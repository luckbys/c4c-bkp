# Integração Evo AI JSON-RPC 2.0

Este documento descreve como configurar e usar a integração com Evo AI usando o protocolo JSON-RPC 2.0.

## Visão Geral

A integração JSON-RPC 2.0 permite comunicação direta com agentes de IA do Evo AI, substituindo o sistema de simulação anterior por chamadas reais aos agentes.

### Características

- ✅ Protocolo JSON-RPC 2.0 completo
- ✅ Método `tasks/send` implementado
- ✅ Autenticação múltipla (API Key, JWT, Login Web)
- ✅ Fallback automático para simulação
- ✅ Logs detalhados de todas as interações
- ✅ Tratamento robusto de erros
- ✅ Integração com Evolution API

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env.local`:

```env
# Evo AI Configuration (JSON-RPC 2.0)
EVO_AI_JSONRPC_URL=https://n8n-evo-ai-frontend.05pdov.easypanel.host
EVO_AI_API_KEY=your_evo_ai_api_key
EVO_AI_JWT_SECRET=your_evo_ai_jwt_secret
EVO_AI_EMAIL_FROM=your_email@example.com
EVO_AI_ADMIN_PASSWORD=your_admin_password
EVO_AI_API_URL=https://n8n-evo-ai-frontend.05pdov.easypanel.host
```

### 2. Configuração de Autenticação

O sistema suporta múltiplos métodos de autenticação:

1. **API Key** (Recomendado)
   - Configure `EVO_AI_API_KEY`
   - Usado nos headers `Authorization` e `X-API-Key`

2. **JWT Secret**
   - Configure `EVO_AI_JWT_SECRET`
   - Usado como fallback se API Key não estiver disponível

3. **Login Web** (Fallback)
   - Configure `EVO_AI_EMAIL_FROM` e `EVO_AI_ADMIN_PASSWORD`
   - Usado apenas se outros métodos falharem

## Como Funciona

### Fluxo de Processamento

1. **Recebimento de Mensagem**
   - Webhook recebe mensagem do WhatsApp
   - Sistema verifica se há agente IA ativo

2. **Processamento JSON-RPC**
   - Constrói contexto da conversa
   - Envia requisição JSON-RPC 2.0 para Evo AI
   - Recebe resposta do agente

3. **Envio de Resposta**
   - Tenta enviar via Evolution API
   - Fallback para simulação se Evolution API falhar

### Estrutura JSON-RPC 2.0

#### Requisição
```json
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Mensagem do usuário aqui"
        }
      ]
    },
    "sessionId": "session-ticket-123-agent-456",
    "id": "task-ticket-123-1234567890"
  },
  "id": "call-1-1234567890"
}
```

#### Resposta de Sucesso
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": {
      "message": {
        "parts": [
          {
            "type": "text",
            "text": "Resposta do agente aqui"
          }
        ]
      }
    }
  },
  "id": "call-1-1234567890"
}
```

#### Resposta de Erro
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal error"
  },
  "id": "call-1-1234567890"
}
```

## Uso

### Ativação Automática

O sistema funciona automaticamente quando:

1. Um agente IA está atribuído ao ticket
2. `autoResponse` está habilitado na configuração do agente
3. Uma mensagem é recebida do cliente

### Teste Manual

Use o script de teste fornecido:

```bash
node test-auto-response.cjs
```

### Logs de Debug

Todos os logs são prefixados com `[EVO-AI-JSONRPC]`:

- `🔄` - Requisições em andamento
- `✅` - Operações bem-sucedidas
- `❌` - Erros
- `⚠️` - Avisos e fallbacks
- `📊` - Métricas e estatísticas

## Fallbacks

### Sistema de Fallback em Camadas

1. **JSON-RPC Principal**
   - Tenta comunicação JSON-RPC 2.0
   - Se falhar, vai para fallback

2. **Simulação Inteligente**
   - Respostas contextuais baseadas na mensagem
   - Confiança reduzida (0.6-0.8)
   - Marcado como `fallback: true`

3. **Evolution API**
   - Tenta enviar via Evolution API real
   - Se falhar, simula envio no Firestore

### Indicadores de Fallback

As mensagens incluem metadados indicando o método usado:

```javascript
{
  protocol: 'JSON-RPC 2.0',  // ou 'simulation'
  fallback: false,            // ou true
  confidence: 0.85,           // 0.7-1.0 para JSON-RPC, 0.6-0.8 para simulação
  agentName: 'Nome do Agente'
}
```

## Monitoramento

### Métricas Disponíveis

- Tempo de resposta das requisições JSON-RPC
- Taxa de sucesso vs fallback
- Confiança média das respostas
- Contagem de interações por agente

### Logs de Auditoria

Todas as interações são registradas com:

- ID da sessão
- ID da tarefa
- Timestamp
- Duração do processamento
- Status (sucesso/erro/fallback)

## Troubleshooting

### Problemas Comuns

1. **Erro de Autenticação**
   ```
   ❌ [EVO-AI-JSONRPC] Erro JSON-RPC: JSON-RPC Error 401: Unauthorized
   ```
   - Verifique `EVO_AI_API_KEY` ou `EVO_AI_JWT_SECRET`

2. **Timeout de Conexão**
   ```
   ❌ [EVO-AI-JSONRPC] Timeout: JSON-RPC timeout após 30000ms
   ```
   - Verifique conectividade com `EVO_AI_JSONRPC_URL`

3. **Resposta Vazia**
   ```
   ❌ [EVO-AI-JSONRPC] Erro ao enviar task: Resposta do agente vazia
   ```
   - Agente pode não estar configurado corretamente
   - Verifique se o agente está ativo no Evo AI

### Teste de Conectividade

```javascript
import { evoAiJsonRpcService } from './src/services/evo-ai-jsonrpc-service';

// Testar conexão
const isConnected = await evoAiJsonRpcService.testConnection();
console.log('Conexão:', isConnected ? 'OK' : 'FALHOU');
```

## Desenvolvimento

### Estrutura de Arquivos

- `src/services/evo-ai-jsonrpc-service.ts` - Serviço principal JSON-RPC
- `src/services/ai-attendance-flow.ts` - Fluxo de atendimento integrado
- `src/app/api/webhooks/evolution/messages-upsert/route.ts` - Webhook handler

### Extensões Futuras

- Suporte a múltiplos agentes por sessão
- Cache de respostas frequentes
- Métricas avançadas de performance
- Interface de configuração visual

## Segurança

### Boas Práticas

1. **Nunca** commite credenciais no código
2. Use variáveis de ambiente para todas as configurações
3. Monitore logs para tentativas de acesso não autorizado
4. Implemente rate limiting se necessário

### Dados Sensíveis

O sistema **não** registra:
- Conteúdo completo das mensagens nos logs
- Credenciais de autenticação
- Informações pessoais dos clientes

Apenas metadados e estatísticas são logados para debug.