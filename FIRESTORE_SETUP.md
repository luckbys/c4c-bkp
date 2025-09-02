# Configuração do Firestore

## Índices Compostos Necessários

Para que as consultas do Firebase funcionem corretamente, você precisa criar os seguintes índices compostos no Firestore:

### 1. Índice para Tickets
- **Coleção**: `tickets`
- **Campos**:
  - `instanceName` (Ascending)
  - `updatedAt` (Descending)

### 2. Índice para Messages
- **Coleção**: `messages`
- **Campos**:
  - `remoteJid` (Ascending)
  - `instanceName` (Ascending)
  - `timestamp` (Descending)

## Como Criar os Índices

### Opção 1: Via Console do Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá para **Firestore Database** > **Indexes**
4. Clique em **Create Index**
5. Configure os campos conforme especificado acima

### Opção 2: Via Firebase CLI
1. Instale o Firebase CLI: `npm install -g firebase-tools`
2. Faça login: `firebase login`
3. Inicialize o projeto: `firebase init firestore`
4. Deploy os índices: `firebase deploy --only firestore:indexes`

### Opção 3: Via Links Diretos (quando aparecerem nos logs)
Quando você executar a aplicação, os links para criar os índices aparecerão nos logs de erro. Clique nos links para criar automaticamente.

## Arquivo de Configuração

O arquivo `firestore.indexes.json` já está configurado com os índices necessários. Para aplicá-los:

```bash
firebase deploy --only firestore:indexes
```

## Status Atual

✅ **Temporariamente resolvido**: As consultas foram modificadas para remover o `orderBy` e fazer a ordenação manualmente no código.

⚠️ **Próximo passo**: Criar os índices compostos para melhorar a performance e reativar as consultas otimizadas.

## Reativando as Consultas Otimizadas

Após criar os índices, você pode reativar as consultas otimizadas removendo os comentários e a ordenação manual nos seguintes arquivos:

- `src/services/firebase-service.ts`
  - Função `getTickets()`
  - Função `subscribeToTickets()`
  - Função `getMessages()`
  - Função `subscribeToMessages()`