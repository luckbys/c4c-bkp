const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

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

// Função para verificar e corrigir configurações de mcp_servers
async function fixInvalidMcpServers() {
  try {
    console.log('🔍 Conectando ao PostgreSQL do Evo AI...');
    
    // Testar conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Buscar todos os agentes
    console.log('\n📋 Buscando agentes no banco de dados...');
    const agentsResult = await pool.query(`
      SELECT id, name, config, client_id, created_at 
      FROM agents 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Encontrados ${agentsResult.rows.length} agentes`);
    
    let agentsWithInvalidMcp = [];
    let totalFixed = 0;
    
    // Verificar cada agente
    for (const agent of agentsResult.rows) {
      try {
        const config = typeof agent.config === 'string' ? JSON.parse(agent.config) : agent.config;
        
        if (config && config.mcp_servers && Array.isArray(config.mcp_servers)) {
          let hasInvalidMcp = false;
          let fixedMcpServers = [];
          
          for (const mcpServer of config.mcp_servers) {
            if (mcpServer.id && !isValidUUID(mcpServer.id)) {
              console.log(`❌ Agente "${agent.name}" (${agent.id}) tem mcp_server com ID inválido: "${mcpServer.id}"`);
              hasInvalidMcp = true;
              
              // Corrigir o ID inválido gerando um UUID válido
              const fixedMcpServer = {
                ...mcpServer,
                id: uuidv4()
              };
              fixedMcpServers.push(fixedMcpServer);
              console.log(`🔧 Corrigido para UUID válido: "${fixedMcpServer.id}"`);
            } else {
              fixedMcpServers.push(mcpServer);
            }
          }
          
          if (hasInvalidMcp) {
            agentsWithInvalidMcp.push({
              id: agent.id,
              name: agent.name,
              originalConfig: config,
              fixedMcpServers: fixedMcpServers
            });
          }
        }
      } catch (parseError) {
        console.log(`⚠️ Erro ao processar config do agente "${agent.name}" (${agent.id}):`, parseError.message);
      }
    }
    
    console.log(`\n📊 Resumo da análise:`);
    console.log(`   - Total de agentes: ${agentsResult.rows.length}`);
    console.log(`   - Agentes com mcp_servers inválidos: ${agentsWithInvalidMcp.length}`);
    
    if (agentsWithInvalidMcp.length === 0) {
      console.log('✅ Nenhum agente com mcp_servers inválidos encontrado!');
      return;
    }
    
    // Aplicar correções
    console.log('\n🔧 Aplicando correções...');
    
    for (const agentToFix of agentsWithInvalidMcp) {
      try {
        // Atualizar a configuração com mcp_servers corrigidos
        const updatedConfig = {
          ...agentToFix.originalConfig,
          mcp_servers: agentToFix.fixedMcpServers
        };
        
        const updateQuery = `
          UPDATE agents 
          SET config = $1, updated_at = NOW() 
          WHERE id = $2
        `;
        
        await pool.query(updateQuery, [JSON.stringify(updatedConfig), agentToFix.id]);
        
        console.log(`✅ Agente "${agentToFix.name}" corrigido com sucesso!`);
        totalFixed++;
      } catch (updateError) {
        console.error(`❌ Erro ao corrigir agente "${agentToFix.name}":`, updateError.message);
      }
    }
    
    console.log(`\n🎉 Correção concluída!`);
    console.log(`   - Agentes corrigidos: ${totalFixed}/${agentsWithInvalidMcp.length}`);
    
    // Verificar se ainda existem problemas
    console.log('\n🔍 Verificando se ainda existem problemas...');
    const verificationResult = await pool.query(`
      SELECT id, name, config 
      FROM agents 
      WHERE config::text LIKE '%test-server-id%'
    `);
    
    if (verificationResult.rows.length === 0) {
      console.log('✅ Nenhum agente com "test-server-id" encontrado. Problema resolvido!');
    } else {
      console.log(`⚠️ Ainda existem ${verificationResult.rows.length} agentes com "test-server-id"`);
      for (const agent of verificationResult.rows) {
        console.log(`   - ${agent.name} (${agent.id})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
  } finally {
    await pool.end();
    console.log('\n🔌 Conexão com PostgreSQL encerrada.');
  }
}

// Executar o script
if (require.main === module) {
  fixInvalidMcpServers()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixInvalidMcpServers };