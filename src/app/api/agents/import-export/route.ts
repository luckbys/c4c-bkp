import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const AgentConfigSchema = z.object({
  version: z.string(),
  metadata: z.object({
    name: z.string(),
    description: z.string(),
    author: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  }),
  config: z.object({
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    userPromptTemplate: z.string().optional(),
    modelConfig: z.object({
      provider: z.string(),
      model: z.string(),
      temperature: z.number(),
      maxTokens: z.number(),
      topP: z.number().optional(),
      frequencyPenalty: z.number().optional(),
      presencePenalty: z.number().optional(),
    }),
    flows: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      trigger: z.string(),
      actions: z.array(z.any()),
    })).optional(),
    integrations: z.record(z.any()).optional(),
  }),
});

const ImportRequestSchema = z.object({
  configData: z.string(), // JSON string or base64
  format: z.enum(['json', 'yaml', 'base64']),
  validateOnly: z.boolean().optional(),
});

const ExportRequestSchema = z.object({
  agentId: z.string(),
  format: z.enum(['json', 'yaml', 'base64']),
  includeMetadata: z.boolean().optional(),
  includeFlows: z.boolean().optional(),
});

// POST /api/agents/import-export - Import agent configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configData, format, validateOnly } = ImportRequestSchema.parse(body);

    // Parse configuration data based on format
    let parsedConfig;
    try {
      parsedConfig = parseConfigData(configData, format);
    } catch (error) {
      return NextResponse.json(
        { error: 'Formato de configuração inválido', details: error instanceof Error ? error.message : 'Erro de parsing' },
        { status: 400 }
      );
    }

    // Validate configuration
    const validationResult = validateAgentConfig(parsedConfig);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Configuração inválida', details: validationResult.errors },
        { status: 400 }
      );
    }

    // If validation only, return validation result
    if (validateOnly) {
      return NextResponse.json({
        valid: true,
        config: parsedConfig,
        summary: generateConfigSummary(parsedConfig),
      });
    }

    // Import configuration (simulate saving to database)
    const importResult = await importAgentConfig(parsedConfig);

    return NextResponse.json({
      success: true,
      agentId: importResult.agentId,
      message: 'Configuração importada com sucesso',
      summary: generateConfigSummary(parsedConfig),
    });
  } catch (error) {
    console.error('Erro ao importar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao importar configuração' },
      { status: 500 }
    );
  }
}

// GET /api/agents/import-export?agentId=xxx&format=json - Export agent configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const format = searchParams.get('format') || 'json';
    const includeMetadata = searchParams.get('includeMetadata') === 'true';
    const includeFlows = searchParams.get('includeFlows') === 'true';

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId é obrigatório' },
        { status: 400 }
      );
    }

    // Get agent configuration (simulate database fetch)
    const agentConfig = await getAgentConfig(agentId);
    if (!agentConfig) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    // Build export data
    const exportData = buildExportData(agentConfig, {
      includeMetadata,
      includeFlows,
    });

    // Format data based on requested format
    const formattedData = formatExportData(exportData, format as 'json' | 'yaml' | 'base64');

    // Set appropriate headers
    const headers = getExportHeaders(format as string, agentConfig.name);

    return new NextResponse(formattedData, { headers });
  } catch (error) {
    console.error('Erro ao exportar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao exportar configuração' },
      { status: 500 }
    );
  }
}

