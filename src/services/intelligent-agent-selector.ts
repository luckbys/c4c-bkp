import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { AIAgentConfig } from '@/components/crm/types';

// Interface para contexto da mensagem
export interface MessageContext {
  content: string;
  messageType: string;
  clientPhone: string;
  instanceId: string;
  timestamp: Date;
  conversationHistory: string[];
  clientName?: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
  sentiment?: 'positive' | 'neutral' | 'negative';
  category?: string;
  keywords?: string[];
}

// Interface para resultado de scoring
export interface AgentScore {
  agent: AIAgentConfig;
  score: number;
  confidence: number;
  reasons: string[];
  matchedKeywords: string[];
  categoryMatch: boolean;
  sentimentMatch: boolean;
}

// Palavras-chave por categoria
const CATEGORY_KEYWORDS = {
  vendas: ['comprar', 'preço', 'valor', 'orçamento', 'produto', 'serviço', 'venda', 'desconto', 'promoção', 'oferta'],
  suporte: ['problema', 'erro', 'ajuda', 'dúvida', 'não funciona', 'bug', 'falha', 'suporte', 'assistência'],
  tecnico: ['configurar', 'instalar', 'setup', 'técnico', 'integração', 'api', 'código', 'sistema', 'servidor'],
  atendimento: ['informação', 'horário', 'funcionamento', 'localização', 'contato', 'telefone', 'endereço'],
  financeiro: ['pagamento', 'cobrança', 'fatura', 'boleto', 'cartão', 'pix', 'financeiro', 'valor']
};

// Palavras de urgência
const URGENCY_KEYWORDS = {
  urgent: ['urgente', 'emergência', 'imediato', 'agora', 'rápido', 'crítico'],
  high: ['importante', 'prioridade', 'preciso', 'necessário'],
  medium: ['quando', 'possível', 'gostaria'],
  low: ['informação', 'curiosidade', 'talvez']
};

// Palavras de sentimento
const SENTIMENT_KEYWORDS = {
  positive: ['obrigado', 'ótimo', 'excelente', 'perfeito', 'satisfeito', 'feliz', 'bom'],
  negative: ['ruim', 'péssimo', 'insatisfeito', 'problema', 'reclamação', 'irritado', 'chateado'],
  neutral: ['informação', 'dúvida', 'pergunta', 'como', 'quando', 'onde']
};

class IntelligentAgentSelector {
  /**
   * Seleciona o melhor agente baseado no contexto da mensagem
   */
  async selectBestAgent(context: MessageContext): Promise<AgentScore | null> {
    try {
      console.log(`🧠 [INTELLIGENT-SELECTOR] Iniciando seleção inteligente de agente`);
      console.log(`🧠 [INTELLIGENT-SELECTOR] Contexto:`, {
        contentLength: context.content.length,
        messageType: context.messageType,
        hasHistory: context.conversationHistory.length > 0
      });

      // Enriquecer contexto com análises
      const enrichedContext = await this.enrichContext(context);
      
      // Buscar agentes disponíveis
      const availableAgents = await this.getAvailableAgents();
      
      if (availableAgents.length === 0) {
        console.log(`🧠 [INTELLIGENT-SELECTOR] ❌ Nenhum agente disponível`);
        return null;
      }

      // Calcular scores para cada agente
      const agentScores = await Promise.all(
        availableAgents.map(agent => this.calculateAgentScore(agent, enrichedContext))
      );

      // Ordenar por score (maior primeiro)
      agentScores.sort((a, b) => b.score - a.score);

      console.log(`🧠 [INTELLIGENT-SELECTOR] Scores calculados:`, 
        agentScores.map(s => ({ 
          name: s.agent.name, 
          score: s.score, 
          confidence: s.confidence,
          reasons: s.reasons.slice(0, 2) // Primeiras 2 razões
        }))
      );

      const bestAgent = agentScores[0];
      
      // Verificar se o melhor agente tem score mínimo
      if (bestAgent.score < 0.3) {
        console.log(`🧠 [INTELLIGENT-SELECTOR] ❌ Melhor agente tem score muito baixo: ${bestAgent.score}`);
        return null;
      }

      console.log(`🧠 [INTELLIGENT-SELECTOR] ✅ Agente selecionado: ${bestAgent.agent.name} (score: ${bestAgent.score})`);
      return bestAgent;

    } catch (error) {
      console.error(`❌ [INTELLIGENT-SELECTOR] Erro na seleção:`, error);
      return null;
    }
  }

