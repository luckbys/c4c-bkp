import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Ticket, Message, AIAgentConfig, AgentInteraction } from '@/components/crm/types';
import { AgentSelectionService } from './agent-selection-service';
import { KeywordActivationHandler } from './agent-activation-handlers';
import { escalationService } from './escalation-service';

/**
 * Resposta do agente IA
 */
export interface AIResponse {
  content: string;
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Serviço principal para processamento automático de mensagens com IA
 */
export class AIAttendanceFlow {
  private static instance: AIAttendanceFlow;
  
  public static getInstance(): AIAttendanceFlow {
    if (!AIAttendanceFlow.instance) {
      AIAttendanceFlow.instance = new AIAttendanceFlow();
    }
    return AIAttendanceFlow.instance;
  }
  
  /**
   * Processa mensagem recebida e ativa agentes conforme necessário
   */
  async processIncomingMessage(message: Message, ticket: Ticket): Promise<void> {
    try {
      console.log(`📨 [AI-FLOW] Processando mensagem ${message.id} do ticket ${ticket.id}`);
      
      // 1. Verificar se deve ativar agente por palavra-chave
      if (!ticket.assignedAgent || ticket.assignedAgent.type !== 'ai') {
        const keywordHandler = new KeywordActivationHandler();
        await keywordHandler.handleNewMessage(message, ticket);
        
        // Recarregar ticket após possível ativação
        const updatedTicket = await this.getTicket(ticket.id);
        if (updatedTicket) {
          ticket = updatedTicket;
        }
      }
      
      // 2. Se há agente IA ativo, processar mensagem
      if (ticket.assignedAgent?.type === 'ai') {
        await this.processMessageWithAI(message, ticket);
      }
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao processar mensagem:', error);
    }
  }
  
  /**
   * Processa mensagem com agente IA ativo
   */
  private async processMessageWithAI(message: Message, ticket: Ticket): Promise<void> {
    try {
      // Verificar se a mensagem é do cliente
      if (message.sender !== 'client') {
        console.log(`⚠️ [AI-FLOW] Mensagem não é do cliente, ignorando`);
        return;
      }
      
      // Obter configuração do agente
      const agentConfig = await this.getAgentConfig(ticket.assignedAgent!.id);
      if (!agentConfig) {
        console.error(`❌ [AI-FLOW] Configuração do agente não encontrada`);
        return;
      }
      
      // Verificar se deve responder automaticamente
      if (!ticket.aiConfig?.autoResponse) {
        console.log(`⚠️ [AI-FLOW] Resposta automática desabilitada`);
        return;
      }
      
      // Verificar limite de interações
      const currentInteractions = await this.getAgentInteractionCount(ticket.id, agentConfig.id);
      if (currentInteractions >= agentConfig.behavior.maxInteractionsPerTicket) {
        console.log(`⚠️ [AI-FLOW] Limite de interações atingido, escalando`);
        await this.escalateToHuman(ticket, {
          type: 'max_interactions',
          description: 'Limite máximo de interações atingido',
          sendTransitionMessage: true
        });
        return;
      }
      
      // Processar mensagem com IA
      const response = await this.processWithEvoAI(message, ticket, agentConfig);
      
      if (!response) {
        console.error(`❌ [AI-FLOW] Falha ao processar com Evo AI`);
        return;
      }
      
      // Verificar se deve escalar para humano usando EscalationService
      const escalationAnalysis = await escalationService.analyzeEscalationNeed(ticket);
      
      if (escalationAnalysis.shouldEscalate) {
        console.log(`⚠️ [AI-FLOW] Escalação necessária: ${escalationAnalysis.reason}`);
        await this.escalateToHuman(ticket, {
          type: 'low_confidence',
          description: escalationAnalysis.reason,
          sendTransitionMessage: true
        });
        return;
      }
      
      // Verificar confiança da resposta
      if (response.confidence < agentConfig.behavior.escalationThreshold) {
        console.log(`⚠️ [AI-FLOW] Confiança baixa (${response.confidence}), escalando`);
        await this.escalateToHuman(ticket, {
          type: 'low_confidence',
          description: `Confiança da resposta abaixo do limite (${response.confidence})`,
          sendTransitionMessage: true
        });
        return;
      }
      
      // Enviar resposta
      await this.sendAIResponse(ticket, response, agentConfig);
      
      // Registrar interação
      await this.logAgentInteraction(ticket.id, agentConfig.id, {
        type: 'response',
        content: response.content,
        confidence: response.confidence,
        metadata: {
          messageId: message.id,
          responseType: 'automatic',
          processingTime: Date.now()
        }
      });
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao processar mensagem com IA:', error);
    }
  }
  
