const { Pool } = require('pg');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuração do PostgreSQL
const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function testDualDeletion() {
  try {
    console.log('🧪 Testando funcionalidade de exclusão dupla...');
    
    // 1. Criar um agente de teste diretamente no PostgreSQL
    console.log('\n📝 Criando agente de teste no PostgreSQL...');
    const testAgentId = uuidv4(); // Usar UUID válido
    
    const postgresQuery = `
      INSERT INTO agents (
        id, client_id, name, description, type, model, 
        instruction, config, role, goal, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *;
    `;
    
    const postgresValues = [
      testAgentId,
      'b43645b9-5616-4899-aa76-29bdd60c33e5', // Cliente devsible
      'Agente_Teste_Exclusao_Dupla',
      'Agente criado para testar exclusão dupla',
      'llm', // Tipo válido no PostgreSQL
      'gpt-3.5-turbo',
      'Você é um agente de teste.',
      JSON.stringify({ tools: null, mcp_servers: [] }),
      'assistant',
      'Agente de teste para exclusão dupla'
    ];
    
    const postgresResult = await pool.query(postgresQuery, postgresValues);
    console.log(`✅ Agente criado no PostgreSQL: ${postgresResult.rows[0].id}`);
    
    // 2. Criar um agente correspondente via API (que criará no Firestore)
    console.log('\n📝 Criando agente correspondente via API...');
    const agentData = {
      name: 'Agente_Teste_Exclusao_Dupla',
      description: 'Agente criado para testar exclusão dupla',
      prompt: 'Você é um agente de teste.',
      type: 'assistant',
      status: 'active'
    };
    
    const createResponse = await fetch('http://localhost:9004/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentData)
    });
    
    let firestoreAgentId = null;
    if (createResponse.ok) {
      const createResult = await createResponse.json();
      firestoreAgentId = createResult.agent?.id;
      console.log(`✅ Agente criado via API: ${firestoreAgentId}`);
    } else {
      console.log('⚠️ Falha ao criar agente via API, continuando apenas com PostgreSQL');
    }
    
    // 3. Verificar se o agente existe no PostgreSQL
    console.log('\n🔍 Verificando existência no PostgreSQL...');
    const postgresCheck = await pool.query('SELECT * FROM agents WHERE id = $1', [testAgentId]);
    console.log(`PostgreSQL: ${postgresCheck.rows.length > 0 ? '✅ Existe' : '❌ Não existe'}`);
    
    // 4. Testar exclusão via API usando o ID do PostgreSQL
    console.log('\n🗑️ Testando exclusão via API (PostgreSQL ID)...');
    
    const deleteResponse = await fetch(`http://localhost:9004/api/agents/${testAgentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const deleteResult = await deleteResponse.json();
    console.log(`Status da exclusão: ${deleteResponse.status}`);
    console.log('Resposta:', deleteResult);
    
    // 5. Verificar se foi deletado do PostgreSQL
    console.log('\n🔍 Verificando exclusão no PostgreSQL...');
    const postgresAfter = await pool.query('SELECT * FROM agents WHERE id = $1', [testAgentId]);
    console.log(`PostgreSQL após exclusão: ${postgresAfter.rows.length > 0 ? '❌ Ainda existe' : '✅ Deletado'}`);
    
    // 6. Se criamos via API, testar exclusão do Firestore também
    if (firestoreAgentId) {
      console.log('\n🗑️ Testando exclusão do agente criado via API...');
      
      const deleteFirestoreResponse = await fetch(`http://localhost:9004/api/agents/${firestoreAgentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const deleteFirestoreResult = await deleteFirestoreResponse.json();
      console.log(`Status da exclusão Firestore: ${deleteFirestoreResponse.status}`);
      console.log('Resposta:', deleteFirestoreResult);
    }
    
    // 7. Resultado final
    const postgresDeleted = postgresAfter.rows.length === 0;
    
    console.log('\n📊 Resultado do teste:');
    console.log(`✅ PostgreSQL deletado: ${postgresDeleted}`);
    
    if (postgresDeleted) {
      console.log('\n🎉 SUCESSO! Exclusão do PostgreSQL funcionando corretamente!');
    } else {
      console.log('\n❌ FALHA! Exclusão do PostgreSQL não funcionou.');
      
      // Limpeza manual
      console.log('🧹 Limpando PostgreSQL manualmente...');
      await pool.query('DELETE FROM agents WHERE id = $1', [testAgentId]);
    }
    
    // 8. Verificar logs da aplicação
    console.log('\n📋 Dicas para verificar:');
    console.log('1. Verifique os logs do servidor Next.js para ver se a exclusão dupla foi executada');
    console.log('2. Procure por mensagens como "Tentando deletar agente diretamente do PostgreSQL"');
    console.log('3. Verifique se não há erros de importação do evo-ai-postgres-service');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Executar teste
testDualDeletion();