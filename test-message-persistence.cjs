const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc } = require('firebase/firestore');
const fetch = require('node-fetch');

// Configuração do Firebase (usando Client SDK)
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

async function testMessagePersistence() {
  console.log('🧪 [TESTE] Iniciando teste de persistência de mensagens...');
  
  try {
    // 1. Contar mensagens antes do teste
    const messagesRef = collection(db, 'messages');
    const beforeQuery = query(
      messagesRef,
      where('instanceName', '==', 'loja'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const beforeSnapshot = await getDocs(beforeQuery);
    
    console.log(`📊 Mensagens antes do teste: ${beforeSnapshot.size}`);
    
    // 2. Enviar mensagem via RabbitMQ
    const testMessage = {
      id: `test-${Date.now()}`,
      type: 'text',
      content: `Teste de persistência - ${new Date().toISOString()}`,
      ticketId: 'test-ticket',
      contactId: '5512981022013@s.whatsapp.net',
      userId: 'test-user',
      timestamp: Date.now(),
      metadata: {
        instanceName: 'loja',
        remoteJid: '5512981022013@s.whatsapp.net',
        sender: 'agent'
      }
    };
    
    console.log('📤 Enviando mensagem via RabbitMQ...');
    const response = await fetch('http://localhost:9003/api/rabbitmq/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro na API: ${response.status} - ${errorData.error}`);
    }
    
    const result = await response.json();
    console.log('✅ Mensagem enviada via RabbitMQ:', result);
    
    // 3. Aguardar processamento
    console.log('⏳ Aguardando processamento (10 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 4. Verificar se a mensagem foi salva no Firebase
    console.log('🔍 Verificando se a mensagem foi salva no Firebase...');
    const messageDocRef = doc(db, 'messages', testMessage.id);
    const messageDoc = await getDoc(messageDocRef);
    
    if (messageDoc.exists()) {
      const data = messageDoc.data();
      console.log('✅ Mensagem encontrada no Firebase:', {
        id: messageDoc.id,
        content: data.content,
        sender: data.sender,
        status: data.status,
        timestamp: data.timestamp?.toDate?.() || data.timestamp
      });
    } else {
      console.log('❌ Mensagem NÃO encontrada no Firebase');
      
      // Verificar mensagens recentes
      const recentQuery = query(
        messagesRef,
        where('instanceName', '==', 'loja'),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const recentSnapshot = await getDocs(recentQuery);
      
      console.log('📋 Mensagens recentes no Firebase:');
      recentSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ID: ${doc.id}, Conteúdo: ${data.content?.substring(0, 50)}...`);
      });
    }
    
    // 5. Verificar logs do processador
    console.log('\n📊 Status dos processadores:');
    const statusResponse = await fetch('http://localhost:9003/api/rabbitmq/status');
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('RabbitMQ Status:', status);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testMessagePersistence().then(() => {
  console.log('\n🏁 Teste concluído!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});