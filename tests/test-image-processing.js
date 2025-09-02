// Teste simples para verificar processamento de imagens
// const { Timestamp } = require('firebase/firestore');

// Simular dados de uma mensagem de imagem como vem da Evolution API
const simulateImageMessage = {
  key: {
    remoteJid: '5512981022013@s.whatsapp.net',
    fromMe: false,
    id: 'TEST_IMAGE_' + Date.now()
  },
  messageTimestamp: Math.floor(Date.now() / 1000),
  pushName: 'Lucas Borges',
  status: 'SERVER_ACK',
  message: {
    imageMessage: {
      // Simular uma mensagem de imagem sem URL (como vem da Evolution API real)
      caption: null,
      url: null,
      mimetype: 'image/jpeg',
      fileSha256: 'test-sha256',
      fileLength: 12345
    }
  }
};

// Função para extrair conteúdo da mensagem (copiada da evolution-api.ts)
function extractMessageContent(message) {
  if (message.conversation) {
    return message.conversation;
  }
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }
  if (message.imageMessage) {
    // Para imagens, retornar a URL se disponível, senão o caption ou texto padrão
    return message.imageMessage.url || message.imageMessage.caption || '📷 Imagem';
  }
  if (message.audioMessage) {
    // Para áudios, retornar a URL se disponível
    return message.audioMessage.url || '🎵 Áudio';
  }
  if (message.documentMessage) {
    // Para documentos, retornar a URL se disponível, senão o nome do arquivo
    return message.documentMessage.url || `📄 ${message.documentMessage.fileName || 'Documento'}`;
  }
  return 'Mensagem não suportada';
}

// Função para detectar tipo da mensagem
function getMessageType(message) {
  if (message.conversation || message.extendedTextMessage) {
    return 'text';
  }
  if (message.imageMessage) {
    return 'image';
  }
  if (message.audioMessage) {
    return 'audio';
  }
  if (message.documentMessage) {
    return 'document';
  }
  return 'unknown';
}

console.log('=== TESTE DE PROCESSAMENTO DE IMAGENS ===\n');

console.log('1. Dados da mensagem simulada:');
console.log(JSON.stringify(simulateImageMessage, null, 2));
console.log('');

console.log('2. Processamento da mensagem:');
const messageContent = extractMessageContent(simulateImageMessage.message);
const messageType = getMessageType(simulateImageMessage.message);

console.log('- Tipo detectado:', messageType);
console.log('- Conteúdo extraído:', messageContent);
console.log('');

console.log('3. Análise do problema:');
if (messageContent === '📷 Imagem') {
  console.log('✅ O conteúdo "📷 Imagem" está sendo gerado corretamente pelo extractMessageContent');
  console.log('❓ O problema deve estar em algum lugar que converte "📷 Imagem" para "[Imagem]"');
} else {
  console.log('❌ Conteúdo inesperado:', messageContent);
}

console.log('');
console.log('4. Verificando se há transformação no frontend:');
console.log('- O texto "📷 Imagem" é salvo no Firebase');
console.log('- Mas aparece como "[Imagem]" na interface');
console.log('- Isso sugere uma transformação no componente de exibição');
