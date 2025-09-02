import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type {
  AIAgentConfig,
  Ticket,
  Message,
  AgentInteraction
} from '@/components/crm/types';
import { agentSelectionService } from './agent-selection-service';

/**
 * Handler para ativação imediata de agentes
 */
export class ImmediateActivationHandler {
  async handleNewTicket(ticket: Ticket): Promise<void> {
    try {
      console.log(`🚀 [IMMEDIATE] Processando novo ticket ${ticket.id}`);
      
      // Verificar se já tem agente atribuído
      if (ticket.assignedAgent) {
        console.log(`⚠️ [IMMEDIATE] Ticket ${ticket.id} já possui agente atribuído`);
        return;
      }
      
      // Selecionar agente automaticamente
      const selectedAgent = await agentSelectionService.selectAgentForTicket(ticket);
      
      if (!selectedAgent) {
        console.log(`⚠️ [IMMEDIATE] Nenhum agente disponível para ticket ${ticket.id}`);
        return;
      }
      
      // Verificar se o agente tem ativação imediata configurada
      const hasImmediateActivation = selectedAgent.activationRules.conditions.some(
        condition => condition.type === 'time' && condition.value === 0
      );
      
      if (!hasImmediateActivation) {
        console.log(`⚠️ [IMMEDIATE] Agente ${selectedAgent.name} não tem ativação imediata`);
        return;
      }
      
      await this.activateAgent(ticket, selectedAgent);
    } catch (error) {
      console.error('❌ [IMMEDIATE] Erro ao processar ativação imediata:', error);
    }
  }
  
  private async activateAgent(ticket: Ticket, agent: AIAgentConfig): Promise<void> {
    try {
      console.log(`🤖 [IMMEDIATE] Ativando agente ${agent.name} para ticket ${ticket.id}`);
      
      // Atualizar ticket com agente atribuído
      const ticketRef = doc(db, 'tickets', ticket.id);
      await updateDoc(ticketRef, {
        assignedAgent: {
          type: 'ai' as const,
          id: agent.id,
          name: agent.name,
          evoAiAgentId: agent.evoAiAgentId
        },
        aiConfig: {
          activationMode: 'immediate' as const,
          autoResponse: agent.behavior.autoEscalation,
          activationTrigger: {
            keywords: [],
            delay: 0,
            conditions: []
          },
          escalationRules: {
            maxInteractions: agent.behavior.maxInteractionsPerTicket,
            escalateToHuman: agent.behavior.autoEscalation,
            escalationConditions: []
          }
        },
        updatedAt: new Date()
      });
      
      // Registrar interação de ativação
      await this.logAgentInteraction(ticket.id, agent.id, {
        type: 'activation',
        content: `Agente ${agent.name} ativado automaticamente`,
        confidence: 1.0,
        metadata: { activationMode: 'immediate', trigger: 'new_ticket' }
      });
      
      // Enviar primeira mensagem se configurado
      if (agent.behavior.autoEscalation) {
        await this.sendInitialResponse(ticket, agent);
      }
    } catch (error) {
      console.error('❌ [IMMEDIATE] Erro ao ativar agente:', error);
    }
  }
  
  private async sendInitialResponse(ticket: Ticket, agent: AIAgentConfig): Promise<void> {
    try {
      // TODO: Integrar com Evo AI para gerar resposta inicial
      console.log(`💬 [IMMEDIATE] Enviando resposta inicial do agente ${agent.name}`);
      
      // Por enquanto, apenas registrar a intenção
      await this.logAgentInteraction(ticket.id, agent.id, {
        type: 'response',
        content: 'Resposta inicial automática enviada',
        confidence: 0.8,
        metadata: { responseType: 'initial', automated: true }
      });
    } catch (error) {
      console.error('❌ [IMMEDIATE] Erro ao enviar resposta inicial:', error);
    }
  }
  
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
      console.error('❌ [IMMEDIATE] Erro ao registrar interação:', error);
    }
  }
}

/**
 * Handler para ativação por palavra-chave
 */
export class KeywordActivationHandler {
  async handleNewMessage(message: Message, ticket: Ticket): Promise<void> {
    try {
      console.log(`🔍 [KEYWORD] Analisando mensagem para palavras-chave`);
      
      // Verificar se já tem agente IA ativo
      if (ticket.assignedAgent?.type === 'ai') {
        console.log(`⚠️ [KEYWORD] Ticket ${ticket.id} já possui agente IA ativo`);
        return;
      }
      
      // Buscar agentes com triggers de palavra-chave
      const agentsWithKeywords = await this.getAgentsWithKeywordTriggers();
      
      if (agentsWithKeywords.length === 0) {
        console.log(`⚠️ [KEYWORD] Nenhum agente com palavras-chave configuradas`);
        return;
      }
      
      // Verificar cada agente
      for (const agent of agentsWithKeywords) {
        const keywords = this.extractKeywordsFromAgent(agent);
        
        if (this.messageContainsKeywords(message.content, keywords)) {
          console.log(`🎯 [KEYWORD] Palavra-chave encontrada para agente ${agent.name}`);
          await this.activateAgent(ticket, agent, keywords.filter(k => 
            message.content.toLowerCase().includes(k.toLowerCase())
          ));
          break; // Ativar apenas o primeiro agente que corresponder
        }
      }
    } catch (error) {
      console.error('❌ [KEYWORD] Erro ao processar ativação por palavra-chave:', error);
    }
  }
  
