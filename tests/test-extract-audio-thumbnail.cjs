// Teste direto da função extractDirectMediaUrl para áudios com jpegThumbnail
const path = require('path');

// Simular a função extractDirectMediaUrl
class WebhookHandlers {
  static extractDirectMediaUrl(messageData, mediaType) {
    let mediaMsg;
    
    // Selecionar o tipo correto de mensagem de mídia
    switch (mediaType) {
      case 'image':
        mediaMsg = messageData.imageMessage;
        break;
      case 'video':
        mediaMsg = messageData.videoMessage;
        break;
      case 'audio':
        mediaMsg = messageData.audioMessage;
        break;
      case 'document':
        mediaMsg = messageData.documentMessage;
        break;
      case 'sticker':
        mediaMsg = messageData.stickerMessage;
        break;
      default:
        return null;
    }
    
    if (!mediaMsg) return null;
    
    // Verificar URL direta
    if (mediaMsg.url && this.isValidMediaUrl(mediaMsg.url)) {
      return mediaMsg.url;
    }
    
    // Verificar dados base64 inline (jpegThumbnail)
    if (mediaMsg.jpegThumbnail) {
      // jpegThumbnail é sempre uma imagem JPEG, independente do tipo de mídia
      const mimeType = 'image/jpeg';
      const base64Data = mediaMsg.jpegThumbnail;
      
      console.log('🎵 [AUDIO THUMBNAIL] Detectado jpegThumbnail:', {
        length: base64Data.length,
        mimeType: mimeType,
        startsWithData: base64Data.startsWith('data:'),
        preview: base64Data.substring(0, 50) + '...'
      });
      
      // Verificar se já é uma data URL
      if (base64Data.startsWith('data:')) {
        console.log('✅ [AUDIO THUMBNAIL] Já é data URL');
        return base64Data;
      } else {
        // Limpar qualquer prefixo e criar data URL
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        const dataUrl = `data:${mimeType};base64,${cleanBase64}`;
        console.log('✅ [AUDIO THUMBNAIL] Data URL criada:', dataUrl.substring(0, 100) + '...');
        return dataUrl;
      }
    }
    
    // Para stickers, verificar thumbnail
    if (mediaMsg.thumbnail) {
      const mimeType = mediaMsg.mimetype || this.getMimeTypeForMediaType(mediaType);
      const base64Data = mediaMsg.thumbnail;
      
      if (base64Data.startsWith('data:')) {
        return base64Data;
      } else {
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        return `data:${mimeType};base64,${cleanBase64}`;
      }
    }
    
    console.log('❌ [AUDIO THUMBNAIL] Nenhum thumbnail encontrado');
    return null;
  }
  
  static isValidMediaUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Verificar se é uma data URL válida
    if (url.startsWith('data:')) {
      return true;
    }
    
    // Rejeitar URLs criptografadas do WhatsApp (.enc)
    if (url.includes('.enc')) {
      return false;
    }
    
    // Verificar se é uma URL HTTP/HTTPS válida
    return url.startsWith('http://') || url.startsWith('https://');
  }
  
  static getMimeTypeForMediaType(mediaType) {
    switch (mediaType) {
      case 'image':
        return 'image/jpeg';
      case 'video':
        return 'video/mp4';
      case 'audio':
        return 'image/jpeg'; // Para thumbnails de áudio, usar MIME type de imagem
      case 'sticker':
        return 'image/webp';
      case 'document':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}

// Dados de teste - áudio com jpegThumbnail
const audioMessageData = {
  audioMessage: {
    url: "https://mmg.whatsapp.net/o1/v/t62.7114-24/AUDIO_THUMBNAIL_TEST.enc?ccb=11-4&oh=01_AdQABCDEFGHIJKLMNOPQRSTUVWXYZ&oe=12345678&_nc_sid=5e03e0",
    mimetype: "audio/ogg; codecs=opus",
    ptt: true,
    seconds: 12,
    fileLength: 98765,
    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
  }
};

// Dados de teste - áudio sem jpegThumbnail
const audioMessageDataNoThumbnail = {
  audioMessage: {
    url: "https://mmg.whatsapp.net/o1/v/t62.7114-24/AUDIO_NO_THUMBNAIL.enc?ccb=11-4&oh=01_AdQABCDEFGHIJKLMNOPQRSTUVWXYZ&oe=12345678&_nc_sid=5e03e0",
    mimetype: "audio/ogg; codecs=opus",
    ptt: true,
    seconds: 8
    // Sem jpegThumbnail
  }
};

function testAudioThumbnailExtraction() {
  console.log('🎵 === TESTE: EXTRAÇÃO DE THUMBNAIL DE ÁUDIO === 🎵\n');
  
  console.log('📋 TESTE 1: Áudio COM jpegThumbnail');
  console.log('🔍 Dados de entrada:');
  console.log('  - URL:', audioMessageData.audioMessage.url);
  console.log('  - MIME Type:', audioMessageData.audioMessage.mimetype);
  console.log('  - Tem jpegThumbnail:', !!audioMessageData.audioMessage.jpegThumbnail);
  console.log('  - Tamanho do thumbnail:', audioMessageData.audioMessage.jpegThumbnail?.length);
  
  const result1 = WebhookHandlers.extractDirectMediaUrl(audioMessageData, 'audio');
  console.log('\n📤 Resultado:');
  console.log('  - Retornou URL:', !!result1);
  console.log('  - Tipo de URL:', result1 ? (result1.startsWith('data:') ? 'data URL' : 'http URL') : 'null');
  console.log('  - Preview:', result1 ? result1.substring(0, 100) + '...' : 'null');
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  console.log('📋 TESTE 2: Áudio SEM jpegThumbnail');
  console.log('🔍 Dados de entrada:');
  console.log('  - URL:', audioMessageDataNoThumbnail.audioMessage.url);
  console.log('  - MIME Type:', audioMessageDataNoThumbnail.audioMessage.mimetype);
  console.log('  - Tem jpegThumbnail:', !!audioMessageDataNoThumbnail.audioMessage.jpegThumbnail);
  
  const result2 = WebhookHandlers.extractDirectMediaUrl(audioMessageDataNoThumbnail, 'audio');
  console.log('\n📤 Resultado:');
  console.log('  - Retornou URL:', !!result2);
  console.log('  - Tipo de URL:', result2 ? (result2.startsWith('data:') ? 'data URL' : 'http URL') : 'null');
  console.log('  - Preview:', result2 ? result2.substring(0, 100) + '...' : 'null');
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  console.log('📊 RESUMO DOS TESTES:');
  console.log('  1. ✅ Áudio com thumbnail:', result1 ? '✅ SUCESSO' : '❌ FALHOU');
  console.log('  2. ✅ Áudio sem thumbnail:', result2 ? '⚠️ URL .enc retornada' : '✅ Null retornado (esperado)');
  
  if (result1 && result1.startsWith('data:image/jpeg;base64,')) {
    console.log('\n🎉 TESTE PASSOU: Thumbnail de áudio foi convertido corretamente para data URL!');
  } else {
    console.log('\n❌ TESTE FALHOU: Thumbnail de áudio não foi processado corretamente');
    console.log('   Esperado: data:image/jpeg;base64,...');
    console.log('   Recebido:', result1 ? result1.substring(0, 50) + '...' : 'null');
  }
}

// Executar teste
testAudioThumbnailExtraction();