// Script para verificar agente atribuído ao ticket 5512981022013
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');

// Configuração do Firebase (usando valores padrão do projeto)
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

async function checkTicketAgent() {
  try {
    console.log('🔍 Verificando ticket para telefone 5512981022013...');
    
    // Buscar ticket por telefone
    const ticketsRef = collection(db, 'tickets');
    const phoneQuery = query(ticketsRef, where('phone', '==', '5512981022013'));
    const phoneSnapshot = await getDocs(phoneQuery);
    
    if (phoneSnapshot.empty) {
      console.log('❌ Nenhum ticket encontrado para o telefone 5512981022013');
      
      // Tentar buscar por remoteJid
      console.log('🔍 Tentando buscar por remoteJid...');
      const jidQuery = query(ticketsRef, where('remoteJid', '==', '5512981022013@s.whatsapp.net'));
      const jidSnapshot = await getDocs(jidQuery);
      
      if (jidSnapshot.empty) {
        console.log('❌ Nenhum ticket encontrado para remoteJid 5512981022013@s.whatsapp.net');
        
        // Listar alguns tickets para debug
        console.log('\n📋 Listando primeiros 5 tickets para debug:');
        const allTicketsSnapshot = await getDocs(query(ticketsRef));
        let count = 0;
        allTicketsSnapshot.forEach(doc => {
          if (count < 5) {
            const data = doc.data();
            console.log(`   ID: ${doc.id}`);
            console.log(`   Phone: ${data.phone}`);
            console.log(`   RemoteJid: ${data.remoteJid}`);
            console.log(`   Instance: ${data.instanceName}`);
            console.log(`   Agent: ${data.assignedAgent ? data.assignedAgent.name : 'Nenhum'}`);
             console.log('   ---');
            count++;
          }
        });
        return;
      } else {
        console.log('✅ Ticket encontrado por remoteJid!');
        await processTickets(jidSnapshot);
      }
    } else {
      console.log('✅ Ticket encontrado por telefone!');
      await processTickets(phoneSnapshot);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar ticket:', error.message);
  }
}

async function processTickets(querySnapshot) {
  for (const ticketDoc of querySnapshot.docs) {
    const data = ticketDoc.data();
    console.log('\n📋 Detalhes do Ticket:');
    console.log(`   ID: ${ticketDoc.id}`);
    console.log(`   Phone: ${data.phone}`);
    console.log(`   RemoteJid: ${data.remoteJid}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Instance: ${data.instanceName}`);
    console.log(`   Assigned Agent: ${data.assignedAgent ? `${data.assignedAgent.name} (${data.assignedAgent.id})` : 'Nenhum agente atribuído'}`);
    console.log(`   AI Config: ${data.aiConfig ? 'Configurado' : 'Não configurado'}`);
    
    if (data.aiConfig) {
      console.log('\n🤖 Configuração do Agente IA:');
      console.log(`   Activation Mode: ${data.aiConfig.activationMode}`);
      console.log(`   Auto Response: ${data.aiConfig.autoResponse}`);
      console.log(`   Max Interactions: ${data.aiConfig.escalationRules?.maxInteractions}`);
      console.log(`   Escalate to Human: ${data.aiConfig.escalationRules?.escalateToHuman}`);
    }
    
    if (data.assignedAgent) {
      console.log('\n🔍 Verificando detalhes do agente...');
      await checkAgentDetails(data.assignedAgent.id);
    } else {
      console.log('\n❌ Nenhum agente atribuído a este ticket');
      console.log('\n💡 Para atribuir um agente:');
      console.log('   1. Acesse o painel do CRM');
      console.log('   2. Abra o ticket');
      console.log('   3. Clique em "Atribuir Agente IA"');
      console.log('   4. Selecione um agente disponível');
      console.log('   5. Configure o modo de ativação (immediate/manual)');
    }
  }
}

async function checkAgentDetails(agentId) {
  try {
    const agentDocRef = doc(db, 'agents', agentId);
    const agentDoc = await getDoc(agentDocRef);
    
    if (agentDoc.exists()) {
      const agentData = agentDoc.data();
      console.log('\n👤 Detalhes do Agente:');
      console.log(`   ID: ${agentDoc.id}`);
      console.log(`   Nome: ${agentData.name}`);
      console.log(`   Tipo: ${agentData.type}`);
      console.log(`   Ativo: ${agentData.active}`);
      console.log(`   Priority: ${agentData.priority}`);
      console.log(`   Evo AI Agent ID: ${agentData.evoAiAgentId || 'Não configurado'}`);
    } else {
      console.log(`❌ Agente ${agentId} não encontrado na coleção agents`);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar agente:', error.message);
  }
}

// Executar verificação
if (require.main === module) {
  checkTicketAgent();
}

module.exports = { checkTicketAgent };