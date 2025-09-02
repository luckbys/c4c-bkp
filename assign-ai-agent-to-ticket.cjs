const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

// Configuração do Firebase
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

// Configuração do agente IA (usando o agente "suporte n1" que já existe)
const AI_AGENT_CONFIG = {
  id: "C8LgbejH133fJq8P8EZv",
  name: "suporte n1",
  type: "ai",
  evoAiAgentId: "77254574-0049-4e44-abd3-741e832e7e67" // ID correto do Evo AI
};

// Configuração IA padrão
const DEFAULT_AI_CONFIG = {
  autoResponse: true,
  escalationRules: {
    confidenceThreshold: 0.7,
    maxInteractions: 10,
    escalateToHuman: true
  },
  responseSettings: {
    maxResponseTime: 30000, // 30 segundos
    enableFallback: true
  }
};

async function assignAIAgentToTicket(ticketId) {
  try {
    console.log(`🤖 Atribuindo agente IA ao ticket ${ticketId}...`);
    
    // Verificar se o ticket existe
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      console.log(`❌ Ticket ${ticketId} não encontrado!`);
      return false;
    }
    
    const ticketData = ticketSnap.data();
    console.log(`📋 Ticket encontrado: ${ticketData.clientName || 'Cliente'} - ${ticketData.remoteJid || ticketData.clientPhone}`);
    
    // Atualizar ticket com agente IA e configuração
    await updateDoc(ticketRef, {
      assignedAgent: AI_AGENT_CONFIG,
      aiConfig: DEFAULT_AI_CONFIG,
      updatedAt: new Date(),
      lastModifiedBy: 'system-auto-assignment'
    });
    
    console.log(`✅ Agente IA "${AI_AGENT_CONFIG.name}" atribuído com sucesso!`);
    console.log(`🔄 Resposta automática habilitada`);
    console.log(`⚙️ Configurações aplicadas:`);
    console.log(`   - Auto Response: ${DEFAULT_AI_CONFIG.autoResponse}`);
    console.log(`   - Confidence Threshold: ${DEFAULT_AI_CONFIG.escalationRules.confidenceThreshold}`);
    console.log(`   - Max Interactions: ${DEFAULT_AI_CONFIG.escalationRules.maxInteractions}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao atribuir agente IA:`, error.message);
    return false;
  }
}

async function assignAIAgentToAllActiveTickets() {
  try {
    console.log('🚀 Atribuindo agente IA a todos os tickets ativos...');
    
    // Buscar tickets ativos sem agente IA
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, where('status', 'in', ['open', 'pending']));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Encontrados ${snapshot.size} tickets ativos`);
    
    let assigned = 0;
    let skipped = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const ticketId = docSnap.id;
      
      // Verificar se já tem agente IA
      if (data.assignedAgent?.type === 'ai') {
        console.log(`⏭️ Ticket ${ticketId} já tem agente IA atribuído`);
        skipped++;
        continue;
      }
      
      // Atribuir agente IA
      const success = await assignAIAgentToTicket(ticketId);
      if (success) {
        assigned++;
      }
      
      // Pequena pausa para não sobrecarregar o Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 RESUMO:`);
    console.log(`   ✅ Tickets com agente IA atribuído: ${assigned}`);
    console.log(`   ⏭️ Tickets já configurados: ${skipped}`);
    console.log(`   📊 Total processado: ${assigned + skipped}`);
    
  } catch (error) {
    console.error('❌ Erro ao processar tickets:', error.message);
  }
}

async function assignToSpecificTicket() {
  // Ticket específico mencionado pelo usuário (5512981022013)
  const ticketsRef = collection(db, 'tickets');
  const q = query(ticketsRef, where('remoteJid', '==', '5512981022013@s.whatsapp.net'));
  const snapshot = await getDocs(q);
  
  if (snapshot.size > 0) {
    const ticketDoc = snapshot.docs[0];
    console.log(`🎯 Encontrado ticket para 5512981022013: ${ticketDoc.id}`);
    await assignAIAgentToTicket(ticketDoc.id);
  } else {
    console.log('❌ Ticket para 5512981022013 não encontrado');
  }
}

// Função principal
async function main() {
  console.log('🤖 Configurador de Agente IA para Tickets');
  console.log('==========================================');
  
  // Verificar se o agente IA existe
  console.log('🔍 Verificando agente IA...');
  const agentRef = doc(db, 'agents', AI_AGENT_CONFIG.id);
  const agentSnap = await getDoc(agentRef);
  
  if (!agentSnap.exists()) {
    console.log(`❌ Agente IA "${AI_AGENT_CONFIG.name}" (${AI_AGENT_CONFIG.id}) não encontrado!`);
    console.log('💡 Certifique-se de que o agente existe na coleção "agents"');
    return;
  }
  
  const agentData = agentSnap.data();
  console.log(`✅ Agente IA "${agentData.name}" encontrado`);
  console.log(`   Status: ${agentData.status}`);
  console.log(`   Evo AI ID: ${agentData.evoAiAgentId}`);
  
  // Primeiro, tentar atribuir ao ticket específico do usuário
  console.log('\n🎯 Atribuindo ao ticket específico (5512981022013)...');
  await assignToSpecificTicket();
  
  // Depois, processar todos os outros tickets ativos
  console.log('\n🔄 Processando todos os tickets ativos...');
  await assignAIAgentToAllActiveTickets();
  
  console.log('\n✅ Configuração concluída!');
  console.log('\n📱 PRÓXIMOS PASSOS:');
  console.log('   1. Envie uma mensagem para o WhatsApp do ticket');
  console.log('   2. O agente IA deve responder automaticamente');
  console.log('   3. Monitore os logs do servidor para verificar o funcionamento');
  console.log('\n🔍 Para verificar se funcionou, execute:');
  console.log('   node check-active-tickets.cjs');
}

// Executar
main()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  });