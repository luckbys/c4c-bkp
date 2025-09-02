import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type {
  AIAgentConfig,
  TicketContext,
  RuleEvaluationResult,
  AgentActivationCondition,
  Ticket
} from '@/components/crm/types';

export class AgentSelectionService {
  private static instance: AgentSelectionService;
  
  public static getInstance(): AgentSelectionService {
    if (!AgentSelectionService.instance) {
      AgentSelectionService.instance = new AgentSelectionService();
    }
    return AgentSelectionService.instance;
  }
  
  /**
   * Seleciona o melhor agente para um ticket baseado nas regras configuradas
   */
  async selectAgentForTicket(ticket: Ticket): Promise<AIAgentConfig | null> {
    try {
      console.log(`🔍 [AGENT-SELECTION] Selecionando agente para ticket ${ticket.id}`);
      
      const availableAgents = await this.getActiveAgents();
      
      if (availableAgents.length === 0) {
        console.log('⚠️ [AGENT-SELECTION] Nenhum agente ativo encontrado');
        return null;
      }
      
      const ticketContext = await this.analyzeTicketContext(ticket);
      
      // Avaliar cada agente baseado nas regras
      const agentScores = await Promise.all(
        availableAgents.map(agent => this.scoreAgent(agent, ticketContext))
      );
      
      // Filtrar agentes com score mínimo
      const viableAgents = agentScores.filter(score => score.score > 0.3);
      
      if (viableAgents.length === 0) {
        console.log('⚠️ [AGENT-SELECTION] Nenhum agente atende aos critérios mínimos');
        return null;
      }
      
      // Selecionar agente com maior pontuação
      const bestMatch = viableAgents.sort((a, b) => b.score - a.score)[0];
      
      console.log(`✅ [AGENT-SELECTION] Agente selecionado: ${bestMatch.agent.name} (score: ${bestMatch.score.toFixed(2)})`);
      
      return bestMatch.agent;
    } catch (error) {
      console.error('❌ [AGENT-SELECTION] Erro ao selecionar agente:', error);
      return null;
    }
  }
  
  /**
   * Avalia múltiplos agentes para um ticket e retorna resultados ordenados
   */
  async evaluateAgentsForTicket(ticket: Ticket): Promise<RuleEvaluationResult[]> {
    try {
      const availableAgents = await this.getActiveAgents();
      const ticketContext = await this.analyzeTicketContext(ticket);
      
      const evaluationResults: RuleEvaluationResult[] = [];
      
      for (const agent of availableAgents) {
        const evaluation = await this.evaluateAgentRules(agent, ticketContext);
        if (evaluation.matches) {
          evaluationResults.push(evaluation);
        }
      }
      
      // Ordenar por prioridade e confiança
      evaluationResults.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.confidence - a.confidence;
      });
      
