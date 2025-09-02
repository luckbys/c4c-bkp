// Usar Firebase client SDK em vez do Admin SDK
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');

// Configuração do Firebase (mesma do frontend)
const firebaseConfig = {
  apiKey: "AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAudioMessages() {
  console.log('🔍 Verificando mensagens de áudio no Firebase...');
  
  try {
    // Primeiro, verificar mensagens gerais
    console.log('\n📊 Verificando mensagens gerais...');
    const messagesRef = collection(db, 'messages');
    const allQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(10));
    const allSnapshot = await getDocs(allQuery);
    
    if (allSnapshot.empty) {
      console.log('❌ Nenhuma mensagem encontrada no banco');
      return;
    }
    
    console.log(`✅ ${allSnapshot.size} mensagens encontradas no total`);
    
    // Contar tipos de mensagem
    const messageTypes = {};
    allSnapshot.forEach(doc => {
      const data = doc.data();
      const type = data.messageType || data.type || 'undefined';
      messageTypes[type] = (messageTypes[type] || 0) + 1;
    });
    
    console.log('\n📈 Tipos de mensagem encontrados:');
    Object.entries(messageTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    // Buscar mensagens de áudio
    console.log('\n🎵 Buscando mensagens de áudio...');
    const audioQuery = query(messagesRef, where('messageType', '==', 'audio'), limit(5));
    const audioSnapshot = await getDocs(audioQuery);
    
    if (audioSnapshot.empty) {
      // Tentar com 'type' em vez de 'messageType'
      console.log('⚠️ Tentando buscar com campo "type"...');
      const audioQuery2 = query(messagesRef, where('type', '==', 'audio'), limit(5));
      const audioSnapshot2 = await getDocs(audioQuery2);
      
      if (audioSnapshot2.empty) {
        console.log('❌ Nenhuma mensagem de áudio encontrada');
        
        // Mostrar algumas mensagens para debug
        console.log('\n🔍 Últimas mensagens para debug:');
        allSnapshot.docs.slice(0, 3).forEach(doc => {
          const data = doc.data();
          console.log(`   - ID: ${doc.id}`);
          console.log(`     messageType: ${data.messageType}`);
          console.log(`     type: ${data.type}`);
          console.log(`     Conteúdo: ${data.content?.substring(0, 50)}...`);
          console.log(`     De: ${data.remoteJid}`);
          console.log('     ---');
        });
      } else {
        console.log(`✅ ${audioSnapshot2.size} mensagens de áudio encontradas (campo 'type'):`);
        audioSnapshot2.forEach(doc => {
          const data = doc.data();
          console.log('\n📱 Mensagem de áudio:');
          console.log(`   ID: ${doc.id}`);
          console.log(`   Tipo: ${data.type}`);
          console.log(`   De: ${data.remoteJid}`);
          console.log(`   Conteúdo: ${data.content?.substring(0, 100)}...`);
          console.log(`   É URL .enc: ${data.content?.includes('.enc') ? 'Sim' : 'Não'}`);
        });
      }
    } else {
      console.log(`✅ ${audioSnapshot.size} mensagens de áudio encontradas (campo 'messageType'):`);
      audioSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('\n📱 Mensagem de áudio:');
        console.log(`   ID: ${doc.id}`);
        console.log(`   Tipo: ${data.messageType}`);
        console.log(`   De: ${data.remoteJid}`);
        console.log(`   Conteúdo: ${data.content?.substring(0, 100)}...`);
        console.log(`   É URL .enc: ${data.content?.includes('.enc') ? 'Sim' : 'Não'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkAudioMessages().then(() => {
  console.log('\n✅ Verificação concluída');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});