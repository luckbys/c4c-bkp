# Configuração da Evolution API

## Problema Identificado

O sistema está recebendo mensagens mas não consegue enviar porque a **Evolution API não está configurada corretamente**.

### Erros Encontrados:
- ❌ `EVOLUTION_API_KEY` não configurada
- ❌ `EVOLUTION_API_URL` usando valor padrão (localhost:8080)
- ❌ Evolution API não está acessível

## Solução

### 1. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env.local`:

```bash
# Evolution API Configuration
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_chave_da_evolution_api
EVOLUTION_WEBHOOK_SECRET=seu_webhook_secret
```

### 2. Obter Credenciais da Evolution API

#### Opção A: Evolution API Hospedada
Se você está usando uma Evolution API hospedada:
1. Acesse o painel da sua Evolution API
2. Vá em **Configurações** > **API Keys**
3. Copie a **API Key** e a **URL base**

#### Opção B: Evolution API Local
Se você tem a Evolution API rodando localmente:
1. Verifique se ela está rodando na porta 8080: `http://localhost:8080`
2. Obtenha a API Key do arquivo de configuração da Evolution API
3. Se não tiver API Key, configure uma no arquivo `.env` da Evolution API

### 3. Verificar Instância do WhatsApp

1. Acesse a Evolution API em: `{EVOLUTION_API_URL}/manager`
2. Verifique se a instância `loja` existe e está conectada
3. Se não existir, crie uma nova instância:
   - Nome: `loja`
   - Escaneie o QR Code com o WhatsApp
   - Aguarde a conexão ser estabelecida

### 4. Testar Configuração

Após configurar, execute o teste:

```bash
node scripts/test-evolution-api.cjs
```

### 5. Exemplo de Configuração Completa

Adicione ao seu `.env.local`:

```bash
# Evolution API Configuration
EVOLUTION_API_URL=https://evolution.exemplo.com
EVOLUTION_API_KEY=B6D9C5F2A8E3D7F1B4C6A9E2D5F8B1C4
EVOLUTION_WEBHOOK_SECRET=webhook_secret_123

# Firebase Configuration (já existente)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw
# ... outras configurações do Firebase
```

## Verificação Final

Após a configuração, o sistema deve:

1. ✅ Conectar com a Evolution API
2. ✅ Verificar status da instância `loja`
3. ✅ Enviar mensagens via WhatsApp
4. ✅ Receber confirmação de entrega

## Troubleshooting

### Erro: "Evolution API offline"
- Verifique se a URL está correta
- Teste o acesso manual: `curl {EVOLUTION_API_URL}`
- Verifique se não há firewall bloqueando

### Erro: "Unauthorized" (401)
- Verifique se a API Key está correta
- Confirme se a API Key não expirou

### Erro: "Instance not found"
- Crie a instância `loja` na Evolution API
- Conecte o WhatsApp escaneando o QR Code

### Erro: "Number does not exist"
- Use números válidos do WhatsApp para teste
- Formato: `5511999999999` (código do país + DDD + número)

## Scripts de Teste

- `node scripts/test-evolution-api.cjs` - Testa conectividade com Evolution API
- `node scripts/diagnose-send-message.cjs` - Diagnóstico completo do envio

---

**Próximos Passos:**
1. Configure as variáveis de ambiente
2. Reinicie a aplicação
3. Execute os testes de verificação
4. Teste o envio de mensagens