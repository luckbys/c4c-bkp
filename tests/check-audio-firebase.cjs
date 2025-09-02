const admin = require('firebase-admin');

// Configuração básica do Firebase
const firebaseAdminConfig = {
  projectId: 'cerc-3m1uep',
  storageBucket: 'cerc-3m1uep.appspot.com'
};

// Inicializar Firebase Admin
if (admin.apps.length === 0) {
  try {
    admin.initializeApp(firebaseAdminConfig);
    console.log('✅ Firebase Admin inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkAudioMessages() {
  console.log('🔍 Verificando mensagens de áudio no Firestore...');
  
  try {
    // Primeiro, verificar se há mensagens em geral
    console.log('\n📊 Verificando mensagens gerais...');
    const allMessagesQuery = db.collection('messages').orderBy('timestamp', 'desc').limit(10);
    const allSnapshot = await allMessagesQuery.get();
    
    if (allSnapshot.empty) {
      console.log('❌ Nenhuma mensagem encontrada no banco');
      return;
    }
    
    console.log(`✅ ${allSnapshot.size} mensagens encontradas no total`);
    
    // Contar tipos de mensagem
    const messageTypes = {};
    allSnapshot.forEach(doc => {
      const data = doc.data();
      const type = data.messageType || 'undefined';
      messageTypes[type] = (messageTypes[type] || 0) + 1;
    });
    
    console.log('\n📈 Tipos de mensagem encontrados:');
    Object.entries(messageTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    // Buscar especificamente mensagens de áudio
    console.log('\n🎵 Buscando mensagens de áudio...');
    const audioQuery = db.collection('messages').where('messageType', '==', 'audio').limit(5);
    const audioSnapshot = await audioQuery.get();
    
    if (audioSnapshot.empty) {
      console.log('❌ Nenhuma mensagem de áudio encontrada');
      
      // Mostrar algumas mensagens recentes para debug
      console.log('\n🔍 Últimas mensagens para debug:');
      allSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`     Tipo: ${data.messageType}`);
        console.log(`     Conteúdo: ${data.content?.substring(0, 50)}...`);
        console.log(`     De: ${data.remoteJid}`);
        console.log('     ---');
      });
    } else {
      console.log(`✅ ${audioSnapshot.size} mensagens de áudio encontradas:`);
      
      audioSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('\n📱 Mensagem de áudio:');
        console.log(`   ID: ${doc.id}`);
        console.log(`   Tipo: ${data.messageType}`);
        console.log(`   De: ${data.remoteJid}`);
        console.log(`   Conteúdo: ${data.content?.substring(0, 100)}...`);
        console.log(`   É URL .enc: ${data.content?.includes('.enc') ? 'Sim' : 'Não'}`);
        console.log(`   Timestamp: ${data.timestamp?.toDate?.() || data.timestamp}`);
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