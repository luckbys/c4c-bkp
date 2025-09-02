# Configuração RabbitMQ VPS - Sistema CRM

## ✅ Status da Implementação

**Data:** 29/08/2025  
**Status:** CONCLUÍDO E TESTADO  
**RabbitMQ VPS:** 212.85.0.57:5672  

## 🔧 Configuração Realizada

### 1. Conexão com RabbitMQ na VPS

✅ **Teste de Conectividade Realizado**
- IP da VPS: `212.85.0.57`
- Porta: `5672`
- Usuário: `guest`
- Senha: `Devs@0101`
- Status: **CONECTADO COM SUCESSO**

### 2. Configurações de Ambiente

**Arquivo:** `.env.local`
```env
RABBITMQ_URL=amqp://guest:Devs@0101@212.85.0.57:5672/
RABBITMQ_EXCHANGE_MESSAGES=crm.messages
RABBITMQ_QUEUE_OUTBOUND=crm.messages.outbound
RABBITMQ_QUEUE_INBOUND=crm.messages.inbound
RABBITMQ_QUEUE_WEBHOOKS=crm.webhooks
RABBITMQ_DLQ_SUFFIX=.dlq
```

### 3. Filas Configuradas

✅ **Exchange e Filas Criadas:**
- Exchange: `crm.messages` (tipo: topic)
- Fila Outbound: `crm.messages.outbound`
- Fila Inbound: `crm.messages.inbound`
- Fila Webhooks: `crm.webhooks`
- Dead Letter Queues: `.dlq` para cada fila

### 4. Teste de Funcionalidade

✅ **Testes Realizados:**
- Conexão com VPS: ✅ Sucesso
- Criação de Exchange: ✅ Sucesso
- Criação de Filas: ✅ Sucesso
- Envio de Mensagem: ✅ Sucesso
- Verificação de Estatísticas: ✅ Sucesso

## 🚀 Como Usar

### 1. Servidor de Desenvolvimento

```bash
# O servidor já está configurado e rodando
npm run dev
# Acesse: http://localhost:9003
```

### 2. Testando Mensagens

1. Acesse a aplicação em `http://localhost:9003`
2. Vá para a seção de Chat/Mensagens
3. Envie uma mensagem de teste
4. Verifique os logs do servidor para confirmação

### 3. Monitoramento

**Interface RabbitMQ Management:**
- URL: Disponível na VPS
- Usuário: `guest`
- Senha: `Devs@0101`

## 📊 Componentes Implementados

### Serviços RabbitMQ
- ✅ `RabbitMQService` - Serviço principal
- ✅ `RabbitMQManager` - Gerenciador de conexões
- ✅ `EvolutionQueueProcessor` - Processador de filas Evolution API
- ✅ `WebhookQueueProcessor` - Processador de webhooks
- ✅ `RetryManager` - Gerenciador de retry automático
- ✅ `RabbitMQProvider` - Provider React
- ✅ `RabbitMQMonitor` - Monitor de filas

### Integração Frontend
- ✅ ChatPanel integrado com RabbitMQ
- ✅ Envio de mensagens via filas
- ✅ Processamento de webhooks
- ✅ Retry automático em falhas
- ✅ Dead Letter Queue para mensagens com erro

## 🔍 Arquivos de Teste

### Scripts de Teste Criados
1. `test-rabbitmq-vps.cjs` - Teste de conectividade VPS
2. `test-rabbitmq-integration.cjs` - Teste de integração
3. `.env.rabbitmq.example` - Exemplo de configuração

### Executar Testes

```bash
# Teste de conectividade VPS
node test-rabbitmq-vps.cjs

# Teste de integração
node test-rabbitmq-integration.cjs
```

## 🎯 Próximos Passos

### Para Produção
1. **Configurar SSL/TLS** para conexão segura
2. **Configurar usuários específicos** (não usar guest)
3. **Configurar clustering** para alta disponibilidade
4. **Implementar monitoramento** avançado
5. **Configurar backup** das filas críticas

### Para Desenvolvimento
1. **Testar cenários de falha** (conexão perdida, etc.)
2. **Implementar logs detalhados** para debug
3. **Criar testes automatizados** para CI/CD
4. **Documentar APIs** de mensageria

## 🐛 Troubleshooting

### Problemas Comuns

**Erro de Conexão:**
```bash
# Verificar se RabbitMQ está rodando na VPS
telnet 212.85.0.57 5672
```

**Credenciais Inválidas:**
- Verificar usuário/senha no .env.local
- Confirmar permissões do usuário na VPS

**Filas não Criadas:**
- Verificar logs do servidor Next.js
- Executar teste de conectividade

### Logs Úteis

```bash
# Logs do servidor Next.js
npm run dev

# Logs específicos do RabbitMQ
# Verificar console do navegador na aplicação
```

## 📞 Suporte

Para problemas relacionados ao RabbitMQ:
1. Verificar logs do servidor
2. Executar scripts de teste
3. Verificar conectividade de rede
4. Confirmar configurações de ambiente

---

**Implementação concluída com sucesso!** 🎉

O sistema CRM agora está totalmente integrado com RabbitMQ na VPS, proporcionando:
- ✅ Processamento assíncrono de mensagens
- ✅ Retry automático em falhas
- ✅ Dead Letter Queue para tratamento de erros
- ✅ Monitoramento em tempo real
- ✅ Escalabilidade para alto volume de mensagens