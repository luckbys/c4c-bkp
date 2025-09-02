# Guia de Implementação - Integração CRM WhatsApp com Evo AI

## 1. Configuração do Ambiente

### 1.1 Variáveis de Ambiente Necessárias

Adicione ao arquivo `.env.local` do CRM:

```bash
# Evo AI Configuration
EVO_AI_API_URL=http://sua-vps:8000
EVO_AI_API_KEY=seu_jwt_token_evo_ai
EVO_AI_WEBHOOK_SECRET=webhook_secret_123

# Evolution API (já existente)
EVOLUTION_API_URL=http://sua-vps:8080
EVOLUTION_API_KEY=sua_chave_evolution

# Redis para Cache
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=sua_senha_redis

# Configurações de AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

### 1.2 Dependências Adicionais

Instale as dependências necessárias:

```bash
npm install @langchain/core @langchain/openai @langchain/anthropic
npm install ioredis uuid date-fns
npm install @types/uuid
```

## 2. Estrutura de Serviços

### 2.1 Serviço de Integração com Evo AI

Crie o arquivo `src/services/evo-ai-service.ts`:

```typescript
interface EvoAiAgent {
  id: string;
  name: string;
  type: 'llm' | 'workflow' | 'sequential';
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    tools?: string[];
  };
  prompt: string;
  status: 'active' | 'inactive';
}

interface AgentExecution {
  input: string;
  context: {
    ticketId: string;
    clientName: string;
    conversationHistory: string[];
    metadata: Record<string, any>;
  };
}

interface AgentResponse {
  response: string;
  confidence: number;
  executionTime: number;
  tokensUsed: number;
  shouldContinue: boolean;
}

class EvoAiService {
  private baseUrl: string;
  private apiKey: string;
  private timeout = 30000; // 30 segundos

  constructor() {
    this.baseUrl = process.env.EVO_AI_API_URL || 'http://localhost:8000';
    this.apiKey = process.env.EVO_AI_API_KEY || '';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`EVO_AI_ERROR: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na comunicação com Evo AI:', error);
      throw error;
    }
  }

  async createAgent(agentData: Omit<EvoAiAgent, 'id'>): Promise<EvoAiAgent> {
    const response = await this.makeRequest('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(agentData)
    });
    return response;
  }

  async updateAgent(agentId: string, agentData: Partial<EvoAiAgent>): Promise<EvoAiAgent> {
    const response = await this.makeRequest(`/api/v1/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(agentData)
    });
    return response;
  }

  async executeAgent(agentId: string, execution: AgentExecution): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(`/api/v1/agents/${agentId}/execute`, {
        method: 'POST',
        body: JSON.stringify(execution)
      });
      
      const executionTime = Date.now() - startTime;
      
      return {
        ...response,
        executionTime
      };
    } catch (error) {
      console.error(`Erro ao executar agente ${agentId}:`, error);
      throw error;
    }
  }

  async getAgentMetrics(agentId: string, startDate: Date, endDate: Date) {
    const params = new URLSearchParams({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });
    
    return await this.makeRequest(`/api/v1/agents/${agentId}/metrics?${params}`);
  }

  async listAgents(): Promise<EvoAiAgent[]> {
    const response = await this.makeRequest('/api/v1/agents');
    return response.agents || [];
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.makeRequest(`/api/v1/agents/${agentId}`, {
      method: 'DELETE'
    });
  }
}

export const evoAiService = new EvoAiService();
```

### 2.2 Serviço de Regras de Ativação

Crie o arquivo `src/services/agent-rules-service.ts`:

```typescript
interface ActivationRule {
  id: string;
  agentId: string;
  conditions: {
    messageTypes?: string[];
    keywords?: string[];
    timeRange?: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
    weekdays?: number[]; // 0-6 (Sunday-Saturday)
    ticketPriority?: string[];
    clientTags?: string[];
    instanceIds?: string[];
  };
  priority: number; // 1-10
  active: boolean;
}

class AgentRulesService {
  async evaluateRules(ticketData: {
    messageType: string;
    content: string;
    timestamp: Date;
    priority: string;
    clientTags: string[];
    instanceId: string;
  }): Promise<string[]> {
    // Buscar todas as regras ativas
    const rules = await this.getActiveRules();
    
    const matchingAgents: { agentId: string; priority: number }[] = [];
    
    for (const rule of rules) {
      if (this.ruleMatches(rule, ticketData)) {
        matchingAgents.push({
          agentId: rule.agentId,
          priority: rule.priority
        });
      }
    }
    
    // Ordenar por prioridade (maior primeiro)
    matchingAgents.sort((a, b) => b.priority - a.priority);
    
    return matchingAgents.map(agent => agent.agentId);
  }

