const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFinalMessages() {
  console.log('🔍 Testando carregamento final de mensagens...');
  
  try {
    // 1. Buscar um ticket específico
    console.log('\n📋 1. Buscando tickets...');
    const ticketsQuery = query(
      collection(db, 'tickets'),
      limit(1)
    );
    
    const ticketsSnapshot = await getDocs(ticketsQuery);
    
    if (ticketsSnapshot.empty) {
      console.log('❌ Nenhum ticket encontrado');
      return;
    }
    
    const ticketDoc = ticketsSnapshot.docs[0];
    const ticketData = ticketDoc.data();
    
    console.log('✅ Ticket encontrado:', {
      id: ticketDoc.id,
      remoteJid: ticketData.remoteJid,
      instanceName: ticketData.instanceName,
      status: ticketData.status,
      clientName: ticketData.client?.name || 'N/A'
    });
    
    // 2. Buscar mensagens do ticket (sem orderBy para evitar erro de índice)
    console.log('\n📝 2. Buscando mensagens do ticket...');
    const messagesQuery = query(
      collection(db, 'messages'),
      where('remoteJid', '==', ticketData.remoteJid),
      where('instanceName', '==', ticketData.instanceName),
      limit(10)
    );
    
    const startTime = Date.now();
    const messagesSnapshot = await getDocs(messagesQuery);
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ Consulta executada em ${queryTime}ms`);
    console.log(`📊 Encontradas ${messagesSnapshot.size} mensagens`);
    
    // 3. Analisar as mensagens
    if (!messagesSnapshot.empty) {
      console.log('\n📋 3. Análise das mensagens:');
      
      messagesSnapshot.docs.forEach((doc, index) => {
        const messageData = doc.data();
        console.log(`Mensagem ${index + 1}:`, {
          id: doc.id,
          sender: messageData.sender,
          content: messageData.content?.substring(0, 50) + '...',
          timestamp: messageData.timestamp,
          type: messageData.type,
          isFromMe: messageData.isFromMe
        });
      });
      
      // 4. Verificar se há mensagens com sender undefined
      const undefinedSenders = messagesSnapshot.docs.filter(doc => 
        doc.data().sender === undefined || doc.data().sender === null
      );
      
      if (undefinedSenders.length > 0) {
        console.log(`\n⚠️  Ainda existem ${undefinedSenders.length} mensagens com sender undefined`);
      } else {
        console.log('\n✅ Todas as mensagens têm sender definido');
      }
      
    } else {
      console.log('❌ Nenhuma mensagem encontrada para este ticket');
    }
    
    // 5. Testar performance com mais mensagens
    console.log('\n⚡ 4. Teste de performance com 50 mensagens...');
    const largeQuery = query(
      collection(db, 'messages'),
      where('remoteJid', '==', ticketData.remoteJid),
      where('instanceName', '==', ticketData.instanceName),
      limit(50)
    );
    
    const largeStartTime = Date.now();
    const largeSnapshot = await getDocs(largeQuery);
    const largeQueryTime = Date.now() - largeStartTime;
    
    console.log(`✅ Consulta de 50 mensagens executada em ${largeQueryTime}ms`);
    console.log(`📊 Total de mensagens carregadas: ${largeSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error('Detalhes do erro:', {
      code: error.code,
      message: error.message
    });
  }
}

// Executar teste
testFinalMessages()
  .then(() => {
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });