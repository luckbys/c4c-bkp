// Teste específico para verificar processamento de imagens da Evolution API
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, limit } = require('firebase/firestore');
const { getStorage, ref, listAll, getDownloadURL, getMetadata } = require('firebase/storage');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBKxhbJQOQGgQQGgQQGgQQGgQQGgQQGgQQ",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function analyzeEvolutionImages() {
  console.log('=== ANÁLISE DE IMAGENS DA EVOLUTION API ===\n');
  
  try {
    // 1. Verificar mensagens de imagem no Firestore (sem orderBy para evitar índice)
    console.log('1. 📊 Analisando mensagens de imagem no Firestore...');
    const messagesRef = collection(db, 'messages');
    const imageQuery = query(
      messagesRef,
      where('type', '==', 'image'),
      limit(50)
    );
    
    const imageMessages = await getDocs(imageQuery);
    console.log(`   Encontradas ${imageMessages.size} mensagens de imagem\n`);
    
    const imageAnalysis = {
      total: 0,
      withFirebaseUrl: 0,
      withPlaceholder: 0,
      withBinExtension: 0,
      withCorrectExtension: 0,
      withWhatsAppUrl: 0,
      withBase64: 0,
      errors: [],
      examples: []
    };
    
    imageMessages.forEach((doc) => {
      const data = doc.data();
      const content = data.content || '';
      
      imageAnalysis.total++;
      
      // Guardar exemplos para análise
      if (imageAnalysis.examples.length < 5) {
        imageAnalysis.examples.push({
          messageId: data.messageId || doc.id,
          content: content.substring(0, 100),
          sender: data.sender,
          instance: data.instanceName,
          timestamp: data.timestamp?.toDate?.() || data.timestamp
        });
      }
      
      // Análise do conteúdo
      if (content.includes('firebasestorage.googleapis.com')) {
        imageAnalysis.withFirebaseUrl++;
        if (content.includes('.bin?')) {
          imageAnalysis.withBinExtension++;
        } else if (content.match(/\.(jpg|jpeg|png|gif|webp)\?/)) {
          imageAnalysis.withCorrectExtension++;
        }
      } else if (content === '[Imagem]' || content === '📷 Imagem') {
        imageAnalysis.withPlaceholder++;
      } else if (content.includes('whatsapp.net')) {
        imageAnalysis.withWhatsAppUrl++;
      } else if (content.startsWith('data:image/')) {
        imageAnalysis.withBase64++;
      } else {
        imageAnalysis.errors.push({
          messageId: data.messageId || doc.id,
          content: content.substring(0, 50),
          issue: 'Formato não reconhecido'
        });
      }
    });
    
    // 2. Verificar arquivos no Firebase Storage
    console.log('2. 🗄️  Analisando arquivos no Firebase Storage...');
    
    const storageAnalysis = {
      totalFiles: 0,
      imageFiles: 0,
      binFiles: 0,
      correctExtensions: 0,
      recentFiles: [],
      accessError: null
    };
    
    try {
      // Tentar listar arquivos na pasta images
      const imagesRef = ref(storage, 'images');
      const imagesList = await listAll(imagesRef);
      
      console.log(`   Encontrados ${imagesList.prefixes.length} diretórios de instância`);
      
      // Analisar apenas os primeiros diretórios para evitar timeout
      const instancesToCheck = imagesList.prefixes.slice(0, 3);
      
      for (const instanceRef of instancesToCheck) {
        console.log(`   📁 Verificando instância: ${instanceRef.name}`);
        
        try {
          const yearsList = await listAll(instanceRef);
          for (const yearRef of yearsList.prefixes.slice(0, 2)) { // Apenas 2 anos mais recentes
            const monthsList = await listAll(yearRef);
            for (const monthRef of monthsList.prefixes.slice(0, 3)) { // Apenas 3 meses mais recentes
              const filesList = await listAll(monthRef);
              
              for (const fileRef of filesList.items.slice(0, 10)) { // Apenas 10 arquivos por pasta
                storageAnalysis.totalFiles++;
                
                const fileName = fileRef.name;
                const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i);
                const isBin = fileName.endsWith('.bin');
                
                if (isImage) {
                  storageAnalysis.imageFiles++;
                  storageAnalysis.correctExtensions++;
                } else if (isBin) {
                  storageAnalysis.binFiles++;
                }
                
                // Pegar alguns exemplos
                if (storageAnalysis.recentFiles.length < 5) {
                  try {
                    const metadata = await getMetadata(fileRef);
                    
                    storageAnalysis.recentFiles.push({
                      name: fileName,
                      path: fileRef.fullPath,
                      size: metadata.size,
                      contentType: metadata.contentType,
                      created: metadata.timeCreated
                    });
                  } catch (metaError) {
                    console.log(`      ⚠️  Erro ao obter metadados de ${fileName}`);
                  }
                }
              }
            }
          }
        } catch (instanceError) {
          console.log(`   ⚠️  Erro ao acessar instância ${instanceRef.name}:`, instanceError.message);
        }
      }
    } catch (storageError) {
      console.log(`   ❌ Erro ao acessar Storage:`, storageError.message);
      storageAnalysis.accessError = storageError.message;
      
      if (storageError.code === 'storage/unauthorized') {
        console.log(`   ℹ️  Problema de permissão - verifique as regras do Storage`);
      }
    }
    
    // 3. Relatório final
    console.log('\n=== RELATÓRIO DE ANÁLISE ===\n');
    
    console.log('📊 MENSAGENS NO FIRESTORE:');
    console.log(`   Total de mensagens de imagem: ${imageAnalysis.total}`);
    
    if (imageAnalysis.total > 0) {
      console.log(`   Com URL do Firebase Storage: ${imageAnalysis.withFirebaseUrl} (${Math.round(imageAnalysis.withFirebaseUrl/imageAnalysis.total*100)}%)`);
      console.log(`   Com extensão .bin: ${imageAnalysis.withBinExtension} (${Math.round(imageAnalysis.withBinExtension/imageAnalysis.total*100)}%)`);
      console.log(`   Com extensão correta: ${imageAnalysis.withCorrectExtension} (${Math.round(imageAnalysis.withCorrectExtension/imageAnalysis.total*100)}%)`);
      console.log(`   Com placeholder: ${imageAnalysis.withPlaceholder} (${Math.round(imageAnalysis.withPlaceholder/imageAnalysis.total*100)}%)`);
      console.log(`   Com URL do WhatsApp: ${imageAnalysis.withWhatsAppUrl} (${Math.round(imageAnalysis.withWhatsAppUrl/imageAnalysis.total*100)}%)`);
      console.log(`   Com base64: ${imageAnalysis.withBase64} (${Math.round(imageAnalysis.withBase64/imageAnalysis.total*100)}%)`);
    }
    
    console.log('\n🗄️  ARQUIVOS NO STORAGE:');
    if (storageAnalysis.accessError) {
      console.log(`   ❌ Erro de acesso: ${storageAnalysis.accessError}`);
    } else {
      console.log(`   Total de arquivos verificados: ${storageAnalysis.totalFiles}`);
      console.log(`   Arquivos de imagem: ${storageAnalysis.imageFiles}`);
      console.log(`   Arquivos .bin: ${storageAnalysis.binFiles}`);
      console.log(`   Extensões corretas: ${storageAnalysis.correctExtensions}`);
    }
    
    // 4. Exemplos de mensagens
    if (imageAnalysis.examples.length > 0) {
      console.log('\n📋 EXEMPLOS DE MENSAGENS:');
      imageAnalysis.examples.forEach((example, index) => {
        console.log(`   ${index + 1}. ID: ${example.messageId}`);
        console.log(`      Content: ${example.content}${example.content.length >= 100 ? '...' : ''}`);
        console.log(`      Sender: ${example.sender} | Instance: ${example.instance}`);
        console.log(`      Timestamp: ${example.timestamp}`);
        console.log('');
      });
    }
    
    // 5. Exemplos de arquivos
    if (storageAnalysis.recentFiles.length > 0) {
      console.log('📁 EXEMPLOS DE ARQUIVOS NO STORAGE:');
      storageAnalysis.recentFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name}`);
        console.log(`      Caminho: ${file.path}`);
        console.log(`      Tamanho: ${file.size} bytes`);
        console.log(`      Tipo: ${file.contentType}`);
        console.log(`      Criado: ${file.created}`);
        console.log('');
      });
    }
    
    // 6. Problemas identificados
    console.log('⚠️  PROBLEMAS IDENTIFICADOS:');
    
    if (imageAnalysis.withPlaceholder > 0) {
      console.log(`   • ${imageAnalysis.withPlaceholder} mensagens com placeholder - imagens não foram processadas`);
      console.log(`     Isso indica que o webhook não conseguiu baixar/processar as imagens`);
    }
    
    if (imageAnalysis.withBinExtension > 0) {
      console.log(`   • ${imageAnalysis.withBinExtension} arquivos com extensão .bin - correção de extensão necessária`);
      console.log(`     A correção implementada deve resolver isso para novos uploads`);
    }
    
    if (storageAnalysis.binFiles > 0) {
      console.log(`   • ${storageAnalysis.binFiles} arquivos .bin no Storage - podem ser imagens mal processadas`);
    }
    
    if (imageAnalysis.errors.length > 0) {
      console.log(`   • ${imageAnalysis.errors.length} mensagens com formato não reconhecido:`);
      imageAnalysis.errors.slice(0, 3).forEach(error => {
        console.log(`     - ${error.messageId}: ${error.content}... (${error.issue})`);
      });
    }
    
    if (storageAnalysis.accessError) {
      console.log(`   • Erro de acesso ao Storage: ${storageAnalysis.accessError}`);
      console.log(`     Verifique as permissões e regras do Firebase Storage`);
    }
    
    // 7. Status geral
    console.log('\n📈 STATUS GERAL:');
    
    if (imageAnalysis.total === 0) {
      console.log('   ❌ Nenhuma mensagem de imagem encontrada');
    } else {
      const successRate = Math.round((imageAnalysis.withFirebaseUrl + imageAnalysis.withBase64) / imageAnalysis.total * 100);
      console.log(`   Taxa de sucesso no processamento: ${successRate}%`);
      
      if (successRate >= 80) {
        console.log('   ✅ Sistema funcionando bem');
      } else if (successRate >= 50) {
        console.log('   ⚠️  Sistema com problemas moderados');
      } else {
        console.log('   ❌ Sistema com problemas graves');
      }
    }
    
    console.log('\n=== FIM DA ANÁLISE ===');
    
  } catch (error) {
    console.error('❌ Erro durante análise:', error.message);
    if (error.code) {
      console.error('Código do erro:', error.code);
    }
  }
}

analyzeEvolutionImages().catch(console.error);
