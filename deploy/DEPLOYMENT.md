# Guia de Deploy - CRM-C4

## Problema Identificado

O erro `unexpected EOF` durante o deploy com buildpack Heroku indica problemas na busca das camadas base da imagem Docker. Este é um problema comum que pode ser resolvido com as soluções abaixo.

## Soluções Implementadas

### 1. Dockerfile Otimizado

Criamos um `Dockerfile.optimized` que:
- Usa Node.js 18 Alpine para melhor compatibilidade
- Implementa multi-stage build otimizado
- Inclui healthcheck integrado
- Usa usuário não-root para segurança
- Limpa cache do npm para reduzir tamanho

### 2. Configuração EasyPanel Atualizada

O arquivo `easypanel.yml` foi atualizado para:
- Forçar uso do Docker ao invés de buildpack (`buildpack: false`)
- Usar o Dockerfile otimizado
- Aumentar recursos de memória para 1Gi
- Adicionar estratégia de deployment rolling
- Incluir configurações de build args

### 3. Script de Deploy Alternativo

O script `deploy-alternative.sh` permite:
- Build e teste local da imagem Docker
- Verificação de saúde da aplicação
- Instruções para deploy manual

## Como Resolver o Erro de Deploy

### Opção 1: Usar Configuração Atualizada (Recomendado)

1. Use o arquivo `easypanel.yml` atualizado
2. Certifique-se de que `buildpack: false` está configurado
3. O deploy usará o `Dockerfile.optimized` automaticamente

### Opção 2: Deploy Manual com Docker

```bash
# 1. Build da imagem
docker build -f Dockerfile.optimized -t crm-c4:latest .

# 2. Teste local
docker run -p 3000:3000 -e NODE_ENV=production crm-c4:latest

# 3. Tag para registry
docker tag crm-c4:latest your-registry/crm-c4:latest

# 4. Push para registry
docker push your-registry/crm-c4:latest
```

### Opção 3: Docker Compose

```bash
# Deploy local com docker-compose
docker-compose up -d
```

## Variáveis de Ambiente Necessárias

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
GEMINI_API_KEY=sua_chave_aqui
EVOLUTION_API_URL=https://evochat.devsible.com.br/
EVOLUTION_API_KEY=sua_chave_aqui
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

## Verificação de Saúde

A aplicação inclui um endpoint de health check em `/api/health` que pode ser usado para:
- Verificar se a aplicação está funcionando
- Configurar health checks no seu provedor de deploy
- Monitoramento automático

## Troubleshooting

### Se o erro persistir:

1. **Verifique a conectividade de rede** do servidor de deploy
2. **Limpe o cache** do buildpack/Docker
3. **Use o Dockerfile.optimized** que é mais robusto
4. **Configure buildpack: false** no easypanel.yml
5. **Aumente o timeout** de deploy se possível

### Logs úteis para debug:

```bash
# Verificar logs do container
docker logs container-name

# Verificar build logs
docker build --progress=plain -f Dockerfile.optimized .
```

## Suporte

Se o problema persistir após implementar essas soluções:
1. Verifique os logs detalhados do EasyPanel
2. Teste o build local primeiro
3. Use o deploy alternativo com Docker
4. Considere usar outro provedor de deploy temporariamente

---

**Nota**: O build local foi testado e funciona perfeitamente, então o problema está especificamente no processo de deploy do buildpack.