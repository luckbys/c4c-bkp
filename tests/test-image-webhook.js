const https = require('https');
const http = require('http');

// Simular uma mensagem de imagem real da Evolution API
const testImageMessage = {
  event: 'messages.upsert',
  instance: 'loja',
  data: {
    key: {
      remoteJid: '5512981022013@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_IMAGE_' + Date.now(),
      participant: undefined
    },
    pushName: 'Teste Usuario',
    status: 'SERVER_ACK',
    message: {
      imageMessage: {
        url: 'https://example.com/test-image.jpg',
        caption: 'Esta é uma imagem de teste',
        mimetype: 'image/jpeg',
        fileLength: '123456',
        height: 1080,
        width: 1920
      }
    },
    contextInfo: undefined,
    messageType: 'imageMessage',
    messageTimestamp: Math.floor(Date.now() / 1000),
    instanceId: '5914f4a1-87e8-434c-a7af-5f1e8c7079f8',
    source: 'web'
  }
};

function testImageWebhook() {
  console.log('Enviando mensagem de imagem de teste...');
  console.log('Dados da mensagem:', JSON.stringify(testImageMessage, null, 2));
  
  const postData = JSON.stringify(testImageMessage);
  
  const options = {
    hostname: 'localhost',
    port: 9002,
    path: '/api/webhooks/evolution',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Resposta do webhook:', result);
        
        if (res.statusCode === 200) {
          console.log('✅ Mensagem de imagem enviada com sucesso!');
        } else {
          console.log('❌ Erro ao enviar mensagem de imagem:', result);
        }
      } catch (error) {
        console.log('Resposta do servidor:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Erro:', error);
  });
  
  req.write(postData);
  req.end();
}

testImageWebhook();
