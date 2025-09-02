# Configuração do Redis

## Status Atual
✅ **Sistema funcionando com cache em memória como fallback**

O sistema está configurado para funcionar sem Redis instalado, usando cache em memória. Para melhor performance em produção, recomenda-se instalar o Redis.

## Instalação do Redis no Windows

### Opção 1: Redis via WSL (Recomendado)
```bash
# Instalar WSL se não tiver
wsl --install

# No WSL, instalar Redis
sudo apt update
sudo apt install redis-server

# Iniciar Redis
sudo service redis-server start

# Testar
redis-cli ping
```

### Opção 2: Redis via Docker
```bash
# Instalar Docker Desktop
# Executar Redis em container
docker run -d --name redis -p 6379:6379 redis:latest

# Testar
docker exec -it redis redis-cli ping
```

### Opção 3: Redis para Windows (Não oficial)
```bash
# Via Chocolatey
choco install redis-64

# Via Scoop
scoop install redis

# Iniciar manualmente
redis-server
```

## Configuração

### Arquivo .env
```env
# Redis Configuration (opcional - sistema funciona sem)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
```

### Verificar Conexão
```bash
# Testar conexão Redis
node check-redis-connection.cjs

# Testar sistema de cache
node test-redis-simple.js
```

## Benefícios do Redis vs Cache em Memória

### Cache em Memória (Atual)
✅ Funciona imediatamente  
✅ Sem dependências externas  
✅ Boa para desenvolvimento  
❌ Dados perdidos ao reiniciar  
❌ Limitado à memória do processo  
❌ Não compartilhado entre instâncias  

### Redis
✅ Persistência de dados  
✅ Compartilhamento entre instâncias  
✅ Melhor performance para grandes volumes  
✅ Recursos avançados (pub/sub, clustering)  
❌ Requer instalação e configuração  
❌ Dependência externa  

## Monitoramento

### Métricas Disponíveis
- Hits/Misses do cache
- Taxa de acerto
- Tipo de cache em uso (memory/redis)
- Número de itens em cache
- Latência das operações

### Logs
O sistema registra automaticamente:
- Tentativas de conexão Redis
- Fallback para cache em memória
- Operações de cache (SET/GET/DELETE)
- Limpeza automática de itens expirados

## Troubleshooting

### Redis não conecta
1. Verificar se Redis está rodando: `redis-cli ping`
2. Verificar configurações no .env
3. Verificar firewall/portas
4. Sistema continuará funcionando com cache em memória

### Performance
- Cache em memória: adequado para desenvolvimento
- Redis: recomendado para produção
- Monitorar taxa de acerto do cache
- Ajustar TTL conforme necessário

## Comandos Úteis

```bash
# Verificar status Redis
redis-cli ping

# Monitorar Redis
redis-cli monitor

# Ver informações
redis-cli info

# Limpar cache
redis-cli flushall

# Testar sistema
node test-redis-simple.js
```