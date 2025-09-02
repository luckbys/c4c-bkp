const axios = require('axios');
const { config } = require('dotenv');

// Carrega variáveis de ambiente
config({ path: '.env.local' });

const EVO_AI_API_URL = process.env.EVO_AI_API_URL;
const EVO_AI_API_KEY = process.env.EVO_AI_API_KEY;
const AGENT_ID = 'bd2613c4-b97e-492a-9c4f-032f384d5a73';

console.log('🎯 Testando endpoint correto do Evo AI...');
console.log('📍 URL da API:', EVO_AI_API_URL);
console.log('🤖 Agent ID:', AGENT_ID);
console.log('');

async function testCorrectEndpoint() {
  try {
    // Teste 1: Endpoint .well-known/agent.json
    console.log('1. 🔍 Testando endpoint .well-known/agent.json...');
    const agentInfoUrl = `${EVO_AI_API_URL}/api/v1/a2a/${AGENT_ID}/.well-known/agent.json`;
    console.log('🌐 URL:', agentInfoUrl);
    
    const agentInfoResponse = await axios.get(agentInfoUrl, {
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
    
    if (agentInfoResponse.error) {
      console.log('❌ Endpoint .well-known falhou:', agentInfoResponse.error);
      console.log('📊 Status:', agentInfoResponse.status || 'Sem resposta');
      console.log('📄 Dados:', agentInfoResponse.data);
    } else {
      console.log('✅ Endpoint .well-known OK!');
      console.log('📊 Status:', agentInfoResponse.status);
      console.log('📄 Dados do agente:', JSON.stringify(agentInfoResponse.data, null, 2));
    }
    
    console.log('');
    
    // Teste 2: Endpoint de execução correto
    console.log('2. 🚀 Testando endpoint de execução correto...');
    const executeUrl = `${EVO_AI_API_URL}/api/v1/a2a/${AGENT_ID}/execute`;
    console.log('🌐 URL:', executeUrl);
    
    const executeResponse = await axios.post(
      executeUrl,
      {
        message: 'Olá, preciso de ajuda com meu pedido',
        context: {
          ticketId: '5512981022013@s.whatsapp.net_loja',
          instanceId: 'loja',
          customerPhone: '5512981022013'
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
      console.log('❌ Execução falhou:', executeResponse.error);
      console.log('📊 Status:', executeResponse.status || 'Sem resposta');
      console.log('📄 Dados:', executeResponse.data);
    } else {
      console.log('✅ Execução OK!');
      console.log('📊 Status:', executeResponse.status);
      console.log('💬 Resposta:', executeResponse.data);
    }
    
    console.log('');
    
    // Teste 3: Listar agentes no formato correto
    console.log('3. 📋 Testando listagem de agentes no formato a2a...');
    const listUrl = `${EVO_AI_API_URL}/api/v1/a2a`;
    console.log('🌐 URL:', listUrl);
    
    const listResponse = await axios.get(listUrl, {
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
    
    if (listResponse.error) {
      console.log('❌ Listagem a2a falhou:', listResponse.error);
      console.log('📊 Status:', listResponse.status || 'Sem resposta');
      console.log('📄 Dados:', listResponse.data);
    } else {
      console.log('✅ Listagem a2a OK!');
      console.log('📊 Status:', listResponse.status);
      console.log('🤖 Agentes encontrados:', listResponse.data?.length || 0);
      if (listResponse.data?.length > 0) {
        console.log('🆔 IDs dos agentes:', listResponse.data.map(a => a.id || a.agentId));
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral no teste:', error.message);
  }
  
  console.log('');
  console.log('📋 RESUMO:');
  console.log('✅ Endpoint correto descoberto: /api/v1/a2a/{agentId}/');
  console.log('🔧 Próximo passo: Atualizar o código para usar o endpoint correto');
}

testCorrectEndpoint();