const axios = require('axios');
const { config } = require('dotenv');

// Carrega variáveis de ambiente
config({ path: '.env.local' });

const EVO_AI_API_URL = process.env.EVO_AI_API_URL;
const EVO_AI_API_KEY = process.env.EVO_AI_API_KEY;
const AGENT_ID = 'bd2613c4-b97e-492a-9c4f-032f384d5a73';

console.log('🧪 Testando API do Evo AI com endpoint correto...');
console.log('📍 URL da API:', EVO_AI_API_URL);
console.log('🔑 API Key:', EVO_AI_API_KEY ? `${EVO_AI_API_KEY.substring(0, 8)}...` : 'NÃO CONFIGURADA');
console.log('🤖 Agent ID:', AGENT_ID);
console.log('');

async function testEvoAIFixed() {
  try {
    // Teste 1: Verificar metadados do agente
    console.log('🔍 1. Testando metadados do agente...');
    try {
      const metadataUrl = `${EVO_AI_API_URL}/api/v1/a2a/${AGENT_ID}/.well-known/agent.json`;
      console.log('   URL:', metadataUrl);
      
      const metadataResponse = await axios.get(metadataUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CRM-WhatsApp-Integration'
        }
      });
      
      console.log('   ✅ Metadados obtidos com sucesso');
      console.log('   📊 Dados do agente:', {
        name: metadataResponse.data.name,
        description: metadataResponse.data.description,
        version: metadataResponse.data.version
      });
    } catch (metadataError) {
      console.log('   ❌ Falha ao obter metadados:', metadataError.response?.status, metadataError.response?.statusText);
    }
    
    // Teste 2: Testar execução do agente
    console.log('\n🤖 2. Testando execução do agente...');
    try {
      const executeUrl = `${EVO_AI_API_URL}/api/v1/a2a/${AGENT_ID}/execute`;
      console.log('   URL:', executeUrl);
      
      const executePayload = {
        input: 'Olá, preciso de ajuda com meu pedido',
        context: {
          ticket_id: '5512981022013',
          client_name: 'Cliente Teste',
          client_phone: '5511999999999',
          conversation_history: [],
          instance_id: 'test-instance',
          metadata: {
            source: 'whatsapp',
            test: true
          }
        }
      };
      
      const executeResponse = await axios.post(executeUrl, executePayload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': EVO_AI_API_KEY ? `Bearer ${EVO_AI_API_KEY}` : undefined,
          'User-Agent': 'CRM-WhatsApp-Integration'
        }
      });
      
      console.log('   ✅ Agente executado com sucesso');
      console.log('   📝 Resposta:', {
        status: executeResponse.status,
        response: executeResponse.data.response?.substring(0, 100) + '...',
        confidence: executeResponse.data.confidence,
        tokensUsed: executeResponse.data.tokens_used
      });
      
    } catch (executeError) {
      console.log('   ❌ Falha na execução:', executeError.response?.status, executeError.response?.statusText);
      if (executeError.response?.data) {
        console.log('   📄 Detalhes do erro:', executeError.response.data);
      }
    }
    
    // Teste 3: Listar agentes disponíveis
    console.log('\n📋 3. Testando listagem de agentes...');
    try {
      const listUrl = `${EVO_AI_API_URL}/api/v1/a2a`;
      console.log('   URL:', listUrl);
      
      const listResponse = await axios.get(listUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Authorization': EVO_AI_API_KEY ? `Bearer ${EVO_AI_API_KEY}` : undefined,
          'User-Agent': 'CRM-WhatsApp-Integration'
        }
      });
      
      console.log('   ✅ Listagem obtida com sucesso');
      console.log('   📊 Agentes encontrados:', listResponse.data.length || 'Dados não são array');
      
    } catch (listError) {
      console.log('   ❌ Falha na listagem:', listError.response?.status, listError.response?.statusText);
    }
    
    // Teste 4: Health check
    console.log('\n🏥 4. Testando health check...');
    try {
      const healthUrls = [
        `${EVO_AI_API_URL}/health`,
        `${EVO_AI_API_URL}/api/health`,
        `${EVO_AI_API_URL}/api/v1/health`
      ];
      
      for (const healthUrl of healthUrls) {
        try {
          console.log('   Testando:', healthUrl);
          const healthResponse = await axios.get(healthUrl, {
            timeout: 5000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CRM-WhatsApp-Integration'
            }
          });
          
          console.log('   ✅ Health check OK:', healthResponse.status);
          break;
        } catch (healthError) {
          console.log('   ⚠️ Health check falhou:', healthError.response?.status);
        }
      }
      
    } catch (error) {
      console.log('   ❌ Erro geral no health check:', error.message);
    }
    
    console.log('\n📊 Resumo dos testes:');
    console.log('============================');
    console.log('✅ Endpoint de metadados testado');
    console.log('✅ Endpoint de execução testado');
    console.log('✅ Endpoint de listagem testado');
    console.log('✅ Health check testado');
    console.log('\n🎯 Próximo passo: Verificar se o serviço está configurado corretamente');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testEvoAIFixed()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });