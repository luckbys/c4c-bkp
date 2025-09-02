import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MessageAnalysisInput, AnalysisResult, SmartRecommendation, ConversationStage } from '@/components/crm/types';

// Cache inteligente para análises
interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
  messageCount: number;
  lastMessageTime: number;
  conversationHash: string;
  similarityScore?: number;
}

const analysisCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
const SIMILARITY_THRESHOLD = 0.8; // 80% de similaridade

// Limpeza periódica do cache
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key);
    }
  }
}, CACHE_DURATION);

// Função para gerar hash do conteúdo da conversa
function generateConversationHash(messages: any[], clientInfo: any): string {
  const content = messages.map(m => `${m.fromMe ? 'agent' : 'client'}:${m.body || ''}`).join('|') + `|${clientInfo.id}`;
  return Buffer.from(content).toString('base64').slice(0, 32);
}

// Função para calcular similaridade entre conversas
function calculateSimilarity(messages1: any[], messages2: any[]): number {
  const text1 = messages1.map(m => m.body?.toLowerCase() || '').join(' ');
  const text2 = messages2.map(m => m.body?.toLowerCase() || '').join(' ');
  
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Função para buscar cache similar
function findSimilarCache(messages: any[], clientInfo: any): CacheEntry | null {
  const currentHash = generateConversationHash(messages, clientInfo);
  
  // Primeiro, buscar cache exato
  if (analysisCache.has(currentHash)) {
    return analysisCache.get(currentHash)!;
  }
  
  // Buscar cache similar para o mesmo cliente
  let bestMatch: CacheEntry | null = null;
  let bestSimilarity = 0;
  
  for (const [hash, entry] of analysisCache.entries()) {
    if (hash.includes(clientInfo.id)) {
      // Reconstruir mensagens do cache seria complexo, então usamos uma heurística simples
      const sizeSimilarity = Math.min(messages.length, entry.messageCount) / Math.max(messages.length, entry.messageCount);
      
      if (sizeSimilarity > SIMILARITY_THRESHOLD && sizeSimilarity > bestSimilarity) {
        bestSimilarity = sizeSimilarity;
        bestMatch = entry;
      }
    }
  }
  
  return bestMatch;
}

// Função para analisar padrões temporais
function analyzeTemporalPatterns(messages: any[]) {
  const now = new Date();
  const messagesByHour = new Map<number, number>();
  const responseTimePatterns: number[] = [];
  
  let lastClientMessage: Date | null = null;
  
  messages.forEach((msg, index) => {
    const msgTime = new Date(msg.timestamp);
    const hour = msgTime.getHours();
    messagesByHour.set(hour, (messagesByHour.get(hour) || 0) + 1);
    
    if (msg.sender === 'client') {
      lastClientMessage = msgTime;
    } else if (msg.sender === 'agent' && lastClientMessage) {
      const responseTime = msgTime.getTime() - lastClientMessage.getTime();
      responseTimePatterns.push(responseTime / 1000 / 60); // em minutos
    }
  });
  
  const avgResponseTime = responseTimePatterns.length > 0 
    ? responseTimePatterns.reduce((a, b) => a + b, 0) / responseTimePatterns.length 
    : 0;
    
  const peakHour = Array.from(messagesByHour.entries())
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 9;
    
  const lastActivityHours = messages.length > 0 
    ? (now.getTime() - new Date(messages[messages.length - 1].timestamp).getTime()) / (1000 * 60 * 60)
    : 0;
    
  return {
    avgResponseTime,
    peakHour,
    messageFrequency: messages.length / Math.max(1, (now.getTime() - new Date(messages[0]?.timestamp || now).getTime()) / (1000 * 60 * 60)),
    lastActivityHours
  };
}

// Função para analisar padrões de comunicação
function analyzeCommunicationPatterns(messages: any[]) {
  const clientMessages = messages.filter(m => m.sender === 'client');
  const agentMessages = messages.filter(m => m.sender === 'agent');
  
  const avgClientMessageLength = clientMessages.length > 0 
    ? clientMessages.reduce((sum, m) => sum + m.content.length, 0) / clientMessages.length 
    : 0;
    
  const avgAgentMessageLength = agentMessages.length > 0 
    ? agentMessages.reduce((sum, m) => sum + m.content.length, 0) / agentMessages.length 
    : 0;
    
  // Análise de palavras-chave de urgência
  const urgencyKeywords = ['urgente', 'rápido', 'imediato', 'hoje', 'agora', 'problema', 'erro', 'falha'];
  const positiveKeywords = ['obrigado', 'perfeito', 'ótimo', 'excelente', 'satisfeito', 'gostei'];
  const negativeKeywords = ['problema', 'ruim', 'insatisfeito', 'cancelar', 'reclamar', 'difícil'];
  
  const urgencyScore = clientMessages.reduce((score, m) => {
    const content = m.content.toLowerCase();
    return score + urgencyKeywords.filter(keyword => content.includes(keyword)).length;
  }, 0);
  
  const positiveScore = clientMessages.reduce((score, m) => {
    const content = m.content.toLowerCase();
    return score + positiveKeywords.filter(keyword => content.includes(keyword)).length;
  }, 0);
  
  const negativeScore = clientMessages.reduce((score, m) => {
    const content = m.content.toLowerCase();
    return score + negativeKeywords.filter(keyword => content.includes(keyword)).length;
  }, 0);
  
  return {
    clientToAgentRatio: clientMessages.length / Math.max(1, agentMessages.length),
    avgClientMessageLength,
    avgAgentMessageLength,
    urgencyScore,
    positiveScore,
    negativeScore,
    hasQuestions: clientMessages.some(m => m.content.includes('?')),
    hasNumbers: clientMessages.some(m => /\d/.test(m.content))
  };
}

// Função para analisar intenção de compra do cliente
function analyzeCustomerIntent(messages: any[]) {
  const clientMessages = messages.filter(msg => msg.fromMe === false);
  const allText = clientMessages.map(msg => msg.body?.toLowerCase() || '').join(' ');
  
  // Palavras-chave de intenção de compra
  const buyingKeywords = [
    'comprar', 'adquirir', 'contratar', 'assinar', 'fechar', 'negócio',
    'preço', 'valor', 'custo', 'investimento', 'orçamento', 'proposta',
    'quando', 'prazo', 'entrega', 'disponível', 'estoque',
    'desconto', 'promoção', 'condições', 'pagamento', 'parcelamento'
  ];
  
  const interestKeywords = [
    'interessado', 'gostaria', 'quero', 'preciso', 'necessito',
    'informações', 'detalhes', 'especificações', 'características',
    'demonstração', 'teste', 'trial', 'exemplo'
  ];
  
  let buyingScore = 0;
  const interestSignals = [];
  
  buyingKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      buyingScore += 10;
      interestSignals.push(keyword);
    }
  });
  
  interestKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      buyingScore += 5;
      interestSignals.push(keyword);
    }
  });
  
  // Bonus por perguntas específicas sobre produto/serviço
  if (allText.includes('como funciona') || allText.includes('qual a diferença')) {
    buyingScore += 15;
    interestSignals.push('pergunta específica');
  }
  
  return {
    buyingIntent: Math.min(buyingScore, 100),
    interestSignals: [...new Set(interestSignals)]
  };
}

