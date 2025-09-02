/**
 * Debug específico para verificar se o tipo de mensagem de áudio está sendo detectado corretamente
 */

// Simular o método getMessageType da Evolution API
function getMessageType(message) {
  console.log('🔍 [DEBUG] Verificando tipo de mensagem:', {
    hasImageMessage: !!message.imageMessage,
    hasVideoMessage: !!message.videoMessage,
    hasAudioMessage: !!message.audioMessage,
    hasDocumentMessage: !!message.documentMessage,
    hasStickerMessage: !!message.stickerMessage,
    hasConversation: !!message.conversation,
    hasExtendedTextMessage: !!message.extendedTextMessage
  });
  
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.audioMessage) return 'audio';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  return 'text';
}

// Simular mensagem de áudio como enviada pelo test-enc-audio-real.cjs
function createTestAudioMessage() {
  return {
    key: {
      remoteJid: '5512999999999@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_ENC_AUDIO_' + Date.now()
    },
    message: {
      audioMessage: {
        url: 'https://mmg.whatsapp.net/o1/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc?ccb=11-4&oh=01_Q5AaIghOZzZON-y6rouMFjOaOkBu7f8KmHRP6M5uMpOgBgNg&oe=66C6E5C1&_nc_sid=5e03e0&mms3=true',
        mimetype: 'audio/ogg; codecs=opus',
        seconds: 15,
        ptt: true,
        fileLength: '123456',
        fileSha256: 'abcdef1234567890abcdef1234567890abcdef12',
        fileEncSha256: 'fedcba0987654321fedcba0987654321fedcba09',
        directPath: '/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc',
        mediaKeyTimestamp: '1692123456'
      }
    },
    messageType: 'audioMessage',
    messageTimestamp: Date.now()
  };
}

// Simular o método convertMessage
function convertMessage(evolutionMessage) {
  const messageType = getMessageType(evolutionMessage.message);
  
  console.log('🔄 [DEBUG] Convertendo mensagem:', {
    messageId: evolutionMessage.key?.id,
    detectedType: messageType,
    hasMessage: !!evolutionMessage.message,
    messageKeys: Object.keys(evolutionMessage.message || {})
  });
  
  return {
    isFromMe: evolutionMessage.key.fromMe,
    id: evolutionMessage.key.id,
    content: 'audio_content_placeholder',
    timestamp: new Date(evolutionMessage.messageTimestamp),
    sender: evolutionMessage.key.fromMe ? 'agent' : 'client',
    type: messageType,
    status: 'sent',
    senderName: evolutionMessage.pushName || 'Usuário',
  };
}

async function debugAudioType() {
  console.log('🎵 === DEBUG AUDIO TYPE DETECTION === 🎵\n');
  
  try {
    // 1. Criar mensagem de teste
    console.log('📱 Criando mensagem de áudio de teste...');
    const testMessage = createTestAudioMessage();
    
    console.log('📋 Estrutura da mensagem:', JSON.stringify(testMessage, null, 2));
    
    // 2. Testar detecção de tipo
    console.log('\n🔍 Testando detecção de tipo...');
    const messageType = getMessageType(testMessage.message);
    console.log(`✅ Tipo detectado: ${messageType}`);
    
    // 3. Testar conversão completa
    console.log('\n🔄 Testando conversão completa...');
    const convertedMessage = convertMessage(testMessage);
    
    console.log('📊 Mensagem convertida:', {
      id: convertedMessage.id,
      type: convertedMessage.type,
      content: convertedMessage.content,
      sender: convertedMessage.sender,
      isFromMe: convertedMessage.isFromMe
    });
    
    // 4. Verificar se o tipo é 'audio'
    if (convertedMessage.type === 'audio') {
      console.log('\n✅ SUCESSO: Tipo de mensagem detectado corretamente como \'audio\'');
    } else {
      console.log(`\n❌ ERRO: Tipo esperado 'audio', mas detectado '${convertedMessage.type}'`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
  }
}

// Executar debug
debugAudioType().catch(console.error);