      return evaluationResults;
    } catch (error) {
      console.error('❌ [AGENT-SELECTION] Erro ao avaliar agentes:', error);
      return [];
    }
  }
  
  /**
   * Busca todos os agentes ativos
   */
  private async getActiveAgents(): Promise<AIAgentConfig[]> {
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
        agents.push({
          ...agentData,
          id: doc.id
        });
      });
      
      return agents;
    } catch (error) {
      console.error('❌ [AGENT-SELECTION] Erro ao buscar agentes ativos:', error);
      return [];
    }
  }
  
  /**
   * Analisa o contexto do ticket para seleção de agentes
   */
  private async analyzeTicketContext(ticket: Ticket): Promise<TicketContext> {
    const lastMessage = ticket.messages && ticket.messages.length > 0 
      ? ticket.messages[ticket.messages.length - 1]
      : null;
    
    return {
      messageType: lastMessage?.type || 'text',
      content: lastMessage?.content || '',
      timestamp: lastMessage?.timestamp || ticket.createdAt,
      priority: ticket.priority,
      clientTags: ticket.tags || [],
      instanceId: ticket.instanceName || '',
      conversationStage: this.determineConversationStage(ticket),
      clientSentiment: this.analyzeClientSentiment(ticket),
      ticketId: ticket.id
    };
  }
  
  /**
   * Calcula score de compatibilidade entre agente e contexto
   */
  private async scoreAgent(
    agent: AIAgentConfig,
    context: TicketContext
  ): Promise<{ agent: AIAgentConfig; score: number }> {
    let score = 0;
    
    // Avaliar condições de ativação (peso: 40%)
    const conditionMatches = agent.activationRules.conditions.filter(
      condition => this.evaluateCondition(condition, context)
    ).length;
    
    if (agent.activationRules.conditions.length > 0) {
      score += (conditionMatches / agent.activationRules.conditions.length) * 0.4;
    }
    
    // Considerar prioridade do agente (peso: 30%)
    score += (agent.activationRules.priority / 10) * 0.3;
    
    // Verificar restrições de tempo (peso: 10%)
    if (this.isWithinTimeRestrictions(agent.activationRules.timeRestrictions)) {
      score += 0.1;
    }
    
    // Verificar disponibilidade do agente (peso: 20%)
    const currentInteractions = await this.getAgentCurrentInteractions(agent.id);
    if (currentInteractions < agent.behavior.maxInteractionsPerTicket) {
      score += 0.2;
    }
    
    return { agent, score: Math.min(score, 1.0) };
  }
  
  /**
   * Avalia as regras de um agente específico
   */
  private async evaluateAgentRules(
    agent: AIAgentConfig,
    context: TicketContext
  ): Promise<RuleEvaluationResult> {
    const matchedConditions: string[] = [];
    let totalConditions = agent.activationRules.conditions.length;
    let matchedCount = 0;
    
    // Avaliar cada condição
    for (const condition of agent.activationRules.conditions) {
      if (this.evaluateCondition(condition, context)) {
        matchedCount++;
        matchedConditions.push(condition.type);
      }
    }
    
    // Calcular confiança baseada na porcentagem de condições atendidas
    const confidence = totalConditions > 0 ? matchedCount / totalConditions : 0;
    
    // Considerar que o agente "matches" se atender pelo menos 50% das condições
    const matches = confidence >= 0.5;
    
    return {
      agentId: agent.id,
      ruleId: `rule_${agent.id}`,
      priority: agent.activationRules.priority,
      confidence,
      matchedConditions,
      matches
    };
  }
  
  /**
   * Avalia uma condição específica
   */
  private evaluateCondition(
    condition: AgentActivationCondition,
    context: TicketContext
  ): boolean {
    try {
      switch (condition.type) {
        case 'priority':
          return this.evaluateStringCondition(
            context.priority,
            condition.operator,
            condition.value as string
          );
          
        case 'message_count':
          // Assumindo que temos essa informação no contexto
          const messageCount = (context as any).messageCount || 0;
          return this.evaluateNumberCondition(
            messageCount,
            condition.operator,
            condition.value as number
          );
          
        case 'keyword':
          return this.evaluateStringCondition(
            context.content,
            'contains',
            condition.value as string
          );
          
        case 'sentiment':
          return this.evaluateStringCondition(
            context.clientSentiment || 'neutral',
            condition.operator,
            condition.value as string
          );
          
        case 'time':
          const currentHour = new Date().getHours();
          return this.evaluateNumberCondition(
            currentHour,
            condition.operator,
            condition.value as number
          );
          
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ [AGENT-SELECTION] Erro ao avaliar condição:', error);
      return false;
    }
  }
  
  private evaluateStringCondition(
    value: string,
    operator: string,
    target: string
  ): boolean {
    const lowerValue = value.toLowerCase();
    const lowerTarget = target.toLowerCase();
    
    switch (operator) {
      case 'equals':
        return lowerValue === lowerTarget;
      case 'contains':
        return lowerValue.includes(lowerTarget);
      default:
        return false;
    }
  }
  
  private evaluateNumberCondition(
    value: number,
    operator: string,
    target: number
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === target;
      case 'greater_than':
        return value > target;
      case 'less_than':
        return value < target;
      default:
        return false;
    }
  }
  
  /**
   * Verifica se o agente está dentro das restrições de tempo
   */
  private isWithinTimeRestrictions(
    timeRestrictions?: {
      workingHours?: { start: string; end: string; };
      weekdays?: number[];
      timezone?: string;
    }
  ): boolean {
    if (!timeRestrictions) {
      return true; // Sem restrições = sempre disponível
    }
    
    const now = new Date();
    
    // Verificar dias da semana
    if (timeRestrictions.weekdays && timeRestrictions.weekdays.length > 0) {
      const currentDay = now.getDay();
      if (!timeRestrictions.weekdays.includes(currentDay)) {
        return false;
      }
    }
    
    // Verificar horário de trabalho
    if (timeRestrictions.workingHours) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      
      const [startHour, startMinute] = timeRestrictions.workingHours.start.split(':').map(Number);
      const [endHour, endMinute] = timeRestrictions.workingHours.end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      if (currentTime < startTime || currentTime > endTime) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Obtém o número atual de interações do agente
   */
  private async getAgentCurrentInteractions(agentId: string): Promise<number> {
    try {
      // Buscar tickets ativos com este agente
      const ticketsRef = collection(db, 'tickets');
      const activeTicketsQuery = query(
        ticketsRef,
        where('assignedAgent.id', '==', agentId),
        where('assignedAgent.type', '==', 'ai'),
        where('status', 'in', ['open', 'pending', 'in_progress'])
      );
      
      const ticketsSnapshot = await getDocs(activeTicketsQuery);
      return ticketsSnapshot.size;
    } catch (error) {
      console.error('❌ [AGENT-SELECTION] Erro ao buscar interações atuais:', error);
      return 0;
    }
  }
  
  /**
   * Determina o estágio da conversa baseado no histórico
   */
  private determineConversationStage(ticket: Ticket): string {
    const messageCount = ticket.messages?.length || 0;
    
    if (messageCount === 0) {
      return 'initial_contact';
    } else if (messageCount <= 3) {
      return 'information_gathering';
    } else if (messageCount <= 10) {
      return 'needs_assessment';
    } else {
      return 'ongoing_support';
    }
  }
  
  /**
   * Analisa o sentimento do cliente baseado nas mensagens
   */
  private analyzeClientSentiment(ticket: Ticket): string {
    // Implementação básica - pode ser melhorada com IA
    const lastMessage = ticket.messages && ticket.messages.length > 0 
      ? ticket.messages[ticket.messages.length - 1]
      : null;
    
    if (!lastMessage || lastMessage.sender !== 'client') {
      return 'neutral';
    }
    
    const content = lastMessage.content.toLowerCase();
    
    // Palavras positivas
    const positiveWords = ['obrigado', 'obrigada', 'excelente', 'ótimo', 'perfeito', 'bom'];
    const hasPositive = positiveWords.some(word => content.includes(word));
    
    // Palavras negativas
    const negativeWords = ['problema', 'erro', 'ruim', 'péssimo', 'horrível', 'cancelar'];
    const hasNegative = negativeWords.some(word => content.includes(word));
    
    if (hasPositive && !hasNegative) {
      return 'positive';
    } else if (hasNegative && !hasPositive) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
}

// Exportar instância singleton
export const agentSelectionService = AgentSelectionService.getInstance();