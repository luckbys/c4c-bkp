const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw',
  authDomain: 'cerc-3m1uep.firebaseapp.com',
  projectId: 'cerc-3m1uep',
  storageBucket: 'cerc-3m1uep.appspot.com',
  messagingSenderId: '881065106062',
  appId: '1:881065106062:web:598a55c9ee155cfa7447df'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixAgentConfidence() {
  try {
    console.log('🔧 Corrigindo configuração de confiança do agente Suporte...');
    
    // Buscar o agente Suporte
    const q = query(collection(db, 'agents'), where('name', '==', 'Suporte'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Agente Suporte não encontrado');
      return;
    }
    
    snapshot.forEach(async (agentDoc) => {
      const agentData = agentDoc.data();
      console.log('📋 Agente encontrado:', {
        id: agentDoc.id,
        name: agentData.name,
        currentAiConfig: agentData.aiConfig
      });
      
      // Configurar aiConfig com limite de confiança mais baixo
      const newAiConfig = {
        autoResponse: true,
        escalationRules: {
          confidenceThreshold: 0.4, // Reduzir de 0.6 para 0.4
          maxAttempts: 3,
          timeoutMinutes: 30
        },
        responseSettings: {
          maxLength: 500,
          tone: 'professional',
          language: 'pt-BR'
        }
      };
      
      // Atualizar o agente
      await updateDoc(doc(db, 'agents', agentDoc.id), {
        aiConfig: newAiConfig
      });
      
      console.log('✅ Agente atualizado com sucesso!');
      console.log('📊 Nova configuração:', {
        confidenceThreshold: newAiConfig.escalationRules.confidenceThreshold,
        autoResponse: newAiConfig.autoResponse
      });
      
      console.log('\n🎯 Agora o agente deve responder mensagens com confiança >= 0.4');
      console.log('💡 Teste novamente o webhook para verificar se funciona');
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar agente:', error);
  }
}

fixAgentConfidence();