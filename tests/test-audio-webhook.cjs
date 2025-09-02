const https = require('https');
const http = require('http');

// Simular uma mensagem de áudio real da Evolution API com URL criptografada
const testAudioMessage = {
  event: 'messages.upsert',
  instance: 'loja',
  data: {
    key: {
      remoteJid: '5512981022013@s.whatsapp.net',
      fromMe: false,
      id: 'REAL_AUDIO_' + Date.now(),
      participant: undefined
    },
    pushName: 'Teste Usuario',
    status: 'SERVER_ACK',
    message: {
      audioMessage: {
        url: 'https://mmg.whatsapp.net/o1/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc?ccb=11-4&oh=01_AdQABCDEFGHIJKLMNOPQRSTUVWXYZ&oe=12345678&_nc_sid=5e03e0',
        mimetype: 'audio/ogg; codecs=opus',
        fileLength: '54321',
        seconds: 15,
        ptt: true,
        mediaKey: 'abcdefghijklmnopqrstuvwxyz1234567890',
        fileEncSha256: 'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12',
        fileSha256: 'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12',
        directPath: '/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc'
      }
    },
    contextInfo: undefined,
    messageType: 'audioMessage',
    messageTimestamp: Math.floor(Date.now() / 1000),
    instanceId: '5914f4a1-87e8-434c-a7af-5f1e8c7079f8',
    source: 'web'
  }
};

// Função para enviar webhook
function sendWebhook(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 9003,
      path: '/api/webhooks/evolution',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': 'webhook_secret_key_2024'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('✅ Webhook Response Status:', res.statusCode);
        console.log('✅ Webhook Response:', responseData);
        resolve({ status: res.statusCode, data: responseData });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro ao enviar webhook:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Executar teste
async function runTest() {
  console.log('🧪 Iniciando teste de webhook de áudio com URL criptografada...');
  console.log('📱 Dados da mensagem:', JSON.stringify(testAudioMessage, null, 2));
  
  try {
    const result = await sendWebhook(testAudioMessage);
    console.log('✅ Teste concluído com sucesso!');
    console.log('📊 Resultado:', result);
  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }
}

// Executar o teste
runTest();