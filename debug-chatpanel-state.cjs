const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, orderBy } = require('firebase/firestore');

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

// Simular a lógica do ChatPanel
function processMessage(doc) {
  const data = doc.data();
  
  // Determinar sender baseado nos dados disponíveis (mesma lógica do client-firebase-service)
  let sender = 'client';
  if (data.sender) {
    sender = data.sender;
  } else if (data.isFromMe !== undefined) {
    sender = data.isFromMe ? 'agent' : 'client';
  }
  
  const message = {
    id: doc.id,
    messageId: data.messageId || doc.id,
    content: data.content || '',
    sender: sender,
    timestamp: data.timestamp?.toDate?.() || new Date(),
    status: data.status || 'sent',
    type: data.type || 'text',
    isFromMe: data.isFromMe !== undefined ? data.isFromMe : sender === 'agent',
    pushName: data.pushName,
    mediaUrl: data.mediaUrl,
    fileName: data.fileName
  };
  
  return message;
}

// Simular a deduplicação do ChatPanel
function deduplicateMessages(messages) {
  const messageMap = new Map();
  
  messages.forEach(message => {
    const key = message.messageId || message.id;
    if (key && (!messageMap.has(key) || messageMap.get(key).timestamp < message.timestamp)) {
      messageMap.set(key, message);
    }
  });
  
  // Converter Map para array e ordenar por timestamp
  const uniqueMessages = Array.from(messageMap.values());
  const sorted = uniqueMessages.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });
  
  return sorted;
}

// Simular a lógica do ChatMessage component
function shouldRenderAsAgent(message) {
  return message.isFromMe || message.sender === 'agent';
}

async function debugChatPanelState() {
  console.log('🔍 Debugando estado do ChatPanel...');
  
  try {
    // Buscar mensagens de um remoteJid específico (usar um que sabemos que tem mensagens do agente)
    const TEST_REMOTE_JID = '5511999999999@s.whatsapp.net';
    const TEST_INSTANCE = 'loja';
    
    console.log(`📍 Testando com remoteJid: ${TEST_REMOTE_JID}`);
    console.log(`📍 Instância: ${TEST_INSTANCE}`);
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('remoteJid', '==', TEST_REMOTE_JID),
      where('instanceName', '==', TEST_INSTANCE)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma mensagem encontrada para este remoteJid');
      return;
    }
    
    console.log(`✅ Encontradas ${snapshot.size} mensagens`);
    
    // 1. Processar mensagens como o client-firebase-service faz
    const rawMessages = [];
    snapshot.forEach((doc) => {
      const processedMessage = processMessage(doc);
      rawMessages.push(processedMessage);
    });
    
    console.log('\n📋 1. Mensagens após processamento inicial:');
    rawMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.messageId}`);
      console.log(`      Sender: ${msg.sender}`);
      console.log(`      isFromMe: ${msg.isFromMe}`);
      console.log(`      Conteúdo: ${msg.content.substring(0, 50)}...`);
    });
    
    // 2. Aplicar deduplicação como o ChatPanel faz
    const deduplicatedMessages = deduplicateMessages(rawMessages);
    
    console.log(`\n📋 2. Após deduplicação: ${rawMessages.length} -> ${deduplicatedMessages.length}`);
    
    // 3. Filtrar mensagens do agente
    const agentMessages = deduplicatedMessages.filter(msg => shouldRenderAsAgent(msg));
    const clientMessages = deduplicatedMessages.filter(msg => !shouldRenderAsAgent(msg));
    
    console.log(`\n📊 3. Estatísticas finais:`);
    console.log(`   Total de mensagens: ${deduplicatedMessages.length}`);
    console.log(`   Mensagens do agente: ${agentMessages.length}`);
    console.log(`   Mensagens do cliente: ${clientMessages.length}`);
    
    // 4. Mostrar últimas mensagens do agente
    console.log(`\n📨 4. Últimas 5 mensagens do agente:`);
    const lastAgentMessages = agentMessages.slice(-5);
    
    if (lastAgentMessages.length === 0) {
      console.log('   ❌ Nenhuma mensagem do agente encontrada!');
      console.log('\n🔍 Verificando mensagens com sender="agent":');
      const agentSenderMessages = deduplicatedMessages.filter(msg => msg.sender === 'agent');
      console.log(`   Mensagens com sender="agent": ${agentSenderMessages.length}`);
      
      console.log('\n🔍 Verificando mensagens com isFromMe=true:');
      const isFromMeMessages = deduplicatedMessages.filter(msg => msg.isFromMe === true);
      console.log(`   Mensagens com isFromMe=true: ${isFromMeMessages.length}`);
      
      if (agentSenderMessages.length > 0) {
        console.log('\n📋 Mensagens com sender="agent":');
        agentSenderMessages.slice(-3).forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.messageId}`);
          console.log(`      Sender: ${msg.sender}`);
          console.log(`      isFromMe: ${msg.isFromMe}`);
          console.log(`      shouldRenderAsAgent: ${shouldRenderAsAgent(msg)}`);
          console.log(`      Conteúdo: ${msg.content.substring(0, 50)}...`);
        });
      }
    } else {
      lastAgentMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.messageId}`);
        console.log(`      Timestamp: ${msg.timestamp.toLocaleString()}`);
        console.log(`      Sender: ${msg.sender}`);
        console.log(`      isFromMe: ${msg.isFromMe}`);
        console.log(`      Conteúdo: ${msg.content.substring(0, 50)}...`);
        console.log('');
      });
    }
    
    // 5. Verificar se há problemas na ordenação
    console.log(`\n📅 5. Verificação de ordenação:`);
    const last3Messages = deduplicatedMessages.slice(-3);
    last3Messages.forEach((msg, index) => {
      const isAgent = shouldRenderAsAgent(msg);
      console.log(`   ${index + 1}. ${msg.timestamp.toLocaleString()} - ${isAgent ? 'AGENTE' : 'CLIENTE'}: ${msg.content.substring(0, 30)}...`);
    });
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

// Executar debug
debugChatPanelState().then(() => {
  console.log('\n🏁 Debug concluído');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro no debug:', error);
  process.exit(1);
});