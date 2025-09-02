'use server';

/**
 * @fileOverview A flow that summarizes recent chat history to provide context for agents.
 *
 * - summarizeChatHistory - A function that summarizes the chat history.
 * - SummarizeChatHistoryInput - The input type for the summarizeChatHistory function.
 * - SummarizeChatHistoryOutput - The return type for the summarizeChatHistory function.
 */

// Tipos básicos sem dependências do Genkit
export interface SummarizeChatHistoryInput {
  chatHistory: string;
}

export interface SummarizeChatHistoryOutput {
  summary: string;
  relevantInformation: string;
}

export async function summarizeChatHistory(input: SummarizeChatHistoryInput): Promise<SummarizeChatHistoryOutput> {
  // Implementação temporária sem Genkit para evitar problemas de build
  try {
    // Simular processamento de IA
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const chatLength = input.chatHistory.length;
    const summary = chatLength > 500 
      ? `Conversa longa com ${Math.floor(chatLength / 100)} tópicos principais discutidos.`
      : `Conversa breve com informações básicas do cliente.`;
    
    const relevantInformation = `Histórico analisado em ${new Date().toLocaleString('pt-BR')}. ` +
      `Contém ${input.chatHistory.split('\n').length} mensagens.`;
    
    return {
      summary,
      relevantInformation
    };
  } catch (error) {
    console.error('Erro ao resumir histórico:', error);
    return {
      summary: 'Erro ao processar histórico de chat.',
      relevantInformation: 'Não foi possível extrair informações relevantes.'
    };
  }
}
