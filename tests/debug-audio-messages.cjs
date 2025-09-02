// Script para debugar mensagens de áudio no Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit } = require('firebase/firestore');

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

async function debugAudioMessages() {
  console.log('🎵 === DEBUG: MENSAGENS DE ÁUDIO NO FIREBASE === 🎵\n');
  
  try {
    // Buscar todas as mensagens de áudio
    const audioMessagesQuery = query(
      collection(db, 'messages'),
      where('type', '==', 'audio'),
      limit(20)
    );
    
    const audioMessagesSnapshot = await getDocs(audioMessagesQuery);
    
    console.log(`📊 Total de mensagens de áudio encontradas: ${audioMessagesSnapshot.size}\n`);
    
    if (audioMessagesSnapshot.size === 0) {
      console.log('❌ Nenhuma mensagem de áudio encontrada no banco de dados.');
      console.log('💡 Isso pode indicar que:');
      console.log('   1. Os webhooks de áudio não estão sendo processados');
      console.log('   2. O tipo está sendo salvo incorretamente');
      console.log('   3. Não há mensagens de áudio no sistema ainda\n');
      
      // Verificar se há mensagens com conteúdo de áudio mas tipo diferente
      console.log('🔍 Verificando mensagens que podem ser áudios com tipo incorreto...');
      
      const allMessagesQuery = query(
        collection(db, 'messages'),
        limit(50)
      );
      
      const allMessagesSnapshot = await getDocs(allMessagesQuery);
      const possibleAudioMessages = [];
      
      allMessagesSnapshot.forEach((doc) => {
        const data = doc.data();
        const content = data.content || '';
        
        // Verificar se o conteúdo parece ser de áudio
        if (
          content.includes('[Áudio]') ||
          content.includes('🎵') ||
          content.includes('audio') ||
          content.includes('.mp3') ||
          content.includes('.wav') ||
          content.includes('.ogg') ||
          content.includes('.m4a') ||
          content.includes('audioMessage')
        ) {
          possibleAudioMessages.push({
            id: doc.id,
            messageId: data.messageId,
            type: data.type,
            content: content.substring(0, 200),
            sender: data.sender,
            instanceName: data.instanceName,
            timestamp: data.timestamp?.toDate?.() || data.timestamp
          });
        }
      });
      
      if (possibleAudioMessages.length > 0) {
        console.log(`\n🎵 Encontradas ${possibleAudioMessages.length} mensagens que podem ser áudios:`);
        possibleAudioMessages.forEach((msg, index) => {
          console.log(`\n--- Possível Áudio ${index + 1} ---`);
          console.log(`ID: ${msg.id}`);
          console.log(`MessageID: ${msg.messageId}`);
          console.log(`Type: ${msg.type}`);
          console.log(`Content: ${msg.content}`);
          console.log(`Sender: ${msg.sender}`);
          console.log(`Instance: ${msg.instanceName}`);
          console.log(`Timestamp: ${msg.timestamp}`);
        });
      } else {
        console.log('\n❌ Nenhuma mensagem com indicadores de áudio encontrada.');
      }
      
      return;
    }
    
    // Analisar mensagens de áudio encontradas
    const audioAnalysis = {
      total: 0,
      withFirebaseUrl: 0,
      withPlaceholder: 0,
      withHttpUrl: 0,
      withDataUrl: 0,
      withInvalidContent: 0,
      examples: []
    };
    
    console.log('=== ANÁLISE DETALHADA DAS MENSAGENS DE ÁUDIO ===\n');
    
    audioMessagesSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const content = data.content || '';
      
      audioAnalysis.total++;
      
      // Análise do conteúdo
      if (content.includes('firebasestorage.googleapis.com')) {
        audioAnalysis.withFirebaseUrl++;
      } else if (content === '[Áudio]' || content.includes('🎵')) {
        audioAnalysis.withPlaceholder++;
      } else if (content.startsWith('http://') || content.startsWith('https://')) {
        audioAnalysis.withHttpUrl++;
      } else if (content.startsWith('data:')) {
        audioAnalysis.withDataUrl++;
      } else {
        audioAnalysis.withInvalidContent++;
      }
      
      // Guardar exemplos para análise detalhada
      if (index < 5) {
        audioAnalysis.examples.push({
          docId: doc.id,
          messageId: data.messageId,
          content: content,
          contentLength: content.length,
          sender: data.sender,
          instanceName: data.instanceName,
          timestamp: data.timestamp?.toDate?.() || data.timestamp,
          status: data.status
        });
      }
      
      console.log(`--- Áudio ${index + 1} ---`);
      console.log(`Doc ID: ${doc.id}`);
      console.log(`Message ID: ${data.messageId}`);
      console.log(`Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
      console.log(`Content Length: ${content.length}`);
      console.log(`Type: ${data.type}`);
      console.log(`Sender: ${data.sender}`);
      console.log(`Instance: ${data.instanceName}`);
      console.log(`Status: ${data.status}`);
      console.log(`Timestamp: ${data.timestamp?.toDate?.() || data.timestamp}`);
      
      // Verificar se é uma URL válida
      if (content.startsWith('http')) {
        try {
          const url = new URL(content);
          console.log(`✅ URL válida: ${url.hostname}`);
        } catch (error) {
          console.log(`❌ URL inválida: ${error.message}`);
        }
      }
      
      console.log('');
    });
    
    // Resumo da análise
    console.log('=== RESUMO DA ANÁLISE ===');
    console.log(`📊 Total de áudios: ${audioAnalysis.total}`);
    console.log(`🔥 Com URL do Firebase: ${audioAnalysis.withFirebaseUrl}`);
    console.log(`📝 Com placeholder: ${audioAnalysis.withPlaceholder}`);
    console.log(`🌐 Com URL HTTP: ${audioAnalysis.withHttpUrl}`);
    console.log(`📄 Com Data URL: ${audioAnalysis.withDataUrl}`);
    console.log(`❌ Com conteúdo inválido: ${audioAnalysis.withInvalidContent}`);
    
    // Diagnóstico
    console.log('\n=== DIAGNÓSTICO ===');
    if (audioAnalysis.withPlaceholder > 0) {
      console.log(`⚠️  ${audioAnalysis.withPlaceholder} áudios estão com placeholder - webhook pode não estar processando corretamente`);
    }
    if (audioAnalysis.withFirebaseUrl === 0 && audioAnalysis.total > 0) {
      console.log(`⚠️  Nenhum áudio foi carregado para o Firebase Storage - verificar processo de upload`);
    }
    if (audioAnalysis.withInvalidContent > 0) {
      console.log(`❌ ${audioAnalysis.withInvalidContent} áudios têm conteúdo inválido - verificar processamento`);
    }
    if (audioAnalysis.withFirebaseUrl > 0) {
      console.log(`✅ ${audioAnalysis.withFirebaseUrl} áudios foram carregados corretamente para o Firebase Storage`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens de áudio:', error);
  }
}

// Executar debug
debugAudioMessages().catch(console.error);