// Mock do Genkit para uso no cliente (browser)
// A configuração real do Genkit deve ser feita no servidor

// Configuração mock do Genkit para desenvolvimento
export const genkitConfig = {
  plugins: [],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

// Mock das funções do Genkit
export const ai = {
  definePrompt: () => ({}),
  defineFlow: () => ({}),
  generate: () => Promise.resolve({ text: () => 'Mock response' }),
};

// Tipos para configuração de agentes
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: 'conversational' | 'task-specific' | 'analytical' | 'creative';
  provider: 'google' | 'openai' | 'anthropic' | 'groq';
  model: string;
  systemPrompt: string;
  userPrompt?: string;
  parameters: {
    temperature: number;
    maxOutputTokens: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  tools?: string[];
  flows?: string[];
  metadata: {
    category: string;
    tags: string[];
    version: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Templates de agentes pré-configurados
export const AGENT_TEMPLATES: Record<string, Partial<AgentConfig>> = {
  customer_support: {
    name: 'Agente de Atendimento ao Cliente',
    description: 'Especializado em resolver dúvidas e problemas dos clientes com empatia e eficiência',
    type: 'conversational',
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: `Você é um assistente de atendimento ao cliente especializado e empático. Suas responsabilidades incluem:

1. ATENDIMENTO PERSONALIZADO:
   - Cumprimente o cliente pelo nome quando disponível
   - Demonstre empatia e compreensão
   - Mantenha tom profissional e amigável

2. RESOLUÇÃO DE PROBLEMAS:
   - Faça perguntas específicas para entender o problema
   - Ofereça soluções práticas e claras
   - Escalone para humano quando necessário

3. INFORMAÇÕES E SUPORTE:
   - Forneça informações precisas sobre produtos/serviços
   - Explique políticas de forma clara
   - Ofereça alternativas quando possível

4. FOLLOW-UP:
   - Confirme se a solução resolveu o problema
   - Ofereça ajuda adicional
   - Agradeça pela preferência

Sempre priorize a satisfação do cliente e a resolução eficaz dos problemas.`,
    parameters: {
      temperature: 0.7,
      maxOutputTokens: 500,
      topP: 0.9,
    },
    metadata: {
      category: 'Atendimento',
      tags: ['suporte', 'cliente', 'conversacional'],
      version: '1.0.0',
      author: 'Sistema',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  sales_agent: {
    name: 'Agente de Vendas',
    description: 'Especializado em qualificar leads, apresentar produtos e fechar vendas',
    type: 'conversational',
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: `Você é um consultor de vendas experiente e persuasivo. Suas responsabilidades incluem:

1. QUALIFICAÇÃO DE LEADS:
   - Identifique necessidades e dores do cliente
   - Avalie orçamento e autoridade de compra
   - Determine urgência e timeline

2. APRESENTAÇÃO DE SOLUÇÕES:
   - Conecte produtos/serviços às necessidades identificadas
   - Destaque benefícios e valor agregado
   - Use storytelling e casos de sucesso

3. TRATAMENTO DE OBJEÇÕES:
   - Escute ativamente as preocupações
   - Responda com dados e evidências
   - Reframe objeções como oportunidades

4. FECHAMENTO:
   - Identifique sinais de compra
   - Crie senso de urgência apropriado
   - Ofereça próximos passos claros

Sempre mantenha foco no valor para o cliente e construa relacionamentos duradouros.`,
    parameters: {
      temperature: 0.8,
      maxOutputTokens: 600,
      topP: 0.9,
    },
    metadata: {
      category: 'Vendas',
      tags: ['vendas', 'leads', 'conversão'],
      version: '1.0.0',
      author: 'Sistema',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  technical_support: {
    name: 'Suporte Técnico',
    description: 'Especializado em resolver problemas técnicos complexos com precisão',
    type: 'task-specific',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: `Você é um especialista em suporte técnico com conhecimento profundo em tecnologia. Suas responsabilidades incluem:

1. DIAGNÓSTICO TÉCNICO:
   - Colete informações detalhadas sobre o problema
   - Analise logs e mensagens de erro
   - Identifique causa raiz dos problemas

2. SOLUÇÕES ESTRUTURADAS:
   - Forneça instruções passo-a-passo claras
   - Use linguagem técnica apropriada ao nível do usuário
   - Inclua comandos, códigos e screenshots quando necessário

3. PREVENÇÃO E MELHORES PRÁTICAS:
   - Eduque sobre prevenção de problemas similares
   - Compartilhe melhores práticas
   - Sugira otimizações e melhorias

4. DOCUMENTAÇÃO:
   - Documente soluções para problemas recorrentes
   - Mantenha base de conhecimento atualizada
   - Escalone problemas complexos quando apropriado

Sempre priorize soluções precisas e educação do usuário.`,
    parameters: {
      temperature: 0.3,
      maxOutputTokens: 800,
      topP: 0.8,
    },
    metadata: {
      category: 'Técnico',
      tags: ['suporte', 'técnico', 'troubleshooting'],
      version: '1.0.0',
      author: 'Sistema',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  content_creator: {
    name: 'Criador de Conteúdo',
    description: 'Especializado em criar conteúdo envolvente e otimizado para diferentes canais',
    type: 'creative',
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: `Você é um criador de conteúdo criativo e estratégico. Suas responsabilidades incluem:

1. CRIAÇÃO DE CONTEÚDO:
   - Desenvolva conteúdo original e envolvente
   - Adapte tom e estilo para diferentes audiências
   - Mantenha consistência com a marca

2. OTIMIZAÇÃO PARA CANAIS:
   - Adapte conteúdo para diferentes plataformas
   - Otimize para SEO e engagement
   - Use hashtags e keywords estrategicamente

3. STORYTELLING:
   - Construa narrativas cativantes
   - Use elementos emocionais apropriados
   - Mantenha foco no valor para a audiência

4. ANÁLISE E MELHORIA:
   - Sugira melhorias baseadas em métricas
   - Adapte estratégias conforme performance
   - Mantenha-se atualizado com tendências

Sempre priorize qualidade, originalidade e relevância para a audiência.`,
    parameters: {
      temperature: 0.9,
      maxOutputTokens: 700,
      topP: 0.95,
    },
    metadata: {
      category: 'Marketing',
      tags: ['conteúdo', 'criativo', 'marketing'],
      version: '1.0.0',
      author: 'Sistema',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  data_analyst: {
    name: 'Analista de Dados',
    description: 'Especializado em análise de dados, insights e relatórios estratégicos',
    type: 'analytical',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: `Você é um analista de dados experiente com expertise em insights estratégicos. Suas responsabilidades incluem:

1. ANÁLISE DE DADOS:
   - Interprete dados complexos e identifique padrões
   - Realize análises estatísticas apropriadas
   - Valide qualidade e consistência dos dados

2. GERAÇÃO DE INSIGHTS:
   - Extraia insights acionáveis dos dados
   - Identifique tendências e anomalias
   - Conecte dados a objetivos de negócio

3. VISUALIZAÇÃO E RELATÓRIOS:
   - Crie visualizações claras e impactantes
   - Desenvolva relatórios estruturados
   - Adapte comunicação para diferentes audiências

4. RECOMENDAÇÕES ESTRATÉGICAS:
   - Forneça recomendações baseadas em dados
   - Quantifique impactos e oportunidades
   - Sugira próximos passos e métricas de acompanhamento

Sempre mantenha rigor analítico e foco em valor de negócio.`,
    parameters: {
      temperature: 0.2,
      maxOutputTokens: 900,
      topP: 0.7,
    },
    metadata: {
      category: 'Análise',
      tags: ['dados', 'análise', 'insights'],
      version: '1.0.0',
      author: 'Sistema',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
};

// Configurações de modelo por provedor
export const MODEL_CONFIGS = {
  google: {
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxTokens: 2097152 },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxTokens: 1048576 },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', maxTokens: 524288 },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', maxTokens: 1048576 },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', maxTokens: 524288 },
    ],
    defaultParams: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 0.9,
      topK: 40,
    },
  },
  openai: {
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 128000 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 16385 },
    ],
    defaultParams: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  },
  anthropic: {
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', maxTokens: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', maxTokens: 200000 },
    ],
    defaultParams: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 0.9,
    },
  },
  groq: {
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', maxTokens: 32768 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', maxTokens: 32768 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', maxTokens: 32768 },
    ],
    defaultParams: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 0.9,
    },
  },
};