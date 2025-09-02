// Script para atribuir agente IA ao ticket S4waFsks3t96n1WOkVV4
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc } = require('firebase/firestore');
const axios = require('axios');

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
const BASE_URL = 'http://localhost:9004';

async function assignAgentToTicket() {
  try {
    console.log('🔍 Verificando agentes disponíveis...');
    
    // Listar agentes disponíveis
    const agentsRef = collection(db, 'agents');
    const agentsSnapshot = await getDocs(agentsRef);
    
    if (agentsSnapshot.empty) {
      console.log('❌ Nenhum agente encontrado no Firestore');
      return;
    }
    
    console.log('\n👥 Agentes disponíveis:');
    let selectedAgent = null;
    
    agentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   ID: ${doc.id}`);
      console.log(`   Nome: ${data.name}`);
      console.log(`   Tipo: ${data.type}`);
      console.log(`   Ativo: ${data.active}`);
      console.log(`   Priority: ${data.priority}`);
      console.log(`   Evo AI Agent ID: ${data.evoAiAgentId || 'Não configurado'}`);
      console.log('   ---');
      
      // Selecionar o primeiro agente disponível (ativo ou sem propriedade active definida)
      if (!selectedAgent && (data.active !== false)) {
        selectedAgent = {
          id: doc.id,
          ...data
        };
      }
    });
    
    if (!selectedAgent) {
      console.log('❌ Nenhum agente encontrado');
      return;
    }
    
    console.log(`\n🎯 Selecionado agente: ${selectedAgent.name} (${selectedAgent.id})`);
    
    // Atribuir agente via API
    console.log('\n📤 Atribuindo agente ao ticket via API...');
    
    const assignmentData = {
      agentId: selectedAgent.id,
      mode: 'immediate', // ou 'manual'
      autoResponse: true,
      maxInteractionsPerTicket: 10
    };
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/tickets/${TICKET_ID}/agent`,
        assignmentData,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      if (response.status === 200) {
        console.log('✅ Agente atribuído com sucesso!');
        console.log(`   Status: ${response.status}`);
        console.log(`   Resposta: ${JSON.stringify(response.data, null, 2)}`);
        
        // Verificar se a atribuição foi salva
        console.log('\n🔍 Verificando atribuição no Firestore...');
        await verifyAssignment();
        
      } else {
        console.log(`❌ Erro na atribuição: ${response.status}`);
      }
      
    } catch (apiError) {
      console.error('❌ Erro na API de atribuição:', apiError.message);
      
      if (apiError.response) {
        console.log(`   Status: ${apiError.response.status}`);
        console.log(`   Dados: ${JSON.stringify(apiError.response.data, null, 2)}`);
      }
      
      // Tentar atribuição direta no Firestore como fallback
      console.log('\n🔄 Tentando atribuição direta no Firestore...');
      await directAssignment(selectedAgent);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

async function directAssignment(agent) {
  try {
    const ticketRef = doc(db, 'tickets', TICKET_ID);
    
    const updateData = {
      agentId: agent.id,
      aiConfig: {
        agentId: agent.id,
        autoResponse: true,
        mode: 'immediate',
        maxInteractionsPerTicket: 10,
        activatedAt: new Date(),
        activatedBy: 'system'
      },
      updatedAt: new Date()
    };
    
    await updateDoc(ticketRef, updateData);
    
    console.log('✅ Agente atribuído diretamente no Firestore!');
    console.log(`   Agent ID: ${agent.id}`);
    console.log(`   Auto Response: true`);
    console.log(`   Mode: immediate`);
    
    await verifyAssignment();
    
  } catch (error) {
    console.error('❌ Erro na atribuição direta:', error.message);
  }
}

async function verifyAssignment() {
  try {
    const ticketRef = doc(db, 'tickets', TICKET_ID);
    const ticketDoc = await getDoc(ticketRef);
    
    if (ticketDoc.exists()) {
      const data = ticketDoc.data();
      console.log('\n✅ Verificação da atribuição:');
      console.log(`   Ticket ID: ${ticketDoc.id}`);
      console.log(`   Agent ID: ${data.agentId || 'Nenhum'}`);
      console.log(`   AI Config: ${data.aiConfig ? 'Configurado' : 'Não configurado'}`);
      
      if (data.aiConfig) {
        console.log(`   Auto Response: ${data.aiConfig.autoResponse}`);
        console.log(`   Mode: ${data.aiConfig.mode}`);
        console.log(`   Max Interactions: ${data.aiConfig.maxInteractionsPerTicket}`);
      }
    } else {
      console.log('❌ Ticket não encontrado para verificação');
    }
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

// Executar atribuição
if (require.main === module) {
  assignAgentToTicket();
}

module.exports = { assignAgentToTicket };