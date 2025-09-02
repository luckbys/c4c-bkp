const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'crm-c4-f6b8b'
  });
}

const db = admin.firestore();

async function debugImageContent() {
  console.log('=== DEBUG: CONTEÚDO DE IMAGENS NO FIREBASE ===\n');
  
  try {
    // Buscar todas as mensagens de imagem
    const messagesRef = db.collection('messages');
    const snapshot = await messagesRef.where('type', '==', 'image').get();
    
    console.log(`Total de mensagens de imagem encontradas: ${snapshot.size}\n`);
    
    const contentCounts = {};
    const examples = {};
    
    snapshot.forEach(doc => {
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
    const bracketImageMessages = snapshot.docs.filter(doc => 
      doc.data().content === '[Imagem]'
    );
    
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
    const emojiImageMessages = snapshot.docs.filter(doc => 
      doc.data().content === '📷 Imagem'
    );
    
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

debugImageContent().then(() => {
  console.log('\n=== DEBUG CONCLUÍDO ===');
  process.exit(0);
}).catch(console.error);