  private async getAgentsWithKeywordTriggers(): Promise<AIAgentConfig[]> {
    try {
      const agentsRef = collection(db, 'agents');
      const agentsQuery = query(
        agentsRef,
        where('status', '==', 'active')
      );
      
      const agentsSnapshot = await getDocs(agentsQuery);
      const agents: AIAgentConfig[] = [];
      
      agentsSnapshot.forEach((doc) => {
        const agentData = doc.data() as AIAgentConfig;
        
        // Verificar se tem condições de palavra-chave
        const hasKeywordConditions = agentData.activationRules.conditions.some(
          condition => condition.type === 'keyword'
        );
        
        if (hasKeywordConditions) {
          agents.push({
            ...agentData,
            id: doc.id
          });
        }
      });
      
      return agents;
    } catch (error) {
      console.error('❌ [KEYWORD] Erro ao buscar agentes com palavras-chave:', error);
      return [];
    }
  }
  
  private extractKeywordsFromAgent(agent: AIAgentConfig): string[] {
    const keywords: string[] = [];
    
    agent.activationRules.conditions.forEach(condition => {
      if (condition.type === 'keyword' && typeof condition.value === 'string') {
        keywords.push(condition.value);
      }
    });
    
    return keywords;
  }
  
  private messageContainsKeywords(content: string, keywords: string[]): boolean {
    const lowerContent = content.toLowerCase();
    return keywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
  }
  
  private async activateAgent(
    ticket: Ticket,
    agent: AIAgentConfig,
    triggeredKeywords: string[]
  ): Promise<void> {
    try {
      console.log(`🤖 [KEYWORD] Ativando agente ${agent.name} por palavra-chave`);
      
      // Atualizar ticket
      const ticketRef = doc(db, 'tickets', ticket.id);
      await updateDoc(ticketRef, {
        assignedAgent: {
          type: 'ai' as const,
          id: agent.id,
          name: agent.name,
          evoAiAgentId: agent.evoAiAgentId
        },
        aiConfig: {
          activationMode: 'keyword' as const,
          autoResponse: true,
          activationTrigger: {
            keywords: triggeredKeywords,
            delay: 0,
            conditions: []
          },
          escalationRules: {
            maxInteractions: agent.behavior.maxInteractionsPerTicket,
            escalateToHuman: agent.behavior.autoEscalation,
            escalationConditions: []
          }
        },
        updatedAt: new Date()
      });
      
      // Registrar ativação
      await this.logAgentInteraction(ticket.id, agent.id, {
        type: 'activation',
        content: `Agente ativado por palavra-chave: ${triggeredKeywords.join(', ')}`,
        confidence: 0.9,
        metadata: {
          activationMode: 'keyword',
          triggeredKeywords,
          trigger: 'keyword_match'
        }
      });
    } catch (error) {
      console.error('❌ [KEYWORD] Erro ao ativar agente:', error);
    }
  }
  
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
      console.error('❌ [KEYWORD] Erro ao registrar interação:', error);
    }
  }
}

/**
 * Handler para ativação manual
 */
export class ManualActivationHandler {
  async activateAgentManually(
    ticketId: string,
    agentId: string,
    userId: string,
    options: {
      autoResponse?: boolean;
      customPrompt?: string;
    } = {}
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`👤 [MANUAL] Ativação manual solicitada por usuário ${userId}`);
      
      // Verificar permissões (implementar conforme necessário)
      if (!await this.userCanActivateAgent(userId, agentId)) {
        return {
          success: false,
          message: 'Usuário não tem permissão para ativar este agente'
        };
      }
      
      // Buscar ticket e agente
      const ticket = await this.getTicket(ticketId);
      const agent = await this.getAgent(agentId);
      
      if (!ticket) {
        return { success: false, message: 'Ticket não encontrado' };
      }
      
      if (!agent) {
        return { success: false, message: 'Agente não encontrado' };
      }
      
      // Verificar se já tem agente ativo
      if (ticket.assignedAgent) {
        return {
          success: false,
          message: 'Ticket já possui agente atribuído'
        };
      }
      
      // Ativar agente
      await this.activateAgent(ticket, agent, userId, options);
      
