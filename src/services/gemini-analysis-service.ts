import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import type { 
  MessageAnalysisInput, 
  AnalysisResult, 
  SmartRecommendation,
  ConversationStage 
} from '@/components/crm/types';

class GeminiAnalysisService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não encontrada nas variáveis de ambiente');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async analyzeConversation(input: MessageAnalysisInput): Promise<AnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(input);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return this.parseGeminiResponse(response);
    } catch (error) {
      console.error('Erro na análise do Gemini:', error);
      return this.getFallbackAnalysis();
    }
  }

  private buildAnalysisPrompt(input: MessageAnalysisInput): string {
    const { messages, clientInfo, conversationContext } = input;
    
    const conversationText = messages
      .slice(-20) // Últimas 20 mensagens
      .map(msg => `${msg.sender}: ${msg.content}`)
      .join('\n');

    return `
Você é um assistente de análise de atendimento ao cliente especializado em CRM.

Analise a seguinte conversa e forneça recomendações de próximas ações:

**Informações do Cliente:**
- Nome: ${clientInfo.name}
- Telefone: ${clientInfo.phone}
- Email: ${clientInfo.email || 'Não informado'}
- Empresa: ${clientInfo.company || 'Não informado'}

**Contexto da Conversa:**
- Duração: ${conversationContext.duration} minutos
- Total de mensagens: ${conversationContext.messageCount}
- Última mensagem do cliente: ${conversationContext.lastClientMessage}
- Interações anteriores: ${conversationContext.previousInteractions}

**Histórico das Últimas 20 Mensagens:**
${conversationText}

**Instruções:**
1. Identifique o estágio atual da conversa
2. Analise o sentimento do cliente
3. Determine o nível de urgência
4. Identifique tópicos-chave
5. Gere até 3 recomendações de ação

**Tipos de Ação Disponíveis:**
- call: Ligar para o cliente
- proposal: Enviar proposta comercial
- demo: Agendar demonstração

**Formato de Resposta (JSON):**
{
  "conversationStage": "initial_contact|information_gathering|needs_assessment|proposal_discussion|negotiation|closing|post_sale|support",
  "clientSentiment": "positive|neutral|negative",
  "urgencyLevel": "low|medium|high",
  "keyTopics": ["tópico1", "tópico2"],
  "recommendations": [
    {
      "action": "call|proposal|demo",
      "title": "Título da recomendação",
      "description": "Descrição detalhada",
      "confidence": 85,
      "reasoning": "Justificativa da recomendação",
      "priority": "low|medium|high",
      "suggestedTiming": "immediate|within_hour|within_day"
    }
  ],
  "summary": "Resumo da análise",
  "confidence": 90
}
`;
  }

  private parseGeminiResponse(response: string): AnalysisResult {
    try {
      // Remove markdown code blocks se existirem
      const cleanResponse = response.replace(/```json\n?|```\n?/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      
      // Adiciona IDs e timestamps às recomendações
      const recommendations: SmartRecommendation[] = parsed.recommendations.map((rec: any, index: number) => ({
        id: `rec_${Date.now()}_${index}`,
        ...rec,
        createdAt: new Date()
      }));

      return {
        ...parsed,
        recommendations
      };
    } catch (error) {
      console.error('Erro ao parsear resposta do Gemini:', error);
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(): AnalysisResult {
    return {
      conversationStage: 'information_gathering' as ConversationStage,
      clientSentiment: 'neutral',
      urgencyLevel: 'medium',
      keyTopics: ['Atendimento geral'],
      recommendations: [
        {
          id: uuidv4(),
          action: 'call',
          title: 'Entrar em contato',
          description: 'Recomendamos entrar em contato para dar continuidade ao atendimento.',
          confidence: 50,
          reasoning: 'Análise automática não disponível no momento.',
          priority: 'medium',
          suggestedTiming: 'within_hour',
          createdAt: new Date()
        }
      ],
      summary: 'Análise simplificada - sistema de IA temporariamente indisponível.',
      confidence: 50
    };
  }
}

export const geminiAnalysisService = new GeminiAnalysisService();