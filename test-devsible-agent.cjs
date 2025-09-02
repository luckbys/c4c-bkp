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

async function testDevsibleAgent() {
  let client;
  try {
    console.log('🔍 Testando criação de agente para cliente devsible...');
    client = await pool.connect();
    
    // Client ID do devsible
    const devsibleClientId = 'b43645b9-5616-4899-aa76-29bdd60c33e5';
    
    // Criar um agente de teste vinculado ao devsible
    const agentId = uuidv4();
    const agentName = `Teste_Devsible_${Date.now()}`;
    
    console.log(`🤖 Criando agente: ${agentName}`);
    console.log(`🆔 Client ID: ${devsibleClientId}`);
    console.log(`🆔 Agent ID: ${agentId}`);
    
    const insertQuery = `
      INSERT INTO agents (
        id, client_id, name, description, type, model, instruction, role, goal, 
        config, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *;
    `;
    
    const values = [
      agentId,
      devsibleClientId,
      agentName,
      'Agente de teste criado para cliente devsible via CRM',
      'llm',
      'gpt-3.5-turbo',
      'Você é um assistente de teste para o cliente devsible.',
      'assistant',
      'Testar a vinculação com cliente devsible',
      JSON.stringify({
        temperature: 0.7,
        max_tokens: 1000,
        created_via: 'crm-devsible-test',
        client: 'devsible',
        test_timestamp: new Date().toISOString()
      })
    ];
    
    const insertResult = await client.query(insertQuery, values);
    const createdAgent = insertResult.rows[0];
    
    console.log('✅ Agente criado com sucesso!');
    console.log('📝 Detalhes do agente:');
    console.log('  ID:', createdAgent.id);
    console.log('  Client ID:', createdAgent.client_id);
    console.log('  Nome:', createdAgent.name);
    console.log('  Tipo:', createdAgent.type);
    console.log('  Criado em:', createdAgent.created_at);
    
    // Verificar se o agente foi criado corretamente
    const verifyResult = await client.query(
      'SELECT * FROM agents WHERE id = $1 AND client_id = $2', 
      [agentId, devsibleClientId]
    );
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Agente verificado com client_id correto!');
    } else {
      console.log('❌ Agente não encontrado com client_id correto!');
    }
    
    // Listar todos os agentes do cliente devsible
    console.log('\n📋 Todos os agentes do cliente devsible:');
    const clientAgentsResult = await client.query(`
      SELECT id, name, type, model, created_at 
      FROM agents 
      WHERE client_id = $1 
      ORDER BY created_at DESC;
    `, [devsibleClientId]);
    
    console.table(clientAgentsResult.rows);
    console.log(`\n📊 Total de agentes para devsible: ${clientAgentsResult.rows.length}`);
    
    // Verificar se há agentes sem client_id (órfãos)
    const orphanAgentsResult = await client.query(`
      SELECT id, name, type, created_at 
      FROM agents 
      WHERE client_id IS NULL 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    
    if (orphanAgentsResult.rows.length > 0) {
      console.log('\n⚠️ Agentes órfãos (sem client_id):');
      console.table(orphanAgentsResult.rows);
      console.log('💡 Estes agentes não aparecerão no painel do cliente!');
    }
    
    console.log('\n🎯 Instruções para verificar no painel:');
    console.log('1. Acesse: https://n8n-evo-ai-frontend.05pdov.easypanel.host/');
    console.log('2. Faça login como cliente devsible');
    console.log(`3. Procure pelo agente: ${agentName}`);
    console.log('4. O agente deve aparecer na lista de agentes do cliente');
    
    // Opcional: remover o agente de teste
    console.log('\n🗑️ Removendo agente de teste...');
    const deleteResult = await client.query(
      'DELETE FROM agents WHERE id = $1 RETURNING id', 
      [agentId]
    );
    
    if (deleteResult.rows.length > 0) {
      console.log('✅ Agente de teste removido com sucesso!');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testDevsibleAgent().catch(console.error);