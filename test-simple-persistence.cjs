const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const fetch = require('node-fetch');

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

async function testSimplePersistence() {
  try {
    console.log('🧪 [TESTE] Testando persistência simples de mensagens...');
    
    // 1. Criar uma mensagem única para teste
    const uniqueText = `TESTE-PERSISTENCIA-${Date.now()}`;
    const testMessage = {
      instanceName: 'loja',
      remoteJid: '5512981022013@s.whatsapp.net',
      messageText: uniqueText
    };
    
    console.log('📤 Enviando mensagem via API...');
    console.log('Texto único:', uniqueText);
    
    // 2. Enviar mensagem via API
    const response = await fetch('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Resposta da API:', result);
    
    // 3. Aguardar processamento
    console.log('⏳ Aguardando 5 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Buscar mensagens no Firebase (sem orderBy)
    console.log('🔍 Buscando mensagens no Firebase...');
    
    const messagesQuery = query(
      collection(db, 'messages'),
      where('instanceName', '==', 'loja'),
      where('remoteJid', '==', '5512981022013@s.whatsapp.net'),
      where('sender', '==', 'agent')
    );
    
    const snapshot = await getDocs(messagesQuery);
    console.log(`📊 Total de mensagens encontradas: ${snapshot.size}`);
    
    // 5. Procurar nossa mensagem específica
    let testMessageFound = false;
    let allMessages = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      allMessages.push({
        id: doc.id,
        content: data.content,
        sender: data.sender,
        timestamp: data.timestamp?.toDate?.() || data.timestamp
      });
      
      if (data.content === uniqueText) {
        testMessageFound = true;
        console.log('✅ MENSAGEM DE TESTE ENCONTRADA!');
        console.log('📝 Dados:', {
          id: doc.id,
          messageId: data.messageId,
          content: data.content,
          sender: data.sender,
          isFromMe: data.isFromMe
        });
      }
    });
    
    if (!testMessageFound) {
      console.log('❌ MENSAGEM DE TESTE NÃO ENCONTRADA!');
      console.log('📋 Últimas mensagens encontradas:');
      allMessages.slice(-5).forEach((msg, index) => {
        console.log(`  ${index + 1}. "${msg.content}" (${msg.sender})`);
      });
    }
    
    // 6. Testar API GET
    console.log('\n🔍 Testando API GET...');
    const getResponse = await fetch(`http://localhost:3000/api/messages?instance=loja&remoteJid=5512981022013@s.whatsapp.net`);
    
    if (getResponse.ok) {
      const getResult = await getResponse.json();
      console.log(`📊 API GET retornou ${getResult.messages?.length || 0} mensagens`);
      
      if (getResult.messages) {
        const apiTestMessage = getResult.messages.find(msg => msg.content === uniqueText);
        if (apiTestMessage) {
          console.log('✅ MENSAGEM DE TESTE ENCONTRADA VIA API!');
        } else {
          console.log('❌ MENSAGEM DE TESTE NÃO ENCONTRADA VIA API!');
          console.log('📋 Últimas mensagens via API:');
          getResult.messages.slice(-3).forEach((msg, index) => {
            console.log(`  ${index + 1}. "${msg.content}" (${msg.sender})`);
          });
        }
      }
    } else {
      console.error('❌ Erro na API GET:', getResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar o teste
testSimplePersistence().then(() => {
  console.log('\n🏁 Teste concluído!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});