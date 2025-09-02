// Script de diagnóstico para processamento de imagens
const { WebhookHandlers } = require('./src/services/webhook-handlers');
const { imageMetrics } = require('./src/services/image-metrics');
const { processMediaWithCache } = require('./src/services/media-upload');

async function debugImageProcessing() {
  console.log('🔍 [DEBUG] Iniciando diagnóstico de processamento de imagem...');
  
  // Dados de teste simples
  const testImageData = {
    key: {
      remoteJid: '5512981022013@s.whatsapp.net',
      fromMe: false,
      id: `DEBUG_IMG_${Date.now()}`
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: 'Debug User',
    message: {
      imageMessage: {
        url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        mimetype: 'image/jpeg',
        caption: 'Debug image'
      }
    }
  };
  
  console.log('🔍 [DEBUG] Dados de teste:', {
    messageId: testImageData.key.id,
    hasImageMessage: !!testImageData.message.imageMessage,
    imageUrlLength: testImageData.message.imageMessage.url.length
  });
  
  // Testar métricas antes
  const metricsBefore = imageMetrics.getMetrics();
  console.log('🔍 [DEBUG] Métricas antes:', metricsBefore);
  
  try {
    console.log('🔍 [DEBUG] Testando processMediaWithCache diretamente...');
    
    const result = await processMediaWithCache(
      testImageData.message.imageMessage.url,
      testImageData.key.id,
      'debug',
      'image/jpeg',
      'debug-image.jpg'
    );
    
    console.log('🔍 [DEBUG] Resultado do processMediaWithCache:', result);
    
    // Verificar métricas após
    const metricsAfter = imageMetrics.getMetrics();
    console.log('🔍 [DEBUG] Métricas após:', metricsAfter);
    
    console.log('🔍 [DEBUG] Mudanças nas métricas:', {
      totalAttempts: metricsAfter.totalAttempts - metricsBefore.totalAttempts,
      successfulLoads: metricsAfter.successfulLoads - metricsBefore.successfulLoads,
      failedLoads: metricsAfter.failedLoads - metricsBefore.failedLoads
    });
    
  } catch (error) {
    console.error('🔍 [DEBUG] ❌ Erro no teste direto:', error);
  }
  
  console.log('\n🔍 [DEBUG] Testando WebhookHandlers.handleNewMessage...');
  
  try {
    await WebhookHandlers.handleNewMessage('debug', testImageData);
    console.log('🔍 [DEBUG] ✅ handleNewMessage executado com sucesso');
  } catch (error) {
    console.error('🔍 [DEBUG] ❌ Erro no handleNewMessage:', error);
  }
  
  // Verificar métricas finais
  const metricsFinal = imageMetrics.getMetrics();
  console.log('🔍 [DEBUG] Métricas finais:', metricsFinal);
  
  console.log('🔍 [DEBUG] Diagnóstico concluído!');
}

// Executar diagnóstico
debugImageProcessing().catch(console.error);
