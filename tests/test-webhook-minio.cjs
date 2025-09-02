// Usar fetch nativo do Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Simular um webhook de imagem da Evolution API
const testImageWebhook = {
  "instance": "loja",
  "data": {
    "key": {
      "remoteJid": "5512982771647@s.whatsapp.net",
      "fromMe": false,
      "id": "TEST_IMAGE_" + Date.now()
    },
    "pushName": "Teste Usuario",
    "message": {
      "imageMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t62.7118-24/12345678_123456789012345_1234567890123456789_n.enc?ccb=11-4&oh=01_Q5AaIghTmq1234567890&oe=67890123&_nc_sid=5e03e0&mms3=true",
        "mimetype": "image/jpeg",
        "caption": "Teste de imagem para MinIO",
        "fileSha256": "abcd1234567890",
        "fileLength": "123456",
        "height": 1080,
        "width": 1920,
        "mediaKey": "test123456789",
        "fileEncSha256": "efgh1234567890",
        "directPath": "/v/t62.7118-24/12345678_123456789012345_1234567890123456789_n.enc",
        "mediaKeyTimestamp": "1234567890",
        "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      }
    },
    "messageType": "imageMessage",
    "messageTimestamp": Math.floor(Date.now() / 1000)
  }
};

// Simular um webhook de áudio da Evolution API
const testAudioWebhook = {
  "instance": "loja",
  "data": {
    "key": {
      "remoteJid": "5512982771647@s.whatsapp.net",
      "fromMe": false,
      "id": "TEST_AUDIO_" + Date.now()
    },
    "pushName": "Teste Usuario",
    "message": {
      "audioMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t62.7117-24/12345678_123456789012345_1234567890123456789_n.enc?ccb=11-4&oh=01_Q5AaIghTmq1234567890&oe=67890123&_nc_sid=5e03e0&mms3=true",
        "mimetype": "audio/ogg; codecs=opus",
        "fileSha256": "abcd1234567890",
        "fileLength": "54321",
        "seconds": 15,
        "ptt": true,
        "mediaKey": "test123456789",
        "fileEncSha256": "efgh1234567890",
        "directPath": "/v/t62.7117-24/12345678_123456789012345_1234567890123456789_n.enc",
        "mediaKeyTimestamp": "1234567890"
      }
    },
    "messageType": "audioMessage",
    "messageTimestamp": Math.floor(Date.now() / 1000)
  }
};

// Simular um webhook de vídeo da Evolution API
const testVideoWebhook = {
  "instance": "loja",
  "data": {
    "key": {
      "remoteJid": "5512982771647@s.whatsapp.net",
      "fromMe": false,
      "id": "TEST_VIDEO_" + Date.now()
    },
    "pushName": "Teste Usuario",
    "message": {
      "videoMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t62.7161-24/12345678_123456789012345_1234567890123456789_n.enc?ccb=11-4&oh=01_Q5AaIghTmq1234567890&oe=67890123&_nc_sid=5e03e0&mms3=true",
        "mimetype": "video/mp4",
        "caption": "Teste de vídeo para MinIO",
        "fileSha256": "abcd1234567890",
        "fileLength": "987654",
        "height": 720,
        "width": 1280,
        "seconds": 30,
        "mediaKey": "test123456789",
        "fileEncSha256": "efgh1234567890",
        "directPath": "/v/t62.7161-24/12345678_123456789012345_1234567890123456789_n.enc",
        "mediaKeyTimestamp": "1234567890",
        "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      }
    },
    "messageType": "videoMessage",
    "messageTimestamp": Math.floor(Date.now() / 1000)
  }
};

async function testWebhookProcessing() {
  console.log('🧪 Testando processamento de webhooks para MinIO...');
  
  const webhookUrl = 'http://localhost:9003/api/webhooks/evolution';
  
  try {
    // Teste 1: Webhook de imagem
    console.log('\n📸 Testando webhook de imagem...');
    const imageResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'test-key'
      },
      body: JSON.stringify(testImageWebhook)
    });
    
    const imageResult = await imageResponse.text();
    console.log('📸 Resposta do webhook de imagem:', {
      status: imageResponse.status,
      statusText: imageResponse.statusText,
      body: imageResult
    });
    
    // Aguardar processamento
    console.log('⏳ Aguardando processamento da imagem (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Teste 2: Webhook de áudio
    console.log('\n🎵 Testando webhook de áudio...');
    const audioResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'test-key'
      },
      body: JSON.stringify(testAudioWebhook)
    });
    
    const audioResult = await audioResponse.text();
    console.log('🎵 Resposta do webhook de áudio:', {
      status: audioResponse.status,
      statusText: audioResponse.statusText,
      body: audioResult
    });
    
    // Aguardar processamento
    console.log('⏳ Aguardando processamento do áudio (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Teste 3: Webhook de vídeo
    console.log('\n🎬 Testando webhook de vídeo...');
    const videoResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'test-key'
      },
      body: JSON.stringify(testVideoWebhook)
    });
    
    const videoResult = await videoResponse.text();
    console.log('🎬 Resposta do webhook de vídeo:', {
      status: videoResponse.status,
      statusText: videoResponse.statusText,
      body: videoResult
    });
    
    console.log('\n✅ Teste de webhooks concluído!');
    console.log('📋 Verifique os logs do servidor para ver se os arquivos foram salvos no MinIO.');
    
  } catch (error) {
    console.error('❌ Erro no teste de webhooks:', error);
  }
}

// Executar teste
testWebhookProcessing();