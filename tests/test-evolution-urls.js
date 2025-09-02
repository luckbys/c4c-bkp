// Script para testar URLs específicas da Evolution API
const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getMetadata, getDownloadURL } = require('firebase/storage');
const { getFirestore, collection, query, where, limit, getDocs } = require('firebase/firestore');

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
const storage = getStorage(app);
const db = getFirestore(app);

// Função para buscar mensagens com mídia no Firestore (sem orderBy)
async function findMediaMessages() {
  console.log('🔍 Buscando mensagens com mídia no Firestore...');
  
  try {
    // Buscar mensagens de imagem sem orderBy
    const imageQuery = query(
      collection(db, 'messages'),
      where('type', '==', 'image'),
      limit(10)
    );
    
    const imageSnapshot = await getDocs(imageQuery);
    console.log(`📸 Encontradas ${imageSnapshot.size} mensagens de imagem`);
    
    const mediaMessages = [];
    
    imageSnapshot.forEach((doc) => {
      const data = doc.data();
      mediaMessages.push({
        id: doc.id,
        messageId: data.messageId,
        type: data.type,
        content: data.content,
        instanceName: data.instanceName,
        timestamp: data.timestamp?.toDate?.() || data.timestamp
      });
    });
    
    // Buscar outros tipos de mídia
    const mediaTypes = ['audio', 'video', 'document', 'sticker'];
    
    for (const mediaType of mediaTypes) {
      try {
        const mediaQuery = query(
          collection(db, 'messages'),
          where('type', '==', mediaType),
          limit(5)
        );
        
        const mediaSnapshot = await getDocs(mediaQuery);
        console.log(`📁 Encontradas ${mediaSnapshot.size} mensagens de ${mediaType}`);
        
        mediaSnapshot.forEach((doc) => {
          const data = doc.data();
          mediaMessages.push({
            id: doc.id,
            messageId: data.messageId,
            type: data.type,
            content: data.content,
            instanceName: data.instanceName,
            timestamp: data.timestamp?.toDate?.() || data.timestamp
          });
        });
      } catch (error) {
        console.log(`⚠️ Erro ao buscar ${mediaType}:`, error.message);
      }
    }
    
    return mediaMessages;
    
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error.message);
    return [];
  }
}

// Função para analisar URLs de mídia
function analyzeMediaUrl(content) {
  if (!content) {
    console.log('❓ Conteúdo vazio');
    return { type: 'empty', url: '', isValid: false };
  }
  
  console.log('🔍 Analisando conteúdo:', content.substring(0, 100) + '...');
  
  // Verificar se é uma URL do Firebase Storage
  if (content.includes('firebasestorage.googleapis.com')) {
    console.log('✅ URL do Firebase Storage detectada');
    return {
      type: 'firebase',
      url: content,
      isValid: content.includes('alt=media') && content.includes('token=')
    };
  }
  
  // Verificar se é uma URL da Evolution API
  if (content.includes('/message/') && content.includes('/media/')) {
    console.log('🔗 URL da Evolution API detectada');
    return {
      type: 'evolution',
      url: content,
      isValid: true
    };
  }
  
  // Verificar se é base64
  if (content.startsWith('data:')) {
    console.log('📄 Conteúdo base64 detectado');
    return {
      type: 'base64',
      url: content,
      isValid: content.includes('base64,')
    };
  }
  
  // Verificar se é uma URL HTTP/HTTPS genérica
  if (content.startsWith('http')) {
    console.log('🌐 URL HTTP genérica detectada');
    return {
      type: 'http',
      url: content,
      isValid: true
    };
  }
  
  console.log('❓ Tipo de conteúdo não reconhecido');
  return {
    type: 'unknown',
    url: content,
    isValid: false
  };
}

// Função para testar acesso a uma URL
async function testUrlAccess(url) {
  console.log('🧪 Testando acesso à URL:', url.substring(0, 80) + '...');
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('📊 Resposta:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });
    
    return {
      accessible: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      size: response.headers.get('content-length')
    };
    
  } catch (error) {
    console.log('❌ Erro ao acessar URL:', error.message);
    return {
      accessible: false,
      error: error.message
    };
  }
}

