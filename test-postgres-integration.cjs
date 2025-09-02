const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function testPostgresIntegration() {
  let client;
  try {
    console.log('🔍 Testando integração PostgreSQL com Evo AI...');
    client = await pool.connect();
    
    // Testar conexão
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Conexão PostgreSQL estabelecida:', testResult.rows[0].now);
    
    // Verificar estrutura da tabela agents
    console.log('\n📊 Verificando estrutura da tabela agents:');
    const structureResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'agents' 
      ORDER BY ordinal_position;
    `);
    
    console.table(structureResult.rows);
    
    // Contar agentes existentes
    const countResult = await client.query('SELECT COUNT(*) as count FROM agents');
    console.log(`\n📋 Agentes existentes na tabela: ${countResult.rows[0].count}`);
    
    // Criar um agente de teste
    console.log('\n🤖 Criando agente de teste...');
    const agentId = uuidv4(); // Usar UUID válido
    
    const insertQuery = `
      INSERT INTO agents (
        id, name, description, type, model, instruction, role, goal, 
        config, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *;
    `;
    
    const values = [
      agentId,
      'Agente Teste CRM',
      'Agente de teste criado via integração PostgreSQL',
      'llm',
      'gpt-3.5-turbo',
      'Você é um assistente útil para testes de integração.',
      'assistant',
      'Testar a integração entre CRM e Evo AI',
      JSON.stringify({
        temperature: 0.7,
        max_tokens: 1000,
        created_via: 'postgres-integration-test',
        test_timestamp: new Date().toISOString()
      })
    ];
    
    const insertResult = await client.query(insertQuery, values);
    const createdAgent = insertResult.rows[0];
    
    console.log('✅ Agente de teste criado com sucesso!');
    console.log('📝 Detalhes do agente:');
    console.log('  ID:', createdAgent.id);
    console.log('  Nome:', createdAgent.name);
    console.log('  Tipo:', createdAgent.type);
    console.log('  Modelo:', createdAgent.model);
    console.log('  Criado em:', createdAgent.created_at);
    
    // Verificar se o agente foi criado
    const verifyResult = await client.query('SELECT * FROM agents WHERE id = $1', [agentId]);
    if (verifyResult.rows.length > 0) {
      console.log('✅ Agente verificado na base de dados!');
    } else {
      console.log('❌ Agente não encontrado após criação!');
    }
    
    // Listar alguns agentes para verificar
    console.log('\n📋 Últimos 5 agentes criados:');
    const listResult = await client.query(`
      SELECT id, name, type, model, created_at 
      FROM agents 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.table(listResult.rows);
    
    // Atualizar o agente de teste
    console.log('\n📝 Testando atualização do agente...');
    const updateResult = await client.query(`
      UPDATE agents 
      SET description = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, ['Agente de teste ATUALIZADO via PostgreSQL', agentId]);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Agente atualizado com sucesso!');
      console.log('📝 Nova descrição:', updateResult.rows[0].description);
    }
    
    // Deletar o agente de teste
    console.log('\n🗑️ Removendo agente de teste...');
    const deleteResult = await client.query('DELETE FROM agents WHERE id = $1 RETURNING id', [agentId]);
    
    if (deleteResult.rows.length > 0) {
      console.log('✅ Agente de teste removido com sucesso!');
    } else {
      console.log('❌ Falha ao remover agente de teste!');
    }
    
    // Verificar contagem final
    const finalCountResult = await client.query('SELECT COUNT(*) as count FROM agents');
    console.log(`\n📊 Contagem final de agentes: ${finalCountResult.rows[0].count}`);
    
    console.log('\n🎉 Teste de integração PostgreSQL concluído com sucesso!');
    console.log('✅ A integração está funcionando corretamente');
    console.log('📊 Agentes criados via CRM aparecerão no painel do Evo AI');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testPostgresIntegration().catch(console.error);