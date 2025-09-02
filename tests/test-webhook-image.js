// Teste para simular webhook de imagem real
const { WebhookHandlers } = require('./src/services/webhook-handlers.ts');

// Simular dados reais de webhook da Evolution API para imagem
const realImageWebhookData = {
  "key": {
    "remoteJid": "5512981022013@s.whatsapp.net",
    "fromMe": false,
    "id": "TEST_WEBHOOK_" + Date.now()
  },
  "messageTimestamp": Math.floor(Date.now() / 1000),
  "pushName": "Lucas Borges",
  "status": "SERVER_ACK",
  "message": {
    "imageMessage": {
      "caption": null,
      "url": null,
      "mimetype": "image/jpeg",
      "fileSha256": "test-sha256",
      "fileLength": 12345,
      "height": 1080,
      "width": 1920
    }
  }
};

async function testWebhookImageProcessing() {
  console.log('=== TESTE DE WEBHOOK DE IMAGEM ===\n');
  
  console.log('1. Dados do webhook simulado:');
  console.log(JSON.stringify(realImageWebhookData, null, 2));
  console.log('');
  
  try {
    console.log('2. Processando via webhook handler...');
    await WebhookHandlers.handleNewMessage('loja', realImageWebhookData);
    console.log('✅ Webhook processado com sucesso!');
    
    console.log('\n3. Verificando no Firebase...');
    console.log('Execute: node check-firebase.js para ver o resultado');
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWebhookImageProcessing().catch(console.error);