  private ruleMatches(rule: ActivationRule, ticketData: any): boolean {
    const { conditions } = rule;
    
    // Verificar tipo de mensagem
    if (conditions.messageTypes && !conditions.messageTypes.includes(ticketData.messageType)) {
      return false;
    }
    
    // Verificar palavras-chave
    if (conditions.keywords) {
      const hasKeyword = conditions.keywords.some(keyword => 
        ticketData.content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }
    
    // Verificar horário
    if (conditions.timeRange) {
      const now = new Date(ticketData.timestamp);
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime < conditions.timeRange.start || currentTime > conditions.timeRange.end) {
        return false;
      }
    }
    
    // Verificar dias da semana
    if (conditions.weekdays) {
      const dayOfWeek = new Date(ticketData.timestamp).getDay();
      if (!conditions.weekdays.includes(dayOfWeek)) {
        return false;
      }
    }
    
    // Verificar prioridade do ticket
    if (conditions.ticketPriority && !conditions.ticketPriority.includes(ticketData.priority)) {
      return false;
    }
    
    // Verificar tags do cliente
    if (conditions.clientTags) {
      const hasTag = conditions.clientTags.some(tag => ticketData.clientTags.includes(tag));
      if (!hasTag) return false;
    }
    
    // Verificar instância
    if (conditions.instanceIds && !conditions.instanceIds.includes(ticketData.instanceId)) {
      return false;
    }
    
    return true;
  }

  private async getActiveRules(): Promise<ActivationRule[]> {
    // Implementar busca no Firestore
    // Retornar apenas regras ativas
    return [];
  }
}

export const agentRulesService = new AgentRulesService();
```

## 3. Integração com Webhook da Evolution API

### 3.1 Modificação do Webhook Handler

Modifique o arquivo de webhook existente para incluir processamento de agentes:

```typescript
// src/app/api/webhook/evolution/route.ts
import { evoAiService } from '@/services/evo-ai-service';
import { agentRulesService } from '@/services/agent-rules-service';

