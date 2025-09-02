// Teste para verificar se mensagens duplicadas estão sendo filtradas
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Carregar variáveis de ambiente
require('dotenv').config();

async function testDuplicateMessagePrevention() {
  console.log('🔍 Testando prevenção de mensagens duplicadas...\n');
  
  // Simular uma mensagem que pode ser duplicada
  const testMessage = {
    event: 'messages.upsert',
    instance: 'test-instance',
    data: {
      key: {
        id: 'test-message-123',
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false
      },
      messageType: 'conversation',
      message: {
        conversation: 'Olá, esta é uma mensagem de teste!'
      },
      messageTimestamp: Date.now(),
      pushName: 'Cliente Teste'
    }
  };
  
  console.log('📨 Mensagem de teste:', {
    messageId: testMessage.data.key.id,
    content: testMessage.data.message.conversation,
    instance: testMessage.instance
  });
  
  try {
    // Simular envio da mesma mensagem múltiplas vezes
    console.log('\n1️⃣ Enviando mensagem pela primeira vez...');
    const response1 = await sendTestWebhook(testMessage);
    console.log('Resposta 1:', response1.status, response1.statusText);
    
    console.log('\n2️⃣ Enviando a mesma mensagem novamente (deve ser filtrada)...');
    const response2 = await sendTestWebhook(testMessage);
    console.log('Resposta 2:', response2.status, response2.statusText);
    
    console.log('\n3️⃣ Enviando a mesma mensagem mais uma vez (deve ser filtrada)...');
    const response3 = await sendTestWebhook(testMessage);
    console.log('Resposta 3:', response3.status, response3.statusText);
    
    // Aguardar um pouco e verificar status
    console.log('\n⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n4️⃣ Verificando status do webhook...');
    const statusResponse = await fetch('http://localhost:3000/api/webhooks/evolution', {
      method: 'GET'
    });
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('📊 Status do sistema de deduplicação:');
      console.log(`   Total de eventos: ${status.deduplication?.totalEvents || 0}`);
      console.log(`   Duplicatas filtradas: ${status.deduplication?.duplicatesFiltered || 0}`);
      console.log(`   Taxa de filtro: ${status.deduplication?.filterRate || 0}%`);
      console.log(`   Tamanho do cache: ${status.deduplication?.cacheSize || 0}`);
    }
    
    console.log('\n✅ Teste de prevenção de duplicatas concluído!');
    console.log('💡 Se as mensagens 2 e 3 foram filtradas, o sistema está funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

async function sendTestWebhook(messageData) {
  const response = await fetch('http://localhost:3000/api/webhooks/evolution', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.EVOLUTION_WEBHOOK_SECRET || 'test-key'
    },
    body: JSON.stringify(messageData)
  });
  
  return response;
}

// Executar teste
testDuplicateMessagePrevention().catch(console.error);