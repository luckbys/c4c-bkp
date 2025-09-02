'use server';

/**
 * @fileOverview A flow that provides AI-powered insights for a support ticket.
 *
 * - getTicketInsights - A function that analyzes ticket data.
 * - GetTicketInsightsInput - The input type for the getTicketInsights function.
 * - GetTicketInsightsOutput - The return type for the getTicketInsights function.
 */

// Tipos básicos sem dependências externas
export interface GetTicketInsightsInput {
  chatHistory: string;
}

export interface GetTicketInsightsOutput {
  summary: string;
  sentiment: 'Positivo' | 'Negativo' | 'Neutro';
  nextBestAction: string;
}


export async function getTicketInsights(input: GetTicketInsightsInput): Promise<GetTicketInsightsOutput> {
  // Implementação temporária sem Genkit para evitar problemas de build
  try {
    // Simular processamento de IA
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const chatHistory = input.chatHistory.toLowerCase();
    
    // Análise básica de sentimento
    let sentiment: 'Positivo' | 'Negativo' | 'Neutro' = 'Neutro';
    const positiveWords = ['obrigado', 'ótimo', 'excelente', 'perfeito', 'satisfeito'];
    const negativeWords = ['problema', 'erro', 'ruim', 'insatisfeito', 'reclamação'];
    
    const hasPositive = positiveWords.some(word => chatHistory.includes(word));
    const hasNegative = negativeWords.some(word => chatHistory.includes(word));
    
    if (hasPositive && !hasNegative) sentiment = 'Positivo';
    else if (hasNegative && !hasPositive) sentiment = 'Negativo';
    
    // Gerar resumo e próxima ação baseado no sentimento
    const messageCount = input.chatHistory.split('\n').length;
    const summary = `Conversa com ${messageCount} mensagens. Cliente demonstra sentimento ${sentiment.toLowerCase()}.`;
    
    let nextBestAction = 'Continuar acompanhamento do ticket.';
    if (sentiment === 'Negativo') {
      nextBestAction = 'Priorizar resolução e oferecer compensação se necessário.';
    } else if (sentiment === 'Positivo') {
      nextBestAction = 'Finalizar atendimento e solicitar avaliação.';
    }
    
    return {
      summary,
      sentiment,
      nextBestAction
    };
  } catch (error) {
    console.error('Erro ao analisar ticket:', error);
    return {
      summary: 'Erro ao processar insights do ticket.',
      sentiment: 'Neutro',
      nextBestAction: 'Revisar ticket manualmente.'
    };
  }
}
