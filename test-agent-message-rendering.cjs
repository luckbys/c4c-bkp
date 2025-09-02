const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, getDocs } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simular a lógica do client-firebase-service
function processMessage(doc) {
  const data = doc.data();
  
  // Determinar sender baseado nos dados disponíveis (mesma lógica do client-firebase-service)
  let sender = 'client';
  if (data.sender) {
    sender = data.sender;
  } else if (data.isFromMe !== undefined) {
    sender = data.isFromMe ? 'agent' : 'client';
  }
  
  const message = {
    id: doc.id,
    messageId: data.messageId || doc.id,
    content: data.content || '',
    sender: sender,
    timestamp: data.timestamp?.toDate?.() || new Date(),
    status: data.status || 'sent',
    type: data.type || 'text',
    isFromMe: data.isFromMe !== undefined ? data.isFromMe : sender === 'agent',
    pushName: data.pushName,
    mediaUrl: data.mediaUrl,
    fileName: data.fileName
  };
  
  return message;
}

// Simular a lógica do ChatMessage component
function shouldRenderAsAgent(message) {
  return message.isFromMe || message.sender === 'agent';
}

async function testAgentMessageRendering() {
  console.log('🧪 Testando renderização de mensagens do agente...');
  
  try {
    // Buscar mensagens recentes do agente (sem orderBy para evitar problema de índice)
    const messagesRef = collection(db, 'messages');
    const agentQuery = query(
      messagesRef,
      where('sender', '==', 'agent')
    );
    
    const snapshot = await getDocs(agentQuery);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma mensagem do agente encontrada');
      return;
    }
    
    console.log(`✅ Encontradas ${snapshot.size} mensagens do agente`);
    console.log('\n📋 Análise de renderização:');
    
    snapshot.forEach((doc, index) => {
      const processedMessage = processMessage(doc);
      const wouldRenderAsAgent = shouldRenderAsAgent(processedMessage);
      
      console.log(`\n   ${index + 1}. Mensagem ID: ${processedMessage.messageId}`);
      console.log(`      Conteúdo: ${processedMessage.content}`);
      console.log(`      Sender: ${processedMessage.sender}`);
      console.log(`      isFromMe: ${processedMessage.isFromMe}`);
      console.log(`      Renderizaria como agente: ${wouldRenderAsAgent ? '✅ SIM' : '❌ NÃO'}`);
      
      if (!wouldRenderAsAgent) {
        console.log(`      ⚠️  PROBLEMA: Mensagem do agente não seria renderizada corretamente!`);
      }
    });
    
    // Testar também mensagens com isFromMe = true
    console.log('\n🔍 Testando mensagens com isFromMe = true...');
    
    const isFromMeQuery = query(
      messagesRef,
      where('isFromMe', '==', true)
    );
    
    const isFromMeSnapshot = await getDocs(isFromMeQuery);
    
    console.log(`✅ Encontradas ${isFromMeSnapshot.size} mensagens com isFromMe = true`);
    
    isFromMeSnapshot.forEach((doc, index) => {
      if (index < 5) { // Mostrar apenas as 5 primeiras
        const processedMessage = processMessage(doc);
        const wouldRenderAsAgent = shouldRenderAsAgent(processedMessage);
        
        console.log(`\n   ${index + 1}. Mensagem ID: ${processedMessage.messageId}`);
        console.log(`      Conteúdo: ${processedMessage.content}`);
        console.log(`      Sender: ${processedMessage.sender}`);
        console.log(`      isFromMe: ${processedMessage.isFromMe}`);
        console.log(`      Renderizaria como agente: ${wouldRenderAsAgent ? '✅ SIM' : '❌ NÃO'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao testar renderização:', error);
  }
}

// Executar teste
testAgentMessageRendering().then(() => {
  console.log('\n🏁 Teste concluído');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro no teste:', error);
  process.exit(1);
});