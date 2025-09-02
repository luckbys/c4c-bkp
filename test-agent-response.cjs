const http = require('http');

// Simular mensagem do WhatsApp para testar resposta automática
async function testAgentResponse() {
  console.log('🤖 Testando resposta automática do agente...');
  
  // Dados da mensagem simulada
  const messageData = {
    event: 'messages.upsert',
    instance: 'loja', // Nome da instância
    data: {
      key: {
        remoteJid: '5512981022013@s.whatsapp.net', // Número que tem ticket ativo
        fromMe: false, // Mensagem recebida (não enviada)
        id: 'TEST_AUTO_RESPONSE_' + Date.now(),
        participant: undefined
      },
      messageType: 'conversation',
      message: {
        conversation: 'Olá! Preciso de ajuda com meu pedido. Podem me ajudar?'
      },
      messageTimestamp: Date.now(),
      pushName: 'Cliente Teste'
    }
  };
  
  const postData = JSON.stringify(messageData);
  
  return new Promise((resolve, reject) => {
    console.log('📤 Enviando mensagem para webhook...');
    console.log('   Número:', messageData.data.key.remoteJid);
    console.log('   Mensagem:', messageData.data.message.conversation);
    console.log('   Instância:', messageData.instance);
    
    const req = http.request({
      hostname: 'localhost',
      port: 9003,
      path: '/api/webhooks/evolution/messages-upsert',
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': 'webhook_secret_key_2024'
      }
    }, (res) => {
      console.log(`\n📥 Resposta do webhook:`);
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n📋 Corpo da resposta:`);
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('Resposta não é JSON:', data);
        }
        
        if (res.statusCode === 200) {
          console.log('\n✅ Webhook processado com sucesso!');
          console.log('\n🔍 Verificações recomendadas:');
          console.log('   1. Verificar logs do servidor para mensagens [EXISTING-AGENT] ou [TICKET-AGENT]');
          console.log('   2. Verificar se o agente foi executado');
          console.log('   3. Verificar se a resposta foi enviada para o WhatsApp');
          console.log('   4. Verificar Firebase para registros de agent_interactions');
        } else {
          console.log(`\n❌ Erro no webhook: Status ${res.statusCode}`);
        }
        
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.error(`\n❌ Erro na requisição:`, error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.error(`\n⏰ Timeout na requisição (15s)`);
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Função para verificar se o servidor está respondendo
async function checkServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 9003,
      path: '/',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Executar teste
async function runTest() {
  try {
    console.log('🔍 Verificando se o servidor está rodando...');
    
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
      console.log('❌ Servidor não está respondendo na porta 9003!');
      console.log('   Execute: npm run dev');
      return;
    }
    
    console.log('✅ Servidor está rodando na porta 9003\n');
    
    // Testar resposta automática
    await testAgentResponse();
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar logs do terminal do servidor');
    console.log('   2. Procurar por mensagens como:');
    console.log('      - "🎯 [EXISTING-AGENT] Ticket ativo encontrado"');
    console.log('      - "🤖 [TICKET-AGENT] Processando resposta"');
    console.log('      - "📤 [TICKET-AGENT] Resposta enviada via WhatsApp"');
    console.log('   3. Se não aparecer, verificar configuração do ticket');
    console.log('   4. Executar: node check-active-tickets.cjs');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar
runTest()
  .then(() => {
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  });