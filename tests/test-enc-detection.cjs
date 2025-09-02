const axios = require('axios');

// Simular webhook com áudio .enc para testar detecção
const testEncDetection = async () => {
  console.log('🧪 === TESTE DE DETECÇÃO DE ARQUIVOS .ENC === 🧪');
  
  const webhookData = {
    "event": "messages.upsert",
    "instance": "loja",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST_ENC_DETECTION_" + Date.now()
      },
      "pushName": "Teste Enc",
      "message": {
        "audioMessage": {
          "url": "https://mmg.whatsapp.net/v/t62.7117-24/536882838_744707151667934_6790652857649873145_n.enc?ccb=11-4&oh=01_Q5Aa2QECQmNjsixZg_eT_Z_Z-KAccjJy1UeRVoa4w4FhDpOgxg&oe=68CE884C&_nc_sid=5e03e0&mms3=true",
          "mimetype": "audio/ogg; codecs=opus",
          "fileSha256": "test",
          "fileLength": "12345",
          "seconds": 10
        }
      },
      "messageType": "audioMessage",
      "messageTimestamp": Math.floor(Date.now() / 1000)
    }
  };
  
  try {
    console.log('📤 Enviando webhook com URL .enc...');
    
    const response = await axios.post('http://localhost:9003/api/webhooks/evolution', webhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook enviado com sucesso:');
    console.log('📊 Status:', response.status);
    console.log('📄 Resposta:', response.data);
    
    console.log('\n🔍 Aguarde alguns segundos e verifique os logs do servidor...');
    console.log('🔍 Procure por mensagens com "🔓 [DECRYPT]" nos logs');
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error.message);
    console.error('❌ Erro completo:', error.code || 'Sem código');
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Resposta:', error.response.data);
    } else {
      console.error('❌ Sem resposta do servidor - verifique se está rodando na porta 3000');
    }
  }
};

// Executar teste
testEncDetection();