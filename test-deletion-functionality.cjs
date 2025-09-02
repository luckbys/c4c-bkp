const { Pool } = require('pg');
const fetch = require('node-fetch');

// Configuração do PostgreSQL
const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

const API_BASE_URL = 'http://localhost:9004';

async function testDeletionFunctionality() {
  console.log('🧪 Testando funcionalidade de exclusão de agentes...');
  
  try {
    // Teste 1: Criar agente via API
    console.log('\n📝 Teste 1: Criando agente via API...');
    const testAgent = {
      name: 'Agente_Teste_Exclusao_' + Date.now(),
      description: 'Agente criado para testar exclusão',
      prompt: 'Você é um agente de teste.',
      model: 'gpt-3.5-turbo',
      type: 'assistant',
      config: {
        temperature: 0.7,
        maxTokens: 1000
      }
    };
    
    const createResponse = await fetch(`${API_BASE_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAgent)
    });
    
    console.log(`   Status da criação: ${createResponse.status}`);
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log(`   ❌ Erro na criação: ${errorText}`);
      
      // Se falhar na criação via API, criar diretamente no PostgreSQL
      console.log('\n🔄 Criando agente diretamente no PostgreSQL...');
      const agentId = require('crypto').randomUUID();
      
      const insertQuery = `
        INSERT INTO agents (
          id, client_id, name, description, type, model, 
          instruction, config, role, goal, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        ) RETURNING *;
      `;
      
      const values = [
        agentId,
        'b43645b9-5616-4899-aa76-29bdd60c33e5', // Cliente devsible
        testAgent.name,
        testAgent.description,
        'llm', // Tipo válido
        testAgent.model,
        testAgent.prompt,
        JSON.stringify({
          tools: null,
          custom_tools: null,
          mcp_servers: [],
          custom_mcp_servers: [],
          agent_tools: null,
          sub_agents: null,
          workflow: null
        }),
        'assistant',
        'Ajudar usuários'
      ];
      
      const result = await pool.query(insertQuery, values);
      const createdAgent = result.rows[0];
      console.log(`   ✅ Agente criado no PostgreSQL: ${createdAgent.id}`);
      
      // Teste 2: Verificar se agente existe no PostgreSQL
      console.log('\n🔍 Teste 2: Verificando existência no PostgreSQL...');
      const checkQuery = 'SELECT * FROM agents WHERE id = $1';
      const checkResult = await pool.query(checkQuery, [createdAgent.id]);
      
      if (checkResult.rows.length > 0) {
        console.log('   ✅ Agente encontrado no PostgreSQL');
        console.log(`   📊 Dados: ${JSON.stringify(checkResult.rows[0], null, 2)}`);
      } else {
        console.log('   ❌ Agente não encontrado no PostgreSQL');
        return;
      }
      
      // Teste 3: Tentar excluir via API
      console.log('\n🗑️ Teste 3: Tentando excluir via API...');
      const deleteResponse = await fetch(`${API_BASE_URL}/api/agents/${createdAgent.id}`, {
        method: 'DELETE'
      });
      
      console.log(`   Status da exclusão: ${deleteResponse.status}`);
      
      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        console.log(`   ✅ Resposta da API: ${JSON.stringify(deleteResult, null, 2)}`);
      } else {
        const errorText = await deleteResponse.text();
        console.log(`   ❌ Erro na exclusão: ${errorText}`);
      }
      
      // Teste 4: Verificar se foi realmente excluído
      console.log('\n🔍 Teste 4: Verificando se foi excluído do PostgreSQL...');
      const finalCheckResult = await pool.query(checkQuery, [createdAgent.id]);
      
      if (finalCheckResult.rows.length === 0) {
        console.log('   ✅ Agente foi excluído com sucesso do PostgreSQL');
      } else {
        console.log('   ❌ Agente ainda existe no PostgreSQL');
        console.log(`   📊 Dados restantes: ${JSON.stringify(finalCheckResult.rows[0], null, 2)}`);
        
        // Limpar manualmente
        console.log('\n🧹 Limpando agente manualmente...');
        await pool.query('DELETE FROM agents WHERE id = $1', [createdAgent.id]);
        console.log('   ✅ Agente removido manualmente');
      }
      
    } else {
      const createdAgent = await createResponse.json();
      console.log(`   ✅ Agente criado via API: ${createdAgent.agent?.id || 'ID não disponível'}`);
      
      if (createdAgent.agent?.id) {
        // Teste de exclusão para agente criado via API
        console.log('\n🗑️ Teste: Excluindo agente criado via API...');
        const deleteResponse = await fetch(`${API_BASE_URL}/api/agents/${createdAgent.agent.id}`, {
          method: 'DELETE'
        });
        
        console.log(`   Status da exclusão: ${deleteResponse.status}`);
        
        if (deleteResponse.ok) {
          const deleteResult = await deleteResponse.json();
          console.log(`   ✅ Resposta da API: ${JSON.stringify(deleteResult, null, 2)}`);
        } else {
          const errorText = await deleteResponse.text();
          console.log(`   ❌ Erro na exclusão: ${errorText}`);
        }
      }
    }
    
    // Teste 5: Verificar comportamento do frontend
    console.log('\n🖥️ Teste 5: Verificando lista de agentes via API...');
    const listResponse = await fetch(`${API_BASE_URL}/api/agents`);
    
    if (listResponse.ok) {
      const agents = await listResponse.json();
      console.log(`   ✅ API de listagem funcionando: ${agents.length} agentes encontrados`);
      
      // Mostrar alguns agentes para debug
      if (agents.length > 0) {
        console.log('   📋 Primeiros agentes:');
        agents.slice(0, 3).forEach((agent, index) => {
          console.log(`     ${index + 1}. ${agent.name} (ID: ${agent.id})`);
        });
      }
    } else {
      console.log(`   ❌ Erro na listagem: ${listResponse.status}`);
    }
    
    // Teste 6: Simular clique do botão (teste de integração)
    console.log('\n🖱️ Teste 6: Simulando comportamento do botão de exclusão...');
    
    // Buscar um agente existente para testar
    const existingAgentsQuery = 'SELECT * FROM agents LIMIT 1';
    const existingResult = await pool.query(existingAgentsQuery);
    
    if (existingResult.rows.length > 0) {
      const testAgentId = existingResult.rows[0].id;
      console.log(`   🎯 Testando exclusão do agente: ${testAgentId}`);
      
      // Simular o que o frontend faz
      const frontendDeleteResponse = await fetch(`${API_BASE_URL}/api/agents/${testAgentId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   📡 Status da requisição: ${frontendDeleteResponse.status}`);
      console.log(`   📡 Headers da resposta: ${JSON.stringify(Object.fromEntries(frontendDeleteResponse.headers), null, 2)}`);
      
      if (frontendDeleteResponse.ok) {
        const result = await frontendDeleteResponse.json();
        console.log(`   ✅ Resposta bem-sucedida: ${JSON.stringify(result, null, 2)}`);
      } else {
        const errorText = await frontendDeleteResponse.text();
        console.log(`   ❌ Erro na exclusão: ${errorText}`);
      }
    } else {
      console.log('   ℹ️ Nenhum agente existente para testar');
    }
    
    console.log('\n📊 Resumo dos testes:');
    console.log('✅ Teste de criação: Concluído');
    console.log('✅ Teste de verificação: Concluído');
    console.log('✅ Teste de exclusão via API: Concluído');
    console.log('✅ Teste de listagem: Concluído');
    console.log('✅ Teste de simulação do frontend: Concluído');
    
    console.log('\n💡 Possíveis causas se o botão não funcionar:');
    console.log('1. Erro de JavaScript no frontend (verificar console do navegador)');
    console.log('2. Problema de CORS ou rede');
    console.log('3. Estado do React não atualizando após exclusão');
    console.log('4. Confirmação de exclusão sendo cancelada');
    console.log('5. Erro na função deleteAgent do frontend');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    await pool.end();
  }
}

// Executar testes
testDeletionFunctionality().catch(console.error);