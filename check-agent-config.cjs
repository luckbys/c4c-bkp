const { Pool } = require('pg');

const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function checkAgentConfig() {
  let client;
  try {
    console.log('🔍 Verificando configuração dos agentes...');
    client = await pool.connect();
    
    // Buscar o último agente criado
    const query = `
      SELECT id, name, config, created_at
      FROM agents 
      ORDER BY created_at DESC 
      LIMIT 1;
    `;
    
    const result = await client.query(query);
    
    if (result.rows && result.rows.length > 0) {
      const agent = result.rows[0];
      console.log('\n📊 Último agente criado:');
      console.log('  ID:', agent.id);
      console.log('  Nome:', agent.name);
      console.log('  Criado em:', agent.created_at);
      
      console.log('\n🔧 Análise da configuração:');
      console.log('  Tipo do config:', typeof agent.config);
      console.log('  Config raw:', agent.config);
      
      // Tentar diferentes formas de parsear
      if (typeof agent.config === 'string') {
        try {
          const parsedConfig = JSON.parse(agent.config);
          console.log('\n✅ Config parseado com sucesso:');
          console.log('  Tools:', parsedConfig.tools);
          console.log('  Custom Tools:', parsedConfig.custom_tools);
          console.log('  MCP Servers:', parsedConfig.mcp_servers?.length || 0);
          console.log('  Custom MCP Servers:', parsedConfig.custom_mcp_servers?.length || 0);
          
          if (parsedConfig.mcp_servers && parsedConfig.mcp_servers.length > 0) {
            console.log('\n🔌 Detalhes dos MCP Servers:');
            parsedConfig.mcp_servers.forEach((server, index) => {
              console.log(`    Server ${index + 1}:`);
              console.log(`      ID: ${server.id}`);
              console.log(`      Tools: ${server.tools?.join(', ') || 'Nenhuma'}`);
              console.log(`      Envs: ${Object.keys(server.envs || {}).join(', ') || 'Nenhuma'}`);
            });
          }
          
        } catch (parseError) {
          console.error('❌ Erro ao parsear config como JSON:', parseError.message);
          
          // Tentar como objeto direto
          if (agent.config === '[object Object]') {
            console.log('⚠️ Config foi salvo como string "[object Object]"');
            console.log('💡 Isso indica que o objeto não foi serializado corretamente');
          }
        }
      } else if (typeof agent.config === 'object') {
        console.log('\n✅ Config já é um objeto:');
        console.log('  Tools:', agent.config.tools);
        console.log('  Custom Tools:', agent.config.custom_tools);
        console.log('  MCP Servers:', agent.config.mcp_servers?.length || 0);
        console.log('  Custom MCP Servers:', agent.config.custom_mcp_servers?.length || 0);
      }
      
    } else {
      console.log('❌ Nenhum agente encontrado na tabela');
    }
    
    // Verificar estrutura da coluna config
    console.log('\n📋 Verificando estrutura da coluna config:');
    const structureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'config';
    `;
    
    const structureResult = await client.query(structureQuery);
    if (structureResult.rows.length > 0) {
      const column = structureResult.rows[0];
      console.log('  Nome da coluna:', column.column_name);
      console.log('  Tipo de dados:', column.data_type);
      console.log('  Permite NULL:', column.is_nullable);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar configuração:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkAgentConfig().catch(console.error);