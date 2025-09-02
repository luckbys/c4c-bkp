// Função isValidUrl para teste
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Função extractMessageContent atualizada para teste
function extractMessageContent(message) {
  if (!message) return '';

  // Mensagem de texto
  if (message.messageType === 'conversation' || message.messageType === 'extendedTextMessage') {
    return message.conversation || message.extendedTextMessage?.text || '';
  }

  // Mensagem de imagem
  if (message.messageType === 'imageMessage') {
    const imageMessage = message.imageMessage;
    if (!imageMessage) return '[Imagem]';
    
    // Se tem URL válida, retorna a URL
    if (imageMessage.url && isValidUrl(imageMessage.url)) {
      return imageMessage.url;
    }
    
    // Se tem caption, retorna o caption
    if (imageMessage.caption) {
      return imageMessage.caption;
    }
    
    // Caso contrário, retorna placeholder
    return '[Imagem]';
  }

  // Mensagem de áudio
  if (message.messageType === 'audioMessage') {
    const audioMessage = message.audioMessage;
    if (!audioMessage) return '[Áudio]';
    
    // Se tem URL válida, retorna a URL
    if (audioMessage.url && isValidUrl(audioMessage.url)) {
      return audioMessage.url;
    }
    
    // Caso contrário, retorna placeholder
    return '[Áudio]';
  }

  // Mensagem de documento
  if (message.messageType === 'documentMessage') {
    const documentMessage = message.documentMessage;
    if (!documentMessage) return '[Documento]';
    
    // Se tem URL válida, retorna a URL
    if (documentMessage.url && isValidUrl(documentMessage.url)) {
      return documentMessage.url;
    }
    
    // Se tem fileName, retorna o nome do arquivo
    if (documentMessage.fileName) {
      return documentMessage.fileName;
    }
    
    // Caso contrário, retorna placeholder
    return '[Documento]';
  }

  // Mensagem de vídeo
  if (message.messageType === 'videoMessage') {
    const videoMessage = message.videoMessage;
    if (!videoMessage) return '[Vídeo]';
    
    if (videoMessage.url && isValidUrl(videoMessage.url)) {
      return videoMessage.url;
    }
    
    return '[Vídeo]';
  }

  // Outros tipos de mensagem
  return message.text || message.body || '';
}

async function testImageMessageFix() {
  console.log('🧪 Testando correção de mensagens de imagem...');
  
  // Simular diferentes tipos de mensagens de imagem
  const testCases = [
    {
      name: 'Imagem com URL válida',
      message: {
        messageType: 'imageMessage',
        imageMessage: {
          url: 'https://example.com/image.jpg',
          caption: 'Legenda da imagem'
        }
      }
    },
    {
      name: 'Imagem com URL válida sem legenda',
      message: {
        messageType: 'imageMessage',
        imageMessage: {
          url: 'https://example.com/image.png'
        }
      }
    },
    {
      name: 'Imagem com caption mas sem URL',
      message: {
        messageType: 'imageMessage',
        imageMessage: {
          caption: 'Imagem enviada'
        }
      }
    },
    {
      name: 'Imagem sem dados',
      message: {
        messageType: 'imageMessage',
        imageMessage: {}
      }
    },
    {
      name: 'Imagem com imageMessage null',
      message: {
        messageType: 'imageMessage',
        imageMessage: null
      }
    }
  ];
  
  console.log('\n📋 Resultados dos testes:');
  
  for (const testCase of testCases) {
    const content = extractMessageContent(testCase.message);
    console.log(`\n${testCase.name}:`);
    console.log(`  Conteúdo extraído: "${content}"`);
    
    // Verificar se é uma URL válida
    const isUrl = isValidUrl(content);
    
    console.log(`  É URL válida: ${isUrl}`);
    console.log(`  Tipo detectado: ${isUrl ? 'URL de imagem' : 'Placeholder/Caption'}`);
  }
  
  // Testar também áudio e documento
  console.log('\n🎵 Testando mensagens de áudio:');
  
  const audioTests = [
    {
      name: 'Áudio com URL',
      message: {
        messageType: 'audioMessage',
        audioMessage: {
          url: 'https://example.com/audio.mp3'
        }
      }
    },
    {
      name: 'Áudio sem URL',
      message: {
        messageType: 'audioMessage',
        audioMessage: {}
      }
    }
  ];
  
  for (const audioTest of audioTests) {
    const content = extractMessageContent(audioTest.message);
    console.log(`  ${audioTest.name}: "${content}"`);
  }
  
  console.log('\n📄 Testando mensagens de documento:');
  
  const docTests = [
    {
      name: 'Documento com URL',
      message: {
        messageType: 'documentMessage',
        documentMessage: {
          url: 'https://example.com/document.pdf',
          fileName: 'documento.pdf'
        }
      }
    },
    {
      name: 'Documento sem URL mas com fileName',
      message: {
        messageType: 'documentMessage',
        documentMessage: {
          fileName: 'documento.pdf'
        }
      }
    },
    {
      name: 'Documento sem dados',
      message: {
        messageType: 'documentMessage',
        documentMessage: {}
      }
    }
  ];
  
  for (const docTest of docTests) {
    const content = extractMessageContent(docTest.message);
    console.log(`  ${docTest.name}: "${content}"`);
  }
  
  console.log('\n✅ Teste concluído!');
}

// Executar teste
testImageMessageFix().catch(console.error);
