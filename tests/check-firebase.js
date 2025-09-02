const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMessages() {
  console.log('=== DEBUG: CONTEÚDO DE IMAGENS NO FIREBASE ===\n');
  
  try {
    // Buscar todas as mensagens de imagem
    const imageMessagesQuery = query(
      collection(db, 'messages'),
      where('type', '==', 'image')
    );
    
    const imageMessagesSnapshot = await getDocs(imageMessagesQuery);
    
    console.log(`Total de mensagens de imagem encontradas: ${imageMessagesSnapshot.size}\n`);
    
    const contentCounts = {};
    const examples = {};
    
    imageMessagesSnapshot.forEach((doc) => {
      const data = doc.data();
      const content = data.content;
      
      // Contar ocorrências de cada tipo de conteúdo
      if (!contentCounts[content]) {
        contentCounts[content] = 0;
        examples[content] = {
          messageId: data.messageId,
          timestamp: data.timestamp?.toDate?.() || data.timestamp,
          sender: data.sender,
          instanceName: data.instanceName
        };
      }
      contentCounts[content]++;
    });
    
    console.log('=== ANÁLISE DE CONTEÚDO ===');
    Object.entries(contentCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([content, count]) => {
        console.log(`\n"${content}": ${count} ocorrências`);
        const example = examples[content];
        console.log(`  Exemplo: ID ${example.messageId}`);
        console.log(`  Timestamp: ${example.timestamp}`);
        console.log(`  Sender: ${example.sender}`);
        console.log(`  Instance: ${example.instanceName}`);
      });
    
    // Verificar especificamente mensagens com '[Imagem]'
    console.log('\n=== MENSAGENS COM [Imagem] ===');
    const bracketImageMessages = [];
    imageMessagesSnapshot.forEach((doc) => {
      if (doc.data().content === '[Imagem]') {
        bracketImageMessages.push(doc);
      }
    });
    
    if (bracketImageMessages.length > 0) {
      console.log(`Encontradas ${bracketImageMessages.length} mensagens com '[Imagem]'`);
      
      // Mostrar detalhes das primeiras 3
      bracketImageMessages.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`\nMensagem ${index + 1}:`);
        console.log(`  ID: ${data.messageId}`);
        console.log(`  Content: "${data.content}"`);
        console.log(`  Type: ${data.type}`);
        console.log(`  Sender: ${data.sender}`);
        console.log(`  Instance: ${data.instanceName}`);
        console.log(`  Timestamp: ${data.timestamp?.toDate?.() || data.timestamp}`);
        console.log(`  Document ID: ${doc.id}`);
      });
    } else {
      console.log('Nenhuma mensagem com "[Imagem]" encontrada.');
    }
    
    // Verificar mensagens com '📷 Imagem'
    console.log('\n=== MENSAGENS COM 📷 Imagem ===');
    const emojiImageMessages = [];
    imageMessagesSnapshot.forEach((doc) => {
      if (doc.data().content === '📷 Imagem') {
        emojiImageMessages.push(doc);
      }
    });
    
    if (emojiImageMessages.length > 0) {
      console.log(`Encontradas ${emojiImageMessages.length} mensagens com '📷 Imagem'`);
      
      // Mostrar detalhes das primeiras 3
      emojiImageMessages.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`\nMensagem ${index + 1}:`);
        console.log(`  ID: ${data.messageId}`);
        console.log(`  Content: "${data.content}"`);
        console.log(`  Type: ${data.type}`);
        console.log(`  Sender: ${data.sender}`);
        console.log(`  Instance: ${data.instanceName}`);
        console.log(`  Timestamp: ${data.timestamp?.toDate?.() || data.timestamp}`);
        console.log(`  Document ID: ${doc.id}`);
      });
    } else {
      console.log('Nenhuma mensagem com "📷 Imagem" encontrada.');
    }
    
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
  }
}

checkMessages();
