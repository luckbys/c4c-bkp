const http = require('http');
const https = require('https');

// Portas para verificar
const PORTS_TO_CHECK = [3000, 9003, 9004];

// Endpoints para testar
const ENDPOINTS_TO_TEST = [
  '/api/webhooks/evolution/messages-upsert',
  '/api/v1/a2a',
  '/api/health'
];

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      resolve({ port, status: 'online', statusCode: res.statusCode });
    });
    
    req.on('error', () => {
      resolve({ port, status: 'offline', statusCode: null });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ port, status: 'timeout', statusCode: null });
    });
    
    req.end();
  });
}

async function testEndpoint(port, endpoint) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: endpoint,
      method: 'GET',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          endpoint,
          port,
          status: 'responding',
          statusCode: res.statusCode,
          response: data.substring(0, 200) // Primeiros 200 caracteres
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        endpoint,
        port,
        status: 'error',
        statusCode: null,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint,
        port,
        status: 'timeout',
        statusCode: null,
        error: 'Request timeout'
      });
    });
    
    req.end();
  });
}

async function checkServerStatus() {
  console.log('🔍 Verificando status do servidor Next.js...\n');
  
  // 1. Verificar portas
  console.log('📡 Verificando portas:');
  const portResults = [];
  
  for (const port of PORTS_TO_CHECK) {
    const result = await checkPort(port);
    portResults.push(result);
    
    const statusIcon = result.status === 'online' ? '✅' : '❌';
    console.log(`   ${statusIcon} Porta ${port}: ${result.status} ${result.statusCode ? `(${result.statusCode})` : ''}`);
  }
  
  // Encontrar porta ativa
  const activePort = portResults.find(r => r.status === 'online');
  
  if (!activePort) {
    console.log('\n❌ PROBLEMA: Nenhuma porta está respondendo!');
    console.log('   Solução: Execute `npm run dev` para iniciar o servidor.');
    return;
  }
  
  console.log(`\n✅ Servidor ativo na porta ${activePort.port}`);
  
  // 2. Testar endpoints
  console.log('\n🔗 Testando endpoints:');
  
  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(activePort.port, endpoint);
    
    const statusIcon = result.status === 'responding' ? '✅' : '❌';
    console.log(`   ${statusIcon} ${endpoint}:`);
    console.log(`      Status: ${result.status}`);
    
    if (result.statusCode) {
      console.log(`      Código: ${result.statusCode}`);
    }
    
    if (result.error) {
      console.log(`      Erro: ${result.error}`);
    }
    
    if (result.response && result.response.length > 0) {
      console.log(`      Resposta: ${result.response.substring(0, 100)}...`);
    }
    
    console.log('');
  }
  
  // 3. Testar webhook específico com POST
  console.log('🤖 Testando webhook de mensagens (POST):');
  
  const webhookResult = await testWebhookPost(activePort.port);
  const webhookIcon = webhookResult.status === 'responding' ? '✅' : '❌';
  
  console.log(`   ${webhookIcon} POST /api/webhooks/evolution/messages-upsert:`);
  console.log(`      Status: ${webhookResult.status}`);
  console.log(`      Código: ${webhookResult.statusCode || 'N/A'}`);
  
  if (webhookResult.error) {
    console.log(`      Erro: ${webhookResult.error}`);
  }
  
  // 4. Resumo e recomendações
  console.log('\n=== RESUMO ===');
  
  if (activePort && webhookResult.status === 'responding') {
    console.log('✅ Servidor funcionando corretamente!');
    console.log(`   URL base: http://localhost:${activePort.port}`);
    console.log('   Webhook de mensagens: Respondendo');
    console.log('\n🔧 Próximos passos para debug:');
    console.log('   1. Verificar logs do servidor para erros');
    console.log('   2. Testar envio de mensagem real no WhatsApp');
    console.log('   3. Verificar configuração dos agentes no Firebase');
    console.log('   4. Executar: node check-active-tickets.cjs');
  } else {
    console.log('❌ Problemas encontrados no servidor!');
    console.log('\n🔧 Soluções recomendadas:');
    console.log('   1. Reiniciar servidor: npm run dev');
    console.log('   2. Verificar logs de erro no terminal');
    console.log('   3. Verificar configurações do .env.local');
  }
}

async function testWebhookPost(port) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: {
          remoteJid: '5512981022013@s.whatsapp.net',
          fromMe: false,
          id: 'TEST_MESSAGE_' + Date.now()
        },
        messageType: 'conversation',
        message: {
          conversation: 'Teste de resposta automática'
        },
        messageTimestamp: Date.now(),
        pushName: 'Teste'
      }
    });
    
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/webhooks/evolution/messages-upsert',
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: 'responding',
          statusCode: res.statusCode,
          response: data
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 'error',
        statusCode: null,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'timeout',
        statusCode: null,
        error: 'Request timeout'
      });
    });
    
    req.write(postData);
    req.end();
  });
}

// Executar verificação
checkServerStatus()
  .then(() => {
    console.log('\n🎉 Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro na verificação:', error.message);
    process.exit(1);
  });