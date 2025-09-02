const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "1037434642735",
  appId: "1:1037434642735:web:b8c4c4c4c4c4c4c4c4c4c4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkImageMessages() {
  console.log('🔍 Verificando mensagens de imagem no Firestore (sem orderBy)...');
  
  try {
    // Buscar mensagens de imagem (sem orderBy para evitar erro de índice)
    console.log('\n📊 Verificando mensagens de imagem...');
    const imageQuery = query(
      collection(db, 'messages'),
      where('type', '==', 'image'),
      limit(10)
    );
    
    const imageSnapshot = await getDocs(imageQuery);
    
    if (imageSnapshot.empty) {
      console.log('❌ Nenhuma mensagem de imagem encontrada');
    } else {
      console.log(`✅ ${imageSnapshot.size} mensagens de imagem encontradas`);
      
      imageSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n--- Mensagem de Imagem ${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`messageId: ${data.messageId}`);
        console.log(`content: ${data.content}`);
        console.log(`type: ${data.type}`);
        console.log(`messageType: ${data.messageType}`);
        console.log(`sender: ${data.sender}`);
        console.log(`remoteJid: ${data.remoteJid}`);
        console.log(`instanceName: ${data.instanceName}`);
        console.log(`timestamp: ${data.timestamp?.toDate()}`);
        
        if (data.mediaUrl) {
          console.log(`mediaUrl: ${data.mediaUrl}`);
        }
        if (data.fileName) {
          console.log(`fileName: ${data.fileName}`);
        }
        if (data.mimeType) {
          console.log(`mimeType: ${data.mimeType}`);
        }
      });
    }
    
    // Buscar mensagens de documento
    console.log('\n📄 Verificando mensagens de documento...');
    const docQuery = query(
      collection(db, 'messages'),
      where('type', '==', 'document'),
      limit(5)
    );
    
    const docSnapshot = await getDocs(docQuery);
    
    if (docSnapshot.empty) {
      console.log('❌ Nenhuma mensagem de documento encontrada');
    } else {
      console.log(`✅ ${docSnapshot.size} mensagens de documento encontradas`);
      
      docSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n--- Mensagem de Documento ${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`messageId: ${data.messageId}`);
        console.log(`content: ${data.content}`);
        console.log(`type: ${data.type}`);
        console.log(`messageType: ${data.messageType}`);
        console.log(`sender: ${data.sender}`);
        console.log(`timestamp: ${data.timestamp?.toDate()}`);
        
        if (data.mediaUrl) {
          console.log(`mediaUrl: ${data.mediaUrl}`);
        }
        if (data.fileName) {
          console.log(`fileName: ${data.fileName}`);
        }
        if (data.mimeType) {
          console.log(`mimeType: ${data.mimeType}`);
        }
      });
    }
    
    // Buscar mensagens com URLs do Firebase Storage
    console.log('\n🔥 Verificando mensagens com URLs do Firebase Storage...');
    const allQuery = query(
      collection(db, 'messages'),
      limit(50)
    );
    
    const allSnapshot = await getDocs(allQuery);
    const firebaseStorageMessages = [];
    
    allSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.content && data.content.includes('firebasestorage.googleapis.com')) {
        firebaseStorageMessages.push({ id: doc.id, data });
      }
    });
    
    if (firebaseStorageMessages.length > 0) {
      console.log(`✅ ${firebaseStorageMessages.length} mensagens com URLs do Firebase Storage encontradas`);
      
      firebaseStorageMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`\n--- Mensagem Firebase Storage ${index + 1} ---`);
        console.log(`ID: ${msg.id}`);
        console.log(`messageId: ${msg.data.messageId}`);
        console.log(`content: ${msg.data.content}`);
        console.log(`type: ${msg.data.type}`);
        console.log(`messageType: ${msg.data.messageType}`);
        console.log(`sender: ${msg.data.sender}`);
        console.log(`timestamp: ${msg.data.timestamp?.toDate()}`);
      });
    } else {
      console.log('❌ Nenhuma mensagem com URLs do Firebase Storage encontrada');
    }
    
    // Verificar mensagens recentes de qualquer tipo
    console.log('\n📝 Verificando mensagens mais recentes (últimas 5)...');
    const recentQuery = query(
      collection(db, 'messages'),
      limit(5)
    );
    
    const recentSnapshot = await getDocs(recentQuery);
    
    if (!recentSnapshot.empty) {
      console.log(`✅ ${recentSnapshot.size} mensagens recentes encontradas`);
      
      recentSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n--- Mensagem Recente ${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`messageId: ${data.messageId}`);
        console.log(`content: ${data.content?.substring(0, 100)}...`);
        console.log(`type: ${data.type}`);
        console.log(`messageType: ${data.messageType}`);
        console.log(`sender: ${data.sender}`);
        console.log(`timestamp: ${data.timestamp?.toDate()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error);
  }
}

checkImageMessages();