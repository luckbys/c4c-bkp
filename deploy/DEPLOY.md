# Deploy Guide - CRM-C4 Application

Este guia explica como fazer o deploy da aplicação CRM-C4 no EasyPanel usando Heroku:24 stack.

## Pré-requisitos

- Conta no EasyPanel
- Repositório Git com o código da aplicação
- Variáveis de ambiente configuradas

## Arquivos de Deploy Criados

- `Dockerfile` - Configuração do container Docker
- `docker-compose.yml` - Para desenvolvimento local
- `.dockerignore` - Arquivos ignorados no build
- `easypanel.yml` - Configuração específica do EasyPanel
- `.env.example` - Exemplo das variáveis de ambiente
- `src/app/api/health/route.ts` - Endpoint de health check

## Passos para Deploy no EasyPanel

### 1. Preparar o Repositório

```bash
# Adicionar os novos arquivos ao Git
git add .
git commit -m "Add deployment configuration for EasyPanel"
git push origin main
```

### 2. Configurar no EasyPanel

1. **Criar Nova Aplicação**
   - Acesse seu painel do EasyPanel
   - Clique em "Create App"
   - Escolha "Deploy from Git"

2. **Configurar Repositório**
   - Cole a URL do seu repositório Git
   - Selecione a branch `main`
   - Defina o diretório raiz como `/`

3. **Configurar Build**
   - Build Method: `Dockerfile`
   - Dockerfile Path: `./Dockerfile`
   - Build Context: `.`

4. **Configurar Variáveis de Ambiente**
   ```
   NODE_ENV=production
   PORT=3000
   HOSTNAME=0.0.0.0
   GEMINI_API_KEY=sua_chave_gemini_aqui
   EVOLUTION_API_URL=https://evochat.devsible.com.br/
   EVOLUTION_API_KEY=sua_chave_evolution_aqui
   NEXT_PUBLIC_APP_URL=https://seu-dominio.com
   ```

5. **Configurar Porta**
   - Port: `3000`
   - Protocol: `HTTP`

6. **Configurar Health Check**
   - Path: `/api/health`
   - Interval: `30s`
   - Timeout: `10s`
   - Retries: `3`

7. **Configurar Recursos**
   - Memory: `512Mi`
   - CPU: `0.5`

### 3. Deploy

1. Clique em "Deploy"
2. Aguarde o build e deploy completarem
3. Acesse a URL fornecida pelo EasyPanel

## Verificação do Deploy

### Health Check
Acesse `https://seu-dominio.com/api/health` para verificar se a aplicação está funcionando.

### Logs
Verifique os logs no painel do EasyPanel para identificar possíveis problemas.

## Configuração de Domínio

1. **No EasyPanel:**
   - Vá para a seção "Domains"
   - Adicione seu domínio personalizado
   - Configure SSL automático

2. **No seu provedor de DNS:**
   - Crie um registro CNAME apontando para o domínio fornecido pelo EasyPanel
   - Ou configure um registro A com o IP fornecido

## Webhook Configuration

Após o deploy, configure o webhook da Evolution API:

```bash
# Substitua pela URL real da sua aplicação
curl -X POST "https://evochat.devsible.com.br/webhook/set/loja" \
  -H "apikey: SUA_EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://seu-dominio.com/api/webhooks/evolution",
      "webhook_by_events": false,
      "webhook_base64": false,
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

## Troubleshooting

### Build Failures
- Verifique se todas as dependências estão no `package.json`
- Confirme se o `Dockerfile` está correto
- Verifique os logs de build no EasyPanel

### Runtime Errors
- Verifique se todas as variáveis de ambiente estão configuradas
- Confirme se a porta 3000 está sendo usada
- Verifique os logs da aplicação

### Webhook Issues
- Confirme se a URL do webhook está acessível publicamente
- Verifique se o endpoint `/api/webhooks/evolution` existe
- Teste o health check em `/api/health`

## Atualizações

Para atualizar a aplicação:

1. Faça push das mudanças para o repositório
2. No EasyPanel, clique em "Redeploy"
3. Aguarde o novo build e deploy

## Monitoramento

- Use o health check endpoint para monitoramento
- Configure alertas no EasyPanel para falhas
- Monitore os logs regularmente

## Backup

- Configure backup automático dos dados se usando banco de dados
- Mantenha backup das variáveis de ambiente
- Documente todas as configurações personalizadas