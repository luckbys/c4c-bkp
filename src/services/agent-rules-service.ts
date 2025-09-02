import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface ActivationRule {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  conditions: {
    messageTypes?: string[]; // 'text', 'image', 'audio', 'video', 'document'
    keywords?: string[]; // palavras-chave que ativam o agente
    timeRange?: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
    weekdays?: number[]; // 0-6 (Sunday-Saturday)
    ticketPriority?: string[]; // 'low', 'medium', 'high', 'urgent'
    clientTags?: string[]; // tags do cliente
    instanceIds?: string[]; // instâncias específicas
    conversationStage?: string[]; // estágio da conversa
    clientSentiment?: string[]; // sentimento do cliente
  };
  priority: number; // 1-10 (maior número = maior prioridade)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TicketData {
  messageType: string;
  content: string;
  timestamp: Date;
  priority: string;
  clientTags: string[];
  instanceId: string;
  conversationStage?: string;
  clientSentiment?: string;
  ticketId: string;
}

interface RuleEvaluationResult {
  agentId: string;
  ruleId: string;
  priority: number;
  confidence: number;
  matchedConditions: string[];
}

class AgentRulesService {
  private readonly collectionName = 'agent_rules';

  async createRule(ruleData: Omit<ActivationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...ruleData,
        createdAt: now,
        updatedAt: now
      });
      
      console.log(`✅ [RULES] Regra criada com sucesso: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      throw error;
    }
  }

  async updateRule(ruleId: string, ruleData: Partial<ActivationRule>): Promise<void> {
    try {
      const ruleRef = doc(db, this.collectionName, ruleId);
      await updateDoc(ruleRef, {
        ...ruleData,
        updatedAt: new Date()
      });
      
      console.log(`✅ [RULES] Regra atualizada: ${ruleId}`);
    } catch (error) {
      console.error(`Erro ao atualizar regra ${ruleId}:`, error);
      throw error;
    }
  }

  async deleteRule(ruleId: string): Promise<void> {
    try {
      const ruleRef = doc(db, this.collectionName, ruleId);
      await deleteDoc(ruleRef);
      
      console.log(`✅ [RULES] Regra deletada: ${ruleId}`);
    } catch (error) {
      console.error(`Erro ao deletar regra ${ruleId}:`, error);
      throw error;
    }
  }

  async getRulesByAgent(agentId: string): Promise<ActivationRule[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('agentId', '==', agentId),
        where('active', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const rules: ActivationRule[] = [];
      
      querySnapshot.forEach((doc) => {
        rules.push({
          id: doc.id,
          ...doc.data()
        } as ActivationRule);
      });
      
      return rules;
    } catch (error) {
      console.error(`Erro ao buscar regras do agente ${agentId}:`, error);
      return [];
    }
  }

  async getActiveRules(): Promise<ActivationRule[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('active', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const rules: ActivationRule[] = [];
      
      querySnapshot.forEach((doc) => {
        rules.push({
          id: doc.id,
          ...doc.data()
        } as ActivationRule);
      });
      
      // Ordenar por prioridade (maior primeiro)
      return rules.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Erro ao buscar regras ativas:', error);
      return [];
    }
  }

  async evaluateRules(ticketData: TicketData): Promise<RuleEvaluationResult[]> {
    try {
      console.log(`🔍 [RULES] Avaliando regras para ticket ${ticketData.ticketId}:`, {
        messageType: ticketData.messageType,
        contentLength: ticketData.content.length,
        priority: ticketData.priority,
        instanceId: ticketData.instanceId
      });
      
      const rules = await this.getActiveRules();
      const matchingResults: RuleEvaluationResult[] = [];
      
      for (const rule of rules) {
        const evaluation = this.evaluateRule(rule, ticketData);
        if (evaluation.matches) {
          matchingResults.push({
            agentId: rule.agentId,
            ruleId: rule.id,
            priority: rule.priority,
            confidence: evaluation.confidence,
            matchedConditions: evaluation.matchedConditions
          });
        }
      }
      
      // Ordenar por prioridade e confiança
      matchingResults.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.confidence - a.confidence;
      });
      
      console.log(`✅ [RULES] Avaliação concluída:`, {
        totalRules: rules.length,
        matchingRules: matchingResults.length,
        topAgent: matchingResults[0]?.agentId || 'none'
      });
      
      return matchingResults;
    } catch (error) {
      console.error('Erro ao avaliar regras:', error);
      return [];
    }
  }

  private evaluateRule(rule: ActivationRule, ticketData: TicketData): {
    matches: boolean;
    confidence: number;
    matchedConditions: string[];
  } {
    const { conditions } = rule;
    const matchedConditions: string[] = [];
    let totalConditions = 0;
    let matchedCount = 0;
    
    // Verificar tipo de mensagem
    if (conditions.messageTypes && conditions.messageTypes.length > 0) {
      totalConditions++;
      if (conditions.messageTypes.includes(ticketData.messageType)) {
        matchedCount++;
        matchedConditions.push('messageType');
      }
    }
    
    // Verificar palavras-chave
    if (conditions.keywords && conditions.keywords.length > 0) {
      totalConditions++;
      const hasKeyword = conditions.keywords.some(keyword => 
        ticketData.content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (hasKeyword) {
        matchedCount++;
        matchedConditions.push('keywords');
      }
    }
    
    // Verificar horário
    if (conditions.timeRange) {
      totalConditions++;
      const now = new Date(ticketData.timestamp);
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime >= conditions.timeRange.start && currentTime <= conditions.timeRange.end) {
        matchedCount++;
        matchedConditions.push('timeRange');
      }
    }
    
    // Verificar dias da semana
    if (conditions.weekdays && conditions.weekdays.length > 0) {
      totalConditions++;
      const dayOfWeek = new Date(ticketData.timestamp).getDay();
      if (conditions.weekdays.includes(dayOfWeek)) {
        matchedCount++;
        matchedConditions.push('weekdays');
      }
    }
    
    // Verificar prioridade do ticket
    if (conditions.ticketPriority && conditions.ticketPriority.length > 0) {
      totalConditions++;
      if (conditions.ticketPriority.includes(ticketData.priority)) {
        matchedCount++;
        matchedConditions.push('ticketPriority');
      }
    }
    
    // Verificar tags do cliente
    if (conditions.clientTags && conditions.clientTags.length > 0) {
      totalConditions++;
      const hasTag = conditions.clientTags.some(tag => ticketData.clientTags.includes(tag));
      if (hasTag) {
        matchedCount++;
        matchedConditions.push('clientTags');
      }
    }
    
    // Verificar instância
    if (conditions.instanceIds && conditions.instanceIds.length > 0) {
      totalConditions++;
      if (conditions.instanceIds.includes(ticketData.instanceId)) {
        matchedCount++;
        matchedConditions.push('instanceIds');
      }
    }
    
    // Verificar estágio da conversa
    if (conditions.conversationStage && conditions.conversationStage.length > 0 && ticketData.conversationStage) {
      totalConditions++;
      if (conditions.conversationStage.includes(ticketData.conversationStage)) {
        matchedCount++;
        matchedConditions.push('conversationStage');
      }
    }
    
    // Verificar sentimento do cliente
    if (conditions.clientSentiment && conditions.clientSentiment.length > 0 && ticketData.clientSentiment) {
      totalConditions++;
      if (conditions.clientSentiment.includes(ticketData.clientSentiment)) {
        matchedCount++;
        matchedConditions.push('clientSentiment');
      }
    }
    
    // Se não há condições definidas, não ativar
    if (totalConditions === 0) {
      return { matches: false, confidence: 0, matchedConditions: [] };
    }
    
    // Calcular confiança baseada na porcentagem de condições atendidas
    const confidence = matchedCount / totalConditions;
    
    // Considerar como match se pelo menos 70% das condições foram atendidas
    const matches = confidence >= 0.7;
    
    return { matches, confidence, matchedConditions };
  }

  async createDefaultRules(agentId: string): Promise<void> {
    try {
      // Regra para horário comercial
      await this.createRule({
        agentId,
        name: 'Horário Comercial',
        description: 'Ativar agente durante horário comercial',
        conditions: {
          timeRange: {
            start: '09:00',
            end: '18:00'
          },
          weekdays: [1, 2, 3, 4, 5] // Segunda a sexta
        },
        priority: 5,
        active: true
      });
      
      // Regra para palavras-chave de vendas
      await this.createRule({
        agentId,
        name: 'Palavras-chave de Vendas',
        description: 'Ativar para mensagens relacionadas a vendas',
        conditions: {
          keywords: ['preço', 'comprar', 'produto', 'vendas', 'orçamento', 'valor'],
          messageTypes: ['text']
        },
        priority: 7,
        active: true
      });
      
      // Regra para tickets de alta prioridade
      await this.createRule({
        agentId,
        name: 'Alta Prioridade',
        description: 'Ativar para tickets de alta prioridade',
        conditions: {
          ticketPriority: ['high', 'urgent']
        },
        priority: 9,
        active: true
      });
      
      console.log(`✅ [RULES] Regras padrão criadas para agente ${agentId}`);
    } catch (error) {
      console.error(`Erro ao criar regras padrão para agente ${agentId}:`, error);
      throw error;
    }
  }
}

export const agentRulesService = new AgentRulesService();
export type { ActivationRule, TicketData, RuleEvaluationResult };