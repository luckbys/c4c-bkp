const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Configuração do Firebase (usando as mesmas configurações do projeto)
const firebaseConfig = {
  apiKey: "AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkActiveTickets() {
  try {
    console.log('🔍 Verificando tickets ativos com agentes IA...');
    
    // Buscar tickets ativos (open ou pending)
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, where('status', 'in', ['open', 'pending']));
    const snapshot = await getDocs(q);
    
    console.log(`\n📊 Total de tickets ativos: ${snapshot.size}`);
    
    if (snapshot.size === 0) {
      console.log('❌ Nenhum ticket ativo encontrado!');
      console.log('\n💡 SOLUÇÃO: Crie um ticket ativo ou verifique se há tickets com status \'open\' ou \'pending\'.');
      return;
    }
    
    let ticketsWithAI = 0;
    let ticketsWithAutoResponse = 0;
    let ticketsWithProblems = [];
    
    console.log('\n=== DETALHES DOS TICKETS ATIVOS ===');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const hasAIAgent = data.assignedAgent?.type === 'ai';
      const hasAutoResponse = data.aiConfig?.autoResponse === true;
      const hasEvoAiId = data.assignedAgent?.evoAiAgentId;
      
      if (hasAIAgent) ticketsWithAI++;
      if (hasAutoResponse) ticketsWithAutoResponse++;
      
      // Identificar problemas
      let problems = [];
      if (!hasAIAgent) problems.push('Nenhum agente IA atribuído');
      if (hasAIAgent && !hasAutoResponse) problems.push('AutoResponse desabilitado');
      if (hasAIAgent && !hasEvoAiId) problems.push('Sem evoAiAgentId configurado');
      if (!data.remoteJid && !data.clientPhone) problems.push('Sem identificação do cliente (remoteJid/clientPhone)');
      if (!data.instanceName) problems.push('Sem instância configurada');
      
      if (problems.length > 0) {
        ticketsWithProblems.push({ id: doc.id, problems });
      }
      
      console.log(`\n📋 Ticket ID: ${doc.id}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Cliente: ${data.clientName || 'N/A'}`);
      console.log(`   Telefone/JID: ${data.remoteJid || data.clientPhone || 'N/A'}`);
      console.log(`   Instância: ${data.instanceName || 'N/A'}`);
      
      if (data.assignedAgent) {
        console.log(`   🤖 Agente Atribuído:`);
        console.log(`      Nome: ${data.assignedAgent.name}`);
        console.log(`      Tipo: ${data.assignedAgent.type}`);
        console.log(`      ID: ${data.assignedAgent.id}`);
        if (data.assignedAgent.evoAiAgentId) {
          console.log(`      Evo AI ID: ${data.assignedAgent.evoAiAgentId}`);
        } else {
          console.log(`      ⚠️ Evo AI ID: NÃO CONFIGURADO`);
        }
      } else {
        console.log(`   ❌ Nenhum agente atribuído`);
      }
      
      if (data.aiConfig) {
        console.log(`   ⚙️ Configuração IA:`);
        console.log(`      Auto Response: ${data.aiConfig.autoResponse ? '✅ HABILITADO' : '❌ DESABILITADO'}`);
        console.log(`      Confidence Threshold: ${data.aiConfig.escalationRules?.confidenceThreshold || 0.7}`);
        console.log(`      Max Interactions: ${data.aiConfig.escalationRules?.maxInteractions || 'N/A'}`);
      } else {
        console.log(`   ❌ Nenhuma configuração IA`);
      }
      
      if (problems.length > 0) {
        console.log(`   🚨 PROBLEMAS IDENTIFICADOS:`);
        problems.forEach(problem => console.log(`      - ${problem}`));
      } else {
        console.log(`   ✅ Configuração parece correta`);
      }
      
      console.log(`   📅 Criado em: ${data.createdAt?.toDate?.() || data.createdAt || 'N/A'}`);
      console.log(`   📅 Atualizado em: ${data.updatedAt?.toDate?.() || data.updatedAt || 'N/A'}`);
    });
    
    console.log('\n=== RESUMO E DIAGNÓSTICO ===');
    console.log(`📊 Total de tickets ativos: ${snapshot.size}`);
    console.log(`🤖 Tickets com agente IA: ${ticketsWithAI}`);
    console.log(`🔄 Tickets com resposta automática: ${ticketsWithAutoResponse}`);
    console.log(`🚨 Tickets com problemas: ${ticketsWithProblems.length}`);
    
    if (ticketsWithProblems.length > 0) {
      console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
      ticketsWithProblems.forEach(ticket => {
        console.log(`   Ticket ${ticket.id}:`);
        ticket.problems.forEach(problem => console.log(`      - ${problem}`));
      });
    }
    
    console.log('\n💡 SOLUÇÕES RECOMENDADAS:');
    
    if (ticketsWithAI === 0) {
      console.log('   1. ❌ PROBLEMA CRÍTICO: Nenhum ticket tem agente IA atribuído!');
      console.log('      SOLUÇÃO: Atribuir um agente IA aos tickets ativos através da interface do CRM.');
    } else if (ticketsWithAutoResponse === 0) {
      console.log('   1. ❌ PROBLEMA CRÍTICO: Nenhum ticket tem resposta automática habilitada!');
      console.log('      SOLUÇÃO: Habilitar autoResponse=true na configuração IA dos tickets.');
    } else {
      console.log('   1. ✅ Configuração básica parece correta.');
    }
    
    console.log('   2. 🔍 Verificar logs do webhook em tempo real:');
    console.log('      - Envie uma mensagem para o WhatsApp do ticket');
    console.log('      - Monitore os logs do servidor Next.js');
    console.log('      - Procure por mensagens como "[EXISTING-AGENT]" ou "[TICKET-AGENT]"');
    
    console.log('   3. 🔧 Verificar configurações do Evolution API:');
    console.log('      - Webhook configurado corretamente');
    console.log('      - Instância ativa e conectada');
    console.log('      - API Key válida');
    
    console.log('   4. 🧪 Testar manualmente:');
    console.log('      - Use o endpoint /api/v1/a2a/{agentId}/execute');
    console.log('      - Verifique se o agente responde corretamente');
    
  } catch (error) {
    console.error('❌ Erro ao verificar tickets:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('permission-denied') || error.message.includes('PERMISSION_DENIED')) {
      console.log('\n💡 ERRO DE PERMISSÃO:');
      console.log('   - Verifique as regras do Firestore');
      console.log('   - Confirme se a configuração do Firebase está correta');
      console.log('   - Verifique se o projeto Firebase está ativo');
    }
  }
}

// Executar verificação
console.log('🚀 Iniciando diagnóstico de resposta automática...');
checkActiveTickets()
  .then(() => {
    console.log('\n🎉 Diagnóstico concluído!');
    console.log('\n📞 Se o problema persistir, verifique:');
    console.log('   - Logs do servidor em tempo real');
    console.log('   - Configuração do webhook do Evolution API');
    console.log('   - Status da conexão da instância WhatsApp');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no diagnóstico:', error.message);
    process.exit(1);
  });