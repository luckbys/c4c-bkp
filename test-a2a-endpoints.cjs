const axios = require('axios');

// Configurações
const BASE_URL = 'http://localhost:9004';
const API_KEY = process.env.EVO_AI_API_KEY || '4d23585ee7d81f96523ccc6468efa703';

// Headers padrão
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

async function testA2AEndpoints() {
  console.log('🧪 Testando endpoints A2A API...');
  console.log('=' .repeat(50));
  
  try {
    // Teste 1: Listar agentes disponíveis
    console.log('\n1. 📋 Testando listagem de agentes...');
    const listResponse = await axios.get(`${BASE_URL}/api/v1/a2a`, { headers });
    
    if (listResponse.status === 200) {
      console.log('✅ Listagem OK!');
      console.log(`📊 Agentes encontrados: ${listResponse.data.count}`);
      
      if (listResponse.data.agents && listResponse.data.agents.length > 0) {
        const firstAgent = listResponse.data.agents[0];
        console.log(`🤖 Primeiro agente: ${firstAgent.name} (${firstAgent.id})`);
        
        // Teste 2: Obter informações do agente
        console.log('\n2. 🔍 Testando informações do agente...');
        const agentResponse = await axios.get(`${BASE_URL}/api/v1/a2a/${firstAgent.id}`, { headers });
        
        if (agentResponse.status === 200) {
          console.log('✅ Informações do agente OK!');
          console.log(`📝 Nome: ${agentResponse.data.name}`);
          console.log(`📝 Descrição: ${agentResponse.data.description}`);
          console.log(`📝 Status: ${agentResponse.data.status}`);
          console.log(`📝 Modelo: ${agentResponse.data.model}`);
        } else {
          console.log('❌ Erro ao obter informações do agente:', agentResponse.status);
        }
        
        // Teste 3: Obter metadados do agente (.well-known/agent.json)
        console.log('\n3. 📋 Testando metadados do agente (.well-known/agent.json)...');
        const metadataResponse = await axios.get(`${BASE_URL}/api/v1/a2a/${firstAgent.id}/.well-known/agent.json`, { headers });
        
        if (metadataResponse.status === 200) {
          console.log('✅ Metadados OK!');
          console.log(`📝 Nome: ${metadataResponse.data.name}`);
          console.log(`📝 Descrição: ${metadataResponse.data.description}`);
          console.log(`📝 URL: ${metadataResponse.data.url}`);
          console.log(`📝 Provedor: ${metadataResponse.data.provider.organization}`);
          console.log(`📝 Versão: ${metadataResponse.data.version}`);
          console.log(`📝 Capacidades: ${Object.keys(metadataResponse.data.capabilities).join(', ')}`);
          console.log(`📝 Skills: ${metadataResponse.data.skills.length} disponíveis`);
        } else {
          console.log('❌ Erro ao obter metadados:', metadataResponse.status);
        }
        
        // Teste 4: Executar agente
        console.log('\n4. 🚀 Testando execução do agente...');
        const executePayload = {
          input: 'Olá! Preciso de ajuda com um teste da API.',
          context: {
            clientName: 'Usuário de Teste',
            clientPhone: '+5511999999999',
            ticketId: 'test-ticket-123',
            instanceId: 'test-instance',
            conversationHistory: [
              'Cliente: Olá',
              'Atendente: Olá! Como posso ajudar?'
            ],
            metadata: {
              testMode: true,
              timestamp: new Date().toISOString()
            }
          }
        };
        
        const executeResponse = await axios.post(
          `${BASE_URL}/api/v1/a2a/${firstAgent.id}/execute`, 
          executePayload, 
          { headers }
        );
        
        if (executeResponse.status === 200) {
          console.log('✅ Execução OK!');
          console.log(`📝 Resposta: ${executeResponse.data.response?.substring(0, 100)}...`);
          console.log(`📝 Confiança: ${executeResponse.data.confidence}`);
          console.log(`📝 Tempo de execução: ${executeResponse.data.executionTime}ms`);
          console.log(`📝 Tokens usados: ${executeResponse.data.tokensUsed}`);
          console.log(`📝 Deve continuar: ${executeResponse.data.shouldContinue}`);
        } else {
          console.log('❌ Erro na execução:', executeResponse.status);
        }
        
      } else {
        console.log('⚠️ Nenhum agente encontrado para testar');
      }
    } else {
      console.log('❌ Erro na listagem:', listResponse.status);
    }
    
    // Teste 5: Documentação da API (OPTIONS)
    console.log('\n5. 📚 Testando documentação da API...');
    const optionsResponse = await axios.options(`${BASE_URL}/api/v1/a2a`, { headers });
    
    if (optionsResponse.status === 200) {
      console.log('✅ Documentação OK!');
      console.log(`📝 Nome da API: ${optionsResponse.data.name}`);
      console.log(`📝 Versão: ${optionsResponse.data.version}`);
      console.log(`📝 Endpoints disponíveis: ${Object.keys(optionsResponse.data.endpoints).length}`);
    } else {
      console.log('❌ Erro na documentação:', optionsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    if (error.response) {
      console.error('📄 Status:', error.response.status);
      console.error('📄 Dados:', error.response.data);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Testes concluídos!');
}

// Executar testes
testA2AEndpoints().catch(console.error);