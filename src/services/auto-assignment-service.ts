import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { intelligentAgentSelector, type MessageContext, type AgentScore } from './intelligent-agent-selector';
import { dynamicConfidenceService } from './dynamic-confidence-service';
import type { AIAgentConfig, Ticket } from '@/components/crm/types';

// Interface para resultado de auto-atribuição
export interface AutoAssignmentResult {
  success: boolean;
  assignedAgent?: AIAgentConfig;
  score?: number;
  confidence?: number;
  reasons?: string[];
  fallbackUsed?: boolean;
  error?: string;
}

// Interface para critérios de auto-atribuição
export interface AutoAssignmentCriteria {
  enableAutoAssignment: boolean;
  minimumScore: number;
  minimumConfidence: number;
  requireCategoryMatch: boolean;
  allowFallback: boolean;
  maxAttempts: number;
  businessHoursOnly: boolean;
  excludeAgents?: string[];
}

// Configuração padrão
const DEFAULT_CRITERIA: AutoAssignmentCriteria = {
  enableAutoAssignment: true,
  minimumScore: 0.4,
  minimumConfidence: 0.3,
  requireCategoryMatch: false,
  allowFallback: true,
  maxAttempts: 3,
  businessHoursOnly: false,
  excludeAgents: []
};

class AutoAssignmentService {
  private criteria: AutoAssignmentCriteria;

  constructor() {
    this.criteria = { ...DEFAULT_CRITERIA };
  }

