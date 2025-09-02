// Script para verificar se o áudio foi processado e salvo no Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } = require('firebase/firestore');
const { getStorage, ref, listAll, getMetadata } = require('firebase/storage');

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
const storage = getStorage(app);

async function checkAudioProcessing() {
  console.log('🔍 === VERIFICANDO PROCESSAMENTO DE ÁUDIO === 🔍\n');
  
  try {
    // Buscar todas as mensagens primeiro
    console.log('📋 Buscando todas as mensagens...');
    
    const messagesRef = collection(db, 'messages');
    const allQuery = query(messagesRef, limit(10));
    const allSnapshot = await getDocs(allQuery);
    
    console.log(`📊 Total de mensagens encontradas: ${allSnapshot.size}`);
    
    if (allSnapshot.size > 0) {
      console.log('\n📝 Tipos de mensagem encontrados:');
      const messageTypes = new Set();
      allSnapshot.docs.forEach(doc => {
        const data = doc.data();
        messageTypes.add(data.messageType || 'undefined');
      });
      messageTypes.forEach(type => console.log(`  - ${type}`));
    }
    
    // Agora buscar mensagens de áudio
    console.log('\n📋 Buscando mensagens de áudio...');
    
    const audioQuery = query(
      messagesRef,
      where('messageType', '==', 'audioMessage'),
      limit(20)
    );
    
    const snapshot = await getDocs(audioQuery);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma mensagem de áudio encontrada');
    } else {
      console.log(`✅ Encontradas ${snapshot.size} mensagens de áudio:\n`);
    }
    
    snapshot.docs.forEach(async (doc) => {
      const data = doc.data();
      const messageId = doc.id;
      
      console.log(`📱 Mensagem ID: ${messageId}`);
      console.log(`⏰ Timestamp: ${data.timestamp?.toDate?.()?.toISOString() || data.timestamp}`);
      console.log(`📞 RemoteJid: ${data.remoteJid}`);
      console.log(`🎵 Tipo: ${data.messageType}`);
      console.log(`📄 Conteúdo: ${data.content}`);
      
      // Verificar se é URL do WhatsApp ou Firebase Storage
      if (data.content) {
        if (data.content.includes('mmg.whatsapp.net') || data.content.includes('pps.whatsapp.net') || data.content.includes('media.whatsapp.net')) {
          console.log('🔗 Status: URL do WhatsApp (não processada para Storage)');
        } else if (data.content.includes('firebasestorage.googleapis.com') || data.content.includes('storage.googleapis.com')) {
          console.log('☁️ Status: URL do Firebase Storage (processada com sucesso)');
          
          // Verificar se o arquivo existe no Storage
          try {
            const url = new URL(data.content);
            const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1]);
              const file = storage.bucket().file(filePath);
              const [exists] = await file.exists();
              console.log(`📁 Arquivo no Storage: ${exists ? '✅ Existe' : '❌ Não encontrado'}`);
            }
          } catch (error) {
            console.log(`❌ Erro ao verificar arquivo no Storage: ${error.message}`);
          }
        } else if (data.content.startsWith('data:')) {
          console.log('📊 Status: URL base64 (não processada)');
        } else {
          console.log('❓ Status: URL desconhecida');
        }
      } else {
        console.log('❌ Status: Sem conteúdo');
      }
      
      console.log('─'.repeat(50));
    });
    
    // Verificar arquivos de áudio no Storage
    console.log('\n☁️ Verificando arquivos de áudio no Firebase Storage...');
    
    const audiosRef = ref(storage, 'audios/');
    const filesList = await listAll(audiosRef);
    const files = filesList.items;
    
    if (files.length === 0) {
      console.log('❌ Nenhum arquivo de áudio encontrado no Storage');
    } else {
      console.log(`✅ Encontrados ${files.length} arquivos de áudio no Storage:`);
      
      for (const file of files) {
        const metadata = await getMetadata(file);
        console.log(`📁 ${file.name} (${metadata.size} bytes, criado em ${metadata.timeCreated})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar processamento:', error);
  }
}

// Executar verificação
checkAudioProcessing().catch(console.error);