const http = require('http');

// Configuração
const WEBHOOK_URL = 'http://localhost:9004/api/webhooks/evolution/messages-upsert';
const TICKET_PHONE = '5512981022013@s.whatsapp.net'; // Número específico do usuário
const INSTANCE_NAME = 'loja';

// Simular mensagem do WhatsApp
function createTestMessage(messageText) {
  return {
    event: 'messages.upsert',
    instance: INSTANCE_NAME,
    data: {
      key: {
        remoteJid: TICKET_PHONE,
        fromMe: false,
        id: 'TEST_MESSAGE_' + Date.now(),
        participant: undefined
      },
      messageType: 'conversation',
      message: {
        conversation: messageText
      },
      messageTimestamp: Date.now(),
      pushName: 'Cliente Teste',
      status: 'RECEIVED'
    }
  };
}

// Enviar webhook de teste
async function sendTestWebhook(messageText) {
  return new Promise((resolve, reject) => {
    const testData = createTestMessage(messageText);
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 9004,
      path: '/api/webhooks/evolution/messages-upsert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log(`📤 Enviando mensagem de teste: "${messageText}"`);
    console.log(`📱 Para: ${TICKET_PHONE}`);
    console.log(`🏢 Instância: ${INSTANCE_NAME}`);
    
    const req = http.request(options, (res) => {
      console.log(`📊 Status da resposta: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ Webhook processado:`, jsonData);
        } catch (e) {
          console.log(`📄 Resposta raw:`, data);
        }
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (e) => {
      console.error(`❌ Erro na requisição: ${e.message}`);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

// Função principal de teste
async function testAutoResponse() {
  console.log('🧪 TESTE DE RESPOSTA AUTOMÁTICA');
  console.log('================================');
  console.log('Este script simula uma mensagem do WhatsApp para testar se o agente IA responde automaticamente.');
  console.log('');
  
  try {
    // Lista de mensagens de teste
    const testMessages = [
      'Olá! Preciso de ajuda com meu pedido.',
      'Qual é o horário de funcionamento?',
      'Como faço para cancelar minha compra?'
    ];
    
    console.log(`🎯 Testando resposta automática para o número: ${TICKET_PHONE}`);
    console.log(`🏢 Instância: ${INSTANCE_NAME}`);
    console.log('');
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n--- TESTE ${i + 1}/${testMessages.length} ---`);
      
      await sendTestWebhook(message);
      
      // Aguardar um pouco entre as mensagens
      if (i < testMessages.length - 1) {
        console.log('⏳ Aguardando 3 segundos antes da próxima mensagem...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO!');
    console.log('');
    console.log('📋 COMO VERIFICAR SE FUNCIONOU:');
    console.log('1. 📱 Verifique o WhatsApp do número de teste se recebeu respostas automáticas');
    console.log('2. 📊 Monitore os logs do servidor Next.js em tempo real');
    console.log('3. 🔍 Procure por mensagens como:');
    console.log('   - "[EXISTING-AGENT] Ticket ativo encontrado"');
    console.log('   - "[TICKET-AGENT] Resposta enviada via WhatsApp"');
    console.log('   - "📤 [AGENT] Resposta enviada via WhatsApp"');
    console.log('');
    console.log('⚠️ SE NÃO FUNCIONOU, VERIFIQUE:');
    console.log('1. 🔗 Servidor Next.js está rodando (npm run dev)');
    console.log('2. 🌐 Evolution API está configurado e conectado');
    console.log('3. 📞 Webhook está configurado corretamente no Evolution API');
    console.log('4. 🔑 API Keys estão corretas');
    console.log('5. 📱 Instância WhatsApp está ativa e conectada');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste
console.log('🚀 Iniciando teste de resposta automática...');
testAutoResponse()
  .then(() => {
    console.log('\n✅ Script de teste finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  });