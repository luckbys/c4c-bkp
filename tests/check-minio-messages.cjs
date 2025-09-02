const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs, where } = require('firebase/firestore');

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

async function checkMinIOMessages() {
  try {
    console.log('🔍 Verificando mensagens com URLs do MinIO...');
    
    // Buscar mensagens recentes
    const recentQuery = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(recentQuery);
    console.log(`📊 Total de mensagens encontradas: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma mensagem encontrada');
      return;
    }
    
    let minioMessages = [];
    let firebaseMessages = [];
    let otherMessages = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const content = data.content || '';
      
      if (content.includes('localhost:9000') || content.includes('minio')) {
        minioMessages.push({ id: doc.id, data });
      } else if (content.includes('firebasestorage.googleapis.com')) {
        firebaseMessages.push({ id: doc.id, data });
      } else {
        otherMessages.push({ id: doc.id, data });
      }
    });
    
    console.log(`\n📊 Estatísticas:`);
    console.log(`🗄️ Mensagens com URLs do MinIO: ${minioMessages.length}`);
    console.log(`🔥 Mensagens com URLs do Firebase: ${firebaseMessages.length}`);
    console.log(`📝 Outras mensagens: ${otherMessages.length}`);
    
    // Mostrar mensagens do MinIO
    if (minioMessages.length > 0) {
      console.log('\n🗄️ MENSAGENS DO MINIO:');
      minioMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`\n--- MinIO Mensagem ${index + 1} ---`);
        console.log(`ID: ${msg.id}`);
        console.log(`messageId: ${msg.data.messageId}`);
        console.log(`type: ${msg.data.type}`);
        console.log(`messageType: ${msg.data.messageType}`);
        console.log(`content: ${msg.data.content}`);
        console.log(`isFromMe: ${msg.data.isFromMe}`);
        console.log(`sender: ${msg.data.sender}`);
        console.log(`timestamp: ${msg.data.timestamp?.toDate?.()}`);
      });
    }
    
    // Mostrar mensagens do Firebase
    if (firebaseMessages.length > 0) {
      console.log('\n🔥 MENSAGENS DO FIREBASE:');
      firebaseMessages.slice(0, 2).forEach((msg, index) => {
        console.log(`\n--- Firebase Mensagem ${index + 1} ---`);
        console.log(`ID: ${msg.id}`);
        console.log(`messageId: ${msg.data.messageId}`);
        console.log(`type: ${msg.data.type}`);
        console.log(`content: ${msg.data.content?.substring(0, 100)}...`);
        console.log(`isFromMe: ${msg.data.isFromMe}`);
      });
    }
    
    // Mostrar outras mensagens
    if (otherMessages.length > 0) {
      console.log('\n📝 OUTRAS MENSAGENS:');
      otherMessages.slice(0, 2).forEach((msg, index) => {
        console.log(`\n--- Outra Mensagem ${index + 1} ---`);
        console.log(`ID: ${msg.id}`);
        console.log(`messageId: ${msg.data.messageId}`);
        console.log(`type: ${msg.data.type}`);
        console.log(`content: ${msg.data.content}`);
        console.log(`isFromMe: ${msg.data.isFromMe}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error);
  }
}

checkMinIOMessages();