const { Pool } = require('pg');

// Configuração do PostgreSQL do Evo AI
const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

// Função para validar se uma string é um UUID válido
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function verifyMcpFix() {
  try {
    console.log('🔍 Verificando se a correção dos mcp_servers funcionou...');
    
    // Testar conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com PostgreSQL estabelecida');
    
    // Buscar todos os agentes
    console.log('\n📋 Verificando agentes no banco de dados...');
    const agentsResult = await pool.query(`
      SELECT id, name, config, client_id, created_at, updated_at
      FROM agents 
      ORDER BY updated_at DESC
    `);
    
    console.log(`📊 Total de agentes: ${agentsResult.rows.length}`);
    
    let totalAgents = 0;
    let agentsWithMcpServers = 0;
    let agentsWithValidMcp = 0;
    let agentsWithInvalidMcp = 0;
    let problemAgents = [];
    
    // Verificar cada agente
    for (const agent of agentsResult.rows) {
      totalAgents++;
      
      try {
        const config = typeof agent.config === 'string' ? JSON.parse(agent.config) : agent.config;
        
        if (config && config.mcp_servers && Array.isArray(config.mcp_servers) && config.mcp_servers.length > 0) {
          agentsWithMcpServers++;
          
          let hasInvalidMcp = false;
          
          for (const mcpServer of config.mcp_servers) {
            if (mcpServer.id) {
              if (isValidUUID(mcpServer.id)) {
                console.log(`✅ Agente "${agent.name}": MCP Server ID válido (${mcpServer.id})`);
              } else {
                console.log(`❌ Agente "${agent.name}": MCP Server ID inválido (${mcpServer.id})`);
                hasInvalidMcp = true;
                problemAgents.push({
                  id: agent.id,
                  name: agent.name,
                  invalidMcpId: mcpServer.id
                });
              }
            }
          }
          
          if (hasInvalidMcp) {
            agentsWithInvalidMcp++;
          } else {
            agentsWithValidMcp++;
          }
        }
      } catch (parseError) {
        console.log(`⚠️ Erro ao processar config do agente "${agent.name}": ${parseError.message}`);
      }
    }
    
    // Verificar especificamente por 'test-server-id'
    console.log('\n🔍 Verificando se ainda existe "test-server-id"...');
    const testServerResult = await pool.query(`
      SELECT id, name, config 
      FROM agents 
      WHERE config::text LIKE '%test-server-id%'
    `);
    
    console.log('\n📊 Resumo da verificação:');
    console.log(`   - Total de agentes: ${totalAgents}`);
    console.log(`   - Agentes com mcp_servers: ${agentsWithMcpServers}`);
    console.log(`   - Agentes com mcp_servers válidos: ${agentsWithValidMcp}`);
    console.log(`   - Agentes com mcp_servers inválidos: ${agentsWithInvalidMcp}`);
    console.log(`   - Agentes com "test-server-id": ${testServerResult.rows.length}`);
    
    if (problemAgents.length > 0) {
      console.log('\n❌ Agentes com problemas encontrados:');
      problemAgents.forEach((agent, index) => {
        console.log(`   ${index + 1}. ${agent.name} (${agent.id}) - ID inválido: ${agent.invalidMcpId}`);
      });
      return false;
    }
    
    if (testServerResult.rows.length > 0) {
      console.log('\n❌ Ainda existem agentes com "test-server-id":');
      testServerResult.rows.forEach((agent, index) => {
        console.log(`   ${index + 1}. ${agent.name} (${agent.id})`);
      });
      return false;
    }
    
    console.log('\n🎉 Verificação concluída com sucesso!');
    console.log('✅ Todos os mcp_servers têm UUIDs válidos');
    console.log('✅ Nenhum "test-server-id" encontrado');
    console.log('✅ A correção funcionou perfeitamente!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    return false;
  } finally {
    await pool.end();
    console.log('\n🔌 Conexão com PostgreSQL encerrada.');
  }
}

// Executar a verificação
if (require.main === module) {
  verifyMcpFix()
    .then((success) => {
      if (success) {
        console.log('\n✅ Verificação bem-sucedida! A correção funcionou.');
        process.exit(0);
      } else {
        console.log('\n❌ Ainda existem problemas que precisam ser corrigidos.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { verifyMcpFix };