function parseConfigData(configData: string, format: string) {
  switch (format) {
    case 'json':
      return JSON.parse(configData);
    case 'yaml':
      // Simulate YAML parsing (in production, use a YAML library)
      return JSON.parse(configData); // Simplified for demo
    case 'base64':
      const decoded = Buffer.from(configData, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    default:
      throw new Error(`Formato não suportado: ${format}`);
  }
}

function validateAgentConfig(config: any) {
  try {
    AgentConfigSchema.parse(config);
    
    // Additional validation rules
    const errors = [];
    
    // Check version compatibility
    if (config.version && !isVersionCompatible(config.version)) {
      errors.push(`Versão ${config.version} não é compatível com a versão atual`);
    }
    
    // Validate model configuration
    if (config.config.modelConfig.temperature < 0 || config.config.modelConfig.temperature > 2) {
      errors.push('Temperatura deve estar entre 0 e 2');
    }
    
    if (config.config.modelConfig.maxTokens < 1 || config.config.modelConfig.maxTokens > 32000) {
      errors.push('Max tokens deve estar entre 1 e 32000');
    }
    
    // Validate system prompt
    if (config.config.systemPrompt.length < 10) {
      errors.push('System prompt deve ter pelo menos 10 caracteres');
    }
    
    if (config.config.systemPrompt.length > 8000) {
      errors.push('System prompt não pode exceder 8000 caracteres');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Erro de validação'],
    };
  }
}

function isVersionCompatible(version: string): boolean {
  // Simulate version compatibility check
  const supportedVersions = ['1.0', '1.1', '1.2'];
  return supportedVersions.includes(version);
}

function generateConfigSummary(config: any) {
  return {
    name: config.metadata.name,
    description: config.metadata.description,
    category: config.metadata.category || 'Geral',
    modelProvider: config.config.modelConfig.provider,
    modelName: config.config.modelConfig.model,
    temperature: config.config.modelConfig.temperature,
    maxTokens: config.config.modelConfig.maxTokens,
    hasFlows: config.config.flows && config.config.flows.length > 0,
    flowsCount: config.config.flows ? config.config.flows.length : 0,
    hasIntegrations: config.config.integrations && Object.keys(config.config.integrations).length > 0,
    systemPromptLength: config.config.systemPrompt.length,
    tags: config.metadata.tags || [],
  };
}

async function importAgentConfig(config: any) {
  // Simulate saving to database
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // In production, save to actual database
  console.log('Importing agent config:', {
    agentId,
    name: config.metadata.name,
    category: config.metadata.category,
  });
  
  return {
    agentId,
    createdAt: new Date().toISOString(),
  };
}

async function getAgentConfig(agentId: string) {
  // Simulate database fetch
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock agent configuration
  return {
    id: agentId,
    name: 'Agente de Exemplo',
    description: 'Um agente de exemplo para demonstração',
    systemPrompt: 'Você é um assistente útil e profissional.',
    userPromptTemplate: 'Usuário: {{user_message}}\n\nAssistente:',
    modelConfig: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0,
    },
    flows: [
      {
        id: 'flow_1',
        name: 'Saudação',
        description: 'Flow para saudações iniciais',
        trigger: 'greeting',
        actions: [
          { type: 'respond', message: 'Olá! Como posso ajudá-lo hoje?' }
        ],
      }
    ],
    integrations: {
      webhook: {
        url: 'https://example.com/webhook',
        enabled: true,
      }
    },
    metadata: {
      author: 'Sistema',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
      tags: ['exemplo', 'demo'],
      category: 'geral',
    },
  };
}

function buildExportData(agentConfig: any, options: {
  includeMetadata?: boolean;
  includeFlows?: boolean;
}) {
  const exportData: any = {
    version: '1.2',
    metadata: {
      name: agentConfig.name,
      description: agentConfig.description,
      author: agentConfig.metadata?.author || 'Usuário',
      createdAt: agentConfig.metadata?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exportedAt: new Date().toISOString(),
    },
    config: {
      name: agentConfig.name,
      description: agentConfig.description,
      systemPrompt: agentConfig.systemPrompt,
      userPromptTemplate: agentConfig.userPromptTemplate,
      modelConfig: agentConfig.modelConfig,
    },
  };

  if (options.includeMetadata && agentConfig.metadata) {
    exportData.metadata = {
      ...exportData.metadata,
      ...agentConfig.metadata,
      exportedAt: new Date().toISOString(),
    };
  }

  if (options.includeFlows && agentConfig.flows) {
    exportData.config.flows = agentConfig.flows;
  }

  if (agentConfig.integrations) {
    exportData.config.integrations = agentConfig.integrations;
  }

  return exportData;
}

function formatExportData(data: any, format: 'json' | 'yaml' | 'base64'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'yaml':
      // Simulate YAML formatting (in production, use a YAML library)
      return JSON.stringify(data, null, 2); // Simplified for demo
    case 'base64':
      const jsonString = JSON.stringify(data, null, 2);
      return Buffer.from(jsonString, 'utf-8').toString('base64');
    default:
      return JSON.stringify(data, null, 2);
  }
}

function getExportHeaders(format: string, agentName: string) {
  const sanitizedName = agentName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
  };

  switch (format) {
    case 'json':
      headers['Content-Type'] = 'application/json';
      headers['Content-Disposition'] = `attachment; filename="${sanitizedName}_${timestamp}.json"`;
      break;
    case 'yaml':
      headers['Content-Type'] = 'application/x-yaml';
      headers['Content-Disposition'] = `attachment; filename="${sanitizedName}_${timestamp}.yaml"`;
      break;
    case 'base64':
      headers['Content-Type'] = 'text/plain';
      headers['Content-Disposition'] = `attachment; filename="${sanitizedName}_${timestamp}.txt"`;
      break;
  }

  return headers;
}