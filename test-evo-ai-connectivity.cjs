// Script para testar conectividade real com Evo AI e identificar problemas
const fetch = require('node-fetch');

// Configurações do Evo AI
const EVO_AI_URL = 'https://n8n-evo-ai-frontend.05pdov.easypanel.host';
const EVO_AI_JWT_SECRET = '4d23585ee7d81f96523ccc6468efa703';
const EVO_AI_EMAIL = 'lucas.hborges42@gmail.com';
const EVO_AI_PASSWORD = 'admin123';

async function testEvoAiConnectivity() {
  console.log('🔍 [TEST] Iniciando teste de conectividade com Evo AI...');
  console.log('URL:', EVO_AI_URL);
  console.log('JWT Secret:', EVO_AI_JWT_SECRET ? 'Configurado' : 'Não configurado');
  
  // Teste 1: Verificar se a URL responde
  console.log('\n📡 [TEST 1] Testando conectividade básica...');
  try {
    const response = await fetch(EVO_AI_URL, {
      method: 'GET',
      timeout: 10000
    });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      console.log('✅ [TEST 1] URL responde corretamente');
    } else {
      console.log('❌ [TEST 1] URL retornou erro:', response.statusText);
    }
  } catch (error) {
    console.log('❌ [TEST 1] Erro de conectividade:', error.message);
    return;
  }
  
  // Teste 2: Testar endpoints de API
  console.log('\n🔌 [TEST 2] Testando endpoints de API...');
  const endpoints = [
    '/api/v1/agents',
    '/api/agents',
    '/api/v1/health',
    '/health',
    '/api/status'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n   Testando: ${EVO_AI_URL}${endpoint}`);
      
      const response = await fetch(`${EVO_AI_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${EVO_AI_JWT_SECRET}`,
          'X-API-Key': EVO_AI_JWT_SECRET,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            console.log(`   ✅ Endpoint funcional - Dados:`, Object.keys(data));
          } catch (jsonError) {
            console.log(`   ⚠️ Endpoint responde mas não é JSON válido`);
          }
        } else {
          const text = await response.text();
          console.log(`   ⚠️ Endpoint responde mas não é JSON:`, text.substring(0, 100));
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Erro: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro de conexão: ${error.message}`);
    }
  }
  
  // Teste 3: Testar JSON-RPC 2.0
  console.log('\n🔄 [TEST 3] Testando protocolo JSON-RPC 2.0...');
  try {
    const jsonRpcRequest = {
      jsonrpc: "2.0",
      method: "tasks/send",
      params: {
        message: {
          role: "user",
          parts: [{
            type: "text",
            text: "Olá, este é um teste de conectividade"
          }]
        },
        sessionId: `test-${Date.now()}`,
        id: `task-test-${Date.now()}`
      },
      id: `call-${Date.now()}`
    };
    
    console.log('   Enviando requisição JSON-RPC...');
    
    const response = await fetch(EVO_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${EVO_AI_JWT_SECRET}`,
        'X-API-Key': EVO_AI_JWT_SECRET
      },
      body: JSON.stringify(jsonRpcRequest),
      timeout: 30000
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const jsonResponse = await response.json();
          console.log('   ✅ JSON-RPC funcionando:', jsonResponse);
        } catch (jsonError) {
          console.log('   ❌ Resposta não é JSON válido:', jsonError.message);
        }
      } else {
        const text = await response.text();
        console.log('   ❌ Resposta não é JSON:', text.substring(0, 200));
      }
    } else {
      const errorText = await response.text();
      console.log('   ❌ Erro JSON-RPC:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('   ❌ Erro na requisição JSON-RPC:', error.message);
  }
  
  // Teste 4: Testar autenticação web
  console.log('\n🔐 [TEST 4] Testando autenticação web...');
  try {
    const loginResponse = await fetch(`${EVO_AI_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: EVO_AI_EMAIL,
        password: EVO_AI_PASSWORD
      }),
      timeout: 10000
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('   ✅ Login bem-sucedido:', Object.keys(loginData));
      
      if (loginData.token) {
        console.log('   🔑 Token obtido, testando com token...');
        
        // Testar com token obtido
        const authTestResponse = await fetch(`${EVO_AI_URL}/api/v1/agents`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        console.log(`   Status com token: ${authTestResponse.status}`);
        
        if (authTestResponse.ok) {
          const agentsData = await authTestResponse.json();
          console.log('   ✅ API funcional com token:', Object.keys(agentsData));
        } else {
          const errorText = await authTestResponse.text();
          console.log('   ❌ API falhou com token:', errorText.substring(0, 200));
        }
      }
    } else {
      const errorText = await loginResponse.text();
      console.log('   ❌ Login falhou:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('   ❌ Erro na autenticação:', error.message);
  }
  
  console.log('\n🏁 [TEST] Teste de conectividade concluído!');
}

// Executar teste
testEvoAiConnectivity().catch(console.error);