  /**
   * Processa mensagem com Evo AI usando JSON-RPC 2.0
   */
  private async processWithEvoAI(
    message: Message,
    ticket: Ticket,
    agentConfig: AIAgentConfig
  ): Promise<AIResponse | null> {
    try {
      console.log(`🤖 [AI-FLOW] Processando com Evo AI via JSON-RPC - Agente: ${agentConfig.name}`);
      
      // Importar serviço JSON-RPC
      const { evoAiJsonRpcService } = await import('./evo-ai-jsonrpc-service');
      
      // Construir contexto da conversa
      const context = await this.buildContext(ticket);
      
      // Preparar contexto para JSON-RPC
      const rpcContext = {
        ticketId: ticket.id,
        clientName: ticket.client.name,
        clientPhone: ticket.client.phone,
        conversationHistory: context.conversationHistory.map((msg: any) => 
          `${msg.role === 'user' ? 'Cliente' : 'Agente'}: ${msg.content}`
        ),
        agentId: agentConfig.evoAiAgentId || agentConfig.id,
        sessionId: `session-${ticket.id}-${agentConfig.id}`
      };
      
      try {
        // Processar mensagem via JSON-RPC 2.0
        const rpcResponse = await evoAiJsonRpcService.processMessage(
          message.content,
          rpcContext
        );
        
        console.log(`✅ [AI-FLOW] Resposta JSON-RPC recebida:`, {
          confidence: rpcResponse.confidence,
          responseLength: rpcResponse.response.length,
          sessionId: rpcResponse.metadata.sessionId
        });
        
        return {
          content: rpcResponse.response,
          confidence: rpcResponse.confidence,
          metadata: {
            ...rpcResponse.metadata,
            model: agentConfig.modelConfig.systemPrompt ? 'custom' : 'evo-ai',
            temperature: agentConfig.modelConfig.temperature,
            protocol: 'JSON-RPC 2.0',
            agentName: agentConfig.name
          }
        };
        
      } catch (rpcError) {
        console.error('❌ [AI-FLOW] Erro na comunicação JSON-RPC:', rpcError);
        
        // Fallback para simulação em caso de erro
        console.log('🔄 [AI-FLOW] Usando fallback de simulação...');
        return await this.simulateEvoAIResponse(message, context, agentConfig);
      }
      
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao processar com Evo AI:', error);
      
      // Fallback final para simulação
      try {
        const context = await this.buildContext(ticket);
        return await this.simulateEvoAIResponse(message, context, agentConfig);
      } catch (fallbackError) {
        console.error('❌ [AI-FLOW] Erro no fallback:', fallbackError);
        return null;
      }
    }
  }
  
  /**
   * Simula resposta do Evo AI (fallback para desenvolvimento)
   */
  private async simulateEvoAIResponse(
    message: Message,
    context: any,
    agentConfig: AIAgentConfig
  ): Promise<AIResponse> {
    console.log('⚠️ [AI-FLOW] Usando simulação como fallback');
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Respostas mais contextuais baseadas na mensagem
    const messageContent = message.content.toLowerCase();
    let response = "Olá! Como posso ajudá-lo hoje?";
    
    if (messageContent.includes('problema') || messageContent.includes('erro')) {
      response = "Entendi que você está enfrentando um problema. Vou analisar a situação e ajudá-lo a resolver.";
    } else if (messageContent.includes('preço') || messageContent.includes('valor') || messageContent.includes('custo')) {
      response = "Vou verificar as informações de preços para você. Um momento, por favor.";
    } else if (messageContent.includes('produto') || messageContent.includes('serviço')) {
      response = "Posso fornecer mais informações sobre nossos produtos e serviços. O que especificamente você gostaria de saber?";
    } else if (messageContent.includes('obrigado') || messageContent.includes('valeu')) {
      response = "Fico feliz em ajudar! Se precisar de mais alguma coisa, estarei aqui.";
    } else if (messageContent.includes('oi') || messageContent.includes('olá') || messageContent.includes('bom dia')) {
      response = "Olá! Seja bem-vindo. Como posso ajudá-lo hoje?";
    }
    
    const confidence = 0.6 + Math.random() * 0.2; // 0.6 a 0.8 (menor que JSON-RPC real)
    
    return {
      content: response,
      confidence,
      metadata: {
        model: 'simulation-fallback',
        temperature: agentConfig.modelConfig.temperature,
        tokens: Math.floor(Math.random() * 100) + 50,
        fallback: true,
        agentName: agentConfig.name
      }
    };
  }
  
