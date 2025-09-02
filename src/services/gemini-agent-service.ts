import { GoogleGenerativeAI } from '@google/generative-ai';
import { firebaseService } from './firebase-service';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { intelligentAgentSelector, type MessageContext } from './intelligent-agent-selector';
import { dynamicConfidenceService } from './dynamic-confidence-service';

// Configuração dos modelos Gemini
const GEMINI_MODELS = {
  'gemini-2.5-pro': {
    name: 'gemini-2.5-pro',
    maxTokens: 8192,
    temperature: 0.7
  },
  'gemini-2.5-flash': {
    name: 'gemini-2.5-flash',
    maxTokens: 8192,
    temperature: 0.7
  },
  'gemini-2.0-flash': {
    name: 'gemini-2.0-flash',
    maxTokens: 8192,
    temperature: 0.7
  }
};

interface AgentExecutionContext {
  input: string;
  context: {
    ticketId: string;
    clientName: string;
    clientPhone: string;
    conversationHistory: string[];
    instanceId: string;
    metadata: any;
  };
}

interface AgentResponse {
  response: string;
  confidence: number;
  executionTime: number;
  tokensUsed: number;
}

class GeminiAgentService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Executa um agente IA usando Gemini
   */
  async executeAgent(
    agentConfig: any,
    execution: AgentExecutionContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 [GEMINI] Executando agente ${agentConfig.id} com modelo ${agentConfig.model || 'gemini-2.5-flash'}`);
      
      // Selecionar modelo
      const modelName = agentConfig.model || 'gemini-2.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });
      
      // Construir prompt do agente
      const prompt = this.buildAgentPrompt(agentConfig, execution);
      
      console.log(`📝 [GEMINI] Prompt construído:`, {
        promptLength: prompt.length,
        agentName: agentConfig.name,
        clientMessage: execution.input
      });
      
      // Gerar resposta
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const executionTime = Date.now() - startTime;
      
      // Calcular confiança baseada na qualidade da resposta
      const confidence = this.calculateConfidence(text, execution.input);
      
      console.log(`✅ [GEMINI] Resposta gerada:`, {
        responseLength: text.length,
        confidence,
        executionTime,
        model: modelName
      });
      
      return {
        response: text,
        confidence,
        executionTime,
        tokensUsed: this.estimateTokens(prompt + text)
      };
      
    } catch (error) {
      console.error(`❌ [GEMINI] Erro ao executar agente:`, error);
      
      return {
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Um atendente humano irá ajudá-lo em breve.',
        confidence: 0.3,
        executionTime: Date.now() - startTime,
        tokensUsed: 0
      };
    }
  }

  /**
   * Constrói o prompt para o agente
   */
  private buildAgentPrompt(agentConfig: any, execution: AgentExecutionContext): string {
    const { input, context } = execution;
    
    // Prompt base do agente
    let prompt = agentConfig.prompt || agentConfig.systemPrompt || '';
    
    // Se não há prompt configurado, usar um padrão
    if (!prompt) {
      prompt = `Você é um assistente de atendimento ao cliente profissional e prestativo. 
Seu nome é ${agentConfig.name || 'Assistente IA'}.
Responda de forma clara, objetiva e amigável às perguntas dos clientes.`;
    }
    
    // Adicionar contexto da conversa
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      prompt += `\n\nHistórico da conversa:\n${context.conversationHistory.slice(-5).join('\n')}`;
    }
    
    // Adicionar informações do cliente
    prompt += `\n\nInformações do cliente:\n- Nome: ${context.clientName}\n- Telefone: ${context.clientPhone}\n- Ticket ID: ${context.ticketId}`;
    
    // Adicionar mensagem atual
    prompt += `\n\nMensagem atual do cliente: "${input}"\n\nResponda de forma profissional e útil:`;
    
    return prompt;
  }

  /**
   * Calcula a confiança da resposta
   */
  private calculateConfidence(response: string, input: string): number {
    // Fatores que aumentam a confiança
    let confidence = 0.5; // Base
    
    // Resposta não vazia
    if (response && response.trim().length > 0) {
      confidence += 0.2;
    }
    
    // Resposta com tamanho adequado (não muito curta nem muito longa)
    if (response.length >= 20 && response.length <= 500) {
      confidence += 0.1;
    }
    
    // Resposta não contém erros óbvios
    if (!response.toLowerCase().includes('erro') && 
        !response.toLowerCase().includes('desculpe, não posso') &&
        !response.toLowerCase().includes('não entendi')) {
      confidence += 0.1;
    }
    
    // Resposta parece contextual (contém palavras da pergunta)
    const inputWords = input.toLowerCase().split(' ').filter(w => w.length > 3);
    const responseWords = response.toLowerCase().split(' ');
    const commonWords = inputWords.filter(word => responseWords.includes(word));
    
    if (commonWords.length > 0) {
      confidence += Math.min(0.1, commonWords.length * 0.02);
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Estima o número de tokens usados
   */
  private estimateTokens(text: string): number {
    // Estimativa aproximada: 1 token ≈ 4 caracteres
    return Math.ceil(text.length / 4);
  }

  /**
   * Processa mensagem com agente IA atribuído a ticket
   */
  async processTicketMessage(
    ticketId: string,
    agentConfig: any,
    messageData: any,
    textContent: string
  ): Promise<void> {
    try {
      console.log(`🎯 [GEMINI-TICKET] ===== INICIANDO PROCESSAMENTO GEMINI =====`);
      console.log(`🎯 [GEMINI-TICKET] Processando mensagem para ticket ${ticketId}`);
      console.log(`🎯 [GEMINI-TICKET] Parâmetros recebidos:`, {
        ticketId,
        agentConfigId: agentConfig?.id,
        agentName: agentConfig?.name,
        model: agentConfig?.model,
        messageId: messageData?.messageId,
        textContentLength: textContent?.length,
        textContent: textContent
      });
      
      // Buscar histórico da conversa
      console.log(`🎯 [GEMINI-TICKET] Buscando histórico da conversa...`);
      const conversationHistory = await this.getConversationHistory(
        messageData.remoteJid,
        messageData.instanceName
      );
      console.log(`🎯 [GEMINI-TICKET] Histórico obtido: ${conversationHistory.length} mensagens`);
      
      // Preparar contexto da execução
      const execution: AgentExecutionContext = {
        input: textContent,
        context: {
          ticketId,
          clientName: messageData.pushName || 'Cliente',
          clientPhone: messageData.remoteJid,
          conversationHistory: conversationHistory.map(msg => 
            `${msg.fromMe ? 'Atendente' : 'Cliente'}: ${msg.content}`
          ),
          instanceId: messageData.instanceName,
          metadata: {
            messageType: messageData.messageType,
            timestamp: messageData.messageTimestamp,
            originalMessageId: messageData.messageId
          }
        }
      };
      
      // Executar agente
      console.log(`🎯 [GEMINI-TICKET] Executando agente com Gemini...`);
      console.log(`🎯 [GEMINI-TICKET] Contexto de execução:`, {
        input: execution.input,
        contextKeys: Object.keys(execution.context),
        conversationHistoryLength: execution.context.conversationHistory.length
      });
      
      const response = await this.executeAgent(agentConfig, execution);
      
      console.log(`🎯 [GEMINI-TICKET] Resposta do agente:`, {
        hasResponse: !!response.response,
        responseLength: response.response?.length || 0,
        confidence: response.confidence,
        executionTime: response.executionTime,
        tokensUsed: response.tokensUsed
      });
      
      // Criar contexto da mensagem para análise inteligente
      const messageContext: MessageContext = {
        content: textContent,
        messageType: messageData.messageType,
        clientPhone: messageData.remoteJid,
        instanceId: messageData.instanceName,
        timestamp: new Date(messageData.messageTimestamp),
        conversationHistory: conversationHistory.map(msg => 
          `${msg.fromMe ? 'Atendente' : 'Cliente'}: ${msg.content}`
        ),
        clientName: messageData.pushName || 'Cliente'
      };

      // Calcular threshold dinâmico baseado no contexto
      const confidenceResult = dynamicConfidenceService.calculateDynamicThreshold(
        agentConfig,
        messageContext,
        response.confidence
      );

      console.log(`🎯 [GEMINI-TICKET] Análise de confiança dinâmica:`);
      console.log(`🎯 [GEMINI-TICKET] ${dynamicConfidenceService.generateConfidenceReport(confidenceResult)}`);
      
      const shouldSend = confidenceResult.shouldSend;
      const finalThreshold = confidenceResult.finalThreshold;
      
      if (response.response && shouldSend) {
        try {
          // Enviar resposta via WhatsApp
          console.log(`🎯 [GEMINI-TICKET] Enviando resposta via Evolution API...`);
          console.log(`🎯 [GEMINI-TICKET] Dados do envio:`, {
            instanceName: messageData.instanceName,
            remoteJid: messageData.remoteJid,
            responseText: response.response
          });
          
          await firebaseService.sendMessage(
            messageData.instanceName,
            messageData.remoteJid,
            response.response
          );
          
          console.log(`📤 [GEMINI-TICKET] ✅ Resposta enviada com sucesso para ticket ${ticketId}`);
          
          // Registrar interação de sucesso
          await this.logTicketInteraction({
            ticketId,
            agentId: agentConfig.id,
            type: 'auto_response',
            content: response.response,
            confidence: response.confidence,
            metadata: {
              originalMessageId: messageData.messageId,
              messageType: messageData.messageType,
              executionTime: response.executionTime,
              tokensUsed: response.tokensUsed,
              model: agentConfig.model || 'gemini-2.5-flash',
              status: 'sent'
            }
          });
          
        } catch (sendError: any) {
          console.error(`❌ [GEMINI-TICKET] Erro ao enviar resposta:`, sendError.message);
          
          // Registrar falha no envio
          await this.logTicketInteraction({
            ticketId,
            agentId: agentConfig.id,
            type: 'send_failed',
            content: `Resposta gerada mas falha no envio: ${response.response}`,
            confidence: response.confidence,
            metadata: {
              originalMessageId: messageData.messageId,
              error: sendError.message,
              reason: sendError.message.includes('NUMBER_NOT_EXISTS') ? 'number_not_exists' : 'send_error',
              executionTime: response.executionTime,
              tokensUsed: response.tokensUsed
            }
          });
          
          // Se o número não existe, não é um erro crítico
          if (sendError.message.includes('NUMBER_NOT_EXISTS')) {
            console.warn(`⚠️ [GEMINI-TICKET] Número não existe no WhatsApp - resposta não enviada mas processamento OK`);
          } else {
            // Para outros erros, re-lançar
            throw sendError;
          }
        }
        
      } else {
        console.log(`⚠️ [GEMINI-TICKET] ❌ Resposta não enviada - confiança insuficiente`);
        console.log(`⚠️ [GEMINI-TICKET] Detalhes:`, {
          hasResponse: !!response.response,
          responseLength: response.response?.length || 0,
          actualConfidence: response.confidence,
          requiredThreshold: finalThreshold,
          difference: finalThreshold - response.confidence,
          adjustmentsApplied: confidenceResult.adjustments.length
        });
        
        // Tentar agente de fallback se disponível
        await this.tryFallbackAgent(ticketId, messageContext, messageData, textContent, agentConfig.id);
        
        // Registrar tentativa com baixa confiança
        await this.logTicketInteraction({
          ticketId,
          agentId: agentConfig.id,
          type: 'low_confidence',
          content: `Resposta gerada mas não enviada (confiança: ${response.confidence})`,
          confidence: response.confidence,
          metadata: {
            originalMessageId: messageData.messageId,
            reason: 'low_confidence',
            threshold: finalThreshold,
            dynamicAdjustments: confidenceResult.adjustments
          }
        });
      }
      
      console.log(`🎯 [GEMINI-TICKET] ===== FIM DO PROCESSAMENTO GEMINI =====`);
      
    } catch (error) {
      console.error(`❌ [GEMINI-TICKET] Erro ao processar mensagem:`, error);
      console.error(`❌ [GEMINI-TICKET] Stack trace:`, error.stack);
      console.log(`🎯 [GEMINI-TICKET] ===== FIM DO PROCESSAMENTO GEMINI (COM ERRO) =====`);
      
      // Registrar erro
      await this.logTicketInteraction({
        ticketId,
        agentId: agentConfig.id,
        type: 'error',
        content: `Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        confidence: 0,
        metadata: {
          originalMessageId: messageData.messageId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      });
    }
  }

  /**
   * Tenta usar agente de fallback quando o principal falha
   */
  private async tryFallbackAgent(
    ticketId: string,
    messageContext: MessageContext,
    messageData: any,
    textContent: string,
    excludeAgentId: string
  ): Promise<void> {
    try {
      console.log(`🔄 [GEMINI-FALLBACK] Tentando agente de fallback para ticket ${ticketId}`);
      
      // Buscar agentes de fallback
      const fallbackAgents = await intelligentAgentSelector.getFallbackAgents(excludeAgentId);
      
      if (fallbackAgents.length === 0) {
        console.log(`🔄 [GEMINI-FALLBACK] ❌ Nenhum agente de fallback disponível`);
        return;
      }

      // Tentar o primeiro agente de fallback
      const fallbackAgent = fallbackAgents[0];
      console.log(`🔄 [GEMINI-FALLBACK] Tentando agente: ${fallbackAgent.name}`);

      const fallbackConfig = {
        id: fallbackAgent.id,
        name: fallbackAgent.name,
        model: 'gemini-2.5-flash',
        prompt: fallbackAgent.systemPrompt || 'Você é um assistente de atendimento ao cliente.',
        aiConfig: {
          escalationRules: {
            confidenceThreshold: 0.3 // Threshold mais baixo para fallback
          }
        }
      };

      // Executar agente de fallback
      const execution = {
        input: textContent,
        context: {
          ticketId,
          clientName: messageContext.clientName || 'Cliente',
          clientPhone: messageContext.clientPhone,
          conversationHistory: messageContext.conversationHistory,
          instanceId: messageContext.instanceId,
          metadata: {
            messageType: messageData.messageType,
            timestamp: messageData.messageTimestamp,
            originalMessageId: messageData.messageId,
            fallbackAttempt: true
          }
        }
      };

      const response = await this.executeAgent(fallbackConfig, execution);
      
      // Verificar se fallback tem confiança suficiente
      if (response.confidence >= 0.3) {
        console.log(`🔄 [GEMINI-FALLBACK] ✅ Agente de fallback gerou resposta com confiança ${response.confidence}`);
        
        // Enviar resposta do fallback
        await firebaseService.sendMessage(
          messageData.instanceName,
          messageData.remoteJid,
          response.response
        );

        // Registrar sucesso do fallback
        await this.logTicketInteraction({
          ticketId,
          agentId: fallbackAgent.id,
          type: 'fallback_response',
          content: response.response,
          confidence: response.confidence,
          metadata: {
            originalMessageId: messageData.messageId,
            fallbackFor: excludeAgentId,
            executionTime: response.executionTime,
            tokensUsed: response.tokensUsed
          }
        });
        
        console.log(`🔄 [GEMINI-FALLBACK] ✅ Resposta de fallback enviada com sucesso`);
      } else {
        console.log(`🔄 [GEMINI-FALLBACK] ❌ Agente de fallback também tem confiança baixa: ${response.confidence}`);
      }
      
    } catch (error) {
      console.error(`❌ [GEMINI-FALLBACK] Erro no agente de fallback:`, error);
    }
  }

  /**
   * Busca histórico da conversa
   */
  private async getConversationHistory(remoteJid: string, instanceName: string, limit = 10) {
    try {
      const messages = await firebaseService.getRecentMessages(remoteJid, instanceName, limit);
      return messages.map(msg => ({
        content: msg.content || '',
        fromMe: msg.fromMe || false,
        timestamp: msg.timestamp
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico da conversa:', error);
      return [];
    }
  }

  /**
   * Registra interação do agente no ticket
   */
  private async logTicketInteraction(interactionData: {
    ticketId: string;
    agentId: string;
    type: string;
    content: string;
    confidence: number;
    metadata?: any;
  }) {
    try {
      // Registrar a interação no Firebase
      await addDoc(collection(db, 'agent_interactions'), {
        ...interactionData,
        timestamp: new Date(),
        createdAt: new Date()
      });
      
      console.log(`📝 [GEMINI-TICKET] Interação registrada para ticket ${interactionData.ticketId}`);
    } catch (error) {
      console.error('❌ [GEMINI-TICKET] Erro ao registrar interação:', error);
    }
  }
}

export const geminiAgentService = new GeminiAgentService();
export { GeminiAgentService };