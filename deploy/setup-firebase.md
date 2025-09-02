# Configuração do Firebase

Para configurar o Firebase corretamente, siga estes passos:

## 1. Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

## 2. Fazer login no Firebase
```bash
firebase login
```

## 3. Inicializar o projeto Firebase
```bash
firebase init firestore
```

## 4. Aplicar as regras de segurança
```bash
firebase deploy --only firestore:rules
```

## 5. Configurar as regras de segurança no Console Firebase

Alternativamente, você pode configurar as regras diretamente no Console Firebase:

1. Acesse https://console.firebase.google.com/
2. Selecione seu projeto: `cerc-3m1uep`
3. Vá para "Firestore Database"
4. Clique na aba "Regras"
5. Substitua as regras existentes por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita para todas as coleções (apenas para desenvolvimento)
    // Em produção, você deve implementar regras de segurança mais restritivas
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. Clique em "Publicar"

## Estrutura das Coleções

O sistema criará automaticamente as seguintes coleções:

### `messages`
- `remoteJid`: string (ID do chat no WhatsApp)
- `messageId`: string (ID único da mensagem)
- `content`: string (conteúdo da mensagem)
- `sender`: 'client' | 'agent'
- `timestamp`: timestamp
- `status`: 'sent' | 'delivered' | 'read'
- `type`: 'text' | 'image' | 'audio' | 'document' | 'note'
- `instanceName`: string (nome da instância)
- `isFromMe`: boolean
- `pushName`: string (nome do remetente)

### `tickets`
- `remoteJid`: string (ID do chat no WhatsApp)
- `instanceName`: string (nome da instância)
- `client`: object (dados do cliente)
- `status`: 'open' | 'pending' | 'resolved' | 'closed'
- `lastMessage`: string
- `lastMessageTime`: timestamp
- `unreadCount`: number
- `createdAt`: timestamp
- `updatedAt`: timestamp

## Nota Importante

As regras atuais permitem acesso total ao banco de dados. Em produção, você deve implementar:

1. Autenticação de usuários
2. Regras de segurança baseadas em roles
3. Validação de dados
4. Limitação de acesso por instância