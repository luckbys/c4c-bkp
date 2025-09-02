// Script para debugar problemas no frontend
const fetch = require('node-fetch');

async function debugFrontendDeletion() {
  console.log('🔍 Debugando problemas de exclusão no frontend...');
  
  try {
    // Verificar se a API está respondendo corretamente
    console.log('\n1. 📡 Testando conectividade da API...');
    const healthCheck = await fetch('http://localhost:9004/api/agents', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${healthCheck.status}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(healthCheck.headers), null, 2)}`);
    
    if (healthCheck.ok) {
      const agents = await healthCheck.json();
      console.log(`   ✅ API funcionando: ${agents?.length || 0} agentes`);
    } else {
      console.log(`   ❌ API com problema: ${await healthCheck.text()}`);
    }
    
    // Verificar CORS
    console.log('\n2. 🌐 Verificando CORS...');
    const corsHeaders = healthCheck.headers.get('access-control-allow-origin');
    console.log(`   CORS Origin: ${corsHeaders || 'Não definido'}`);
    
    // Simular requisição exata do frontend
    console.log('\n3. 🖥️ Simulando requisição exata do frontend...');
    
    // Primeiro, criar um agente para testar
    const testAgent = {
      name: 'Teste_Frontend_Debug_' + Date.now(),
      description: 'Agente para debug do frontend',
      prompt: 'Teste',
      model: 'gpt-3.5-turbo',
      type: 'assistant'
    };
    
    const createResponse = await fetch('http://localhost:9004/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAgent)
    });
    
    if (createResponse.ok) {
      const created = await createResponse.json();
      const agentId = created.agent?.id;
      
      if (agentId) {
        console.log(`   ✅ Agente criado para teste: ${agentId}`);
        
        // Simular exatamente o que o frontend faz
        console.log('\n4. 🎯 Simulando clique do botão (fetch exato do frontend)...');
        
        const deleteResponse = await fetch(`http://localhost:9004/api/agents/${agentId}`, {
          method: 'DELETE'
        });
        
        console.log(`   Status: ${deleteResponse.status}`);
        console.log(`   Status Text: ${deleteResponse.statusText}`);
        console.log(`   Headers: ${JSON.stringify(Object.fromEntries(deleteResponse.headers), null, 2)}`);
        
        if (deleteResponse.ok) {
          const result = await deleteResponse.json();
          console.log(`   ✅ Exclusão bem-sucedida: ${JSON.stringify(result, null, 2)}`);
          
          // Verificar se realmente foi excluído
          console.log('\n5. ✅ Verificando se foi realmente excluído...');
          const checkResponse = await fetch('http://localhost:9004/api/agents');
          
          if (checkResponse.ok) {
            const response = await checkResponse.json();
            console.log(`   📊 Resposta da API: ${JSON.stringify(response, null, 2)}`);
            
            // A resposta pode ser um array ou um objeto com propriedade agents
            const allAgents = Array.isArray(response) ? response : (response.agents || []);
            
            if (Array.isArray(allAgents)) {
              const stillExists = allAgents.find(agent => agent.id === agentId);
              
              if (stillExists) {
                console.log(`   ❌ PROBLEMA: Agente ainda existe na lista!`);
                console.log(`   📊 Dados do agente: ${JSON.stringify(stillExists, null, 2)}`);
              } else {
                console.log(`   ✅ Agente foi removido da lista corretamente`);
              }
            } else {
              console.log(`   ⚠️ Formato de resposta inesperado: ${typeof response}`);
            }
          }
          
        } else {
          const errorText = await deleteResponse.text();
          console.log(`   ❌ Erro na exclusão: ${errorText}`);
        }
        
      } else {
        console.log(`   ❌ Não foi possível obter ID do agente criado`);
      }
    } else {
      console.log(`   ❌ Falha ao criar agente de teste: ${createResponse.status}`);
    }
    
    console.log('\n📋 Checklist para debug no navegador:');
    console.log('1. Abra o DevTools (F12)');
    console.log('2. Vá para a aba Console');
    console.log('3. Clique no botão de exclusão');
    console.log('4. Verifique se aparecem erros no console');
    console.log('5. Vá para a aba Network');
    console.log('6. Clique no botão de exclusão novamente');
    console.log('7. Verifique se a requisição DELETE aparece');
    console.log('8. Verifique o status da requisição (200 = sucesso)');
    console.log('9. Verifique se o estado do React está atualizando');
    
    console.log('\n🔧 Possíveis soluções:');
    console.log('1. Se não aparecer requisição: Problema no onClick do botão');
    console.log('2. Se requisição falhar: Problema de rede/CORS');
    console.log('3. Se requisição suceder mas lista não atualizar: Problema no setState');
    console.log('4. Se confirmação não aparecer: Problema no confirm()');
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  }
}

debugFrontendDeletion().catch(console.error);