// Função para analisar objeções do cliente
function analyzeObjections(messages: any[]) {
  const clientMessages = messages.filter(msg => msg.fromMe === false);
  const allText = clientMessages.map(msg => msg.body?.toLowerCase() || '').join(' ');
  
  const objectionPatterns = {
    price: ['caro', 'preço alto', 'muito dinheiro', 'não tenho orçamento', 'custoso'],
    timing: ['não é o momento', 'mais tarde', 'próximo mês', 'ano que vem', 'ainda não'],
    authority: ['preciso consultar', 'vou conversar', 'não decido sozinho', 'meu chefe'],
    need: ['não preciso', 'não é necessário', 'já tenho', 'não vejo necessidade'],
    trust: ['não conheço', 'nunca ouvi falar', 'não confio', 'parece suspeito']
  };
  
  const objections = [];
  let objectionType = null;
  
  Object.entries(objectionPatterns).forEach(([type, keywords]) => {
    keywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        objections.push(keyword);
        objectionType = type;
      }
    });
  });
  
  return {
    objections: [...new Set(objections)],
    type: objectionType
  };
}

// Função para calcular nível de engajamento
function calculateEngagementLevel(messages: any[], temporalPatterns: any) {
  const clientMessages = messages.filter(msg => msg.fromMe === false);
  
  let engagementScore = 0;
  
  // Frequência de mensagens
  if (temporalPatterns.messageFrequency > 5) engagementScore += 30;
  else if (temporalPatterns.messageFrequency > 2) engagementScore += 20;
  else engagementScore += 10;
  
  // Tempo de resposta
  if (temporalPatterns.avgResponseTime < 5) engagementScore += 25;
  else if (temporalPatterns.avgResponseTime < 15) engagementScore += 15;
  else engagementScore += 5;
  
  // Tamanho das mensagens
  const avgClientMessageLength = clientMessages.reduce((sum, msg) => 
    sum + (msg.body?.length || 0), 0) / Math.max(clientMessages.length, 1);
  
  if (avgClientMessageLength > 50) engagementScore += 20;
  else if (avgClientMessageLength > 20) engagementScore += 10;
  
  // Perguntas feitas
  const questionCount = clientMessages.filter(msg => msg.body?.includes('?')).length;
  engagementScore += Math.min(questionCount * 5, 25);
  
  if (engagementScore >= 80) return 'Alto';
  if (engagementScore >= 50) return 'Médio';
  return 'Baixo';
}

