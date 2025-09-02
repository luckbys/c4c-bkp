const axios = require('axios');

// Simular um webhook de áudio real da Evolution API
async function testRealAudioWebhook() {
  console.log('🎵 Testando webhook de áudio com URL real...');
  
  // Dados simulados mais realistas de um webhook de áudio da Evolution API
  const webhookData = {
    event: 'messages.upsert',
    instance: 'loja',
    data: {
      key: {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
        id: 'REAL_AUDIO_' + Date.now()
      },
      pushName: 'Teste Audio Real',
      message: {
        audioMessage: {
          url: 'https://mmg.whatsapp.net/o1/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc?ccb=11-4&oh=01_AdQABCDEFGHIJKLMNOPQRSTUVWXYZ&oe=12345678&_nc_sid=5e03e0',
          mimetype: 'audio/ogg; codecs=opus',
          seconds: 15,
          ptt: true,
          fileLength: 54321,
          mediaKey: 'abcdefghijklmnopqrstuvwxyz1234567890',
          fileEncSha256: 'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12',
          fileSha256: 'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12',
          directPath: '/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc'
        }
      },
      messageType: 'audioMessage',
      messageTimestamp: Math.floor(Date.now() / 1000),
      instanceId: '5914f4a1-87e8-434c-a7af-5f1e8c7079f8',
      source: 'web'
    }
  };
  
  try {
    console.log('📤 Enviando webhook para:', 'http://localhost:3000/webhook/loja');
    console.log('📋 Dados do webhook:');
    console.log(JSON.stringify(webhookData, null, 2));
    
    const response = await axios.post('http://localhost:3000/webhook/loja', webhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Webhook Response Status:', response.status);
    console.log('✅ Webhook Response:', response.data);
    console.log('✅ Teste concluído com sucesso!');
    
    console.log('📊 Resultado:', {
      status: response.status,
      data: JSON.stringify(response.data)
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Executar teste
testRealAudioWebhook().catch(console.error);

// Aguardar um pouco para ver os logs do processamento
setTimeout(() => {
  console.log('\n⏰ Aguardando processamento... Verifique os logs do aplicativo para ver se o áudio foi processado.');
}, 3000);