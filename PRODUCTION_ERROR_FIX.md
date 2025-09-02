# Correção do Erro 500 em Produção - Firebase Service Account

## 🔍 Problema Identificado

O erro 500 no endpoint `/api/messages` em produção é causado pela **falta da variável de ambiente `FIREBASE_SERVICE_ACCOUNT_KEY`** no servidor de produção.

### Diagnóstico Realizado

✅ **Configurações OK:**
- Evolution API está funcionando corretamente
- Variáveis do Firebase Client SDK estão configuradas
- Endpoint `/api/send-message` está funcionando
- Site em produção está acessível

❌ **Problema Identificado:**
- `FIREBASE_SERVICE_ACCOUNT_KEY` não está configurada
- Firebase Admin SDK não consegue se autenticar
- Operações de escrita no Firestore falham

## 🛠️ Solução

### 1. Obter as Credenciais do Firebase Admin SDK

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione o projeto `cerc-3m1uep`
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Aba **Contas de Serviço**
5. Clique em **Gerar nova chave privada**
6. Baixe o arquivo JSON

### 2. Configurar no Servidor de Produção

#### Opção A: Variável de Ambiente (Recomendado)

```bash
# No servidor de produção, adicione ao .env ou configure diretamente:
export FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  "project_id": "cerc-3m1uep",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}'
```

#### Opção B: Arquivo de Credenciais

```bash
# 1. Fazer upload do arquivo JSON para o servidor
scp firebase-service-account.json user@server:/path/to/app/

# 2. Configurar a variável de ambiente apontando para o arquivo
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/app/firebase-service-account.json"
```

### 3. Reiniciar a Aplicação

```bash
# Reiniciar o servidor/container para carregar as novas variáveis
pm2 restart app
# ou
docker-compose restart
# ou
systemctl restart your-app
```

### 4. Verificar a Correção

```bash
# Testar o endpoint que estava falhando
curl -X POST https://c4c.devsible.com.br/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "loja",
    "remoteJid": "5511999999999@s.whatsapp.net",
    "messageText": "Teste após correção"
  }'
```

## 🔧 Configurações Adicionais

### Variáveis de Ambiente Necessárias

```env
# Firebase Client SDK (já configuradas)
NEXT_PUBLIC_FIREBASE_API_KEY=AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cerc-3m1uep.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cerc-3m1uep
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cerc-3m1uep.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=881065106062
NEXT_PUBLIC_FIREBASE_APP_ID=1:881065106062:web:598a55c9ee155cfa7447df

# Firebase Admin SDK (FALTANDO - PRINCIPAL PROBLEMA)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Evolution API (já configuradas)
EVOLUTION_API_URL=https://evochat.devsible.com.br
EVOLUTION_API_KEY=...

# Ambiente
NODE_ENV=production
```

## 🚨 Segurança

### ⚠️ IMPORTANTE: Proteção das Credenciais

1. **Nunca commitar** o arquivo JSON ou a chave no repositório
2. **Usar variáveis de ambiente** no servidor de produção
3. **Restringir permissões** do arquivo de credenciais (600)
4. **Rotacionar chaves** periodicamente

### Permissões Necessárias

A conta de serviço precisa das seguintes permissões:
- **Cloud Datastore User** (para Firestore)
- **Storage Admin** (para Firebase Storage)
- **Firebase Admin** (para operações administrativas)

## 📋 Checklist de Verificação

- [ ] Credenciais do Firebase Admin SDK obtidas
- [ ] Variável `FIREBASE_SERVICE_ACCOUNT_KEY` configurada no servidor
- [ ] Aplicação reiniciada
- [ ] Teste do endpoint `/api/messages` realizado
- [ ] Logs verificados para confirmar ausência de erros
- [ ] Funcionalidade de envio de mensagens testada no frontend

## 🔍 Troubleshooting

### Se o erro persistir:

1. **Verificar logs do servidor:**
   ```bash
   # PM2
   pm2 logs
   
   # Docker
   docker logs container-name
   
   # Systemd
   journalctl -u your-service -f
   ```

2. **Testar configuração localmente:**
   ```bash
   node scripts/diagnose-production-error.cjs
   ```

3. **Verificar permissões do Firebase:**
   - Console do Firebase > IAM & Admin
   - Verificar se a conta de serviço tem as permissões corretas

4. **Validar formato da chave:**
   ```bash
   echo $FIREBASE_SERVICE_ACCOUNT_KEY | jq .
   ```

## 📞 Suporte

Se o problema persistir após seguir este guia:
1. Verificar logs detalhados do servidor
2. Confirmar que todas as variáveis estão carregadas
3. Testar conectividade com Firebase usando as credenciais
4. Verificar se não há problemas de rede/firewall

---

**Status:** 🔴 Erro identificado - Aguardando configuração da `FIREBASE_SERVICE_ACCOUNT_KEY`
**Prioridade:** 🔥 Alta - Funcionalidade crítica afetada
**Tempo estimado:** ⏱️ 15-30 minutos para implementar a correção