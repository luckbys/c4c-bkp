const https = require('https');
const http = require('http');

// URL da VPS EasyPanel
const PRODUCTION_URL = 'https://c4c.devsible.com.br';
const LOCAL_URL = 'http://localhost:9004';

console.log('🔍 Testando Firebase na VPS EasyPanel vs Local...');
console.log(`🌐 Produção: ${PRODUCTION_URL}`);
console.log(`🏠 Local: ${LOCAL_URL}`);
console.log('\n' + '='.repeat(60));

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 15000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout (15s)'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testEndpoint(baseUrl, label) {
  console.log(`\n📍 Testando ${label}...`);
  
  const testData = {
    instanceName: 'loja',
    remoteJid: '5511999999999@s.whatsapp.net',
    messageText: 'Teste de conectividade Firebase'
  };

  try {
    // 1. Testar endpoint /api/messages (POST)
    console.log('1️⃣ Testando POST /api/messages...');
    const messagesResponse = await makeRequest(`${baseUrl}/api/messages`, {
      method: 'POST',
      body: testData
    });
    
    console.log(`   Status: ${messagesResponse.status}`);
    if (messagesResponse.status === 200) {
      console.log('   ✅ Endpoint funcionando');
    } else {
      console.log('   ❌ Erro no endpoint');
      console.log(`   📄 Resposta:`, JSON.stringify(messagesResponse.data).substring(0, 200));
    }

    // 2. Testar endpoint /api/send-message
    console.log('\n2️⃣ Testando POST /api/send-message...');
    const sendResponse = await makeRequest(`${baseUrl}/api/send-message`, {
      method: 'POST',
      body: {
        instanceName: 'loja',
        remoteJid: '5511999999999@s.whatsapp.net',
        text: 'Teste de envio'
      }
    });
    
    console.log(`   Status: ${sendResponse.status}`);
    if (sendResponse.status === 200) {
      console.log('   ✅ Endpoint funcionando');
    } else {
      console.log('   ❌ Erro no endpoint');
      console.log(`   📄 Resposta:`, JSON.stringify(sendResponse.data).substring(0, 200));
    }

    // 3. Testar GET /api/messages
    console.log('\n3️⃣ Testando GET /api/messages...');
    const getResponse = await makeRequest(`${baseUrl}/api/messages?instanceName=loja&remoteJid=5511999999999@s.whatsapp.net&limit=1`);
    
    console.log(`   Status: ${getResponse.status}`);
    if (getResponse.status === 200) {
      console.log('   ✅ Endpoint funcionando');
      if (getResponse.data && getResponse.data.length !== undefined) {
        console.log(`   📊 Mensagens encontradas: ${getResponse.data.length}`);
      }
    } else {
      console.log('   ❌ Erro no endpoint');
      console.log(`   📄 Resposta:`, JSON.stringify(getResponse.data).substring(0, 200));
    }

    return {
      label,
      messagesPost: messagesResponse.status === 200,
      sendMessage: sendResponse.status === 200,
      messagesGet: getResponse.status === 200,
      overall: messagesResponse.status === 200 && sendResponse.status === 200 && getResponse.status === 200
    };

  } catch (error) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
    return {
      label,
      messagesPost: false,
      sendMessage: false,
      messagesGet: false,
      overall: false,
      error: error.message
    };
  }
}

async function runTests() {
  const results = {};

  // Testar produção
  results.production = await testEndpoint(PRODUCTION_URL, 'Produção (EasyPanel)');
  
  // Testar local (se disponível)
  results.local = await testEndpoint(LOCAL_URL, 'Local (Development)');

  // Relatório comparativo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO COMPARATIVO');
  console.log('='.repeat(60));
  
  console.log('\n🌐 PRODUÇÃO (EasyPanel):');
  console.log(`   POST /api/messages: ${results.production.messagesPost ? '✅' : '❌'}`);
  console.log(`   POST /api/send-message: ${results.production.sendMessage ? '✅' : '❌'}`);
  console.log(`   GET /api/messages: ${results.production.messagesGet ? '✅' : '❌'}`);
  console.log(`   Status Geral: ${results.production.overall ? '✅ FUNCIONANDO' : '❌ COM PROBLEMAS'}`);
  
  console.log('\n🏠 LOCAL (Development):');
  console.log(`   POST /api/messages: ${results.local.messagesPost ? '✅' : '❌'}`);
  console.log(`   POST /api/send-message: ${results.local.sendMessage ? '✅' : '❌'}`);
  console.log(`   GET /api/messages: ${results.local.messagesGet ? '✅' : '❌'}`);
  console.log(`   Status Geral: ${results.local.overall ? '✅ FUNCIONANDO' : '❌ COM PROBLEMAS'}`);

  // Diagnóstico
  console.log('\n🔍 DIAGNÓSTICO:');
  if (results.local.overall && !results.production.overall) {
    console.log('❌ Problema específico da PRODUÇÃO');
    console.log('💡 Possíveis causas:');
    console.log('   - FIREBASE_SERVICE_ACCOUNT_KEY não configurada na VPS');
    console.log('   - Variáveis de ambiente incorretas no EasyPanel');
    console.log('   - Problema de conectividade com Firebase em produção');
    console.log('\n📋 Ações recomendadas:');
    console.log('   1. Verificar variáveis de ambiente no EasyPanel');
    console.log('   2. Configurar FIREBASE_SERVICE_ACCOUNT_KEY');
    console.log('   3. Reiniciar aplicação na VPS');
  } else if (!results.local.overall && !results.production.overall) {
    console.log('❌ Problema GERAL (local e produção)');
    console.log('💡 Possíveis causas:');
    console.log('   - Configuração do Firebase incorreta');
    console.log('   - Evolution API indisponível');
    console.log('   - Problema no código da aplicação');
  } else if (results.local.overall && results.production.overall) {
    console.log('✅ Tudo funcionando corretamente!');
  }

  // JSON para análise
  console.log('\n📄 Resultado JSON:');
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    production: results.production,
    local: results.local,
    comparison: {
      productionWorking: results.production.overall,
      localWorking: results.local.overall,
      needsFirebaseConfig: results.local.overall && !results.production.overall
    }
  }, null, 2));
}

// Executar testes
runTests().catch(console.error);