import type { AIAgentConfig } from '@/components/crm/types';
import type { MessageContext } from './intelligent-agent-selector';

// Interface para configuração de confiança
export interface ConfidenceConfig {
  baseThreshold: number;
  contextAdjustments: {
    urgency: Record<string, number>;
    sentiment: Record<string, number>;
    category: Record<string, number>;
    messageType: Record<string, number>;
  };
  agentSpecific: Record<string, number>;
  fallbackThreshold: number;
  maxAdjustment: number;
}

// Interface para resultado de cálculo de confiança
export interface ConfidenceResult {
  threshold: number;
  baseThreshold: number;
  adjustments: Array<{
    factor: string;
    value: number;
    reason: string;
  }>;
  finalThreshold: number;
  shouldSend: boolean;
  confidence: number;
}

// Configuração padrão de confiança
const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  baseThreshold: 0.5, // Threshold base mais baixo
  contextAdjustments: {
    urgency: {
      urgent: -0.2,   // Reduz threshold para casos urgentes
      high: -0.1,     // Reduz um pouco para alta prioridade
      medium: 0,      // Mantém threshold padrão
      low: 0.1        // Aumenta threshold para baixa prioridade
    },
    sentiment: {
      negative: -0.15, // Reduz threshold para sentimento negativo
      neutral: 0,      // Mantém padrão
      positive: 0.05   // Aumenta levemente para positivo
    },
    category: {
      suporte: -0.1,     // Reduz para suporte (mais importante responder)
      tecnico: 0.05,     // Aumenta para técnico (precisa ser mais preciso)
      vendas: -0.05,     // Reduz levemente para vendas
      atendimento: -0.1, // Reduz para atendimento geral
      financeiro: 0.1    // Aumenta para financeiro (mais sensível)
    },
    messageType: {
      conversation: 0,           // Padrão para texto
      extendedTextMessage: 0,    // Padrão para texto estendido
      imageMessage: 0.1,         // Aumenta para imagens (mais complexo)
      audioMessage: 0.15,        // Aumenta para áudio (mais complexo)
      videoMessage: 0.2,         // Aumenta para vídeo (mais complexo)
      documentMessage: 0.1       // Aumenta para documentos
    }
  },
  agentSpecific: {
    // Configurações específicas por agente (serão carregadas dinamicamente)
  },
  fallbackThreshold: 0.3, // Threshold mínimo para fallback
  maxAdjustment: 0.3      // Máximo de ajuste permitido
};

