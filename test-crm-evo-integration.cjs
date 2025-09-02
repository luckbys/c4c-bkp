// Teste da integração CRM -> Evo AI após correção dos mcp_servers
const path = require('path');
const { Pool } = require('pg');

// Simular o ambiente Next.js
process.env.NODE_ENV = 'development';
process.env.EVO_AI_API_URL = 'https://n8n-evo-ai-frontend.05pdov.easypanel.host';
process.env.EVO_AI_JWT_SECRET = '4d23585ee7d81f96523ccc6468efa703';

async function testCRMEvoIntegration() {
  try {
    console.log('🔍 Testando integração CRM -> Evo AI após correção...');
    
    // Importar o serviço Evo AI
    const evoAiServicePath = path.join(__dirname, 'src', 'services', 'evo-ai-service.ts');
    console.log('📦 Importando serviço Evo AI...');
    
    // Registrar ts-node para poder importar TypeScript
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs'
      }
    });
    
    const { default: EvoAiService } = require('./src/services/evo-ai-service.ts');
    const evoAiService = new EvoAiService();
    
    console.log('✅ Serviço Evo AI importado com sucesso');
    
    // Teste 1: Verificar conexão
    console.log('\n🔗 Testando conexão com Evo AI...');
    const isConnected = await evoAiService.testConnection();
    console.log('Conexão:', isConnected ? '✅ Conectado' : '❌ Falha na conexão');
    
    // Teste 2: Listar agentes
    console.log('\n📋 Testando listagem de agentes...');
    try {
      const agents = await evoAiService.listAgents();
      console.log(`✅ Agentes listados: ${agents.length} encontrados`);
      
      if (agents.length > 0) {
        console.log('\n📊 Agentes encontrados:');
        agents.forEach((agent, index) => {
          console.log(`   ${index + 1}. ${agent.name} (${agent.id})`);
          console.log(`      Tipo: ${agent.type}`);
          console.log(`      Status: ${agent.status || 'N/A'}`);
        });
      }
      
      console.log('\n🎉 Teste de listagem bem-sucedido! A correção funcionou.');
      return true;
      
    } catch (listError) {
      console.log('❌ Erro ao listar agentes:', listError.message);
      
      // Verificar se ainda há erro de UUID
      if (listError.message.includes('uuid_parsing') || listError.message.includes('test-server-id')) {
        console.log('❌ Ainda existem problemas de UUID nos agentes!');
        return false;
      }
      
      // Se for outro tipo de erro, pode ser problema de rede/auth
      console.log('⚠️ Erro pode ser de conectividade ou autenticação');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    return false;
  }
}

// Executar o teste
if (require.main === module) {
  testCRMEvoIntegration()
    .then((success) => {
      if (success) {
        console.log('\n✅ Integração CRM -> Evo AI funcionando corretamente!');
        process.exit(0);
      } else {
        console.log('\n❌ Ainda há problemas na integração.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { testCRMEvoIntegration };