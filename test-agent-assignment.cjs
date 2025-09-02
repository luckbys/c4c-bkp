// Script para testar a atribuição de agentes IA aos tickets
const axios = require('axios');

const BASE_URL = 'http://localhost:9004';

async function testAgentAssignment() {
  try {
    console.log('🧪 Testando atribuição de agentes IA aos tickets...');
    
    // 1. Buscar tickets disponíveis
    console.log('\n1. 📋 Buscando tickets disponíveis...');
    const ticketsResponse = await axios.get(`${BASE_URL}/api/tickets?instance=loja`);
    const tickets = ticketsResponse.data.tickets;
    
    if (!tickets || tickets.length === 0) {
      console.log('❌ Nenhum ticket encontrado');
      return;
    }
    
    const testTicket = tickets[0];
    console.log(`✅ Ticket de teste selecionado: ${testTicket.id}`);
    
    // 2. Buscar agentes disponíveis
    console.log('\n2. 🤖 Buscando agentes disponíveis...');
    const agentsResponse = await axios.post(`${BASE_URL}/api/agents/available`, {
      ticketId: testTicket.id
    });
    
    const agents = agentsResponse.data.agents;
    
    if (!agents || agents.length === 0) {
      console.log('❌ Nenhum agente disponível');
      return;
    }
    
    const testAgent = agents[0];
    console.log(`✅ Agente de teste selecionado: ${testAgent.id} - ${testAgent.name}`);
    
    // 3. Testar atribuição do agente
    console.log('\n3. 🎯 Testando atribuição do agente...');
    const assignResponse = await axios.post(`${BASE_URL}/api/tickets/${testTicket.id}/agent`, {
      agentId: testAgent.id,
      activationMode: 'manual',
      autoResponse: false
    });
    
    console.log('✅ Resposta da atribuição:', assignResponse.data);
    
    // 4. Verificar se o agente foi atribuído
    console.log('\n4. 🔍 Verificando atribuição...');
    const checkResponse = await axios.get(`${BASE_URL}/api/tickets/${testTicket.id}/agent`);
    console.log('✅ Agente atribuído:', checkResponse.data);
    
    // 5. Remover agente (cleanup)
    console.log('\n5. 🧹 Removendo agente (cleanup)...');
    const removeResponse = await axios.delete(`${BASE_URL}/api/tickets/${testTicket.id}/agent`);
    console.log('✅ Agente removido:', removeResponse.data);
    
    console.log('\n🎉 Teste de atribuição de agentes concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Dados:', error.response.data);
    }
    
    if (error.code) {
      console.error('🔧 Código:', error.code);
    }
  }
}

// Executar teste
testAgentAssignment().catch(console.error);