class DynamicConfidenceService {
  private config: ConfidenceConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIDENCE_CONFIG };
  }

  /**
   * Calcula threshold dinâmico baseado no contexto e agente
   */
  calculateDynamicThreshold(
    agent: AIAgentConfig,
    context: MessageContext,
    agentConfidence: number
  ): ConfidenceResult {
    console.log(`🎯 [DYNAMIC-CONFIDENCE] Calculando threshold dinâmico`);
    console.log(`🎯 [DYNAMIC-CONFIDENCE] Agente: ${agent.name}`);
    console.log(`🎯 [DYNAMIC-CONFIDENCE] Contexto:`, {
      category: context.category,
      urgency: context.urgencyLevel,
      sentiment: context.sentiment,
      messageType: context.messageType
    });

    let threshold = this.config.baseThreshold;
    const adjustments: Array<{ factor: string; value: number; reason: string }> = [];

    // 1. Ajuste específico do agente
    const agentAdjustment = this.getAgentSpecificAdjustment(agent);
    if (agentAdjustment !== 0) {
      threshold += agentAdjustment;
      adjustments.push({
        factor: 'agent',
        value: agentAdjustment,
        reason: `Ajuste específico do agente ${agent.name}`
      });
    }

    // 2. Ajuste por urgência
    if (context.urgencyLevel) {
      const urgencyAdjustment = this.config.contextAdjustments.urgency[context.urgencyLevel] || 0;
      if (urgencyAdjustment !== 0) {
        threshold += urgencyAdjustment;
        adjustments.push({
          factor: 'urgency',
          value: urgencyAdjustment,
          reason: `Urgência: ${context.urgencyLevel}`
        });
      }
    }

    // 3. Ajuste por sentimento
    if (context.sentiment) {
      const sentimentAdjustment = this.config.contextAdjustments.sentiment[context.sentiment] || 0;
      if (sentimentAdjustment !== 0) {
        threshold += sentimentAdjustment;
        adjustments.push({
          factor: 'sentiment',
          value: sentimentAdjustment,
          reason: `Sentimento: ${context.sentiment}`
        });
      }
    }

    // 4. Ajuste por categoria
    if (context.category) {
      const categoryAdjustment = this.config.contextAdjustments.category[context.category] || 0;
      if (categoryAdjustment !== 0) {
        threshold += categoryAdjustment;
        adjustments.push({
          factor: 'category',
          value: categoryAdjustment,
          reason: `Categoria: ${context.category}`
        });
      }
    }

    // 5. Ajuste por tipo de mensagem
    const messageTypeAdjustment = this.config.contextAdjustments.messageType[context.messageType] || 0;
    if (messageTypeAdjustment !== 0) {
      threshold += messageTypeAdjustment;
      adjustments.push({
        factor: 'messageType',
        value: messageTypeAdjustment,
        reason: `Tipo de mensagem: ${context.messageType}`
      });
    }

    // 6. Ajuste por histórico de conversa
    if (context.conversationHistory.length > 5) {
      const historyAdjustment = -0.05; // Reduz threshold para conversas longas
      threshold += historyAdjustment;
      adjustments.push({
        factor: 'history',
        value: historyAdjustment,
        reason: 'Conversa longa (mais contexto disponível)'
      });
    }

    // Limitar ajustes ao máximo permitido
    const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.value, 0);
    if (Math.abs(totalAdjustment) > this.config.maxAdjustment) {
      const limitedAdjustment = Math.sign(totalAdjustment) * this.config.maxAdjustment;
      threshold = this.config.baseThreshold + limitedAdjustment;
      adjustments.push({
        factor: 'limit',
        value: limitedAdjustment - totalAdjustment,
        reason: 'Limitado ao ajuste máximo permitido'
      });
    }

    // Garantir que o threshold não seja menor que o mínimo
    const finalThreshold = Math.max(threshold, this.config.fallbackThreshold);
    const shouldSend = agentConfidence >= finalThreshold;

    const result: ConfidenceResult = {
      threshold: this.config.baseThreshold,
      baseThreshold: this.config.baseThreshold,
      adjustments,
      finalThreshold,
      shouldSend,
      confidence: agentConfidence
    };

    console.log(`🎯 [DYNAMIC-CONFIDENCE] Resultado:`, {
      baseThreshold: this.config.baseThreshold,
      finalThreshold,
      agentConfidence,
      shouldSend,
      adjustmentsCount: adjustments.length
    });

    return result;
  }

  /**
   * Obtém ajuste específico do agente
   */
  private getAgentSpecificAdjustment(agent: AIAgentConfig): number {
    // Verificar configuração específica do agente
    if (this.config.agentSpecific[agent.id]) {
      return this.config.agentSpecific[agent.id];
    }

    // Ajustes baseados no tipo/categoria do agente (inferir do nome se necessário)
    let category = 'geral';
    if (agent.name) {
      const name = agent.name.toLowerCase();
      if (name.includes('suporte') || name.includes('support')) category = 'suporte';
      else if (name.includes('vendas') || name.includes('sales')) category = 'vendas';
      else if (name.includes('tecnico') || name.includes('technical')) category = 'tecnico';
      else if (name.includes('atendimento') || name.includes('customer')) category = 'atendimento';
      else if (name.includes('financeiro') || name.includes('financial')) category = 'financeiro';
    }
    
    switch (category) {
      case 'suporte':
      case 'atendimento':
        return -0.05; // Agentes de suporte podem ter threshold menor
      case 'vendas':
        return -0.03; // Agentes de vendas também
      case 'tecnico':
        return 0.05;  // Agentes técnicos precisam ser mais precisos
      case 'financeiro':
        return 0.1;   // Agentes financeiros precisam ser muito precisos
      default:
        return 0;
    }
  }

  /**
   * Atualiza configuração específica de um agente
   */
  updateAgentConfig(agentId: string, threshold: number): void {
    this.config.agentSpecific[agentId] = threshold;
    console.log(`🎯 [DYNAMIC-CONFIDENCE] Configuração atualizada para agente ${agentId}: ${threshold}`);
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): ConfidenceConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configuração base
   */
  updateConfig(newConfig: Partial<ConfidenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🎯 [DYNAMIC-CONFIDENCE] Configuração atualizada`);
  }

  /**
   * Calcula threshold recomendado baseado em performance histórica
   */
  async calculateRecommendedThreshold(
    agentId: string,
    performanceMetrics?: {
      successRate: number;
      averageConfidence: number;
      totalInteractions: number;
    }
  ): Promise<number> {
    // Se não há métricas, usar padrão
    if (!performanceMetrics) {
      return this.config.baseThreshold;
    }

    const { successRate, averageConfidence, totalInteractions } = performanceMetrics;

    // Calcular threshold baseado na performance
    let recommendedThreshold = this.config.baseThreshold;

    // Ajustar baseado na taxa de sucesso
    if (successRate > 0.9 && totalInteractions > 10) {
      recommendedThreshold -= 0.1; // Agente muito bom, pode ter threshold menor
    } else if (successRate < 0.7 && totalInteractions > 5) {
      recommendedThreshold += 0.1; // Agente com problemas, threshold maior
    }

    // Ajustar baseado na confiança média
    if (averageConfidence > 0.8) {
      recommendedThreshold -= 0.05; // Agente confiante
    } else if (averageConfidence < 0.5) {
      recommendedThreshold += 0.05; // Agente inseguro
    }

    // Limitar entre valores razoáveis
    return Math.max(0.2, Math.min(0.8, recommendedThreshold));
  }

  /**
   * Verifica se deve usar agente de fallback
   */
  shouldUseFallback(
    primaryAgentConfidence: number,
    primaryThreshold: number,
    fallbackAgentConfidence?: number
  ): boolean {
    // Se agente primário não atende o threshold
    if (primaryAgentConfidence < primaryThreshold) {
      // E se há agente de fallback com confiança suficiente
      if (fallbackAgentConfidence && fallbackAgentConfidence >= this.config.fallbackThreshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gera relatório de confiança
   */
  generateConfidenceReport(result: ConfidenceResult): string {
    const lines = [
      `Threshold Base: ${result.baseThreshold}`,
      `Threshold Final: ${result.finalThreshold}`,
      `Confiança do Agente: ${result.confidence}`,
      `Deve Enviar: ${result.shouldSend ? 'SIM' : 'NÃO'}`,
      '',
      'Ajustes Aplicados:'
    ];

    result.adjustments.forEach(adj => {
      const sign = adj.value >= 0 ? '+' : '';
      lines.push(`  ${adj.factor}: ${sign}${adj.value} (${adj.reason})`);
    });

    return lines.join('\n');
  }
}

export const dynamicConfidenceService = new DynamicConfidenceService();
export default dynamicConfidenceService;