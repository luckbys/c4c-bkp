/**
 * Teste específico para verificar processamento de mensagens de vídeo
 * Compara com o processamento de áudio que está funcionando
 */

const axios = require('axios');

// Configurações
const WEBHOOK_URL = 'http://localhost:9003/api/webhooks/evolution';
const API_KEY = 'test-key';

// Simular mensagem de vídeo real da Evolution API
const createVideoMessage = () => {
  return {
    event: 'messages.upsert',
    instance: 'test-instance',
    data: {
      key: {
        remoteJid: '5511999887766@s.whatsapp.net',
        fromMe: false,
        id: `video_test_${Date.now()}`
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: 'Teste Vídeo',
      message: {
        videoMessage: {
          url: 'https://mmg.whatsapp.net/v/t62.7161-24/12345_video.mp4?ccb=11-4&oh=test&oe=test&_nc_sid=test',
          mimetype: 'video/mp4',
          fileLength: 1024000,
          seconds: 30,
          caption: 'Vídeo de teste',
          jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
        }
      }
    }
  };
};

// Simular mensagem de áudio para comparação
const createAudioMessage = () => {
  return {
    event: 'messages.upsert',
    instance: 'test-instance',
    data: {
      key: {
        remoteJid: '5511999887766@s.whatsapp.net',
        fromMe: false,
        id: `audio_test_${Date.now()}`
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: 'Teste Áudio',
      message: {
        audioMessage: {
          url: 'https://mmg.whatsapp.net/v/t62.7114-24/12345_audio.enc?ccb=11-4&oh=test&oe=test&_nc_sid=test',
          mimetype: 'audio/ogg; codecs=opus',
          fileLength: 51200,
          seconds: 15,
          ptt: true
        }
      }
    }
  };
};

// Função para enviar webhook
async function sendWebhook(webhookData, testName) {
  try {
    console.log(`\n🧪 [${testName}] Enviando webhook...`);
    console.log('📋 Dados:', JSON.stringify(webhookData, null, 2));
    
    const response = await axios.post(WEBHOOK_URL, webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      timeout: 30000
    });
    
    console.log(`✅ [${testName}] Webhook enviado com sucesso:`, response.status);
    console.log('📤 Resposta:', response.data);
    
    return { success: true, response: response.data };
  } catch (error) {
    console.error(`❌ [${testName}] Erro ao enviar webhook:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return { success: false, error: error.message };
  }
}

// Função principal de teste
async function runVideoTests() {
  console.log('🎬 INICIANDO TESTES DE PROCESSAMENTO DE VÍDEO');
  console.log('=' .repeat(60));
  
  // Teste 1: Mensagem de vídeo básica
  console.log('\n📹 TESTE 1: Mensagem de vídeo básica');
  const videoMessage = createVideoMessage();
  await sendWebhook(videoMessage, 'VÍDEO BÁSICO');
  
  // Aguardar um pouco entre os testes
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 2: Mensagem de áudio para comparação
  console.log('\n🎵 TESTE 2: Mensagem de áudio para comparação');
  const audioMessage = createAudioMessage();
  await sendWebhook(audioMessage, 'ÁUDIO COMPARAÇÃO');
  
  // Aguardar um pouco entre os testes
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 3: Vídeo com URL direta
  console.log('\n📹 TESTE 3: Vídeo com URL direta');
  const directVideoMessage = {
    ...createVideoMessage(),
    data: {
      ...createVideoMessage().data,
      key: { ...createVideoMessage().data.key, id: `video_direct_${Date.now()}` },
      message: {
        videoMessage: {
          url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
          mimetype: 'video/mp4',
          fileLength: 1048576,
          seconds: 30,
          caption: 'Vídeo com URL direta'
        }
      }
    }
  };
  await sendWebhook(directVideoMessage, 'VÍDEO URL DIRETA');
  
  console.log('\n🏁 TESTES CONCLUÍDOS');
  console.log('=' .repeat(60));
  console.log('\n📊 PRÓXIMOS PASSOS:');
  console.log('1. Verificar logs do console do servidor para debug de vídeos');
  console.log('2. Verificar se vídeos estão sendo salvos no Firebase');
  console.log('3. Comparar processamento de vídeo vs áudio');
  console.log('4. Verificar se URLs de vídeo estão sendo processadas corretamente');
}

// Executar testes
if (require.main === module) {
  runVideoTests().catch(console.error);
}

module.exports = {
  createVideoMessage,
  createAudioMessage,
  sendWebhook,
  runVideoTests
};