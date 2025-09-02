const fetch = require('node-fetch');
const { AbortController } = require('abort-controller');

// Polyfill para AbortSignal.timeout se não estiver disponível
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

async function testEvoAIAPI() {
  try {
    console.log('🔍 Testando API do Evo AI após correção...');
    
    const baseUrl = 'https://n8n-evo-ai-frontend.05pdov.easypanel.host';
    const jwtSecret = '4d23585ee7d81f96523ccc6468efa703';
    
    // Teste direto da API de agentes
    console.log('\n🤖 Testando listagem de agentes (teste principal)...');
    const agentsResponse = await fetch(`${baseUrl}/api/v1/agents/?skip=0&limit=100`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtSecret}`,
        'X-API-Key': jwtSecret,
        'User-Agent': 'CRM-Test/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    console.log('Status da resposta:', agentsResponse.status, agentsResponse.statusText);
    
    if (agentsResponse.ok) {
      try {
        const agentsData = await agentsResponse.json();
        console.log('✅ Agentes listados com sucesso!');
        console.log('📊 Total de agentes encontrados:', agentsData.length || 0);
        
        if (agentsData.length > 0) {
          console.log('\n📋 Lista de agentes:');
          agentsData.forEach((agent, index) => {
            console.log(`   ${index + 1}. ${agent.name} (${agent.id})`);
            console.log(`      Tipo: ${agent.type}`);
            console.log(`      Modelo: ${agent.model}`);
            console.log(`      Cliente: ${agent.client_id}`);
            
            // Verificar se tem mcp_servers válidos
            if (agent.config && agent.config.mcp_servers) {
              console.log(`      MCP Servers: ${agent.config.mcp_servers.length}`);
              agent.config.mcp_servers.forEach((mcp, mcpIndex) => {
                console.log(`        ${mcpIndex + 1}. ID: ${mcp.id} (${isValidUUID(mcp.id) ? 'UUID válido' : 'UUID inválido'})`);
              });
            }
          });
        }
        
        console.log('\n🎉 Teste concluído com sucesso! A correção funcionou.');
        return true;
        
      } catch (jsonError) {
        console.log('❌ Erro ao processar JSON da resposta:', jsonError.message);
        // Não tentar ler o texto novamente pois o body já foi consumido
        console.log('📄 A resposta não é um JSON válido');
        return false;
      }
    } else {
      console.log('❌ Erro ao listar agentes:', agentsResponse.status, agentsResponse.statusText);
      
      // Tentar obter detalhes do erro
      try {
        const errorText = await agentsResponse.text();
        console.log('📄 Detalhes do erro:', errorText.substring(0, 500));
        
        // Verificar se ainda há erro de validação de UUID
        if (errorText.includes('uuid_parsing') || errorText.includes('test-server-id')) {
          console.log('❌ Ainda existem problemas de UUID nos agentes!');
          return false;
        }
      } catch (e) {
        console.log('❌ Não foi possível obter detalhes do erro');
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste da API:', error.message);
    return false;
  }
}

// Função para validar UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Executar o teste
if (require.main === module) {
  testEvoAIAPI()
    .then((success) => {
      if (success) {
        console.log('\n✅ Teste executado com sucesso! API funcionando corretamente.');
        process.exit(0);
      } else {
        console.log('\n❌ Teste falhou. Ainda há problemas na API.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { testEvoAIAPI };