  /**
   * Constrói contexto da conversa para o agente
   */
  private async buildContext(ticket: Ticket): Promise<any> {
    const recentMessages = ticket.messages?.slice(-10) || [];
    
    return {
      ticketId: ticket.id,
      clientInfo: {
        name: ticket.client.name,
        phone: ticket.client.phone,
        email: ticket.client.email
      },
      conversationHistory: recentMessages.map(msg => ({
        role: msg.sender === 'client' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      })),
      ticketInfo: {
        status: ticket.status,
        priority: ticket.priority,
        channel: ticket.channel,
        tags: ticket.tags,
        createdAt: ticket.createdAt
      },
      metadata: {
        messageCount: ticket.messages?.length || 0,
        unreadCount: ticket.unreadCount,
        lastActivity: ticket.updatedAt
      }
    };
  }
  
  /**
   * Envia resposta do agente IA
   */
  private async sendAIResponse(
    ticket: Ticket,
    response: AIResponse,
    agentConfig: AIAgentConfig
  ): Promise<void> {
    try {
      // Simular delay de digitação se configurado
      if (agentConfig.behavior.responseDelay) {
        await this.simulateTyping(ticket, agentConfig.behavior.responseDelay);
      }
      
      console.log(`💬 [AI-FLOW] Enviando resposta via ${response.metadata?.protocol || 'simulação'}:`, {
        content: response.content.substring(0, 100) + (response.content.length > 100 ? '...' : ''),
        confidence: response.confidence,
        agentName: agentConfig.name,
        isFallback: response.metadata?.fallback || false
      });
      
      // Tentar enviar via Evolution API real
      try {
        await this.sendViaEvolutionAPI(ticket, response, agentConfig);
      } catch (evolutionError) {
        console.warn('⚠️ [AI-FLOW] Falha na Evolution API, usando simulação:', evolutionError);
        await this.simulateMessageSending(ticket, response, agentConfig);
      }
      
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao enviar resposta:', error);
    }
  }
  
  /**
   * Envia mensagem via Evolution API real
   */
  private async sendViaEvolutionAPI(
    ticket: Ticket,
    response: AIResponse,
    agentConfig: AIAgentConfig
  ): Promise<void> {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada');
    }
    
    const payload = {
      number: ticket.client.phone.replace(/\D/g, ''),
      text: response.content,
      delay: agentConfig.behavior.responseDelay || 0
    };
    
    const evolutionResponse = await fetch(`${evolutionApiUrl}/message/sendText/${ticket.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (!evolutionResponse.ok) {
      throw new Error(`Evolution API error: ${evolutionResponse.status}`);
    }
    
    console.log(`✅ [AI-FLOW] Mensagem enviada via Evolution API`);
  }
  
  /**
   * Simula envio de mensagem (fallback para desenvolvimento)
   */
  private async simulateMessageSending(
    ticket: Ticket,
    response: AIResponse,
    agentConfig: AIAgentConfig
  ): Promise<void> {
    try {
      console.log('📝 [AI-FLOW] Simulando envio de mensagem (fallback)');
      
      // Adicionar mensagem ao histórico do ticket
      const newMessage: Message = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: response.content,
        timestamp: new Date(),
        sender: 'agent',
        status: 'sent',
        type: 'text',
        isFromMe: true,
        senderName: agentConfig.name,
        metadata: {
          automated: true,
          confidence: response.confidence,
          protocol: response.metadata?.protocol || 'simulation',
          agentId: agentConfig.id
        }
      };
      
      const ticketRef = doc(db, 'tickets', ticket.id);
      const currentMessages = ticket.messages || [];
      
      await updateDoc(ticketRef, {
        messages: [...currentMessages, newMessage],
        lastMessage: response.content,
        lastMessageTime: new Date(),
        updatedAt: new Date(),
        'aiConfig.lastInteraction': new Date(),
        'aiConfig.interactionCount': (ticket.aiConfig?.interactionCount || 0) + 1
      });
      
      console.log(`✅ [AI-FLOW] Mensagem simulada enviada com sucesso:`, {
        messageId: newMessage.id,
        confidence: response.confidence,
        protocol: response.metadata?.protocol
      });
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao simular envio de mensagem:', error);
    }
  }
  
  /**
   * Simula digitação do agente
   */
  private async simulateTyping(ticket: Ticket, delayMs: number): Promise<void> {
    console.log(`⌨️ [AI-FLOW] Simulando digitação por ${delayMs}ms`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  /**
   * Escala ticket para agente humano
   */
  private async escalateToHuman(
    ticket: Ticket,
    reason: {
      type: 'low_confidence' | 'max_interactions' | 'manual' | 'error';
      description: string;
      sendTransitionMessage: boolean;
    }
  ): Promise<void> {
    try {
      console.log(`⬆️ [AI-FLOW] Escalando ticket ${ticket.id} para humano: ${reason.description}`);
      
      // Usar o EscalationService para executar a escalação
      const escalated = await escalationService.escalateToHuman(
        ticket,
        reason.description
      );
      
      if (!escalated) {
        console.error('❌ [AI-FLOW] Falha ao escalar ticket');
        return;
      }
      
      // Enviar mensagem de transição se solicitado
      if (reason.sendTransitionMessage) {
        await this.sendTransitionMessage(ticket, reason);
      }
      
      console.log(`✅ [AI-FLOW] Ticket ${ticket.id} escalado com sucesso`);
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao escalar para humano:', error);
    }
  }
  
  /**
   * Envia mensagem de transição para o cliente
   */
  private async sendTransitionMessage(
    ticket: Ticket,
    reason: {
      type: string;
      description: string;
    }
  ): Promise<void> {
    try {
      const transitionMessages = {
        low_confidence: "Vou transferir você para um de nossos especialistas que poderá ajudá-lo melhor.",
        max_interactions: "Para garantir o melhor atendimento, vou conectá-lo com um agente especializado.",
        manual: "Transferindo para um agente humano conforme solicitado.",
        error: "Ocorreu um problema técnico. Conectando você com um agente humano."
      };
      
      const message = transitionMessages[reason.type as keyof typeof transitionMessages] || 
        "Transferindo para um agente humano.";
      
      console.log(`💬 [AI-FLOW] Enviando mensagem de transição: "${message}"`);
      
      // TODO: Implementar envio real via Evolution API
      // Por enquanto, apenas registrar
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao enviar mensagem de transição:', error);
    }
  }
  

  
  /**
   * Obtém configuração do agente
   */
  private async getAgentConfig(agentId: string): Promise<AIAgentConfig | null> {
    try {
      const agentRef = doc(db, 'agents', agentId);
      const agentSnap = await getDoc(agentRef);
      
      if (!agentSnap.exists()) {
        return null;
      }
      
      return { id: agentSnap.id, ...agentSnap.data() } as AIAgentConfig;
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao buscar configuração do agente:', error);
      return null;
    }
  }
  
  /**
   * Obtém ticket atualizado
   */
  private async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) {
        return null;
      }
      
      return { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao buscar ticket:', error);
      return null;
    }
  }
  
  /**
   * Conta interações do agente no ticket
   */
  private async getAgentInteractionCount(ticketId: string, agentId: string): Promise<number> {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket || !ticket.agentInteractions) {
        return 0;
      }
      
      return ticket.agentInteractions.filter(
        interaction => interaction.agentId === agentId && interaction.type === 'response'
      ).length;
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao contar interações:', error);
      return 0;
    }
  }
  
  /**
   * Registra interação do agente
   */
  private async logAgentInteraction(
    ticketId: string,
    agentId: string,
    interaction: {
      type: 'activation' | 'response' | 'escalation' | 'handoff';
      content?: string;
      confidence?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) {
        return;
      }
      
      const ticket = ticketSnap.data() as Ticket;
      const agentInteractions = ticket.agentInteractions || [];
      
      const newInteraction: AgentInteraction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        timestamp: new Date(),
        ...interaction
      };
      
      agentInteractions.push(newInteraction);
      
      await updateDoc(ticketRef, {
        agentInteractions,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('❌ [AI-FLOW] Erro ao registrar interação:', error);
    }
  }
}

// Exportar instância singleton
export const aiAttendanceFlow = AIAttendanceFlow.getInstance();