// Função para análise avançada de sentimento
function analyzeSentiment(messages: any[]): { sentiment: 'positive' | 'neutral' | 'negative'; confidence: number; indicators: string[] } {
  const clientMessages = messages.filter(m => !m.fromMe);
  const text = clientMessages.map(m => m.body?.toLowerCase() || '').join(' ');
  
  const positiveWords = [
    'obrigado', 'obrigada', 'ótimo', 'excelente', 'perfeito', 'maravilhoso',
    'adorei', 'gostei', 'interessante', 'legal', 'bom', 'boa', 'sim',
    'claro', 'certamente', 'definitivamente', 'concordo', 'aceito'
  ];
  
  const negativeWords = [
    'não', 'nunca', 'jamais', 'impossível', 'difícil', 'problema',
    'ruim', 'péssimo', 'horrível', 'odeio', 'detesto', 'chato',
    'caro', 'expensive', 'complicado', 'confuso', 'frustrado'
  ];
  
  const urgencyWords = [
    'urgente', 'rápido', 'imediato', 'agora', 'hoje', 'amanhã',
    'preciso', 'necessário', 'importante', 'pressa', 'emergência'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  let indicators: string[] = [];
  
  // Contar palavras positivas
  positiveWords.forEach(word => {
    const count = (text.match(new RegExp(word, 'g')) || []).length;
    if (count > 0) {
      positiveScore += count;
      indicators.push(`Palavra positiva: "${word}" (${count}x)`);
    }
  });
  
  // Contar palavras negativas
  negativeWords.forEach(word => {
    const count = (text.match(new RegExp(word, 'g')) || []).length;
    if (count > 0) {
      negativeScore += count;
      indicators.push(`Palavra negativa: "${word}" (${count}x)`);
    }
  });
  
  // Detectar padrões de urgência
  urgencyWords.forEach(word => {
    const count = (text.match(new RegExp(word, 'g')) || []).length;
    if (count > 0) {
      indicators.push(`Indicador de urgência: "${word}" (${count}x)`);
    }
  });
  
  // Detectar emojis
  const positiveEmojis = text.match(/[😊😃😄😁🙂👍✅💯🎉]/g) || [];
  const negativeEmojis = text.match(/[😞😔😟😢😠👎❌]/g) || [];
  
  positiveScore += positiveEmojis.length * 2;
  negativeScore += negativeEmojis.length * 2;
  
  if (positiveEmojis.length > 0) {
    indicators.push(`Emojis positivos detectados (${positiveEmojis.length})`);
  }
  if (negativeEmojis.length > 0) {
    indicators.push(`Emojis negativos detectados (${negativeEmojis.length})`);
  }
  
  // Calcular sentimento final
  const totalScore = positiveScore + negativeScore;
  let sentiment: 'positive' | 'neutral' | 'negative';
  let confidence: number;
  
  if (totalScore === 0) {
    sentiment = 'neutral';
    confidence = 50;
  } else {
    const positiveRatio = positiveScore / totalScore;
    if (positiveRatio > 0.6) {
      sentiment = 'positive';
      confidence = Math.min(60 + (positiveRatio - 0.6) * 100, 95);
    } else if (positiveRatio < 0.4) {
      sentiment = 'negative';
      confidence = Math.min(60 + (0.4 - positiveRatio) * 100, 95);
    } else {
      sentiment = 'neutral';
      confidence = 70;
    }
  }
  
  return { sentiment, confidence: Math.round(confidence), indicators };
}

// Função para análise avançada de urgência
function analyzeUrgency(messages: any[]): { level: 'low' | 'medium' | 'high'; confidence: number; indicators: string[] } {
  const clientMessages = messages.filter(m => !m.fromMe);
  const text = clientMessages.map(m => m.body?.toLowerCase() || '').join(' ');
  
  const urgencyIndicators = {
    high: [
      'urgente', 'emergência', 'imediato', 'agora mesmo', 'hoje',
      'preciso agora', 'não posso esperar', 'crítico', 'prioridade'
    ],
    medium: [
      'rápido', 'logo', 'breve', 'amanhã', 'esta semana',
      'preciso', 'importante', 'necessário', 'quando possível'
    ],
    low: [
      'quando der', 'sem pressa', 'qualquer hora', 'futuramente',
      'eventualmente', 'talvez', 'pensando em'
    ]
  };
  
  let urgencyScore = 0;
  let indicators: string[] = [];
  
  // Verificar indicadores de alta urgência
  urgencyIndicators.high.forEach(indicator => {
    const count = (text.match(new RegExp(indicator, 'g')) || []).length;
    if (count > 0) {
      urgencyScore += count * 3;
      indicators.push(`Alta urgência: "${indicator}" (${count}x)`);
    }
  });
  
  // Verificar indicadores de média urgência
  urgencyIndicators.medium.forEach(indicator => {
    const count = (text.match(new RegExp(indicator, 'g')) || []).length;
    if (count > 0) {
      urgencyScore += count * 2;
      indicators.push(`Média urgência: "${indicator}" (${count}x)`);
    }
  });
  
  // Verificar indicadores de baixa urgência (reduz score)
  urgencyIndicators.low.forEach(indicator => {
    const count = (text.match(new RegExp(indicator, 'g')) || []).length;
    if (count > 0) {
      urgencyScore -= count;
      indicators.push(`Baixa urgência: "${indicator}" (${count}x)`);
    }
  });
  
  // Analisar padrões temporais
  const now = new Date();
  const recentMessages = clientMessages.filter(m => {
    if (!m.timestamp) return false;
    const msgTime = new Date(m.timestamp);
    const hoursDiff = (now.getTime() - msgTime.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 2; // Mensagens nas últimas 2 horas
  });
  
  if (recentMessages.length > 3) {
    urgencyScore += 2;
    indicators.push('Múltiplas mensagens recentes detectadas');
  }
  
  // Detectar pontos de exclamação (indicam urgência)
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 2) {
    urgencyScore += Math.min(exclamations, 5);
    indicators.push(`Múltiplos pontos de exclamação (${exclamations})`);
  }
  
  // Determinar nível de urgência
  let level: 'low' | 'medium' | 'high';
  let confidence: number;
  
  if (urgencyScore >= 6) {
    level = 'high';
    confidence = Math.min(70 + urgencyScore * 3, 95);
  } else if (urgencyScore >= 3) {
    level = 'medium';
    confidence = Math.min(60 + urgencyScore * 5, 90);
  } else {
    level = 'low';
    confidence = Math.max(50 - urgencyScore * 5, 30);
  }
  
  return { level, confidence: Math.round(confidence), indicators };
}

async function analyzeConversation(input: MessageAnalysisInput): Promise<AnalysisResult> {
  try {
    const { messages, clientInfo } = input;
    
    if (!messages || messages.length === 0) {
      throw new Error('Nenhuma mensagem fornecida para análise');
    }

    // Verificar cache inteligente primeiro
    const cachedEntry = findSimilarCache(messages, clientInfo);
    
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CACHE_DURATION) {
      console.log('🎯 Análise encontrada no cache inteligente');
      
      // Se for cache similar (não exato), ajustar confiança
      if (cachedEntry.similarityScore && cachedEntry.similarityScore < 1.0) {
        const adjustedResult = {
          ...cachedEntry.result,
          confidence: Math.round(cachedEntry.result.confidence * cachedEntry.similarityScore)
        };
        return adjustedResult;
      }
      
      return cachedEntry.result;
    }

    // Analisar padrões temporais e de comunicação
    const temporalPatterns = analyzeTemporalPatterns(messages);
    const communicationPatterns = analyzeCommunicationPatterns(messages);
    
    // Análises auxiliares
    const intentAnalysis = analyzeCustomerIntent(messages);
    const objectionAnalysis = analyzeObjections(messages);
    const engagementLevel = calculateEngagementLevel(messages, temporalPatterns);
    const sentimentAnalysis = analyzeSentiment(messages);
    const urgencyAnalysis = analyzeUrgency(messages);
    
    console.log('📊 Análises auxiliares:', {
      intent: intentAnalysis,
      objections: objectionAnalysis.objections.length,
      engagement: engagementLevel,
      sentiment: sentimentAnalysis.sentiment,
      urgency: urgencyAnalysis.level
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // Variar temperatura baseada no número de mensagens e padrões
    const temperature = Math.min(0.9, 0.3 + (messages.length * 0.01) + (communicationPatterns.urgencyScore * 0.1));
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: temperature,
        topP: 0.8,
        topK: 40
      }
    });

    // Construir contexto da conversa com mais detalhes
    const conversationContext = messages
      .slice(-25) // Aumentado para 25 mensagens
      .map((msg, index) => {
        const timestamp = new Date(msg.timestamp).toLocaleString('pt-BR');
        return `[${timestamp}] ${msg.sender === 'client' ? 'Cliente' : 'Atendente'}: ${msg.content}`;
      })
      .join('\n');

    // Determinar contexto temporal
    const timeContext = temporalPatterns.lastActivityHours < 1 
      ? 'conversa muito recente e ativa'
      : temporalPatterns.lastActivityHours < 24 
      ? 'conversa do dia atual'
      : 'conversa de dias anteriores';

    // Determinar urgência baseada em padrões
    const urgencyContext = communicationPatterns.urgencyScore > 2 
      ? 'alta urgência detectada'
      : communicationPatterns.urgencyScore > 0 
      ? 'urgência moderada'
      : 'sem indicadores de urgência';

    // Determinar sentimento baseado em padrões
    const sentimentContext = communicationPatterns.positiveScore > communicationPatterns.negativeScore 
      ? 'tendência positiva'
      : communicationPatterns.negativeScore > communicationPatterns.positiveScore 
      ? 'tendência negativa'
      : 'sentimento neutro';


    
    const prompt = `
Você é um especialista em análise de conversas de vendas e atendimento ao cliente com 15+ anos de experiência em CRM e conversão.

CONTEXTO DETALHADO DA CONVERSA:
🕒 TEMPORAL:
- ${timeContext}
- Frequência: ${temporalPatterns.messageFrequency.toFixed(2)} msg/hora
- Tempo médio de resposta: ${temporalPatterns.avgResponseTime.toFixed(1)} min
- Horário de pico: ${temporalPatterns.peakHour}h
- Última atividade: ${temporalPatterns.lastActivityHours.toFixed(1)}h atrás

💬 COMUNICAÇÃO:
- Proporção cliente/atendente: ${communicationPatterns.clientToAgentRatio.toFixed(1)}
- ${urgencyContext}
- ${sentimentContext}
- Faz perguntas: ${communicationPatterns.hasQuestions ? 'Sim' : 'Não'}
- Menciona números/valores: ${communicationPatterns.hasNumbers ? 'Sim' : 'Não'}
- Nível de engajamento: ${engagementLevel}

🎯 INTENÇÃO DETECTADA:
- Intenção de compra: ${intentAnalysis.buyingIntent}%
- Sinais de interesse: ${intentAnalysis.interestSignals.join(', ') || 'Nenhum'}
- Objeções identificadas: ${objectionAnalysis.objections.join(', ') || 'Nenhuma'}
- Tipo de objeção: ${objectionAnalysis.type || 'N/A'}

📊 ANÁLISE AVANÇADA DE SENTIMENTO:
- Sentimento detectado: ${sentimentAnalysis.sentiment}
- Confiança da análise: ${sentimentAnalysis.confidence}%
- Indicadores encontrados: ${sentimentAnalysis.indicators.join(', ')}

⚡ ANÁLISE AVANÇADA DE URGÊNCIA:
- Nível de urgência: ${urgencyAnalysis.level}
- Confiança da análise: ${urgencyAnalysis.confidence}%
- Indicadores de urgência: ${urgencyAnalysis.indicators.join(', ')}

👤 PERFIL DO CLIENTE:
- Nome: ${clientInfo.name}
- Telefone: ${clientInfo.phone}
- Email: ${clientInfo.email || 'Não informado'}
- Empresa: ${clientInfo.company || 'Não informada'}

📝 HISTÓRICO DA CONVERSA:
${conversationContext}

🎯 MISSÃO: Analise esta conversa específica e forneça insights únicos e acionáveis baseados EXCLUSIVAMENTE no conteúdo real.

CONSIDERE AS ANÁLISES AVANÇADAS:
1. Sentimento detectado (${sentimentAnalysis.sentiment}) com ${sentimentAnalysis.confidence}% de confiança
2. Urgência identificada (${urgencyAnalysis.level}) com ${urgencyAnalysis.confidence}% de confiança
3. Sinais de compra explícitos e implícitos
4. Objeções e como superá-las
5. Momento ideal para próxima ação baseado na urgência
6. Personalização baseada no perfil e sentimento do cliente
7. Oportunidades de upsell/cross-sell

RETORNE JSON ESTRUTURADO:
{
  "status": "lead_qualificado" | "negociacao" | "fechamento" | "pos_venda" | "suporte",
  "summary": "Resumo específico considerando sentimento ${sentimentAnalysis.sentiment} e urgência ${urgencyAnalysis.level}",
  "mainTopics": ["tópicos específicos mencionados"],
  "buyingSignals": ["sinais de compra identificados"],
  "objections": ["objeções ou preocupações do cliente"],
  "recommendations": [
    {
      "action": "call" | "proposal" | "demo" | "follow_up" | "email",
      "priority": "${urgencyAnalysis.level === 'high' ? 'alta' : urgencyAnalysis.level === 'medium' ? 'media' : 'baixa'}",
      "reason": "justificativa baseada no sentimento ${sentimentAnalysis.sentiment} e urgência ${urgencyAnalysis.level}",
      "timing": "${urgencyAnalysis.level === 'high' ? 'imediato' : urgencyAnalysis.level === 'medium' ? 'hoje' : 'esta_semana'}",
      "script": "script personalizado considerando o tom ${sentimentAnalysis.sentiment} do cliente"
    }
  ],
  "nextSteps": ["ações priorizadas baseadas na urgência ${urgencyAnalysis.level}"],
  "urgencyLevel": "${urgencyAnalysis.level === 'high' ? 'alta' : urgencyAnalysis.level === 'medium' ? 'media' : 'baixa'}",
  "customerSentiment": "${sentimentAnalysis.sentiment === 'positive' ? 'positivo' : sentimentAnalysis.sentiment === 'negative' ? 'negativo' : 'neutro'}",
  "conversionProbability": "número entre 0-100 ajustado pelo sentimento e urgência",
  "suggestedResponse": "resposta personalizada considerando sentimento ${sentimentAnalysis.sentiment} e urgência ${urgencyAnalysis.level}"
}

IMPORTANTE: Use os valores exatos das análises avançadas de sentimento e urgência para personalizar todas as recomendações.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Tentar fazer parse do JSON
    let analysisData;
    try {
      // Extrair JSON da resposta (caso venha com texto adicional)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta do Gemini:', parseError);
      console.error('Resposta original:', text);
      
      // Fallback com análise baseada em padrões detectados
       const fallbackStatus: ConversationStage = communicationPatterns.urgencyScore > 1 ? 'support' : 'initial_contact';
       const fallbackSentiment: 'positive' | 'neutral' | 'negative' = communicationPatterns.positiveScore > communicationPatterns.negativeScore 
         ? 'positive' : communicationPatterns.negativeScore > 0 ? 'negative' : 'neutral';
       const fallbackPriority: 'low' | 'medium' | 'high' = communicationPatterns.urgencyScore > 1 ? 'high' : 'medium';
       const fallbackUrgency: 'low' | 'medium' | 'high' = communicationPatterns.urgencyScore > 1 ? 'high' : 'medium';
       
       analysisData = {
         status: fallbackStatus === 'support' ? 'suporte' : 'lead_qualificado',
         summary: `Conversa ${timeContext} com ${sentimentContext}. ${messages.length} mensagens trocadas.`,
         mainTopics: ['Atendimento', communicationPatterns.hasQuestions ? 'Dúvidas' : 'Informações'],
         recommendations: [{
           action: 'call',
           priority: fallbackPriority === 'high' ? 'alta' : 'media',
           reason: `Baseado em ${urgencyContext} e ${sentimentContext}`
         }],
         nextSteps: ['Acompanhar cliente', 'Verificar satisfação'],
         urgencyLevel: fallbackUrgency === 'high' ? 'alta' : 'media',
         customerSentiment: fallbackSentiment === 'positive' ? 'positivo' : fallbackSentiment === 'negative' ? 'negativo' : 'neutro',
         conversionProbability: Math.max(20, Math.min(80, 50 + (communicationPatterns.positiveScore * 10) - (communicationPatterns.negativeScore * 10)))
       };
    }

    // Mapear a resposta do Gemini para o tipo AnalysisResult correto
    const mappedRecommendations: SmartRecommendation[] = (analysisData.recommendations || []).map((rec: any, index: number) => ({
      id: `rec_${Date.now()}_${index}`,
      action: rec.action === 'call' || rec.action === 'proposal' || rec.action === 'demo' ? rec.action : 'call',
      title: rec.action || 'Ação recomendada',
      description: rec.reason || 'Recomendação baseada na análise da conversa',
      confidence: Math.min(100, Math.max(0, (rec.priority === 'alta' ? 80 : rec.priority === 'media' ? 60 : 40))),
      reasoning: rec.reason || 'Baseado na análise da conversa',
      priority: rec.priority === 'alta' ? 'high' : rec.priority === 'media' ? 'medium' : rec.priority === 'baixa' ? 'low' : 'medium',
      suggestedTiming: rec.priority === 'alta' ? 'immediate' : rec.priority === 'media' ? 'within_hour' : 'within_day',
      timing: rec.timing,
      script: rec.script,
      createdAt: new Date()
    }));

    // Mapear o status para conversationStage
    const mapStatusToStage = (status: string): ConversationStage => {
      switch (status) {
        case 'lead_qualificado': return 'initial_contact';
        case 'negociacao': return 'negotiation';
        case 'fechamento': return 'closing';
        case 'pos_venda': return 'post_sale';
        case 'suporte': return 'support';
        default: return 'information_gathering';
      }
    };

    // Mapear urgencyLevel para o formato correto
    const mapUrgencyLevel = (urgency: string): 'low' | 'medium' | 'high' => {
      switch (urgency) {
        case 'alta': return 'high';
        case 'media': return 'medium';
        case 'baixa': return 'low';
        default: return 'medium';
      }
    };

    // Mapear customerSentiment para clientSentiment
    const mapSentiment = (sentiment: string): 'positive' | 'neutral' | 'negative' => {
      switch (sentiment) {
        case 'positivo': return 'positive';
        case 'neutro': return 'neutral';
        case 'negativo': return 'negative';
        default: return 'neutral';
      }
    };

    const finalResult: AnalysisResult = {
      conversationStage: mapStatusToStage(analysisData.status),
      clientSentiment: mapSentiment(analysisData.customerSentiment || 'neutro'),
      urgencyLevel: mapUrgencyLevel(analysisData.urgencyLevel || 'media'),
      keyTopics: analysisData.mainTopics || ['Atendimento geral'],
      buyingSignals: analysisData.buyingSignals || [],
      objections: analysisData.objections || [],
      recommendations: mappedRecommendations,
      summary: analysisData.summary || 'Análise da conversa realizada',
      confidence: Math.min(100, Math.max(0, analysisData.conversionProbability || 50)),
      suggestedResponse: analysisData.suggestedResponse
    };

    // Armazenar no cache com informações adicionais
    const conversationHash = generateConversationHash(messages, clientInfo);
    analysisCache.set(conversationHash, {
      result: finalResult,
      timestamp: Date.now(),
      messageCount: messages.length,
      lastMessageTime: new Date(messages[messages.length - 1]?.timestamp || Date.now()).getTime(),
      conversationHash,
      similarityScore: 1.0
    });

    return finalResult;

  } catch (error) {
    console.error('Erro na análise da conversa:', error);
    throw new Error('Falha ao analisar a conversa');
  }
}



// Função para validar estrutura das mensagens
function validateMessages(messages: any[]): { isValid: boolean; error?: string } {
  if (!messages || !Array.isArray(messages)) {
    return { isValid: false, error: 'Mensagens devem ser um array' };
  }

  if (messages.length === 0) {
    return { isValid: false, error: 'Array de mensagens não pode estar vazio' };
  }

  if (messages.length > 1000) {
    return { isValid: false, error: 'Número máximo de mensagens excedido (1000)' };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (!msg || typeof msg !== 'object') {
      return { isValid: false, error: `Mensagem ${i + 1} deve ser um objeto` };
    }

    if (typeof msg.fromMe !== 'boolean') {
      return { isValid: false, error: `Mensagem ${i + 1}: campo 'fromMe' deve ser boolean` };
    }

    if (!msg.body || typeof msg.body !== 'string') {
      return { isValid: false, error: `Mensagem ${i + 1}: campo 'body' deve ser uma string não vazia` };
    }

    if (msg.body.length > 4000) {
      return { isValid: false, error: `Mensagem ${i + 1}: conteúdo muito longo (máximo 4000 caracteres)` };
    }

    // Validar timestamp se presente
    if (msg.timestamp && !isValidTimestamp(msg.timestamp)) {
      return { isValid: false, error: `Mensagem ${i + 1}: timestamp inválido` };
    }
  }

  return { isValid: true };
}

// Função para validar timestamp
function isValidTimestamp(timestamp: any): boolean {
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.getTime() > 0;
  }
  if (typeof timestamp === 'number') {
    return timestamp > 0 && timestamp <= Date.now() + 86400000; // Não pode ser mais de 1 dia no futuro
  }
  return false;
}

// Função para validar informações do cliente
function validateClientInfo(clientInfo: any): { isValid: boolean; error?: string } {
  if (!clientInfo || typeof clientInfo !== 'object') {
    return { isValid: false, error: 'Informações do cliente devem ser um objeto' };
  }

  if (!clientInfo.id || typeof clientInfo.id !== 'string') {
    return { isValid: false, error: 'ID do cliente é obrigatório e deve ser uma string' };
  }

  if (clientInfo.id.length > 100) {
    return { isValid: false, error: 'ID do cliente muito longo (máximo 100 caracteres)' };
  }

  // Validar campos opcionais se presentes
  if (clientInfo.name && (typeof clientInfo.name !== 'string' || clientInfo.name.length > 200)) {
    return { isValid: false, error: 'Nome do cliente deve ser uma string com máximo 200 caracteres' };
  }

  if (clientInfo.phone && (typeof clientInfo.phone !== 'string' || !/^[\d\s\+\-\(\)]+$/.test(clientInfo.phone))) {
    return { isValid: false, error: 'Telefone do cliente deve conter apenas números e caracteres válidos' };
  }

  return { isValid: true };
}

// Função para sanitizar dados de entrada
function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove caracteres de controle
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Sanitizar dados de entrada
    const sanitizedBody = sanitizeInput(body);
    const { messages, clientInfo } = sanitizedBody;

    // Validações robustas
    const messagesValidation = validateMessages(messages);
    if (!messagesValidation.isValid) {
      return NextResponse.json(
        { error: messagesValidation.error },
        { status: 400 }
      );
    }

    const clientValidation = validateClientInfo(clientInfo);
    if (!clientValidation.isValid) {
      return NextResponse.json(
        { error: clientValidation.error },
        { status: 400 }
      );
    }

    // Log da requisição para monitoramento
    console.log(`📊 Iniciando análise - Cliente: ${clientInfo.id}, Mensagens: ${messages.length}`);
    
    const analysisInput: MessageAnalysisInput = {
      messages,
      clientInfo,
      conversationContext: {
        duration: messages.length > 0 ? Math.max(1, (new Date().getTime() - new Date(messages[0].timestamp).getTime()) / (1000 * 60)) : 0,
        messageCount: messages.length,
        lastClientMessage: new Date(messages.filter(m => m.sender === 'client').pop()?.timestamp || new Date()),
        hasUnreadMessages: messages.some(m => m.status !== 'read'),
        previousInteractions: 0
      }
    };

    const startTime = Date.now();
    const result = await analyzeConversation(analysisInput);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Análise concluída em ${duration}ms - Confiança: ${result.confidence}%`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Erro na análise da conversa:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      clientId: body?.clientInfo?.id,
      messageCount: body?.messages?.length
    });
    
    // Retornar erro mais específico baseado no tipo
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Formato de dados inválido' },
        { status: 400 }
      );
    }
    
    if (error instanceof TypeError) {
      return NextResponse.json(
        { error: 'Estrutura de dados incorreta' },
        { status: 400 }
      );
    }
    
    // Erro genérico para outros casos
    return NextResponse.json(
      { error: 'Erro interno do servidor. Tente novamente em alguns instantes.' },
      { status: 500 }
    );
  }
}

// Método GET para verificar se a API está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'API de análise de chat funcionando',
    timestamp: new Date().toISOString()
  });
}