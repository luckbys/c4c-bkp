const axios = require('axios');

// Teste com dados mais realistas de áudio da Evolution API
const realEvolutionAudio = {
  "event": "messages.upsert",
  "instance": "loja",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0C78C4D5E6F7A8B9C0D1E2F3A4B5C", // ID mais realista
      "participant": undefined
    },
    "pushName": "Teste Audio Real",
    "message": {
      "audioMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t62.7114-24/3EB0C78C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0.enc?ccb=11-4&oh=01_AdQABCDEFGHIJKLMNOPQRSTUVWXYZ&oe=12345678&_nc_sid=5e03e0",
        "mimetype": "audio/ogg; codecs=opus",
        "ptt": true,
        "seconds": 8,
        "fileLength": 12345,
        "fileSha256": "abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12",
        "fileEncSha256": "abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12",
        "directPath": "/v/t62.7114-24/3EB0C78C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0.enc",
        // Adicionar thumbnail base64 para teste
        "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      }
    },
    "messageType": "audioMessage",
    "messageTimestamp": Math.floor(Date.now() / 1000),
    "instanceId": "5914f4a1-87e8-434c-a7af-5f1e8c7079f8",
    "source": "web"
  }
};

async function testRealEvolutionAudio() {
  try {
    console.log('🎵 === TESTE DE ÁUDIO REAL DA EVOLUTION API ===');
    console.log('🔍 Dados da mensagem:', JSON.stringify(realEvolutionAudio, null, 2));
    
    console.log('\n📤 Enviando webhook para o servidor...');
    const response = await axios.post('http://localhost:9003/api/webhooks/evolution', realEvolutionAudio, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook enviado com sucesso!');
    console.log('📊 Status:', response.status);
    console.log('📋 Resposta:', response.data);
    
    console.log('\n🔍 VERIFICAÇÕES IMPORTANTES:');
    console.log('1. Verificar logs do servidor para processamento do áudio');
    console.log('2. Verificar se a Evolution API consegue encontrar a mensagem');
    console.log('3. Verificar se o thumbnail base64 está sendo processado');
    console.log('4. Verificar se a extensão .ogg está sendo usada');
    
    const audioUrl = realEvolutionAudio.data.message.audioMessage.url;
    console.log('\n📎 URL do áudio:', audioUrl);
    console.log('🔒 É URL criptografada (.enc):', audioUrl.includes('.enc'));
    console.log('🎵 MIME type:', realEvolutionAudio.data.message.audioMessage.mimetype);
    console.log('⏱️ Duração:', realEvolutionAudio.data.message.audioMessage.seconds, 'segundos');
    console.log('📞 É PTT (Push to Talk):', realEvolutionAudio.data.message.audioMessage.ptt);
    console.log('🖼️ Tem thumbnail:', !!realEvolutionAudio.data.message.audioMessage.jpegThumbnail);
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Resposta:', error.response.data);
    }
  }
}

testRealEvolutionAudio().catch(console.error);