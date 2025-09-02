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

async function testAgentCreation() {
  let client;
  try {
    console.log('🔍 Testando criação de agente com tipo válido...');
    client = await pool.connect();
    
    // Testar conexão
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Conexão PostgreSQL estabelecida:', testResult.rows[0].now);
    
    // Criar um agente de teste com tipo válido
    console.log('\n🤖 Criando agente de teste com tipo "llm"...');
    const agentId = uuidv4();
    
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
      'Agente Teste CRM Corrigido',
      'Agente de teste criado via integração PostgreSQL com tipo válido',
      'llm', // Usando tipo válido
      'gpt-3.5-turbo',
      'Você é um assistente útil para testes de integração.',
      'assistant',
      'Testar a integração entre CRM e Evo AI',
      JSON.stringify({
        temperature: 0.7,
        max_tokens: 1000,
        created_via: 'postgres-integration-test-fixed',
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
    
    // Listar todos os agentes para verificar
    console.log('\n📋 Todos os agentes na tabela:');
    const listResult = await client.query(`
      SELECT id, name, type, model, created_at 
      FROM agents 
      ORDER BY created_at DESC
    `);
    
    console.table(listResult.rows);
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('✅ O agente deve aparecer no painel do Evo AI em:');
    console.log('🌐 https://n8n-evo-ai-frontend.05pdov.easypanel.host/');
    
    // Não deletar o agente para que apareça no painel
    console.log('\n📌 Agente mantido no banco para verificação no painel');
    
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

testAgentCreation().catch(console.error);