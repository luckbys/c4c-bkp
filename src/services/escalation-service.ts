import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Ticket, AgentInteraction, AIAgentConfig } from '@/components/crm/types';

/**
 * Critérios para escalação automática
 */
export interface EscalationCriteria {
  maxInteractions: number;
  lowConfidenceThreshold: number;
  timeoutMinutes: number;
  keywordTriggers: string[];
  sentimentThreshold: number;
}

/**
 * Resultado da análise de escalação
 */
export interface EscalationAnalysis {
  shouldEscalate: boolean;
  reason: string;
  confidence: number;
  suggestedAgent?: string;
  metadata: Record<string, any>;
}

/**
 * Agente humano disponível
 */
export interface HumanAgent {
  id: string;
  name: string;
  email: string;
  department: string;
  skills: string[];
  currentLoad: number;
  maxLoad: number;
  isOnline: boolean;
  lastActivity: Date;
}

/**
 * Serviço de escalação para agentes humanos
 */
export class EscalationService {
  private static instance: EscalationService;
  
  public static getInstance(): EscalationService {
    if (!EscalationService.instance) {
      EscalationService.instance = new EscalationService();
    }
    return EscalationService.instance;
  }

  /**
   * Analisa se um ticket deve ser escalado para um agente humano
   */
  async analyzeEscalationNeed(ticket: Ticket): Promise<EscalationAnalysis> {
    try {
      console.log(`🔍 [ESCALATION] Analisando necessidade de escalação para ticket ${ticket.id}`);
      
      // Se não tem agente IA, não precisa escalar
      if (!ticket.assignedAgent || ticket.assignedAgent.type !== 'ai') {
        return {
          shouldEscalate: false,
          reason: 'Ticket não possui agente IA ativo',
          confidence: 0,
          metadata: {}
        };
      }

      const criteria = await this.getEscalationCriteria(ticket.assignedAgent.id);
      const interactions = ticket.agentInteractions || [];
      const aiInteractions = interactions.filter(i => i.type === 'response');
      
      // Verificar critérios de escalação
      const checks = [
        this.checkMaxInteractions(aiInteractions, criteria),
        this.checkLowConfidence(aiInteractions, criteria),
        this.checkTimeout(ticket, criteria),
        this.checkKeywordTriggers(ticket, criteria),
        this.checkSentiment(ticket, criteria)
      ];
      
      const escalationReasons = checks.filter(check => check.shouldEscalate);
      
      if (escalationReasons.length > 0) {
        const primaryReason = escalationReasons[0];
        const suggestedAgent = await this.findBestHumanAgent(ticket);
        
        return {
          shouldEscalate: true,
          reason: primaryReason.reason,
          confidence: primaryReason.confidence,
          suggestedAgent: suggestedAgent?.id,
          metadata: {
            allReasons: escalationReasons.map(r => r.reason),
            suggestedAgentName: suggestedAgent?.name,
            interactionCount: aiInteractions.length
          }
        };
      }
      
      return {
        shouldEscalate: false,
        reason: 'Critérios de escalação não atendidos',
        confidence: 0,
        metadata: {
          interactionCount: aiInteractions.length,
          checksPerformed: checks.length
        }
      };
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao analisar escalação:', error);
      return {
        shouldEscalate: false,
        reason: 'Erro na análise de escalação',
        confidence: 0,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Executa a escalação do ticket para um agente humano
   */
  async escalateToHuman(
    ticket: Ticket, 
    reason: string, 
    targetAgentId?: string
  ): Promise<boolean> {
    try {
      console.log(`🚀 [ESCALATION] Escalando ticket ${ticket.id} para agente humano`);
      
      const humanAgent = targetAgentId 
        ? await this.getHumanAgent(targetAgentId)
        : await this.findBestHumanAgent(ticket);
      
      if (!humanAgent) {
        console.error('❌ [ESCALATION] Nenhum agente humano disponível');
        return false;
      }
      
      // Atualizar ticket
      const ticketRef = doc(db, 'tickets', ticket.id);
      await updateDoc(ticketRef, {
        assignedAgent: {
          type: 'human' as const,
          id: humanAgent.id,
          name: humanAgent.name,
          email: humanAgent.email
        },
        status: 'in_progress',
        escalatedAt: new Date(),
        escalationReason: reason,
        updatedAt: new Date()
      });
      
      // Registrar interação de escalação
      await this.logEscalationInteraction(ticket.id, humanAgent.id, reason);
      
      // Atualizar carga do agente humano
      await this.updateAgentLoad(humanAgent.id, 1);
      
      // Notificar agente humano (TODO: implementar notificação)
      await this.notifyHumanAgent(humanAgent, ticket, reason);
      
      console.log(`✅ [ESCALATION] Ticket ${ticket.id} escalado para ${humanAgent.name}`);
      return true;
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao escalar ticket:', error);
      return false;
    }
  }

  /**
   * Encontra o melhor agente humano para o ticket
   */
  async findBestHumanAgent(ticket: Ticket): Promise<HumanAgent | null> {
    try {
      const agents = await this.getAvailableHumanAgents();
      
      if (agents.length === 0) {
        return null;
      }
      
      // Ordenar por disponibilidade e carga
      const sortedAgents = agents
        .filter(agent => agent.isOnline && agent.currentLoad < agent.maxLoad)
        .sort((a, b) => {
          // Priorizar por menor carga
          const loadDiff = (a.currentLoad / a.maxLoad) - (b.currentLoad / b.maxLoad);
          if (loadDiff !== 0) return loadDiff;
          
          // Em caso de empate, priorizar por atividade recente
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        });
      
      return sortedAgents[0] || null;
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao buscar agente humano:', error);
      return null;
    }
  }

  /**
   * Obtém critérios de escalação para um agente IA
   */
  private async getEscalationCriteria(agentId: string): Promise<EscalationCriteria> {
    try {
      const agentRef = doc(db, 'agents', agentId);
      const agentSnap = await getDoc(agentRef);
      
      if (agentSnap.exists()) {
        const agent = agentSnap.data() as AIAgentConfig;
        return {
          maxInteractions: agent.behavior.maxInteractionsPerTicket || 5,
          lowConfidenceThreshold: 0.6,
          timeoutMinutes: 30,
          keywordTriggers: ['humano', 'pessoa', 'gerente', 'supervisor'],
          sentimentThreshold: 0.3
        };
      }
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao obter critérios:', error);
    }
    
    // Critérios padrão
    return {
      maxInteractions: 5,
      lowConfidenceThreshold: 0.6,
      timeoutMinutes: 30,
      keywordTriggers: ['humano', 'pessoa', 'gerente', 'supervisor'],
      sentimentThreshold: 0.3
    };
  }

  /**
   * Verifica se excedeu o número máximo de interações
   */
  private checkMaxInteractions(
    interactions: AgentInteraction[], 
    criteria: EscalationCriteria
  ): EscalationAnalysis {
    const shouldEscalate = interactions.length >= criteria.maxInteractions;
    
    return {
      shouldEscalate,
      reason: shouldEscalate 
        ? `Limite de ${criteria.maxInteractions} interações atingido`
        : 'Limite de interações não atingido',
      confidence: shouldEscalate ? 0.9 : 0,
      metadata: {
        currentInteractions: interactions.length,
        maxInteractions: criteria.maxInteractions
      }
    };
  }

  /**
   * Verifica se há muitas respostas com baixa confiança
   */
  private checkLowConfidence(
    interactions: AgentInteraction[], 
    criteria: EscalationCriteria
  ): EscalationAnalysis {
    if (interactions.length < 2) {
      return {
        shouldEscalate: false,
        reason: 'Poucas interações para análise de confiança',
        confidence: 0,
        metadata: {}
      };
    }
    
    const recentInteractions = interactions.slice(-3); // Últimas 3 interações
    const lowConfidenceCount = recentInteractions.filter(
      i => (i.confidence || 0) < criteria.lowConfidenceThreshold
    ).length;
    
    const shouldEscalate = lowConfidenceCount >= 2;
    
    return {
      shouldEscalate,
      reason: shouldEscalate 
        ? `${lowConfidenceCount} respostas com baixa confiança detectadas`
        : 'Confiança das respostas adequada',
      confidence: shouldEscalate ? 0.8 : 0,
      metadata: {
        lowConfidenceCount,
        recentInteractions: recentInteractions.length,
        threshold: criteria.lowConfidenceThreshold
      }
    };
  }

  /**
   * Verifica se o ticket está há muito tempo sem resolução
   */
  private checkTimeout(ticket: Ticket, criteria: EscalationCriteria): EscalationAnalysis {
    const now = new Date();
    const createdAt = ticket.createdAt instanceof Date 
      ? ticket.createdAt 
      : (ticket.createdAt as any)?.toDate?.() || new Date();
    
    const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const shouldEscalate = minutesElapsed > criteria.timeoutMinutes;
    
    return {
      shouldEscalate,
      reason: shouldEscalate 
        ? `Ticket aberto há ${Math.round(minutesElapsed)} minutos`
        : 'Tempo de atendimento dentro do limite',
      confidence: shouldEscalate ? 0.7 : 0,
      metadata: {
        minutesElapsed: Math.round(minutesElapsed),
        timeoutMinutes: criteria.timeoutMinutes
      }
    };
  }

  /**
   * Verifica se há palavras-chave que indicam necessidade de escalação
   */
  private checkKeywordTriggers(
    ticket: Ticket, 
    criteria: EscalationCriteria
  ): EscalationAnalysis {
    // TODO: Analisar mensagens recentes do ticket
    // Por enquanto, retorna false
    return {
      shouldEscalate: false,
      reason: 'Nenhuma palavra-chave de escalação detectada',
      confidence: 0,
      metadata: {
        keywords: criteria.keywordTriggers
      }
    };
  }

  /**
   * Verifica o sentimento do cliente
   */
  private checkSentiment(
    ticket: Ticket, 
    criteria: EscalationCriteria
  ): EscalationAnalysis {
    // TODO: Implementar análise de sentimento
    // Por enquanto, retorna false
    return {
      shouldEscalate: false,
      reason: 'Sentimento do cliente adequado',
      confidence: 0,
      metadata: {
        sentimentThreshold: criteria.sentimentThreshold
      }
    };
  }

  /**
   * Obtém agentes humanos disponíveis
   */
  private async getAvailableHumanAgents(): Promise<HumanAgent[]> {
    try {
      // TODO: Implementar busca de agentes humanos no Firebase
      // Por enquanto, retorna dados simulados
      return [
        {
          id: 'human_1',
          name: 'João Silva',
          email: 'joao@empresa.com',
          department: 'Suporte',
          skills: ['atendimento', 'vendas'],
          currentLoad: 2,
          maxLoad: 5,
          isOnline: true,
          lastActivity: new Date()
        },
        {
          id: 'human_2',
          name: 'Maria Santos',
          email: 'maria@empresa.com',
          department: 'Vendas',
          skills: ['vendas', 'negociação'],
          currentLoad: 1,
          maxLoad: 4,
          isOnline: true,
          lastActivity: new Date(Date.now() - 5 * 60 * 1000) // 5 min atrás
        }
      ];
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao buscar agentes humanos:', error);
      return [];
    }
  }

  /**
   * Obtém um agente humano específico
   */
  private async getHumanAgent(agentId: string): Promise<HumanAgent | null> {
    const agents = await this.getAvailableHumanAgents();
    return agents.find(agent => agent.id === agentId) || null;
  }

  /**
   * Registra interação de escalação
   */
  private async logEscalationInteraction(
    ticketId: string, 
    humanAgentId: string, 
    reason: string
  ): Promise<void> {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) {
        return;
      }
      
      const ticket = ticketSnap.data() as Ticket;
      const agentInteractions = ticket.agentInteractions || [];
      
      const escalationInteraction: AgentInteraction = {
        id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: humanAgentId,
        type: 'escalation',
        content: `Ticket escalado para agente humano: ${reason}`,
        timestamp: new Date(),
        confidence: 1.0,
        metadata: {
          escalationReason: reason,
          previousAgent: ticket.assignedAgent
        }
      };
      
      agentInteractions.push(escalationInteraction);
      
      await updateDoc(ticketRef, {
        agentInteractions,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao registrar escalação:', error);
    }
  }

  /**
   * Atualiza a carga de trabalho de um agente humano
   */
  private async updateAgentLoad(agentId: string, increment: number): Promise<void> {
    try {
      // TODO: Implementar atualização da carga no Firebase
      console.log(`📊 [ESCALATION] Atualizando carga do agente ${agentId}: +${increment}`);
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao atualizar carga do agente:', error);
    }
  }

  /**
   * Notifica agente humano sobre escalação
   */
  private async notifyHumanAgent(
    agent: HumanAgent, 
    ticket: Ticket, 
    reason: string
  ): Promise<void> {
    try {
      // TODO: Implementar notificação (email, push, etc.)
      console.log(`📧 [ESCALATION] Notificando ${agent.name} sobre escalação do ticket ${ticket.id}`);
    } catch (error) {
      console.error('❌ [ESCALATION] Erro ao notificar agente:', error);
    }
  }
}

// Exportar instância singleton
export const escalationService = EscalationService.getInstance();