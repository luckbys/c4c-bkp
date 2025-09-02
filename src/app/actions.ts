'use server';

import { summarizeChatHistory, type SummarizeChatHistoryInput } from '@/ai/flows/summarize-chat-history';
import { getTicketInsights, type GetTicketInsightsInput } from '@/ai/flows/get-ticket-insights';

export async function summarizeChatHistoryAction(input: SummarizeChatHistoryInput) {
  try {
    // Artificial delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = await summarizeChatHistory(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in summarizeChatHistoryAction:', error);
    return { success: false, error: 'Falha ao resumir o histórico de chat.' };
  }
}

export async function getTicketInsightsAction(input: GetTicketInsightsInput) {
  try {
    // Artificial delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = await getTicketInsights(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in getTicketInsightsAction:', error);
    return { success: false, error: 'Falha ao obter insights do ticket.' };
  }
}
