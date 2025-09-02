const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs, where, Timestamp } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRecentMessages() {
  try {
    console.log('🔍 Verificando mensagens recentes...');
    
    // Buscar mensagens dos últimos 10 minutos
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const tenMinutesAgoTimestamp = Timestamp.fromDate(tenMinutesAgo);
    
    const messagesRef = collection(db, 'messages');
    const recentQuery = query(
      messagesRef,
      where('timestamp', '>=', tenMinutesAgoTimestamp),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(recentQuery);
    
    console.log(`📊 Total de mensagens recentes encontradas: ${querySnapshot.size}`);
    
    if (querySnapshot.empty) {
      console.log('❌ Nenhuma mensagem recente encontrada');
      return;
    }
    
    console.log('\n📝 Análise das mensagens recentes:');
    
    querySnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nMensagem ${index + 1}:`);
      console.log(`- ID: ${doc.id}`);
      console.log(`- messageType: ${data.messageType}`);
      console.log(`- type: ${data.type}`);
      console.log(`- content: ${data.content?.substring(0, 100)}${data.content?.length > 100 ? '...' : ''}`);
      console.log(`- sender: ${data.sender}`);
      console.log(`- messageId: ${data.messageId}`);
      console.log(`- timestamp: ${data.timestamp}`);
      
      if (data.type === 'audio') {
        console.log(`🎵 ÁUDIO ENCONTRADO!`);
        console.log(`   - messageType: ${data.messageType}`);
        console.log(`   - URL: ${data.content}`);
      }
    });
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error);
  }
}

checkRecentMessages();