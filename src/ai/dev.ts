import { config } from 'dotenv';
config();

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Configurar Genkit
const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});

// Definir fluxos para o dashboard
const summarizeChatHistory = ai.defineFlow(
  {
    name: 'summarizeChatHistory',
    inputSchema: z.object({
      chatHistory: z.string(),
    }),
    outputSchema: z.object({
      summary: z.string(),
      relevantInformation: z.string(),
    }),
  },
  async (input) => {
    // Simular processamento
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
  }
);

const getTicketInsights = ai.defineFlow(
  {
    name: 'getTicketInsights',
    inputSchema: z.object({
      chatHistory: z.string(),
    }),
    outputSchema: z.object({
      summary: z.string(),
      sentiment: z.enum(['Positivo', 'Negativo', 'Neutro']),
      nextBestAction: z.string(),
    }),
  },
  async (input) => {
    // Simular processamento
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
  }
);

console.log('Genkit flows configured successfully');
