// Script para debugar o messageType no processamento de mensagens
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } = require('firebase/firestore');

// Configuração do Firebase
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

// Simular o processamento de uma mensagem de áudio
function simulateEvolutionMessage() {
  return {
    key: {
      remoteJid: '5512998765432@s.whatsapp.net',
      fromMe: false,
      id: 'test_audio_' + Date.now()
    },
    message: {
      audioMessage: {
        url: 'https://evolution-api.com/files/audio/test.ogg',
        mimetype: 'audio/ogg; codecs=opus',
        seconds: 10,
        ptt: true
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: 'Teste Usuario'
  };
}

// Simular o método convertMessage da Evolution API
function convertMessage(evolutionMessage) {
  const content = extractMessageContent(evolutionMessage.message);
  
  return {
    isFromMe: evolutionMessage.key.fromMe,
    id: evolutionMessage.key.id,
    content,
    timestamp: new Date(evolutionMessage.messageTimestamp * 1000),
    sender: evolutionMessage.key.fromMe ? 'agent' : 'client',
    type: getMessageType(evolutionMessage.message),
    status: 'sent',
    senderName: evolutionMessage.pushName || 'Usuário',
  };
}

function extractMessageContent(message) {
  if (message.conversation) {
    return message.conversation;
  }
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }
  if (message.audioMessage) {
    // Para áudios, retornar a URL se disponível
    if (message.audioMessage.url && isValidUrl(message.audioMessage.url)) {
      return message.audioMessage.url;
    }
    return '🎵 Áudio';
  }
  return 'Mensagem não suportada';
}

function getMessageType(message) {
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.audioMessage) return 'audio';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  return 'text';
}

function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  } catch {
    return false;
  }
}

async function debugMessageType() {
  console.log('🔍 === DEBUG MESSAGE TYPE === 🔍\n');
  
  try {
    // 1. Simular mensagem de áudio da Evolution API
    console.log('📱 Simulando mensagem de áudio da Evolution API...');
    const evolutionMessage = simulateEvolutionMessage();
    console.log('Raw Evolution Message:', JSON.stringify(evolutionMessage, null, 2));
    
    // 2. Converter mensagem usando o método da Evolution API
    console.log('\n🔄 Convertendo mensagem...');
    const convertedMessage = convertMessage(evolutionMessage);
    console.log('Converted Message:', JSON.stringify(convertedMessage, null, 2));
    
    // 3. Verificar o tipo de mensagem
    console.log('\n📊 Análise do tipo de mensagem:');
    console.log(`- messageType: ${convertedMessage.type}`);
    console.log(`- content: ${convertedMessage.content}`);
    console.log(`- sender: ${convertedMessage.sender}`);
    console.log(`- isFromMe: ${convertedMessage.isFromMe}`);
    
    // 4. Verificar se há mensagens no Firestore com tipo undefined
    console.log('\n🔍 Verificando mensagens no Firestore...');
    const messagesRef = collection(db, 'messages');
    const undefinedQuery = query(messagesRef, limit(5));
    const snapshot = await getDocs(undefinedQuery);
    
    console.log(`Total de mensagens encontradas: ${snapshot.size}`);
    
    if (snapshot.size > 0) {
      console.log('\n📝 Análise das mensagens existentes:');
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\nMensagem ${index + 1}:`);
        console.log(`- ID: ${doc.id}`);
        console.log(`- messageType: ${data.messageType || 'undefined'}`);
        console.log(`- type: ${data.type || 'undefined'}`);
        console.log(`- content: ${data.content}`);
        console.log(`- sender: ${data.sender}`);
        console.log(`- timestamp: ${data.timestamp}`);
      });
    }
    
    console.log('\n✅ Debug concluído!');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

// Executar debug
debugMessageType().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});