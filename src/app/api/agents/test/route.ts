import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const TestAgentSchema = z.object({
  agentConfig: z.object({
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    userPromptTemplate: z.string().optional(),
    modelConfig: z.object({
      provider: z.string(),
      model: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().min(1),
      topP: z.number().min(0).max(1).optional(),
      frequencyPenalty: z.number().min(-2).max(2).optional(),
      presencePenalty: z.number().min(-2).max(2).optional(),
    }),
  }),
  testMessage: z.string().min(1),
  context: z.object({
    userInfo: z.string().optional(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.string(),
    })).optional(),
    sessionData: z.record(z.any()).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentConfig, testMessage, context } = TestAgentSchema.parse(body);

    // Simular teste do agente
    const testResult = await testAgent(agentConfig, testMessage, context);

    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Erro ao testar agente:', error);
    return NextResponse.json(
      { error: 'Erro ao testar agente' },
      { status: 500 }
    );
  }
}

async function testAgent(
  agentConfig: any,
  testMessage: string,
  context?: any
) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime = Date.now();

  try {
    // Construir prompt completo
    const fullPrompt = buildFullPrompt(agentConfig, testMessage, context);
    
    // Simular execução do modelo
    const response = await simulateModelExecution(agentConfig, fullPrompt);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Avaliar qualidade da resposta
    const qualityScore = evaluateResponseQuality(response, testMessage, agentConfig);
    
    // Gerar métricas
    const metrics = generateTestMetrics(response, responseTime, qualityScore);

    return {
      success: true,
      response: response.content,
      metrics,
      reasoning: response.reasoning,
      suggestions: generateImprovementSuggestions(qualityScore, agentConfig),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erro durante execução do teste',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString(),
    };
  }
}

