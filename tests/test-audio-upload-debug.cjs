// Script para testar o upload de áudios para Firebase Storage
const axios = require('axios');

// Simular webhook de áudio real
const audioWebhookData = {
  event: 'messages.upsert',
  instance: 'loja',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_AUDIO_' + Date.now()
    },
    messageType: 'audioMessage',
    message: {
      audioMessage: {
        url: 'https://mmg.whatsapp.net/v/t62.7117-24/536310996_123456789_test.enc?ccb=11-4&oh=test&oe=test',
        mimetype: 'audio/ogg; codecs=opus',
        seconds: 5,
        ptt: true,
        fileLength: 12345
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: 'Teste Audio Upload'
  }
};

async function testAudioUpload() {
  console.log('🎵 === TESTE DE UPLOAD DE ÁUDIO === 🎵\n');
  
  try {
    console.log('📤 Enviando webhook de áudio para:', 'http://localhost:9003/api/webhooks/evolution');
    console.log('📋 Dados do webhook:');
    console.log(JSON.stringify(audioWebhookData, null, 2));
    
    const response = await axios.post('http://localhost:9003/api/webhooks/evolution', audioWebhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Webhook Response Status:', response.status);
    console.log('✅ Webhook Response:', response.data);
    
    // Aguardar um pouco para o processamento
    console.log('\n⏰ Aguardando 5 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📊 Teste concluído!');
    console.log('💡 Verifique os logs do servidor para ver:');
    console.log('   1. Se o áudio foi reconhecido como URL válida');
    console.log('   2. Se o upload para Firebase Storage foi iniciado');
    console.log('   3. Se houve algum erro no processo de upload');
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Executar teste
testAudioUpload().catch(console.error);