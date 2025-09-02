const axios = require('axios');

// Configurações
const BASE_URL = 'http://localhost:9004';
const TICKET_ID = 'jAWBpqqq7luqqW82pxfd'; // ID do ticket visível na interface

async function checkAutoResponseConfig() {
  try {
    console.log('🔍 [CONFIG] Verificando configuração de resposta automática...');
    console.log(`📋 [CONFIG] Ticket ID: ${TICKET_ID}`);
    
    // 1. Buscar dados do ticket via API
    console.log('\n📡 [CONFIG] Buscando dados do ticket via API...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/tickets/${TICKET_ID}`, {
        timeout: 10000
      });
      
      const ticket = response.data;
      
      console.log('✅ [CONFIG] Ticket encontrado!');
      console.log('\n📋 [CONFIG] Dados do ticket:');
      console.log(`   ID: ${ticket.id}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Cliente: ${ticket.client?.name || 'N/A'}`);
      console.log(`   Telefone: ${ticket.client?.phone || 'N/A'}`);
      console.log(`   Instância: ${ticket.instanceName}`);
      
      // 2. Verificar agente atribuído
      console.log('\n🤖 [CONFIG] Verificando agente atribuído:');
      if (!ticket.assignedAgent) {
        console.log('❌ [CONFIG] Nenhum agente atribuído ao ticket!');
        console.log('💡 [CONFIG] Para atribuir um agente:');
        console.log('   1. Clique no botão "Atribuir Agente IA" na interface');
        console.log('   2. Selecione o agente "Suporte"');
        console.log('   3. Configure o modo de ativação');
        return;
      }
      
      console.log(`✅ [CONFIG] Agente atribuído:`);
      console.log(`   Tipo: ${ticket.assignedAgent.type}`);
      console.log(`   ID: ${ticket.assignedAgent.id}`);
      console.log(`   Nome: ${ticket.assignedAgent.name}`);
      console.log(`   Evo AI ID: ${ticket.assignedAgent.evoAiAgentId || 'N/A'}`);
      
      // 3. Verificar configuração AI
      console.log('\n⚙️ [CONFIG] Verificando configuração AI:');
      if (!ticket.aiConfig) {
        console.log('❌ [CONFIG] Configuração AI não encontrada!');
        console.log('💡 [CONFIG] Para configurar:');
        console.log('   1. Clique no ícone de configuração do agente');
        console.log('   2. Habilite "Resposta Automática"');
        console.log('   3. Defina o modo de ativação como "Imediato"');
        return;
      }
      
      console.log(`✅ [CONFIG] Configuração AI encontrada:`);
      console.log(`   Modo de ativação: ${ticket.aiConfig.activationMode}`);
      console.log(`   Resposta automática: ${ticket.aiConfig.autoResponse}`);
      console.log(`   Max interações: ${ticket.aiConfig.escalationRules?.maxInteractions || 'N/A'}`);
      console.log(`   Escalar para humano: ${ticket.aiConfig.escalationRules?.escalateToHuman || 'N/A'}`);
      
      // 4. Diagnóstico
      console.log('\n🔍 [CONFIG] Diagnóstico:');
      
      if (ticket.assignedAgent.type !== 'ai') {
        console.log('❌ [CONFIG] Problema: Agente não é do tipo IA');
        console.log('💡 [CONFIG] Solução: Atribuir um agente IA ao ticket');
      } else if (!ticket.aiConfig.autoResponse) {
        console.log('❌ [CONFIG] Problema: Resposta automática está DESABILITADA');
        console.log('💡 [CONFIG] Solução: Habilitar autoResponse = true');
        console.log('\n🔧 [CONFIG] Para corrigir via API:');
        console.log(`   PUT ${BASE_URL}/api/tickets/${TICKET_ID}/agent`);
        console.log('   Body: { "autoResponse": true }');
      } else {
        console.log('✅ [CONFIG] Configuração parece correta!');
        console.log('🔍 [CONFIG] Se ainda não está funcionando, verificar:');
        console.log('   1. Logs do servidor para mensagens EXISTING-AGENT');
        console.log('   2. Conectividade com Evo AI');
        console.log('   3. Processamento de webhooks');
      }
      
    } catch (apiError) {
      console.error('❌ [CONFIG] Erro ao buscar ticket via API:', {
        message: apiError.message,
        status: apiError.response?.status,
        data: apiError.response?.data
      });
    }
    
  } catch (error) {
    console.error('❌ [CONFIG] Erro geral:', error.message);
  }
}

// Executar verificação
checkAutoResponseConfig().catch(console.error);

// Função adicional para corrigir configuração
async function fixAutoResponse() {
  try {
    console.log('\n🔧 [FIX] Tentando corrigir configuração de resposta automática...');
    
    const response = await axios.put(`${BASE_URL}/api/tickets/${TICKET_ID}/agent`, {
      autoResponse: true,
      activationMode: 'immediate'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ [FIX] Configuração atualizada com sucesso!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Resposta: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    console.error('❌ [FIX] Erro ao corrigir configuração:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Exportar função de correção para uso manual
if (process.argv.includes('--fix')) {
  fixAutoResponse().catch(console.error);
}