// Script para debugar problemas de sincronização de mensagens do agente
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, onSnapshot, getDocs } = require('firebase/firestore');

// Configuração do Firebase (usando as mesmas configurações dos outros scripts)
const firebaseConfig = {
  apiKey: "AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugAgentMessageSync() {
  console.log('🔍 [DEBUG] Investigando sincronização de mensagens do agente...');
  console.log('=' .repeat(60));
  
  const testRemoteJid = '5512981022013@s.whatsapp.net';
  const instanceName = 'loja';
  
  try {
    // 1. Verificar mensagens existentes
    console.log('\n📊 1. Verificando mensagens existentes...');
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('remoteJid', '==', testRemoteJid),
      where('instanceName', '==', instanceName)
    );
    
    const snapshot = await getDocs(q);
    console.log(`Total de mensagens: ${snapshot.size}`);
    
    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        messageId: data.messageId,
        content: data.content,
        sender: data.sender,
        isFromMe: data.isFromMe,
        type: data.type,
        timestamp: data.timestamp?.toDate() || new Date(),
        status: data.status
      });
    });
    
    // Ordenar por timestamp
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // 2. Analisar mensagens do agente
    console.log('\n📤 2. Analisando mensagens do agente...');
    const agentMessages = messages.filter(msg => 
      msg.sender === 'agent' || msg.isFromMe === true
    );
    
    console.log(`Mensagens do agente: ${agentMessages.length}`);
    
    if (agentMessages.length > 0) {
      console.log('\n📋 Últimas 5 mensagens do agente:');
      agentMessages.slice(-5).forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.timestamp.toLocaleString()}]`);
        console.log(`      ID: ${msg.messageId}`);
        console.log(`      Conteúdo: ${msg.content}`);
        console.log(`      Sender: ${msg.sender}`);
        console.log(`      isFromMe: ${msg.isFromMe}`);
        console.log(`      Status: ${msg.status}`);
        console.log(`      Tipo: ${msg.type}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhuma mensagem do agente encontrada!');
    }
    
    // 3. Verificar mensagens recentes (últimos 30 minutos)
    console.log('\n⏰ 3. Verificando mensagens recentes (últimos 30 minutos)...');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentMessages = messages.filter(msg => msg.timestamp > thirtyMinutesAgo);
    
    console.log(`Mensagens recentes: ${recentMessages.length}`);
    
    if (recentMessages.length > 0) {
      console.log('\n📋 Mensagens recentes:');
      recentMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.timestamp.toLocaleString()}] ${msg.sender}: ${msg.content}`);
      });
    }
    
    // 4. Configurar listener em tempo real
    console.log('\n🔄 4. Configurando listener em tempo real...');
    console.log('Aguardando por novas mensagens (pressione Ctrl+C para sair)...');
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('\n🔔 [REAL-TIME] Atualização recebida!');
      console.log(`Mensagens no snapshot: ${querySnapshot.size}`);
      
      const newMessages = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          messageId: data.messageId,
          content: data.content,
          sender: data.sender,
          isFromMe: data.isFromMe,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });
      
      // Verificar se há mensagens novas do agente
      const newAgentMessages = newMessages.filter(msg => 
        (msg.sender === 'agent' || msg.isFromMe === true) &&
        msg.timestamp > thirtyMinutesAgo
      );
      
      if (newAgentMessages.length > 0) {
        console.log('✅ [REAL-TIME] Mensagens do agente detectadas:');
        newAgentMessages.forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.content} (${msg.sender}, isFromMe: ${msg.isFromMe})`);
        });
      } else {
        console.log('ℹ️ [REAL-TIME] Nenhuma mensagem nova do agente');
      }
    });
    
    // Manter o script rodando
    process.on('SIGINT', () => {
      console.log('\n👋 Encerrando listener...');
      unsubscribe();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  }
}

// Executar debug
debugAgentMessageSync().catch(console.error);