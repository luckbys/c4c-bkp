const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, onSnapshot, addDoc, serverTimestamp } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

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

// Simular um remoteJid de teste
const TEST_REMOTE_JID = '5511999999999@s.whatsapp.net';
const TEST_INSTANCE = 'loja';

let messageCount = 0;
let listenerActive = false;

// Função para gerar ID de mensagem
function generateMessageId() {
  return `${uuidv4()}_${Date.now()}`;
}

// Configurar listener em tempo real (simulando o ChatPanel)
function setupRealtimeListener() {
  console.log('🔄 Configurando listener em tempo real...');
  
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('remoteJid', '==', TEST_REMOTE_JID),
    where('instanceName', '==', TEST_INSTANCE)
  );
  
  listenerActive = true;
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!listenerActive) return;
    
    console.log('\n📨 [LISTENER] Snapshot recebido:', {
      size: snapshot.size,
      fromCache: snapshot.metadata.fromCache,
      hasPendingWrites: snapshot.metadata.hasPendingWrites
    });
    
    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        messageId: data.messageId,
        content: data.content,
        sender: data.sender,
        isFromMe: data.isFromMe,
        timestamp: data.timestamp,
        type: data.type
      });
    });
    
    // Ordenar por timestamp
    messages.sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return timeA.getTime() - timeB.getTime();
    });
    
    console.log('\n📋 [LISTENER] Mensagens processadas:');
    messages.forEach((msg, index) => {
      const isAgent = msg.isFromMe || msg.sender === 'agent';
      console.log(`   ${index + 1}. ${msg.messageId}`);
      console.log(`      Conteúdo: ${msg.content}`);
      console.log(`      Sender: ${msg.sender}`);
      console.log(`      isFromMe: ${msg.isFromMe}`);
      console.log(`      Tipo: ${msg.type}`);
      console.log(`      Renderizaria como agente: ${isAgent ? '✅ SIM' : '❌ NÃO'}`);
      console.log('');
    });
    
    messageCount = messages.length;
  }, (error) => {
    console.error('❌ [LISTENER] Erro:', error);
  });
  
  return unsubscribe;
}

// Função para simular envio de mensagem do agente
async function sendAgentMessage(content) {
  console.log(`\n🚀 Enviando mensagem do agente: "${content}"`);
  
  try {
    const messageData = {
      remoteJid: TEST_REMOTE_JID,
      messageId: generateMessageId(),
      content: content,
      sender: 'agent',
      status: 'sent',
      type: 'text',
      instanceName: TEST_INSTANCE,
      isFromMe: true,
      pushName: 'Agente',
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    console.log(`✅ Mensagem salva com ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    throw error;
  }
}

// Função principal de teste
async function testAgentMessageSync() {
  console.log('🧪 Testando sincronização de mensagens do agente...');
  console.log(`📍 RemoteJid de teste: ${TEST_REMOTE_JID}`);
  console.log(`📍 Instância de teste: ${TEST_INSTANCE}`);
  
  // 1. Configurar listener
  const unsubscribe = setupRealtimeListener();
  
  // 2. Aguardar um pouco para o listener se estabilizar
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`\n📊 Mensagens iniciais detectadas: ${messageCount}`);
  
  // 3. Enviar mensagem de teste
  const testMessage = `Teste de sincronização - ${new Date().toLocaleTimeString()}`;
  await sendAgentMessage(testMessage);
  
  // 4. Aguardar sincronização
  console.log('\n⏳ Aguardando sincronização...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 5. Enviar segunda mensagem para testar múltiplas mensagens
  const testMessage2 = `Segunda mensagem de teste - ${new Date().toLocaleTimeString()}`;
  await sendAgentMessage(testMessage2);
  
  // 6. Aguardar mais um pouco
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 7. Finalizar teste
  console.log('\n🏁 Teste finalizado');
  listenerActive = false;
  unsubscribe();
  
  console.log('\n📋 Resumo do teste:');
  console.log(`   - Mensagens enviadas: 2`);
  console.log(`   - Total de mensagens detectadas: ${messageCount}`);
  console.log(`   - Listener funcionou: ${messageCount > 0 ? '✅ SIM' : '❌ NÃO'}`);
  
  if (messageCount === 0) {
    console.log('\n⚠️  PROBLEMA DETECTADO: O listener não está detectando mensagens!');
    console.log('   Possíveis causas:');
    console.log('   1. Problema na query do Firestore');
    console.log('   2. Problema nas permissões');
    console.log('   3. Problema na configuração do listener');
  } else {
    console.log('\n✅ Listener funcionando corretamente!');
  }
}

// Executar teste
testAgentMessageSync().then(() => {
  console.log('\n🎯 Teste concluído com sucesso');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro no teste:', error);
  process.exit(1);
});