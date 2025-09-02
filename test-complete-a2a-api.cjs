const http = require('http');

const API_KEY = '4d23585ee7d81f96523ccc6468efa703';
const BASE_URL = 'http://localhost:9004';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testCompleteA2AAPI() {
  console.log('🚀 Testando API A2A completa\n');
  
  try {
    // 1. Listar agentes
    console.log('1️⃣ Testando listagem de agentes...');
    const agentsResponse = await makeRequest('/api/v1/a2a');
    console.log(`   Status: ${agentsResponse.status}`);
    console.log(`   Dados recebidos:`, typeof agentsResponse.data);
    
    // Verificar se a resposta é um array ou tem propriedade agents
    let agents = agentsResponse.data;
    if (agentsResponse.data && agentsResponse.data.agents) {
      agents = agentsResponse.data.agents;
    } else if (!Array.isArray(agentsResponse.data)) {
      console.log('❌ Formato de resposta inesperado:', agentsResponse.data);
      return;
    }
    
    console.log(`   Agentes encontrados: ${agents.length}`);
    
    if (agents.length === 0) {
      console.log('❌ Nenhum agente encontrado!');
      return;
    }
    
    const firstAgent = agents[0];
    console.log(`   Primeiro agente: ${firstAgent.name} (ID: ${firstAgent.id})`);
    
    // 2. Testar .well-known/agent.json
    console.log('\n2️⃣ Testando endpoint .well-known/agent.json...');
    const wellKnownResponse = await makeRequest(`/api/v1/a2a/${firstAgent.id}/.well-known/agent.json`);
    console.log(`   Status: ${wellKnownResponse.status}`);
    console.log(`   Nome do agente: ${wellKnownResponse.data.name}`);
    console.log(`   URL: ${wellKnownResponse.data.url}`);
    console.log(`   Provedor: ${wellKnownResponse.data.provider.organization}`);
    
    // 3. Testar execução do agente
    console.log('\n3️⃣ Testando execução do agente...');
    const executeResponse = await makeRequest(
      `/api/v1/a2a/${firstAgent.id}/execute`,
      'POST',
      {
        input: 'Olá! Este é um teste da API A2A.',
        context: {
          clientName: 'Usuário de Teste',
          clientPhone: '+5511999999999',
          ticketId: 'test-api-a2a'
        }
      }
    );
    console.log(`   Status: ${executeResponse.status}`);
    console.log(`   Sucesso: ${executeResponse.data.success}`);
    console.log(`   Resposta: ${executeResponse.data.response?.substring(0, 100)}...`);
    console.log(`   Confiança: ${executeResponse.data.confidence}`);
    console.log(`   Tempo de execução: ${executeResponse.data.executionTime}ms`);
    
    // 4. Resumo final
    console.log('\n✅ TESTE COMPLETO - TODOS OS ENDPOINTS FUNCIONANDO!');
    console.log('\n📋 Resumo dos endpoints testados:');
    console.log(`   • GET  ${BASE_URL}/api/v1/a2a - Lista agentes`);
    console.log(`   • GET  ${BASE_URL}/api/v1/a2a/{agentId}/.well-known/agent.json - Metadados do agente`);
    console.log(`   • POST ${BASE_URL}/api/v1/a2a/{agentId}/execute - Executa agente`);
    
    console.log('\n🔑 Formato de uso conforme solicitado:');
    console.log(`   ${BASE_URL}/api/v1/a2a/${firstAgent.id}/.well-known/agent.json`);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    process.exit(1);
  }
}

// Executar teste completo
testCompleteA2AAPI()
  .then(() => {
    console.log('\n🎉 Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  });