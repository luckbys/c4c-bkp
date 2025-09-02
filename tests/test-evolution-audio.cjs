const axios = require('axios');

// Simular uma mensagem de áudio real da Evolution API
const realAudioMessage = {
  event: 'messages.upsert',
  instance: 'loja',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'EVOLUTION_AUDIO_' + Date.now(),
      participant: undefined
    },
    pushName: 'Usuario Teste',
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

async function testEvolutionAudio() {
  console.log('🎵 === TESTE DE ÁUDIO DA EVOLUTION API === 🎵\n');
  
  try {
    console.log('📱 Simulando mensagem de áudio da Evolution API...');
    console.log('🔍 Dados da mensagem:', JSON.stringify(realAudioMessage, null, 2));
    
    console.log('\n📤 Enviando webhook para o servidor...');
    const response = await axios.post('http://localhost:9003/api/webhooks/evolution', realAudioMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Webhook enviado com sucesso!');
    console.log('📊 Status:', response.status);
    console.log('📋 Resposta:', response.data);
    
    console.log('\n🔍 VERIFICAÇÕES IMPORTANTES:');
    console.log('1. Verificar logs do servidor para processamento do áudio');
    console.log('2. Verificar se a URL .enc está sendo detectada');
    console.log('3. Verificar se o upload para Firebase Storage está acontecendo');
    console.log('4. Verificar se a extensão .ogg está sendo usada');
    
    const audioUrl = realAudioMessage.data.message.audioMessage.url;
    console.log('\n📎 URL do áudio:', audioUrl);
    console.log('🔒 É URL criptografada (.enc):', audioUrl.includes('.enc'));
    console.log('🎵 MIME type:', realAudioMessage.data.message.audioMessage.mimetype);
    console.log('⏱️ Duração:', realAudioMessage.data.message.audioMessage.seconds, 'segundos');
    console.log('📞 É PTT (Push to Talk):', realAudioMessage.data.message.audioMessage.ptt);
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error.message);
    if (error.response) {
      console.error('📊 Status do erro:', error.response.status);
      console.error('📋 Dados do erro:', error.response.data);
    }
  }
}

// Executar teste
testEvolutionAudio().catch(console.error);