// Função para verificar arquivos no Storage
async function checkStorageFiles() {
  console.log('📁 Verificando arquivos no Firebase Storage...');
  
  const mediaTypes = ['images', 'audios', 'videos', 'documents', 'stickers'];
  const results = {};
  
  for (const mediaType of mediaTypes) {
    try {
      const mediaRef = ref(storage, mediaType);
      const mediaList = await listAll(mediaRef);
      
      console.log(`\n📂 ${mediaType}: ${mediaList.items.length} arquivos`);
      results[mediaType] = {
        totalFiles: mediaList.items.length,
        folders: mediaList.prefixes.length,
        sampleFiles: []
      };
      
      // Analisar alguns arquivos
      for (const itemRef of mediaList.items.slice(0, 3)) {
        try {
          const metadata = await getMetadata(itemRef);
          const downloadURL = await getDownloadURL(itemRef);
          
          console.log(`  📄 ${itemRef.name}:`);
          console.log(`     Tamanho: ${metadata.size} bytes`);
          console.log(`     Content-Type: ${metadata.contentType}`);
          console.log(`     Criado: ${metadata.timeCreated}`);
          
          const fileInfo = {
            name: itemRef.name,
            size: metadata.size,
            contentType: metadata.contentType,
            created: metadata.timeCreated,
            downloadURL: downloadURL
          };
          
          results[mediaType].sampleFiles.push(fileInfo);
          
          // Testar acesso
          const accessTest = await testUrlAccess(downloadURL);
          if (accessTest.accessible) {
            console.log(`     ✅ Acessível`);
            fileInfo.accessible = true;
          } else {
            console.log(`     ❌ Não acessível: ${accessTest.error || accessTest.status}`);
            fileInfo.accessible = false;
            fileInfo.error = accessTest.error || accessTest.status;
          }
          
        } catch (error) {
          console.log(`  ❌ Erro ao analisar ${itemRef.name}: ${error.message}`);
        }
      }
      
      // Verificar pastas de instâncias
      if (mediaList.prefixes.length > 0) {
        console.log(`  📁 Pastas encontradas: ${mediaList.prefixes.length}`);
        for (const folderRef of mediaList.prefixes.slice(0, 3)) {
          try {
            const folderList = await listAll(folderRef);
            console.log(`    📂 ${folderRef.name}: ${folderList.items.length} arquivos`);
          } catch (error) {
            console.log(`    ❌ Erro ao acessar pasta ${folderRef.name}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Erro ao verificar ${mediaType}: ${error.message}`);
      results[mediaType] = { error: error.message };
    }
  }
  
  return results;
}

// Função principal de teste
async function runEvolutionTests() {
  console.log('🚀 Iniciando testes de URLs da Evolution API...');
  
  try {
    // 1. Verificar arquivos no Storage primeiro
    console.log('\n📁 === VERIFICAÇÃO DO FIREBASE STORAGE ===');
    const storageResults = await checkStorageFiles();
    
    let totalFiles = 0;
    let accessibleFiles = 0;
    
    for (const [mediaType, result] of Object.entries(storageResults)) {
      if (result.totalFiles) {
        totalFiles += result.totalFiles;
        const accessible = result.sampleFiles?.filter(f => f.accessible).length || 0;
        accessibleFiles += accessible;
        console.log(`\n📊 ${mediaType}: ${result.totalFiles} arquivos, ${accessible}/${result.sampleFiles?.length || 0} testados são acessíveis`);
      }
    }
    
    console.log(`\n📈 RESUMO DO STORAGE:`);
    console.log(`   Total de arquivos: ${totalFiles}`);
    console.log(`   Arquivos testados acessíveis: ${accessibleFiles}`);
    
    // 2. Buscar mensagens com mídia
    console.log('\n\n📝 === VERIFICAÇÃO DAS MENSAGENS ===');
    const mediaMessages = await findMediaMessages();
    console.log(`\n📊 Total de mensagens com mídia encontradas: ${mediaMessages.length}`);
    
    if (mediaMessages.length > 0) {
      // Analisar URLs das mensagens
      console.log('\n🔍 Analisando URLs das mensagens:');
      const urlAnalysis = {};
      
      for (const message of mediaMessages.slice(0, 5)) {
        console.log(`\n📝 Mensagem ${message.messageId} (${message.type}):`);
        const analysis = analyzeMediaUrl(message.content);
        
        if (!urlAnalysis[analysis.type]) {
          urlAnalysis[analysis.type] = 0;
        }
        urlAnalysis[analysis.type]++;
        
        // Testar acesso se for uma URL válida
        if (analysis.isValid && analysis.type !== 'base64') {
          await testUrlAccess(analysis.url);
        }
      }
      
      console.log('\n📊 Resumo dos tipos de URL nas mensagens:');
      for (const [type, count] of Object.entries(urlAnalysis)) {
        console.log(`  ${type}: ${count} mensagens`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
}

// Executar testes
runEvolutionTests().then(() => {
  console.log('\n🏁 Testes concluídos!');
}).catch(error => {
  console.error('❌ Erro nos testes:', error);
});

module.exports = {
  findMediaMessages,
  analyzeMediaUrl,
  testUrlAccess,
  checkStorageFiles,
  runEvolutionTests
};