      return {
        success: true,
        message: `Agente ${agent.name} ativado com sucesso`
      };
    } catch (error) {
      console.error('❌ [MANUAL] Erro na ativação manual:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }
  
  private async userCanActivateAgent(userId: string, agentId: string): Promise<boolean> {
    // TODO: Implementar verificação de permissões
    // Por enquanto, permitir todos os usuários
    return true;
  }
  
  private async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) {
        return null;
      }
      
      return { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
    } catch (error) {
      console.error('❌ [MANUAL] Erro ao buscar ticket:', error);
      return null;
    }
  }
  
  private async getAgent(agentId: string): Promise<AIAgentConfig | null> {
    try {
      const agentRef = doc(db, 'agents', agentId);
      const agentSnap = await getDoc(agentRef);
      
      if (!agentSnap.exists()) {
        return null;
      }
      
      return { id: agentSnap.id, ...agentSnap.data() } as AIAgentConfig;
    } catch (error) {
      console.error('❌ [MANUAL] Erro ao buscar agente:', error);
      return null;
    }
  }
  
  private async activateAgent(
    ticket: Ticket,
    agent: AIAgentConfig,
    userId: string,
    options: {
      autoResponse?: boolean;
      customPrompt?: string;
    }
  ): Promise<void> {
    try {
      // Atualizar ticket
      const ticketRef = doc(db, 'tickets', ticket.id);
      await updateDoc(ticketRef, {
        assignedAgent: {
          type: 'ai' as const,
          id: agent.id,
          name: agent.name,
          evoAiAgentId: agent.evoAiAgentId
        },
        aiConfig: {
          activationMode: 'manual' as const,
          autoResponse: options.autoResponse || false,
          activationTrigger: {
            keywords: [],
            delay: 0,
            conditions: []
          },
          escalationRules: {
            maxInteractions: agent.behavior.maxInteractionsPerTicket,
            escalateToHuman: agent.behavior.autoEscalation,
            escalationConditions: []
          }
        },
        updatedAt: new Date()
      });
      
      // Registrar ativação
      await this.logAgentInteraction(ticket.id, agent.id, {
        type: 'activation',
        content: `Agente ativado manualmente por usuário ${userId}`,
        confidence: 1.0,
        metadata: {
          activationMode: 'manual',
          activatedBy: userId,
          autoResponse: options.autoResponse,
          customPrompt: options.customPrompt
        }
      });
    } catch (error) {
      console.error('❌ [MANUAL] Erro ao ativar agente:', error);
      throw error;
    }
  }
  
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
      console.error('❌ [MANUAL] Erro ao registrar interação:', error);
    }
  }
}

/**
 * Handler para ativação agendada
 */
export class ScheduledActivationHandler {
  private scheduledActivations = new Map<string, NodeJS.Timeout>();
  
  async scheduleAgentActivation(
    ticketId: string,
    agentId: string,
    delayMinutes: number
  ): Promise<void> {
    try {
      console.log(`⏰ [SCHEDULED] Agendando ativação do agente ${agentId} em ${delayMinutes} minutos`);
      
      // Cancelar agendamento anterior se existir
      const existingTimeout = this.scheduledActivations.get(ticketId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Agendar nova ativação
      const timeout = setTimeout(async () => {
        await this.executeScheduledActivation(ticketId, agentId);
        this.scheduledActivations.delete(ticketId);
      }, delayMinutes * 60 * 1000);
      
      this.scheduledActivations.set(ticketId, timeout);
      
      // Registrar agendamento
      await this.logScheduledActivation(ticketId, agentId, delayMinutes);
    } catch (error) {
      console.error('❌ [SCHEDULED] Erro ao agendar ativação:', error);
    }
  }
  
  async cancelScheduledActivation(ticketId: string): Promise<void> {
    const timeout = this.scheduledActivations.get(ticketId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledActivations.delete(ticketId);
      console.log(`🚫 [SCHEDULED] Ativação agendada cancelada para ticket ${ticketId}`);
    }
  }
  
  private async executeScheduledActivation(ticketId: string, agentId: string): Promise<void> {
    try {
      console.log(`⏰ [SCHEDULED] Executando ativação agendada para ticket ${ticketId}`);
      
      const manualHandler = new ManualActivationHandler();
      const result = await manualHandler.activateAgentManually(
        ticketId,
        agentId,
        'system',
        { autoResponse: true }
      );
      
      if (result.success) {
        console.log(`✅ [SCHEDULED] Ativação agendada executada com sucesso`);
      } else {
        console.error(`❌ [SCHEDULED] Falha na ativação agendada: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ [SCHEDULED] Erro na execução da ativação agendada:', error);
    }
  }
  
  private async logScheduledActivation(
    ticketId: string,
    agentId: string,
    delayMinutes: number
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
        type: 'activation',
        content: `Ativação agendada para ${delayMinutes} minutos`,
        confidence: 1.0,
        metadata: {
          activationMode: 'scheduled',
          delayMinutes,
          scheduledFor: new Date(Date.now() + delayMinutes * 60 * 1000)
        }
      };
      
      agentInteractions.push(newInteraction);
      
      await updateDoc(ticketRef, {
        agentInteractions,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('❌ [SCHEDULED] Erro ao registrar agendamento:', error);
    }
  }
}

// Exportar instâncias dos handlers
export const immediateActivationHandler = new ImmediateActivationHandler();
export const keywordActivationHandler = new KeywordActivationHandler();
export const manualActivationHandler = new ManualActivationHandler();
export const scheduledActivationHandler = new ScheduledActivationHandler();