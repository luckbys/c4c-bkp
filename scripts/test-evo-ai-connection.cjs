// Importar fetch para Node.js
let fetch;
try {
  fetch = require('node-fetch');
} catch (error) {
  // Para Node.js 18+, usar fetch nativo
  fetch = globalThis.fetch;
}

let AbortController;
try {
  AbortController = require('abort-controller').AbortController;
} catch (error) {
  // Para Node.js 18+, usar AbortController nativo
  AbortController = globalThis.AbortController;
}

// Configurações do Evo AI
const EVO_AI_URL = process.env.EVO_AI_API_URL || 'https://n8n-evo-ai-frontend.05pdov.easypanel.host';
const EVO_AI_JWT_SECRET = process.env.EVO_AI_JWT_SECRET || '4d23585ee7d81f96523ccc6468efa703';
const EVO_AI_EMAIL = process.env.EVO_AI_EMAIL_FROM || 'lucas.hborges42@gmail.com';
const EVO_AI_PASSWORD = process.env.EVO_AI_ADMIN_PASSWORD || 'admin123';

console.log('🔧 Teste de Conectividade com Evo AI');
console.log('=====================================');
console.log('URL:', EVO_AI_URL);
console.log('Email:', EVO_AI_EMAIL);
console.log('Tem JWT Secret:', !!EVO_AI_JWT_SECRET);
console.log('Tem Password:', !!EVO_AI_PASSWORD);
console.log('');

async function testHealthEndpoints() {
  console.log('🔍 Testando endpoints de health...');
  
  const healthEndpoints = [
    '/health',
    '/api/health',
    '/api/v1/health',
    '/status',
    '/'
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      console.log(`\n🔍 Testando: ${EVO_AI_URL}${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${EVO_AI_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CRM-WhatsApp-Test'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const text = await response.text();
        console.log(`   ✅ Sucesso! Resposta:`, text.substring(0, 200));
        return true;
      } else {
        console.log(`   ❌ Falhou com status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro:`, error.message);
    }
  }
  
  return false;
}

async function testAuthentication() {
  console.log('\n🔐 Testando autenticação...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`${EVO_AI_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: EVO_AI_EMAIL,
        password: EVO_AI_PASSWORD
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Autenticação bem-sucedida!');
      console.log('Token recebido:', data.access_token ? 'Sim' : 'Não');
      return data.access_token || data.token;
    } else {
      const errorText = await response.text();
      console.log('❌ Falha na autenticação:', errorText);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na autenticação:', error.message);
    return null;
  }
}

async function testAgentCreation(token) {
  console.log('\n🤖 Testando criação de agente...');
  
  const agentPayload = {
    name: 'Teste CRM Agent',
    type: 'llm',
    description: 'Agente de teste criado via CRM',
    config: {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
      tools: [],
      system_prompt: 'Você é um assistente útil para atendimento ao cliente.'
    },
    prompt: 'Você é um assistente útil para atendimento ao cliente.',
    status: 'active'
  };
  
  const agentEndpoints = [
    '/api/v1/agents',
    '/api/agents',
    '/agents'
  ];
  
  for (const endpoint of agentEndpoints) {
    try {
      console.log(`\n🔄 Tentando criar agente via: ${EVO_AI_URL}${endpoint}`);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CRM-WhatsApp-Test'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-API-Key'] = token;
      } else if (EVO_AI_JWT_SECRET) {
        headers['Authorization'] = `Bearer ${EVO_AI_JWT_SECRET}`;
        headers['X-API-Key'] = EVO_AI_JWT_SECRET;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${EVO_AI_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(agentPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Agente criado com sucesso!`);
        console.log(`   ID: ${data.id}`);
        console.log(`   Nome: ${data.name}`);
        return data;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Falha: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
  
  return null;
}

async function testAgentListing(token) {
  console.log('\n📋 Testando listagem de agentes...');
  
  try {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'CRM-WhatsApp-Test'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-API-Key'] = token;
    } else if (EVO_AI_JWT_SECRET) {
      headers['Authorization'] = `Bearer ${EVO_AI_JWT_SECRET}`;
      headers['X-API-Key'] = EVO_AI_JWT_SECRET;
    }
    
    const response = await fetch(`${EVO_AI_URL}/api/v1/agents`, {
      method: 'GET',
      headers
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Listagem bem-sucedida!');
      console.log(`Total de agentes: ${data.agents ? data.agents.length : 'N/A'}`);
      
      if (data.agents && data.agents.length > 0) {
        console.log('Agentes encontrados:');
        data.agents.forEach((agent, index) => {
          console.log(`  ${index + 1}. ${agent.name} (${agent.id})`);
        });
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.log('❌ Falha na listagem:', errorText);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na listagem:', error.message);
    return null;
  }
}

async function runTests() {
  try {
    // Teste 1: Health Check
    const healthOk = await testHealthEndpoints();
    
    if (!healthOk) {
      console.log('\n❌ FALHA: Nenhum endpoint de health respondeu');
      console.log('\n🔧 Possíveis soluções:');
      console.log('   1. Verificar se o Evo AI está rodando');
      console.log('   2. Verificar a URL configurada');
      console.log('   3. Verificar conectividade de rede');
      console.log('   4. Verificar firewall/proxy');
      return;
    }
    
    // Teste 2: Autenticação
    const token = await testAuthentication();
    
    // Teste 3: Listagem de agentes
    await testAgentListing(token);
    
    // Teste 4: Criação de agente
    const createdAgent = await testAgentCreation(token);
    
    // Resumo final
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('====================');
    console.log(`Health Check: ${healthOk ? '✅ OK' : '❌ FALHA'}`);
    console.log(`Autenticação: ${token ? '✅ OK' : '❌ FALHA'}`);
    console.log(`Criação de Agente: ${createdAgent ? '✅ OK' : '❌ FALHA'}`);
    
    if (healthOk && token && createdAgent) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM!');
      console.log('   O Evo AI está funcionando corretamente.');
      console.log('   Os agentes criados no CRM aparecerão no painel do Evo AI.');
    } else {
      console.log('\n⚠️ ALGUNS TESTES FALHARAM');
      console.log('   Verifique as configurações e conectividade.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral nos testes:', error);
  }
}

// Executar testes
runTests().catch(console.error);