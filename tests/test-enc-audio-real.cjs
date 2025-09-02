const axios = require('axios');

// Dados reais de áudio .enc da Evolution API
const realEncAudioWebhook = {
  "event": "messages.upsert",
  "instance": "evolution_exchange",
  "data": {
    "key": {
      "remoteJid": "5512999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "TEST_ENC_AUDIO_" + Date.now(),
      "participant": undefined
    },
    "pushName": "Teste Usuario",
    "message": {
      "audioMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc?ccb=11-4&oh=01_Q5AaIghOZzZON-y6rouMFjOaOkBu7f8KmHRP6M5uMpOgBgNg&oe=66C6E5C1&_nc_sid=5e03e0&mms3=true",
        "mimetype": "audio/ogg; codecs=opus",
        "fileSha256": "abcdef1234567890abcdef1234567890abcdef12",
        "fileLength": "12345",
        "seconds": 15,
        "ptt": true,
        "mediaKey": "1234567890abcdef1234567890abcdef1234567890abcdef12",
        "fileEncSha256": "fedcba0987654321fedcba0987654321fedcba09",
        "directPath": "/v/t62.7114-24/12345678901234567890123456789012345678901234567890123456789012345678901234567890.enc",
        "mediaKeyTimestamp": "1692123456"
      }
    },
    "messageType": "audioMessage",
    "messageTimestamp": Date.now()
  }
};

async function testEncAudioProcessing() {
  console.log('🎵 === TESTE DE PROCESSAMENTO DE ÁUDIO .ENC === 🎵\n');
  
  try {
    console.log('📱 Dados do webhook de áudio .enc:');
    console.log(JSON.stringify(realEncAudioWebhook, null, 2));
    
    const audioUrl = realEncAudioWebhook.data.message.audioMessage.url;
    console.log('\n🔍 ANÁLISE DA URL:');
    console.log('📎 URL:', audioUrl);
    console.log('🔒 Contém .enc:', audioUrl.includes('.enc'));
    console.log('🌐 É WhatsApp URL:', audioUrl.includes('whatsapp.net'));
    console.log('🎵 MIME type:', realEncAudioWebhook.data.message.audioMessage.mimetype);
    console.log('⏱️ Duração:', realEncAudioWebhook.data.message.audioMessage.seconds, 'segundos');
    console.log('📞 É PTT:', realEncAudioWebhook.data.message.audioMessage.ptt);
    
    console.log('\n📤 Enviando webhook para o servidor...');
    const response = await axios.post('http://localhost:9003/api/webhooks/evolution', realEncAudioWebhook, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('\n✅ Webhook enviado com sucesso!');
    console.log('📊 Status:', response.status);
    console.log('📋 Resposta:', response.data);
    
    console.log('\n🔍 VERIFICAÇÕES IMPORTANTES:');
    console.log('1. ✅ Webhook foi aceito pelo servidor');
    console.log('2. 🔍 Verificar logs do servidor para:');
    console.log('   - Detecção de URL .enc');
    console.log('   - Tentativa de descriptografia');
    console.log('   - Processo de upload para Firebase Storage');
    console.log('   - Conversão para arquivo .ogg');
    console.log('   - Salvamento da mensagem no Firestore');
    
    console.log('\n⏳ Aguardando processamento no servidor...');
    console.log('📋 Verifique os logs do terminal do servidor para detalhes do processamento.');
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Resposta:', error.response.data);
    }
  }
}

// Executar teste
testEncAudioProcessing().catch(console.error);