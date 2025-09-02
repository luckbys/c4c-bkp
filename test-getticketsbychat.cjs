const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function testGetTicketsByChat() {
  console.log('🔍 Teste da função getTicketsByChat');
  console.log('=' .repeat(50));
  
  try {
    const remoteJid = '5512981022013@s.whatsapp.net';
    const instanceName = 'loja';
    
    console.log('📋 Parâmetros de busca:');
    console.log('- Remote JID:', remoteJid);
    console.log('- Instance Name:', instanceName);
    
    // Simular a mesma query que a função getTicketsByChat usa
    const q = query(
      collection(db, 'tickets'),
      where('remoteJid', '==', remoteJid),
      where('instanceName', '==', instanceName)
    );
    
    console.log('\n🔍 Executando query...');
    const querySnapshot = await getDocs(q);
    
    console.log('📊 Resultados encontrados:', querySnapshot.size);
    
    if (querySnapshot.empty) {
      console.log('❌ Nenhum ticket encontrado para estes parâmetros');
      
      // Verificar se existe ticket com remoteJid sem @s.whatsapp.net
      const remoteJidWithoutSuffix = '5512981022013';
      console.log('\n🔍 Tentando buscar com remoteJid sem sufixo:', remoteJidWithoutSuffix);
      
      const q2 = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', remoteJidWithoutSuffix),
        where('instanceName', '==', instanceName)
      );
      
      const querySnapshot2 = await getDocs(q2);
      console.log('📊 Resultados com remoteJid sem sufixo:', querySnapshot2.size);
      
      if (!querySnapshot2.empty) {
        querySnapshot2.forEach((doc) => {
          const data = doc.data();
          console.log('\n📋 Ticket encontrado (sem sufixo):');
          console.log('- ID:', doc.id);
          console.log('- Remote JID:', data.remoteJid);
          console.log('- Instance Name:', data.instanceName);
          console.log('- Status:', data.status);
          console.log('- Assigned Agent:', data.assignedAgent);
          console.log('- AI Config:', data.aiConfig);
        });
      }
      
      return;
    }
    
    // Processar resultados encontrados
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      console.log('\n📋 Ticket encontrado:');
      console.log('- ID:', doc.id);
      console.log('- Remote JID:', data.remoteJid);
      console.log('- Instance Name:', data.instanceName);
      console.log('- Status:', data.status);
      console.log('- Cliente:', data.client?.name || 'N/A');
      
      // Verificar agente atribuído
      if (data.assignedAgent) {
        console.log('\n🤖 Agente Atribuído:');
        console.log('- Tipo:', data.assignedAgent.type);
        console.log('- ID:', data.assignedAgent.id);
        console.log('- Nome:', data.assignedAgent.name);
        console.log('- Evo AI Agent ID:', data.assignedAgent.evoAiAgentId);
      } else {
        console.log('\n❌ Nenhum agente atribuído');
      }
      
      // Verificar AI Config
      if (data.aiConfig) {
        console.log('\n⚙️ AI Config:');
        console.log('- Auto Response:', data.aiConfig.autoResponse);
        console.log('- Mode:', data.aiConfig.mode);
        console.log('- Agent ID:', data.aiConfig.agentId);
        console.log('- Max Interactions:', data.aiConfig.maxInteractionsPerTicket);
      } else {
        console.log('\n❌ Nenhuma configuração de IA');
      }
      
      // Verificar critérios para processamento
      const isActiveTicket = data.status === 'open' || data.status === 'pending';
      const hasAIAgent = data.assignedAgent?.type === 'ai';
      const hasAutoResponse = data.aiConfig?.autoResponse === true;
      
      console.log('\n✅ Critérios de processamento:');
      console.log('- Status ativo (open/pending):', isActiveTicket);
      console.log('- Tem agente IA:', hasAIAgent);
      console.log('- Auto response ativo:', hasAutoResponse);
      console.log('- Atende todos os critérios:', isActiveTicket && hasAIAgent && hasAutoResponse);
    });
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testGetTicketsByChat();