export async function POST(request: Request) {
  try {
    const webhookData = await request.json();
    
    // Processar mensagem normalmente (código existente)
    const ticket = await processWebhookMessage(webhookData);
    
    // Verificar se deve ativar agente
    if (webhookData.data?.message && !webhookData.data.message.fromMe) {
      await processAgentActivation(ticket, webhookData);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response('Error', { status: 500 });
  }
}

async function processAgentActivation(ticket: any, webhookData: any) {
  try {
    const ticketData = {
      messageType: webhookData.data.message.messageType || 'text',
      content: webhookData.data.message.conversation || '',
      timestamp: new Date(webhookData.data.message.messageTimestamp * 1000),
      priority: ticket.priority || 'medium',
      clientTags: ticket.client?.tags || [],
      instanceId: webhookData.instance
    };
    
    // Avaliar regras e obter agentes que devem ser ativados
    const matchingAgents = await agentRulesService.evaluateRules(ticketData);
    
    if (matchingAgents.length > 0) {
      // Executar o agente com maior prioridade
      const primaryAgentId = matchingAgents[0];
      await executeAgentForTicket(primaryAgentId, ticket, webhookData);
    }
  } catch (error) {
    console.error('Erro ao processar ativação de agente:', error);
  }
}

async function executeAgentForTicket(agentId: string, ticket: any, webhookData: any) {
  try {
    // Preparar contexto da conversa
    const conversationHistory = await getConversationHistory(ticket.id);
    
    const execution = {
      input: webhookData.data.message.conversation || '',
      context: {
        ticketId: ticket.id,
        clientName: ticket.client.name,
        conversationHistory: conversationHistory.map(msg => 
          `${msg.sender}: ${msg.content}`
        ),
        metadata: {
          instanceId: webhookData.instance,
          clientPhone: ticket.client.phone,
          ticketPriority: ticket.priority
        }
      }
    };
    
    // Executar agente
    const response = await evoAiService.executeAgent(agentId, execution);
    
    // Se o agente retornou uma resposta, enviar via Evolution API
    if (response.response && response.confidence > 0.7) {
      await sendAgentResponse(webhookData.instance, ticket.client.phone, response.response);
      
      // Registrar execução
      await logAgentExecution({
        agentId,
        ticketId: ticket.id,
        input: execution.input,
        output: response.response,
        executionTime: response.executionTime,
        tokensUsed: response.tokensUsed,
        confidence: response.confidence,
        status: 'success'
      });
    }
  } catch (error) {
    console.error(`Erro ao executar agente ${agentId}:`, error);
    
    // Registrar erro
    await logAgentExecution({
      agentId,
      ticketId: ticket.id,
      input: webhookData.data.message.conversation || '',
      output: '',
      executionTime: 0,
      tokensUsed: 0,
      confidence: 0,
      status: 'error'
    });
  }
}
```

## 4. Interface do Usuário

### 4.1 Página Principal de Agentes

Crie o arquivo `src/app/agentes/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, BarChart3, Play, Pause } from 'lucide-react';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { AgentMetricsDialog } from '@/components/agents/AgentMetricsDialog';

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: 'active' | 'inactive';
  totalInteractions: number;
  successRate: number;
  lastExecution?: Date;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      setAgents(prev => prev.map(agent => 
        agent.id === agentId ? { ...agent, status: newStatus as any } : agent
      ));
    } catch (error) {
      console.error('Erro ao alterar status do agente:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando agentes...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Agentes LLM</h1>
          <p className="text-gray-600">Gerencie seus agentes de inteligência artificial</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Agente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{agent.name}</CardTitle>
              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                {agent.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{agent.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Modelo:</span>
                  <span className="font-medium">{agent.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Interações:</span>
                  <span className="font-medium">{agent.totalInteractions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxa de Sucesso:</span>
                  <span className="font-medium">{agent.successRate}%</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAgentStatus(agent.id, agent.status)}
                >
                  {agent.status === 'active' ? (
                    <Pause className="w-4 h-4 mr-1" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  {agent.status === 'active' ? 'Pausar' : 'Ativar'}
                </Button>
                
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configurar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Métricas
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Nenhum agente criado</h3>
          <p className="text-gray-600 mb-4">Crie seu primeiro agente LLM para começar</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Agente
          </Button>
        </div>
      )}

      <CreateAgentDialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        onAgentCreated={loadAgents}
      />
      
      {selectedAgent && (
        <AgentMetricsDialog 
          agent={selectedAgent}
          open={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
```

## 5. Configuração de Deploy

### 5.1 Docker Compose para Desenvolvimento

Crie o arquivo `docker-compose.agents.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    environment:
      - REDIS_PASSWORD=sua_senha_redis
    volumes:
      - redis_data:/data

  evo-ai:
    image: evolutionapi/evo-ai:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/evoai
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=seu_jwt_secret
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=evoai
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  redis_data:
  postgres_data:
```

### 5.2 Script de Inicialização

Crie o arquivo `scripts/setup-evo-ai-integration.sh`:

```bash
#!/bin/bash

echo "🚀 Configurando integração com Evo AI..."

# Verificar se o Evo AI está rodando
echo "📡 Verificando conexão com Evo AI..."
curl -f $EVO_AI_API_URL/health || {
  echo "❌ Evo AI não está acessível em $EVO_AI_API_URL"
  exit 1
}

# Instalar dependências
echo "📦 Instalando dependências..."
npm install @langchain/core @langchain/openai ioredis

# Executar migrações do banco
echo "🗄️ Executando migrações..."
npm run db:migrate

# Criar agente padrão
echo "🤖 Criando agente padrão..."
node scripts/create-default-agent.js

echo "✅ Integração configurada com sucesso!"
echo "🌐 Acesse http://localhost:3000/agentes para gerenciar seus agentes"
```

## 6. Monitoramento e Logs

### 6.1 Dashboard de Métricas

Implementar métricas em tempo real:

- **Performance**: Tempo de resposta médio, taxa de sucesso
- **Uso**: Tokens consumidos, custo por agente
- **Qualidade**: Feedback dos usuários, confidence score
- **Disponibilidade**: Uptime dos agentes, erros por hora

### 6.2 Alertas Automáticos

Configurar alertas para:

- Taxa de erro > 10%
- Tempo de resposta > 5 segundos
- Agente offline por > 5 minutos
- Consumo de tokens acima do limite

Esta implementação fornece uma base sólida para integrar o Evo AI com seu CRM WhatsApp, permitindo criação e gerenciamento de agentes LLM com ativação automática baseada em regras configuráveis.