  /**
   * Atribui automaticamente o melhor agente para um ticket
   */
  async autoAssignAgent(
    ticketId: string,
    messageContext: MessageContext,
    criteria?: Partial<AutoAssignmentCriteria>
  ): Promise<AutoAssignmentResult> {
    try {
      console.log(`🤖 [AUTO-ASSIGN] Iniciando auto-atribuição para ticket ${ticketId}`);
      
      // Mesclar critérios personalizados com padrões
      const finalCriteria = { ...this.criteria, ...criteria };
      
      // Verificar se auto-atribuição está habilitada
      if (!finalCriteria.enableAutoAssignment) {
        console.log(`🤖 [AUTO-ASSIGN] Auto-atribuição desabilitada`);
        return { success: false, error: 'Auto-atribuição desabilitada' };
      }

      // Verificar horário comercial se necessário
      if (finalCriteria.businessHoursOnly && !this.isBusinessHours()) {
        console.log(`🤖 [AUTO-ASSIGN] Fora do horário comercial`);
        return { success: false, error: 'Fora do horário comercial' };
      }

      // Verificar se ticket já tem agente
      const hasAgent = await this.ticketHasAgent(ticketId);
      if (hasAgent) {
        console.log(`🤖 [AUTO-ASSIGN] Ticket já possui agente atribuído`);
        return { success: false, error: 'Ticket já possui agente' };
      }

      // Selecionar melhor agente
      const agentScore = await intelligentAgentSelector.selectBestAgent(messageContext);
      
      if (!agentScore) {
        console.log(`🤖 [AUTO-ASSIGN] ❌ Nenhum agente adequado encontrado`);
        return { success: false, error: 'Nenhum agente adequado encontrado' };
      }

      console.log(`🤖 [AUTO-ASSIGN] Agente selecionado:`, {
        name: agentScore.agent.name,
        score: agentScore.score,
        confidence: agentScore.confidence,
        reasons: agentScore.reasons.slice(0, 3)
      });

      // Verificar critérios mínimos
      if (agentScore.score < finalCriteria.minimumScore) {
        console.log(`🤖 [AUTO-ASSIGN] ❌ Score muito baixo: ${agentScore.score} < ${finalCriteria.minimumScore}`);
        
        if (finalCriteria.allowFallback) {
          return await this.tryFallbackAssignment(ticketId, messageContext, finalCriteria);
        }
        
        return { 
          success: false, 
          error: `Score insuficiente: ${agentScore.score}` 
        };
      }

      if (agentScore.confidence < finalCriteria.minimumConfidence) {
        console.log(`🤖 [AUTO-ASSIGN] ❌ Confiança muito baixa: ${agentScore.confidence} < ${finalCriteria.minimumConfidence}`);
        
        if (finalCriteria.allowFallback) {
          return await this.tryFallbackAssignment(ticketId, messageContext, finalCriteria);
        }
        
        return { 
          success: false, 
          error: `Confiança insuficiente: ${agentScore.confidence}` 
        };
      }

      // Verificar compatibilidade de categoria se necessário
      if (finalCriteria.requireCategoryMatch && !agentScore.categoryMatch) {
        console.log(`🤖 [AUTO-ASSIGN] ❌ Categoria não compatível`);
        
        if (finalCriteria.allowFallback) {
          return await this.tryFallbackAssignment(ticketId, messageContext, finalCriteria);
        }
        
        return { 
          success: false, 
          error: 'Categoria não compatível' 
        };
      }

      // Atribuir agente ao ticket
      const assignmentSuccess = await this.assignAgentToTicket(
        ticketId, 
        agentScore.agent, 
        messageContext
      );

      if (assignmentSuccess) {
        console.log(`🤖 [AUTO-ASSIGN] ✅ Agente ${agentScore.agent.name} atribuído com sucesso`);
        
        // Registrar métricas de atribuição
        await this.logAssignmentMetrics(ticketId, agentScore, 'auto_assignment');
        
        return {
          success: true,
          assignedAgent: agentScore.agent,
          score: agentScore.score,
          confidence: agentScore.confidence,
          reasons: agentScore.reasons,
          fallbackUsed: false
        };
      } else {
        console.log(`🤖 [AUTO-ASSIGN] ❌ Falha ao atribuir agente`);
        return { success: false, error: 'Falha na atribuição' };
      }

    } catch (error) {
      console.error(`❌ [AUTO-ASSIGN] Erro na auto-atribuição:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  /**
   * Tenta atribuição com agente de fallback
   */
  private async tryFallbackAssignment(
    ticketId: string,
    messageContext: MessageContext,
    criteria: AutoAssignmentCriteria
  ): Promise<AutoAssignmentResult> {
    try {
      console.log(`🔄 [AUTO-ASSIGN-FALLBACK] Tentando agentes de fallback`);
      
      const fallbackAgents = await intelligentAgentSelector.getFallbackAgents();
      
      if (fallbackAgents.length === 0) {
        console.log(`🔄 [AUTO-ASSIGN-FALLBACK] ❌ Nenhum agente de fallback disponível`);
        return { success: false, error: 'Nenhum agente de fallback disponível' };
      }

      // Tentar cada agente de fallback
      for (const fallbackAgent of fallbackAgents.slice(0, criteria.maxAttempts)) {
        console.log(`🔄 [AUTO-ASSIGN-FALLBACK] Tentando: ${fallbackAgent.name}`);
        
        const assignmentSuccess = await this.assignAgentToTicket(
          ticketId, 
          fallbackAgent, 
          messageContext,
          true // É fallback
        );

        if (assignmentSuccess) {
          console.log(`🔄 [AUTO-ASSIGN-FALLBACK] ✅ Agente de fallback ${fallbackAgent.name} atribuído`);
          
          // Registrar métricas de fallback
          await this.logAssignmentMetrics(ticketId, {
            agent: fallbackAgent,
            score: 0.3, // Score padrão para fallback
            confidence: 0.5,
            reasons: ['Agente de fallback'],
            matchedKeywords: [],
            categoryMatch: false,
            sentimentMatch: false
          }, 'fallback_assignment');
          
          return {
            success: true,
            assignedAgent: fallbackAgent,
            score: 0.3,
            confidence: 0.5,
            reasons: ['Agente de fallback selecionado'],
            fallbackUsed: true
          };
        }
      }

      console.log(`🔄 [AUTO-ASSIGN-FALLBACK] ❌ Todos os agentes de fallback falharam`);
      return { success: false, error: 'Todos os agentes de fallback falharam' };
      
    } catch (error) {
      console.error(`❌ [AUTO-ASSIGN-FALLBACK] Erro no fallback:`, error);
      return { success: false, error: 'Erro no fallback' };
    }
  }

  /**
   * Atribui agente ao ticket no Firestore
   */
  private async assignAgentToTicket(
    ticketId: string,
    agent: AIAgentConfig,
    messageContext: MessageContext,
    isFallback = false
  ): Promise<boolean> {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      
      // Calcular threshold dinâmico para o agente
      const confidenceResult = dynamicConfidenceService.calculateDynamicThreshold(
        {
          id: agent.id,
          name: agent.name,
          description: agent.description || '',
          status: agent.status,
          prompt: agent.prompt,
          activationRules: agent.activationRules,
          behavior: agent.behavior,
          modelConfig: agent.modelConfig
        },
        messageContext,
        0.5 // Confiança padrão para atribuição
      );

      const updateData = {
        assignedAgent: {
          type: 'ai' as const,
          id: agent.id,
          name: agent.name,
          evoAiAgentId: agent.evoAiAgentId || null
        },
        aiConfig: {
          activationMode: 'immediate',
          autoResponse: true,
          activationTrigger: {
            keywords: messageContext.keywords || [],
            delay: 0,
            conditions: []
          },
          escalationRules: {
            maxInteractions: agent.behavior?.maxInteractionsPerTicket || 10,
            escalateToHuman: agent.behavior?.autoEscalation !== false,
            confidenceThreshold: confidenceResult.finalThreshold,
            escalationConditions: []
          }
        },
        autoAssigned: true,
        autoAssignedAt: new Date(),
        autoAssignmentType: isFallback ? 'fallback' : 'intelligent',
        updatedAt: new Date()
      };

      await updateDoc(ticketRef, updateData);
      
      console.log(`💾 [AUTO-ASSIGN] Ticket ${ticketId} atualizado com agente ${agent.name}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [AUTO-ASSIGN] Erro ao atualizar ticket:`, error);
      return false;
    }
  }

  /**
   * Verifica se ticket já tem agente atribuído
   */
  private async ticketHasAgent(ticketId: string): Promise<boolean> {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) {
        return false;
      }
      
      const ticket = ticketSnap.data() as Ticket;
      return !!ticket.assignedAgent;
      
    } catch (error) {
      console.error('Erro ao verificar agente do ticket:', error);
      return false;
    }
  }

  /**
   * Verifica se está em horário comercial
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = domingo, 6 = sábado
    
    // Segunda a sexta, 9h às 18h
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }

  /**
   * Registra métricas de atribuição
   */
  private async logAssignmentMetrics(
    ticketId: string,
    agentScore: AgentScore,
    assignmentType: string
  ): Promise<void> {
    try {
      const metricsData = {
        ticketId,
        agentId: agentScore.agent.id,
        agentName: agentScore.agent.name,
        assignmentType,
        score: agentScore.score,
        confidence: agentScore.confidence,
        reasons: agentScore.reasons,
        matchedKeywords: agentScore.matchedKeywords,
        categoryMatch: agentScore.categoryMatch,
        sentimentMatch: agentScore.sentimentMatch,
        timestamp: new Date()
      };

      await addDoc(collection(db, 'assignment_metrics'), metricsData);
      console.log(`📊 [AUTO-ASSIGN] Métricas registradas para ticket ${ticketId}`);
      
    } catch (error) {
      console.error('Erro ao registrar métricas:', error);
    }
  }

  /**
   * Atualiza critérios de auto-atribuição
   */
  updateCriteria(newCriteria: Partial<AutoAssignmentCriteria>): void {
    this.criteria = { ...this.criteria, ...newCriteria };
    console.log(`🤖 [AUTO-ASSIGN] Critérios atualizados:`, this.criteria);
  }

  /**
   * Obtém critérios atuais
   */
  getCriteria(): AutoAssignmentCriteria {
    return { ...this.criteria };
  }

  /**
   * Obtém estatísticas de auto-atribuição
   */
  async getAssignmentStats(days = 7): Promise<{
    totalAssignments: number;
    successfulAssignments: number;
    fallbackAssignments: number;
    averageScore: number;
    averageConfidence: number;
    topAgents: Array<{ agentId: string; agentName: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const q = query(
        collection(db, 'assignment_metrics'),
        where('timestamp', '>=', startDate)
      );

      const querySnapshot = await getDocs(q);
      const metrics: any[] = [];
      
      querySnapshot.forEach((doc) => {
        metrics.push(doc.data());
      });

      const totalAssignments = metrics.length;
      const successfulAssignments = metrics.filter(m => m.assignmentType === 'auto_assignment').length;
      const fallbackAssignments = metrics.filter(m => m.assignmentType === 'fallback_assignment').length;
      
      const averageScore = metrics.reduce((sum, m) => sum + (m.score || 0), 0) / totalAssignments || 0;
      const averageConfidence = metrics.reduce((sum, m) => sum + (m.confidence || 0), 0) / totalAssignments || 0;
      
      // Contar agentes mais usados
      const agentCounts: Record<string, { name: string; count: number }> = {};
      metrics.forEach(m => {
        if (!agentCounts[m.agentId]) {
          agentCounts[m.agentId] = { name: m.agentName, count: 0 };
        }
        agentCounts[m.agentId].count++;
      });
      
      const topAgents = Object.entries(agentCounts)
        .map(([agentId, data]) => ({ agentId, agentName: data.name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalAssignments,
        successfulAssignments,
        fallbackAssignments,
        averageScore,
        averageConfidence,
        topAgents
      };
      
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalAssignments: 0,
        successfulAssignments: 0,
        fallbackAssignments: 0,
        averageScore: 0,
        averageConfidence: 0,
        topAgents: []
      };
    }
  }
}

export const autoAssignmentService = new AutoAssignmentService();
export default autoAssignmentService;