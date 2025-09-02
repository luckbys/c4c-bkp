const axios = require('axios');
const { config } = require('dotenv');

// Carrega variáveis de ambiente
config({ path: '.env.local' });

const EVO_AI_API_URL = process.env.EVO_AI_API_URL;
const EVO_AI_API_KEY = process.env.EVO_AI_API_KEY;
const EVO_AI_JSONRPC_URL = process.env.EVO_AI_JSONRPC_URL;

console.log('🧪 Testando API real do Evo AI...');
console.log('📍 URL da API:', EVO_AI_API_URL);
console.log('🔑 API Key:', EVO_AI_API_KEY ? `${EVO_AI_API_KEY.substring(0, 8)}...` : 'NÃO CONFIGURADA');
console.log('🌐 JSON-RPC URL:', EVO_AI_JSONRPC_URL);
console.log('');

async function testEvoAIAPI() {
  try {
    console.log('1. 🔍 Testando conectividade básica...');
    
    // Teste 1: Verificar se a API está online
    const healthCheck = await axios.get(`${EVO_AI_API_URL}/health`, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${EVO_AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }).catch(err => ({ error: err.message, status: err.response?.status }));
    
    if (healthCheck.error) {
      console.log('❌ Health check falhou:', healthCheck.error);
      console.log('📊 Status:', healthCheck.status || 'Sem resposta');
    } else {
      console.log('✅ Health check OK:', healthCheck.status);
    }
    
    console.log('');
    console.log('2. 📋 Testando listagem de agentes...');
    
    // Teste 2: Listar agentes
    const agentsResponse = await axios.get(`${EVO_AI_API_URL}/api/v1/agents`, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${EVO_AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }).catch(err => ({ 
      error: err.message, 
      status: err.response?.status,
      data: err.response?.data 
    }));
    
    if (agentsResponse.error) {
      console.log('❌ Listagem de agentes falhou:', agentsResponse.error);
      console.log('📊 Status:', agentsResponse.status || 'Sem resposta');
      console.log('📄 Dados:', agentsResponse.data);
    } else {
      console.log('✅ Listagem de agentes OK');
      console.log('📊 Status:', agentsResponse.status);
      console.log('🤖 Agentes encontrados:', agentsResponse.data?.length || 0);
      
      if (agentsResponse.data?.length > 0) {
        console.log('🆔 Primeiro agente ID:', agentsResponse.data[0].id);
        
        // Teste 3: Executar agente específico
        console.log('');
        console.log('3. 🚀 Testando execução de agente...');
        
        const agentId = agentsResponse.data[0].id;
        const executeResponse = await axios.post(
          `${EVO_AI_API_URL}/api/v1/agents/${agentId}/execute`,
          {
            message: 'Teste de conectividade da API',
            context: {
              ticketId: 'test_ticket',
              instanceId: 'test_instance'
            }
          },
          {
            timeout: 15000,
            headers: {
              'Authorization': `Bearer ${EVO_AI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        ).catch(err => ({ 
          error: err.message, 
          status: err.response?.status,
          data: err.response?.data 
        }));
        
        if (executeResponse.error) {
          console.log('❌ Execução do agente falhou:', executeResponse.error);
          console.log('📊 Status:', executeResponse.status || 'Sem resposta');
          console.log('📄 Dados:', executeResponse.data);
        } else {
          console.log('✅ Execução do agente OK');
          console.log('📊 Status:', executeResponse.status);
          console.log('💬 Resposta:', executeResponse.data?.response?.substring(0, 100) + '...');
        }
      }
    }
    
    console.log('');
    console.log('4. 🌐 Testando JSON-RPC endpoint...');
    
    // Teste 4: JSON-RPC
    const jsonRpcResponse = await axios.post(
      EVO_AI_JSONRPC_URL,
      {
        jsonrpc: '2.0',
        method: 'agent.list',
        params: {},
        id: 1
      },
      {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${EVO_AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(err => ({ 
      error: err.message, 
      status: err.response?.status,
      data: err.response?.data 
    }));
    
    if (jsonRpcResponse.error) {
      console.log('❌ JSON-RPC falhou:', jsonRpcResponse.error);
      console.log('📊 Status:', jsonRpcResponse.status || 'Sem resposta');
      console.log('📄 Dados:', jsonRpcResponse.data);
    } else {
      console.log('✅ JSON-RPC OK');
      console.log('📊 Status:', jsonRpcResponse.status);
      console.log('🔄 Resposta JSON-RPC:', jsonRpcResponse.data);
    }
    
  } catch (error) {
    console.error('💥 Erro geral no teste:', error.message);
  }
  
  console.log('');
  console.log('📋 RESUMO DO TESTE:');
  console.log('🔗 URL da API:', EVO_AI_API_URL);
  console.log('🌐 JSON-RPC URL:', EVO_AI_JSONRPC_URL);
  console.log('🔑 API Key configurada:', !!EVO_AI_API_KEY);
  console.log('');
  console.log('💡 Se todos os testes falharam, verifique:');
  console.log('   1. Se a URL da API está correta');
  console.log('   2. Se a API Key é válida');
  console.log('   3. Se o servidor Evo AI está online');
  console.log('   4. Se há problemas de rede/firewall');
}

testEvoAIAPI();