const https = require('https');
const http = require('http');

// Configurações da Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = 'loja';

console.log('🔍 Testando Evolution API...');
console.log(`📍 URL: ${EVOLUTION_API_URL}`);
console.log(`🔑 API Key: ${EVOLUTION_API_KEY ? '***configurada***' : '❌ NÃO CONFIGURADA'}`);
console.log(`📱 Instância: ${INSTANCE_NAME}`);
console.log('\n' + '='.repeat(60));

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
        ...options.headers
      },
      timeout: 10000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testEvolutionAPI() {
  try {
    // 1. Testar se a Evolution API está online
    console.log('1️⃣ Testando se Evolution API está online...');
    try {
      const response = await makeRequest(`${EVOLUTION_API_URL}/`);
      console.log(`✅ Evolution API online - Status: ${response.status}`);
      if (response.data) {
        console.log(`📄 Resposta:`, JSON.stringify(response.data).substring(0, 200));
      }
    } catch (error) {
      console.log(`❌ Evolution API offline - Erro: ${error.message}`);
      return;
    }

    // 2. Testar autenticação
    console.log('\n2️⃣ Testando autenticação...');
    try {
      const response = await makeRequest(`${EVOLUTION_API_URL}/instance/fetchInstances`);
      console.log(`✅ Autenticação OK - Status: ${response.status}`);
      if (response.data) {
        console.log(`📄 Instâncias:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log(`❌ Erro de autenticação: ${error.message}`);
    }

    // 3. Verificar status da instância específica
    console.log(`\n3️⃣ Verificando status da instância '${INSTANCE_NAME}'...`);
    try {
      const response = await makeRequest(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`);
      console.log(`✅ Status da instância - Status: ${response.status}`);
      if (response.data) {
        console.log(`📄 Estado:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar instância: ${error.message}`);
    }

    // 4. Testar endpoint de envio (sem enviar mensagem real)
    console.log(`\n4️⃣ Testando endpoint de envio...`);
    try {
      const response = await makeRequest(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: {
          number: '5511999999999', // Número de teste
          text: 'Teste de conectividade'
        }
      });
      console.log(`📤 Teste de envio - Status: ${response.status}`);
      if (response.data) {
        console.log(`📄 Resposta:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log(`❌ Erro no teste de envio: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Verificar variáveis de ambiente
console.log('🔧 Verificando configuração...');
if (!EVOLUTION_API_KEY) {
  console.log('⚠️  EVOLUTION_API_KEY não configurada!');
  console.log('💡 Adicione EVOLUTION_API_KEY=sua_chave_aqui no arquivo .env.local');
}

if (!EVOLUTION_API_URL || EVOLUTION_API_URL === 'http://localhost:8080') {
  console.log('⚠️  EVOLUTION_API_URL usando valor padrão (localhost)');
  console.log('💡 Verifique se a Evolution API está rodando localmente ou configure a URL correta');
}

console.log('\n' + '='.repeat(60));
testEvolutionAPI();