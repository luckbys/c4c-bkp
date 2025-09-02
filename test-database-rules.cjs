const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
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

async function testDatabaseAccess() {
  console.log('🔍 Testando acesso ao Firebase...');
  
  try {
    // 1. Testar acesso às coleções
    console.log('\n📊 Verificando coleções disponíveis...');
    
    // Testar coleção de tickets
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    console.log(`✅ Tickets encontrados: ${ticketsSnapshot.size}`);
    
    if (ticketsSnapshot.size > 0) {
      console.log('\n📋 Primeiros 3 tickets:');
      let count = 0;
      ticketsSnapshot.forEach((doc) => {
        if (count < 3) {
          const data = doc.data();
          console.log(`  - ID: ${doc.id}`);
          console.log(`    RemoteJid: ${data.remoteJid}`);
          console.log(`    Instance: ${data.instanceName}`);
          console.log(`    Status: ${data.status}`);
          console.log(`    Cliente: ${data.client?.name || 'N/A'}`);
          console.log(`    Última mensagem: ${data.lastMessage || 'N/A'}`);
          console.log('    ---');
          count++;
        }
      });
    }
    
    // Testar coleção de mensagens
    const messagesSnapshot = await getDocs(collection(db, 'messages'));
    console.log(`\n💬 Mensagens encontradas: ${messagesSnapshot.size}`);
    
    if (messagesSnapshot.size > 0) {
      console.log('\n📝 Primeiras 5 mensagens:');
      let count = 0;
      messagesSnapshot.forEach((doc) => {
        if (count < 5) {
          const data = doc.data();
          console.log(`  - ID: ${doc.id}`);
          console.log(`    RemoteJid: ${data.remoteJid}`);
          console.log(`    Instance: ${data.instanceName}`);
          console.log(`    Sender: ${data.sender}`);
          console.log(`    Content: ${data.content?.substring(0, 50)}...`);
          console.log(`    Type: ${data.type}`);
          console.log(`    Timestamp: ${data.timestamp?.toDate?.() || data.timestamp}`);
          console.log('    ---');
          count++;
        }
      });
    }
    
    // 3. Testar consulta específica de mensagens por ticket
    if (ticketsSnapshot.size > 0) {
      const firstTicket = ticketsSnapshot.docs[0].data();
      console.log(`\n🔍 Testando consulta de mensagens para ticket: ${firstTicket.remoteJid}`);
      
      const messagesQuery = query(
        collection(db, 'messages'),
        where('remoteJid', '==', firstTicket.remoteJid),
        where('instanceName', '==', firstTicket.instanceName)
      );
      
      const ticketMessages = await getDocs(messagesQuery);
      console.log(`📨 Mensagens encontradas para este ticket: ${ticketMessages.size}`);
      
      if (ticketMessages.size > 0) {
        console.log('\n📋 Mensagens do ticket:');
        ticketMessages.forEach((doc) => {
          const data = doc.data();
          console.log(`  - ${data.sender}: ${data.content?.substring(0, 100)}...`);
          console.log(`    Timestamp: ${data.timestamp?.toDate?.() || data.timestamp}`);
        });
      } else {
        console.log('❌ Nenhuma mensagem encontrada para este ticket específico');
        console.log('   Isso pode indicar um problema na consulta ou nos dados');
      }
    }
    
    // 4. Verificar instâncias disponíveis
    const instancesSnapshot = await getDocs(collection(db, 'instances'));
    console.log(`\n🏢 Instâncias encontradas: ${instancesSnapshot.size}`);
    
    if (instancesSnapshot.size > 0) {
      console.log('\n📋 Instâncias disponíveis:');
      instancesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.name || 'N/A'} (${data.status || 'N/A'})`);
      });
    }
    
    // 5. Verificar índices e performance
    console.log('\n⚡ Testando performance de consultas...');
    const start = Date.now();
    
    const limitedQuery = query(
      collection(db, 'messages'),
      limit(10)
    );
    
    await getDocs(limitedQuery);
    const end = Date.now();
    console.log(`⏱️ Consulta com limit(10) levou: ${end - start}ms`);
    
    if (end - start > 5000) {
      console.log('⚠️ AVISO: Consulta muito lenta, pode indicar problema de índices');
    }
    
  } catch (error) {
    console.error('❌ Erro ao acessar Firebase:', error);
    
    if (error.code) {
      console.error(`Código do erro: ${error.code}`);
    }
    
    if (error.message) {
      console.error(`Mensagem: ${error.message}`);
    }
    
    // Sugestões baseadas no tipo de erro
    if (error.code === 'permission-denied') {
      console.log('\n💡 Sugestões:');
      console.log('   1. Verificar regras do Firestore');
      console.log('   2. Verificar autenticação');
      console.log('   3. Verificar configuração do projeto');
    } else if (error.code === 'unavailable') {
      console.log('\n💡 Sugestões:');
      console.log('   1. Verificar conexão com internet');
      console.log('   2. Verificar status do Firebase');
      console.log('   3. Tentar novamente em alguns minutos');
    }
  }
}

// Executar teste
testDatabaseAccess().then(() => {
  console.log('\n✅ Teste concluído');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});