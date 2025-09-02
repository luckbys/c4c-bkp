// Teste específico para verificar se o thumbnail base64 está sendo processado para áudios
const { exec } = require('child_process');
const fs = require('fs');

// Dados de teste com áudio e thumbnail base64
const audioWithThumbnail = {
  "event": "messages.upsert",
  "instance": "loja",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "AUDIO_THUMBNAIL_TEST_" + Date.now()
    },
    "pushName": "Teste Audio Thumbnail",
    "message": {
      "audioMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t62.7114-24/AUDIO_THUMBNAIL_TEST.enc?ccb=11-4&oh=01_AdQABCDEFGHIJKLMNOPQRSTUVWXYZ&oe=12345678&_nc_sid=5e03e0",
        "mimetype": "audio/ogg; codecs=opus",
        "ptt": true,
        "seconds": 12,
        "fileLength": 98765,
        "fileSha256": "abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12",
        "fileEncSha256": "abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12",
        "directPath": "/v/t62.7114-24/AUDIO_THUMBNAIL_TEST.enc",
        // Thumbnail base64 para áudio (waveform visual)
        "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      }
    },
    "messageType": "audioMessage",
    "messageTimestamp": Math.floor(Date.now() / 1000),
    "instanceId": "test-instance-id",
    "source": "web"
  }
};

async function testAudioThumbnail() {
  console.log('🎵 === TESTE: THUMBNAIL BASE64 EM ÁUDIOS === 🎵\n');
  
  try {
    console.log('📤 Enviando webhook com áudio + thumbnail base64...');
    console.log('🔍 Dados do teste:');
    console.log('  - URL:', audioWithThumbnail.data.message.audioMessage.url);
    console.log('  - MIME Type:', audioWithThumbnail.data.message.audioMessage.mimetype);
    console.log('  - Duração:', audioWithThumbnail.data.message.audioMessage.seconds, 'segundos');
    console.log('  - Tem jpegThumbnail:', !!audioWithThumbnail.data.message.audioMessage.jpegThumbnail);
    console.log('  - Tamanho do thumbnail:', audioWithThumbnail.data.message.audioMessage.jpegThumbnail?.length, 'caracteres');
    
    // Salvar dados em arquivo temporário
    const tempFile = 'temp-audio-webhook.json';
    fs.writeFileSync(tempFile, JSON.stringify(audioWithThumbnail, null, 2));
    
    return new Promise((resolve, reject) => {
      const curlCommand = `curl -X POST -H "Content-Type: application/json" -d @${tempFile} http://localhost:9003/api/webhooks/evolution`;
      
      exec(curlCommand, (error, stdout, stderr) => {
        // Limpar arquivo temporário
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {}
        
        if (error) {
          console.log('\n❌ Erro no webhook:', error.message);
          reject(error);
          return;
        }
        
        console.log('\n📥 Resposta do webhook:', stdout);
        if (stderr) {
          console.log('\n⚠️ Stderr:', stderr);
        }
        
        console.log('\n✅ Webhook enviado com sucesso!');
        console.log('\n⏳ Aguardando processamento... (3 segundos)');
        
        setTimeout(() => {
          console.log('\n🔍 Verificando se o thumbnail foi processado nos logs do servidor...');
          console.log('\n📋 Pontos a verificar nos logs:');
          console.log('  1. ✅ Detecção do tipo "audio"');
          console.log('  2. ✅ Detecção do jpegThumbnail');
          console.log('  3. ✅ Conversão do thumbnail para data URL');
          console.log('  4. ✅ Upload do thumbnail para Firebase Storage');
          console.log('  5. ✅ Salvamento da URL do Firebase na mensagem');
          resolve();
        }, 3000);
      });
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testAudioThumbnail().catch(console.error);