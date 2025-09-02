# Configuração do Firebase na VPS EasyPanel

## Problema Identificado

O erro 500 no endpoint `/api/messages` está ocorrendo na VPS EasyPanel (`https://c4c.devsible.com.br`) mas funciona localmente:

```
POST https://c4c.devsible.com.br/api/messages 500 (Internal Server Error)
Error saving message: Error: Failed to save message
```

**Causa:** A variável `FIREBASE_SERVICE_ACCOUNT_KEY` não está configurada corretamente na VPS.

## Solução para EasyPanel

### 1. Acessar o Painel EasyPanel

1. Acesse: `https://easypanel.devsible.com.br`
2. Faça login com suas credenciais
3. Navegue até o projeto/aplicação CRM

### 2. Configurar Variáveis de Ambiente

No painel do EasyPanel, adicione as seguintes variáveis de ambiente:

#### Variáveis do Firebase (Obrigatórias)

```bash
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cerc-3m1uep.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cerc-3m1uep
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cerc-3m1uep.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=881065106062
NEXT_PUBLIC_FIREBASE_APP_ID=1:881065106062:web:598a55c9ee155cfa7447df

# Firebase Admin SDK (CRÍTICO)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"cerc-3m1uep","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

#### Variáveis da Evolution API

```bash
EVOLUTION_API_URL=https://evochat.devsible.com.br
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
EVOLUTION_API_TOKEN=429683C4C977415CAAFCCE10F7D57E11
```

### 3. Obter a Chave do Firebase Admin SDK

1. Acesse o [Console Firebase](https://console.firebase.google.com/)
2. Selecione o projeto `cerc-3m1uep`
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Aba **Contas de Serviço**
5. Clique em **Gerar nova chave privada**
6. Baixe o arquivo JSON
7. **Importante:** Copie todo o conteúdo JSON em uma única linha

### 4. Formato da Variável FIREBASE_SERVICE_ACCOUNT_KEY

A variável deve ser o JSON completo em uma única linha:

```json
{"type":"service_account","project_id":"cerc-3m1uep","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xyz@cerc-3m1uep.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs/firebase-adminsdk-xyz%40cerc-3m1uep.iam.gserviceaccount.com"}
```

### 5. Passos no EasyPanel

1. **Environment Variables:**
   - Clique em "Environment Variables" ou "Variáveis de Ambiente"
   - Adicione cada variável individualmente
   - Para `FIREBASE_SERVICE_ACCOUNT_KEY`, cole o JSON completo

2. **Restart da Aplicação:**
   - Após adicionar todas as variáveis
   - Clique em "Restart" ou "Reiniciar"
   - Aguarde o deploy completar

### 6. Verificação

Após configurar e reiniciar:

1. **Teste o endpoint:**
   ```bash
   curl -X POST https://c4c.devsible.com.br/api/messages \
     -H "Content-Type: application/json" \
     -d '{"instanceName":"loja","remoteJid":"5511999999999@s.whatsapp.net","messageText":"Teste"}'
   ```

2. **Verifique os logs:**
   - No painel EasyPanel, vá em "Logs"
   - Procure por erros relacionados ao Firebase

### 7. Troubleshooting

#### Erro: "Firebase Admin SDK not initialized"
- Verifique se `FIREBASE_SERVICE_ACCOUNT_KEY` está configurada
- Confirme se o JSON está válido (sem quebras de linha extras)

#### Erro: "Invalid private key"
- Regenere a chave no Console Firebase
- Certifique-se de que as quebras de linha estão como `\n`

#### Erro: "Project not found"
- Verifique se `NEXT_PUBLIC_FIREBASE_PROJECT_ID` está correto
- Confirme se o projeto existe no Firebase

### 8. Variáveis Completas para EasyPanel

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cerc-3m1uep.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cerc-3m1uep
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cerc-3m1uep.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=881065106062
NEXT_PUBLIC_FIREBASE_APP_ID=1:881065106062:web:598a55c9ee155cfa7447df
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Evolution API Configuration
EVOLUTION_API_URL=https://evochat.devsible.com.br
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
EVOLUTION_API_TOKEN=429683C4C977415CAAFCCE10F7D57E11

# Other configurations
GEMINI_API_KEY=AIzaSyCb02UOLsV2yiZNq9FK-zZcIdp9KCn91AA
REDIS_HOST=easypanel.devsible.com.br
REDIS_PORT=6379
REDIS_PASSWORD=Devs@0101
REDIS_USERNAME=default
REDIS_URL=redis://default:Devs@0101@easypanel.devsible.com.br:6379
```

---

**Importante:** Após configurar todas as variáveis, reinicie a aplicação no EasyPanel para que as mudanças tenham efeito.