const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSpecificTicket() {
  try {
    console.log('🔍 Testando carregamento de mensagens para ticket específico...');
    
    const remoteJid = '5512997561047@s.whatsapp.net';
    const instanceName = 'loja';
    
    console.log('📱 RemoteJid:', remoteJid);
    console.log('🏢 Instance:', instanceName);
    
    const q = query(
      collection(db, 'messages'),
      where('remoteJid', '==', remoteJid),
      where('instanceName', '==', instanceName)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('📊 Mensagens encontradas:', querySnapshot.size);
    
    if (querySnapshot.size > 0) {
      querySnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📝 Mensagem ${index + 1}:`, {
          id: doc.id,
          content: data.content?.substring(0, 50),
          sender: data.sender,
          timestamp: data.timestamp?.toDate?.() || data.timestamp
        });
      });
    } else {
      console.log('❌ Nenhuma mensagem encontrada para este ticket');
      
      // Verificar se há mensagens com remoteJid similar
      console.log('\n🔍 Verificando mensagens com remoteJid similar...');
      const similarQ = query(
        collection(db, 'messages'),
        where('remoteJid', '>=', '5512997561047'),
        where('remoteJid', '<=', '5512997561047\uf8ff')
      );
      
      const similarSnapshot = await getDocs(similarQ);
      console.log('📊 Mensagens similares encontradas:', similarSnapshot.size);
      
      similarSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📝 Similar ${index + 1}:`, {
          id: doc.id,
          remoteJid: data.remoteJid,
          instanceName: data.instanceName,
          content: data.content?.substring(0, 30)
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testSpecificTicket();