# Configuração do Firebase para Produção

## Problema Identificado

O erro "chave API key do Firebase está errada" na produção ocorre porque:

1. **Em desenvolvimento**: O código usa valores padrão (hardcoded) quando as variáveis de ambiente não estão definidas
2. **Em produção**: As variáveis de ambiente não estão configuradas na VPS, causando falha na autenticação

## Solução

### 1. Configurar Variáveis de Ambiente na VPS

Crie um arquivo `.env.local` na sua VPS com as seguintes variáveis:

```bash
# Firebase Client SDK (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id

# Firebase Admin SDK (Backend) - OBRIGATÓRIO para produção
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"seu_projeto",...}'
```

### 2. Obter as Credenciais do Firebase

#### Para o Client SDK (Frontend):
1. Acesse o [Console Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em "Configurações do Projeto" (ícone de engrenagem)
4. Na aba "Geral", role até "Seus apps"
5. Clique no ícone de configuração do seu app web
6. Copie os valores do `firebaseConfig`

#### Para o Admin SDK (Backend):
1. No Console Firebase, vá em "Configurações do Projeto"
2. Clique na aba "Contas de Serviço"
3. Clique em "Gerar nova chave privada"
4. Baixe o arquivo JSON
5. Copie todo o conteúdo do JSON e cole como valor da variável `FIREBASE_SERVICE_ACCOUNT_KEY`

### 3. Configurar na VPS

#### Opção A: Arquivo .env.local
```bash
# Na sua VPS, no diretório do projeto:
cp .env.example .env.local
nano .env.local  # ou vim .env.local
# Cole as variáveis com os valores corretos
```

#### Opção B: Variáveis de Sistema
```bash
# Adicionar ao ~/.bashrc ou ~/.profile
export NEXT_PUBLIC_FIREBASE_API_KEY="sua_api_key"
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
# ... outras variáveis
```

#### Opção C: Docker/Docker Compose
```yaml
# docker-compose.yml
services:
  app:
    environment:
      - NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
      - FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### 4. Verificar a Configuração

Após configurar as variáveis, reinicie a aplicação:

```bash
# Se usando PM2
pm2 restart all

# Se usando Docker
docker-compose restart

# Se rodando diretamente
npm run build
npm start
```

### 5. Logs para Debug

Verifique os logs da aplicação para confirmar a inicialização:

```bash
# Procure por estas mensagens nos logs:
✅ Firebase Admin inicializado com service account
✅ Firebase Admin inicializado com credenciais padrão
```

## Diferenças Importantes

### Desenvolvimento vs Produção

| Aspecto | Desenvolvimento | Produção |
|---------|----------------|----------|
| **Client SDK** | Usa valores padrão se .env não existir | **DEVE** ter variáveis de ambiente |
| **Admin SDK** | Pode usar credenciais padrão | **DEVE** ter FIREBASE_SERVICE_ACCOUNT_KEY |
| **Segurança** | Regras permissivas | Regras restritivas recomendadas |

### Variáveis Críticas para Produção

1. **FIREBASE_SERVICE_ACCOUNT_KEY**: Obrigatória para operações do servidor
2. **NEXT_PUBLIC_FIREBASE_API_KEY**: Necessária para autenticação do cliente
3. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**: Deve corresponder ao projeto correto

## Troubleshooting

### Erro: "Firebase API key is invalid"
- Verifique se `NEXT_PUBLIC_FIREBASE_API_KEY` está definida
- Confirme se a API key está correta no Console Firebase
- Verifique se o domínio está autorizado nas configurações do Firebase

### Erro: "Service account key is invalid"
- Verifique se `FIREBASE_SERVICE_ACCOUNT_KEY` está definida
- Confirme se o JSON está válido (sem quebras de linha)
- Verifique se a conta de serviço tem as permissões necessárias

### Erro: "Project not found"
- Verifique se `NEXT_PUBLIC_FIREBASE_PROJECT_ID` está correto
- Confirme se o projeto existe no Console Firebase

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite arquivos `.env` no Git
- Use variáveis de ambiente seguras na produção
- Configure regras de segurança restritivas no Firestore
- Monitore o uso da API para detectar abusos

## Próximos Passos

1. Configure as variáveis de ambiente na VPS
2. Reinicie a aplicação
3. Teste o login na produção
4. Configure regras de segurança mais restritivas
5. Configure monitoramento e alertas