function buildFullPrompt(agentConfig: any, testMessage: string, context?: any): string {
  let prompt = agentConfig.systemPrompt + '\n\n';
  
  // Adicionar contexto se disponível
  if (context) {
    if (context.userInfo) {
      prompt += `Informações do usuário: ${context.userInfo}\n`;
    }
    
    if (context.history && context.history.length > 0) {
      prompt += 'Histórico da conversa:\n';
      context.history.forEach((msg: any) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    if (context.sessionData) {
      prompt += `Dados da sessão: ${JSON.stringify(context.sessionData)}\n`;
    }
    
    prompt += '\n';
  }
  
  // Adicionar mensagem do usuário
  prompt += `Usuário: ${testMessage}\n\nAssistente:`;
  
  return prompt;
}

async function simulateModelExecution(agentConfig: any, prompt: string) {
  // Simular diferentes tipos de resposta baseado na configuração
  const { modelConfig } = agentConfig;
  
  // Gerar resposta baseada no tipo de agente e configuração
  const responseVariations = generateResponseVariations(agentConfig, prompt);
  
  // Selecionar resposta baseada na temperatura
  const selectedResponse = selectResponseByTemperature(
    responseVariations,
    modelConfig.temperature
  );
  
  // Simular tokens utilizados
  const tokensUsed = Math.floor(prompt.length / 4) + Math.floor(selectedResponse.length / 4);
  
  return {
    content: selectedResponse,
    reasoning: generateReasoning(agentConfig, prompt, selectedResponse),
    tokensUsed,
    model: modelConfig.model,
    provider: modelConfig.provider,
  };
}

function generateResponseVariations(agentConfig: any, prompt: string): string[] {
  const agentName = agentConfig.name;
  const isCustomerSupport = agentConfig.systemPrompt.includes('atendimento') || 
                           agentConfig.systemPrompt.includes('customer');
  const isSales = agentConfig.systemPrompt.includes('vendas') || 
                  agentConfig.systemPrompt.includes('sales');
  const isTechnical = agentConfig.systemPrompt.includes('técnico') || 
                      agentConfig.systemPrompt.includes('technical');
  
  const variations = [];
  
  if (isCustomerSupport) {
    variations.push(
      `Olá! Sou o ${agentName} e estou aqui para ajudá-lo. Entendi sua solicitação e vou fazer o possível para resolver sua questão de forma rápida e eficiente. Poderia me fornecer mais alguns detalhes para que eu possa oferecer a melhor solução?`,
      `Obrigado por entrar em contato! Como ${agentName}, posso ajudá-lo com sua solicitação. Vou analisar sua situação e fornecer as informações necessárias. Aguarde um momento enquanto verifico os detalhes.`,
      `Fico feliz em poder ajudá-lo hoje! Sou o ${agentName} e vou garantir que sua experiência seja positiva. Vou trabalhar para resolver sua questão o mais rapidamente possível.`
    );
  } else if (isSales) {
    variations.push(
      `Olá! Sou o ${agentName}, consultor de vendas. Fico feliz em saber do seu interesse! Vou apresentar as melhores soluções para suas necessidades. Que tal conversarmos sobre como posso ajudá-lo a alcançar seus objetivos?`,
      `Excelente! Como ${agentName}, posso ajudá-lo a encontrar a solução perfeita. Vou analisar suas necessidades e apresentar as opções que melhor se adequam ao seu perfil e orçamento.`,
      `Muito obrigado pelo seu interesse! Sou o ${agentName} e estou aqui para apresentar as melhores oportunidades. Vamos descobrir juntos como nossa solução pode agregar valor ao seu negócio.`
    );
  } else if (isTechnical) {
    variations.push(
      `Olá! Sou o ${agentName}, especialista técnico. Vou analisar sua questão técnica e fornecer uma solução detalhada. Primeiro, preciso entender melhor o problema para oferecer a melhor abordagem.`,
      `Como ${agentName}, vou ajudá-lo a resolver essa questão técnica. Vou fazer um diagnóstico completo e fornecer instruções passo-a-passo para a solução.`,
      `Entendi sua questão técnica. Sou o ${agentName} e vou aplicar minha expertise para resolver esse problema. Vou fornecer uma análise detalhada e as melhores práticas.`
    );
  } else {
    variations.push(
      `Olá! Sou o ${agentName} e estou aqui para ajudá-lo. Vou analisar sua solicitação e fornecer a melhor resposta possível. Como posso ser útil hoje?`,
      `Obrigado por sua mensagem! Como ${agentName}, vou fazer o meu melhor para atender suas necessidades. Vou processar sua solicitação e retornar com informações úteis.`,
      `Fico feliz em poder ajudá-lo! Sou o ${agentName} e vou trabalhar para fornecer exatamente o que você precisa. Vamos resolver isso juntos!`
    );
  }
  
  return variations;
}

function selectResponseByTemperature(variations: string[], temperature: number): string {
  if (temperature < 0.3) {
    // Baixa temperatura: resposta mais determinística (primeira opção)
    return variations[0];
  } else if (temperature < 0.7) {
    // Temperatura média: alternar entre as duas primeiras
    return variations[Math.floor(Math.random() * 2)];
  } else {
    // Alta temperatura: qualquer variação
    return variations[Math.floor(Math.random() * variations.length)];
  }
}

function generateReasoning(agentConfig: any, prompt: string, response: string): string {
  return `Baseado na configuração do agente ${agentConfig.name}, analisei o prompt e gerei uma resposta que:

1. Mantém o tom e personalidade definidos no system prompt
2. Responde adequadamente à solicitação do usuário
3. Segue as diretrizes de comportamento estabelecidas
4. Utiliza a temperatura ${agentConfig.modelConfig.temperature} para balancear criatividade e consistência

A resposta foi otimizada para ser útil, relevante e alinhada com os objetivos do agente.`;
}

function evaluateResponseQuality(response: any, testMessage: string, agentConfig: any): number {
  let score = 0;
  
  // Avaliar relevância (0-25 pontos)
  if (response.content.length > 50 && response.content.includes(agentConfig.name)) {
    score += 25;
  } else if (response.content.length > 30) {
    score += 15;
  } else {
    score += 5;
  }
  
  // Avaliar tom apropriado (0-25 pontos)
  const hasPoliteGreeting = response.content.includes('Olá') || 
                           response.content.includes('Obrigado') ||
                           response.content.includes('Fico feliz');
  if (hasPoliteGreeting) score += 25;
  else score += 10;
  
  // Avaliar estrutura (0-25 pontos)
  const hasStructure = response.content.includes('!') || 
                      response.content.includes('?') ||
                      response.content.split('.').length > 2;
  if (hasStructure) score += 25;
  else score += 10;
  
  // Avaliar alinhamento com configuração (0-25 pontos)
  const systemPromptKeywords = agentConfig.systemPrompt.toLowerCase();
  let alignmentScore = 0;
  
  if (systemPromptKeywords.includes('atendimento') && 
      response.content.toLowerCase().includes('ajud')) {
    alignmentScore += 25;
  } else if (systemPromptKeywords.includes('vendas') && 
             response.content.toLowerCase().includes('solução')) {
    alignmentScore += 25;
  } else if (systemPromptKeywords.includes('técnico') && 
             response.content.toLowerCase().includes('analis')) {
    alignmentScore += 25;
  } else {
    alignmentScore += 15;
  }
  
  score += alignmentScore;
  
  return Math.min(score, 100);
}

function generateTestMetrics(response: any, responseTime: number, qualityScore: number) {
  return {
    responseTime: `${responseTime}ms`,
    qualityScore: `${qualityScore}/100`,
    tokensUsed: response.tokensUsed,
    model: response.model,
    provider: response.provider,
    confidence: qualityScore > 80 ? 'Alta' : qualityScore > 60 ? 'Média' : 'Baixa',
    categories: {
      relevancia: qualityScore > 75 ? 'Excelente' : qualityScore > 50 ? 'Boa' : 'Regular',
      tom: qualityScore > 70 ? 'Apropriado' : 'Precisa melhorar',
      estrutura: qualityScore > 65 ? 'Bem estruturada' : 'Pode melhorar',
      alinhamento: qualityScore > 80 ? 'Totalmente alinhado' : 'Parcialmente alinhado',
    },
  };
}

function generateImprovementSuggestions(qualityScore: number, agentConfig: any): string[] {
  const suggestions = [];
  
  if (qualityScore < 60) {
    suggestions.push('Considere revisar o system prompt para ser mais específico sobre o comportamento esperado');
    suggestions.push('Ajuste a temperatura do modelo para obter respostas mais consistentes');
  }
  
  if (qualityScore < 70) {
    suggestions.push('Adicione mais exemplos de interações no system prompt');
    suggestions.push('Considere aumentar o max_tokens para respostas mais completas');
  }
  
  if (qualityScore < 80) {
    suggestions.push('Refine as instruções de tom e personalidade');
    suggestions.push('Adicione diretrizes mais específicas para o domínio do agente');
  }
  
  if (agentConfig.modelConfig.temperature > 1.0) {
    suggestions.push('Temperatura alta pode gerar respostas inconsistentes - considere reduzir');
  }
  
  if (agentConfig.modelConfig.temperature < 0.2) {
    suggestions.push('Temperatura muito baixa pode gerar respostas robóticas - considere aumentar');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Configuração está funcionando bem! Continue testando com diferentes cenários');
  }
  
  return suggestions;
}