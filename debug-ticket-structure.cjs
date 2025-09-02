const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

const TICKET_ID = 'S4waFsks3t96n1WOkVV4';

async function debugTicketStructure() {
  try {
    console.log('🔍 Analisando estrutura do ticket...');
    
    const ticketRef = doc(db, 'tickets', TICKET_ID);
    const ticketDoc = await getDoc(ticketRef);
    
    if (ticketDoc.exists()) {
      const data = ticketDoc.data();
      
      console.log('\n📋 Estrutura completa do ticket:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🔍 Análise específica:');
      console.log('- ID:', ticketDoc.id);
      console.log('- Status:', data.status);
      console.log('- Agent ID:', data.agentId);
      console.log('- Assigned Agent:', data.assignedAgent);
      console.log('- AI Config:', data.aiConfig);
      
      // Verificar se tem assignedAgent com type 'ai'
      if (data.assignedAgent) {
        console.log('\n🤖 Assigned Agent Details:');
        console.log('- Type:', data.assignedAgent.type);
        console.log('- ID:', data.assignedAgent.id);
        console.log('- Name:', data.assignedAgent.name);
      }
      
      // Verificar aiConfig
      if (data.aiConfig) {
        console.log('\n⚙️ AI Config Details:');
        console.log('- Auto Response:', data.aiConfig.autoResponse);
        console.log('- Mode:', data.aiConfig.mode);
        console.log('- Agent ID:', data.aiConfig.agentId);
      }
      
      // Verificar se atende aos critérios do teste
      const isActiveTicket = data.status === 'open' || data.status === 'pending';
      const hasAIAgent = data.assignedAgent?.type === 'ai';
      const hasAutoResponse = data.aiConfig?.autoResponse === true;
      
      console.log('\n✅ Critérios de detecção:');
      console.log('- Status ativo (open/pending):', isActiveTicket);
      console.log('- Tem agente IA:', hasAIAgent);
      console.log('- Auto response ativo:', hasAutoResponse);
      console.log('- Atende todos os critérios:', isActiveTicket && hasAIAgent && hasAutoResponse);
      
    } else {
      console.log('❌ Ticket não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

debugTicketStructure();