  /**
   * Enriquece o contexto com análises automáticas
   */
  private async enrichContext(context: MessageContext): Promise<MessageContext> {
    const content = context.content.toLowerCase();
    
    // Detectar categoria
    const category = this.detectCategory(content);
    
    // Detectar urgência
    const urgencyLevel = this.detectUrgency(content);
    
    // Detectar sentimento
    const sentiment = this.detectSentiment(content);
    
    // Extrair keywords relevantes
    const keywords = this.extractKeywords(content);

    return {
      ...context,
      category,
      urgencyLevel,
      sentiment,
      keywords
    };
  }

  /**
   * Detecta a categoria da mensagem
   */
  private detectCategory(content: string): string {
    let maxMatches = 0;
    let detectedCategory = 'geral';

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matches = keywords.filter(keyword => content.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = category;
      }
    }

    return detectedCategory;
  }

  /**
   * Detecta o nível de urgência
   */
  private detectUrgency(content: string): 'low' | 'medium' | 'high' | 'urgent' {
    for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return level as 'low' | 'medium' | 'high' | 'urgent';
      }
    }
    return 'medium'; // Padrão
  }

  /**
   * Detecta o sentimento da mensagem
   */
  private detectSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    for (const [sentiment, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return sentiment as 'positive' | 'neutral' | 'negative';
      }
    }
    return 'neutral'; // Padrão
  }

  /**
   * Extrai keywords relevantes
   */
  private extractKeywords(content: string): string[] {
    const allKeywords = Object.values(CATEGORY_KEYWORDS).flat();
    return allKeywords.filter(keyword => content.includes(keyword));
  }

  /**
   * Busca agentes disponíveis
   */
  private async getAvailableAgents(): Promise<AIAgentConfig[]> {
    try {
      const q = query(
        collection(db, 'ai_agents'),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(q);
      const agents: AIAgentConfig[] = [];
      
      querySnapshot.forEach((doc) => {
        agents.push({ id: doc.id, ...doc.data() } as AIAgentConfig);
      });
      
      return agents;
    } catch (error) {
      console.error('Erro ao buscar agentes:', error);
      return [];
    }
  }

  /**
   * Calcula score de compatibilidade para um agente
   */
  private async calculateAgentScore(
    agent: AIAgentConfig, 
    context: MessageContext
  ): Promise<AgentScore> {
    let score = 0;
    let confidence = 0;
    const reasons: string[] = [];
    const matchedKeywords: string[] = [];
    let categoryMatch = false;
    let sentimentMatch = false;

    // 1. Compatibilidade de categoria (peso: 40%)
    // Inferir categoria do nome/descrição do agente se não tiver metadata
    let agentCategory = 'geral';
    if (agent.name) {
      const name = agent.name.toLowerCase();
      if (name.includes('suporte') || name.includes('support')) agentCategory = 'suporte';
      else if (name.includes('vendas') || name.includes('sales')) agentCategory = 'vendas';
      else if (name.includes('tecnico') || name.includes('technical')) agentCategory = 'tecnico';
      else if (name.includes('atendimento') || name.includes('customer')) agentCategory = 'atendimento';
    }
    
    if (context.category) {
      if (agentCategory === context.category || 
          (agentCategory === 'atendimento' && context.category === 'geral')) {
        score += 0.4;
        categoryMatch = true;
        reasons.push(`Categoria compatível: ${context.category}`);
      }
    }

    // 2. Análise de keywords (peso: 30%)
    if (context.keywords && context.keywords.length > 0) {
      const agentKeywords = this.getAgentKeywords(agent);
      const matches = context.keywords.filter(k => 
        agentKeywords.some(ak => ak.toLowerCase().includes(k.toLowerCase()))
      );
      
      if (matches.length > 0) {
        const keywordScore = Math.min(matches.length / context.keywords.length, 1) * 0.3;
        score += keywordScore;
        matchedKeywords.push(...matches);
        reasons.push(`Keywords compatíveis: ${matches.join(', ')}`);
      }
    }

    // 3. Compatibilidade de sentimento (peso: 15%)
    if (context.sentiment) {
      // Inferir estilo de resposta do nome/descrição se não tiver behavior
      let responseStyle = 'professional';
      if (agent.name) {
        const name = agent.name.toLowerCase();
        if (name.includes('suporte') || name.includes('support')) responseStyle = 'supportive';
        else if (name.includes('vendas') || name.includes('sales')) responseStyle = 'friendly';
        else if (name.includes('tecnico') || name.includes('technical')) responseStyle = 'technical';
      }
      
      const styleMatch = this.checkSentimentStyleMatch(context.sentiment, responseStyle);
      if (styleMatch) {
        score += 0.15;
        sentimentMatch = true;
        reasons.push(`Estilo de resposta compatível com sentimento ${context.sentiment}`);
      }
    }

    // 4. Urgência e disponibilidade (peso: 10%)
    if (context.urgencyLevel === 'urgent' || context.urgencyLevel === 'high') {
      const priority = agent.activationRules?.priority || 5;
      if (priority >= 7) {
        score += 0.1;
        reasons.push('Agente prioritário para casos urgentes');
      }
    }

    // 5. Histórico de performance (peso: 5%)
    // TODO: Implementar baseado em métricas históricas
    score += 0.05; // Score base por estar ativo

    // Calcular confiança baseada na qualidade dos matches
    confidence = this.calculateConfidence(score, reasons.length, matchedKeywords.length);

    return {
      agent,
      score: Math.min(score, 1), // Máximo 1.0
      confidence,
      reasons,
      matchedKeywords,
      categoryMatch,
      sentimentMatch
    };
  }

  /**
   * Extrai keywords do agente
   */
  private getAgentKeywords(agent: AIAgentConfig): string[] {
    const keywords: string[] = [];
    
    // Keywords do nome e descrição
    if (agent.name) keywords.push(...agent.name.toLowerCase().split(' '));
    if (agent.description) keywords.push(...agent.description.toLowerCase().split(' '));
    
    // Keywords do prompt
    if (agent.prompt) keywords.push(...agent.prompt.toLowerCase().split(' ').slice(0, 10));
    
    // Keywords das regras de ativação
    if (agent.activationRules?.conditions) {
      agent.activationRules.conditions.forEach(condition => {
        if (condition.type === 'keyword' && typeof condition.value === 'string') {
          keywords.push(condition.value.toLowerCase());
        }
      });
    }
    
    return keywords;
  }

  /**
   * Verifica compatibilidade entre sentimento e estilo de resposta
   */
  private checkSentimentStyleMatch(sentiment: string, responseStyle: string): boolean {
    const styleMap: Record<string, string[]> = {
      'empathetic': ['negative'],
      'professional': ['neutral', 'positive'],
      'friendly': ['positive', 'neutral'],
      'technical': ['neutral'],
      'supportive': ['negative', 'neutral']
    };
    
    return styleMap[responseStyle]?.includes(sentiment) || false;
  }

  /**
   * Calcula confiança baseada na qualidade dos matches
   */
  private calculateConfidence(score: number, reasonsCount: number, keywordsCount: number): number {
    let confidence = score; // Base na pontuação
    
    // Bonus por múltiplas razões
    if (reasonsCount >= 3) confidence += 0.1;
    if (reasonsCount >= 2) confidence += 0.05;
    
    // Bonus por keywords
    if (keywordsCount >= 2) confidence += 0.1;
    if (keywordsCount >= 1) confidence += 0.05;
    
    return Math.min(confidence, 1);
  }

  /**
   * Obtém agentes de fallback
   */
  async getFallbackAgents(excludeAgentId?: string): Promise<AIAgentConfig[]> {
    try {
      const agents = await this.getAvailableAgents();
      return agents
        .filter(agent => agent.id !== excludeAgentId)
        .filter(agent => agent.metadata?.tags?.includes('fallback') || 
                        agent.metadata?.category === 'atendimento')
        .slice(0, 2); // Máximo 2 fallbacks
    } catch (error) {
      console.error('Erro ao buscar agentes de fallback:', error);
      return [];
    }
  }
}

export const intelligentAgentSelector = new IntelligentAgentSelector();
export default intelligentAgentSelector;