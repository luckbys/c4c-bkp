const http = require('http');

// Teste simples com timeout
async function testWebhookSimple() {
  console.log('🧪 Teste simples de webhook...');
  
  const webhookPayload = {
    event: 'messages.upsert',
    instance: 'loja',
    data: {
      key: {
        remoteJid: '5512981022013@s.whatsapp.net',
        fromMe: false,
        id: `TEST_MESSAGE_${Date.now()}`,
        participant: undefined
      },
      messageType: 'conversation',
      message: {
        conversation: 'Olá! Preciso de ajuda com meu pedido. Podem me ajudar?'
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: 'Cliente Teste',
      status: 'RECEIVED'
    }
  };
  
  console.log('📤 Enviando para webhook...');
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(webhookPayload);
    
    const options = {
      hostname: 'localhost',
      port: 9003,
      path: '/api/webhooks/evolution/messages-upsert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000 // 10 segundos timeout
    };
    
    const req = http.request(options, (res) => {
      console.log(`📥 Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📄 Resposta: ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('timeout', () => {
      console.log('⏰ Timeout - servidor pode estar processando...');
      req.destroy();
      resolve({ status: 'timeout', data: 'Timeout após 10s' });
    });
    
    req.on('error', (e) => {
      console.error(`❌ Erro: ${e.message}`);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

// Executar
testWebhookSimple()
  .then(result => {
    console.log('\n✅ Teste concluído!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Verifique os logs do servidor Next.js');
    console.log('2. Procure por logs [EXISTING-AGENT] ou [TICKET-AGENT]');
    console.log('3. Verifique se houve resposta automática no WhatsApp');
    console.log('4. Execute: node check-active-tickets.cjs para verificar configuração');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  });