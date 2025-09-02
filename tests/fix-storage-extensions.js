// Script para corrigir arquivos sem extensão no Firebase Storage
const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getMetadata, getDownloadURL, uploadBytes, deleteObject } = require('firebase/storage');

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

// Mapeamento de content-type para extensões
const contentTypeToExtension = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/aac': '.aac',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
  'video/mpeg': '.mpeg',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/octet-stream': '.bin' // Fallback para binários
};

// Função para determinar extensão baseada no content-type
function getExtensionFromContentType(contentType) {
  if (!contentType) return null;
  
  // Remover parâmetros extras do content-type
  const cleanContentType = contentType.split(';')[0].trim().toLowerCase();
  
  return contentTypeToExtension[cleanContentType] || null;
}

// Função para verificar se um arquivo tem extensão
function hasExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return false;
  
  const extension = filename.substring(lastDot);
  return extension.length > 1 && extension.length <= 5;
}

// Função para baixar arquivo do Storage
async function downloadFile(fileRef) {
  try {
    const downloadURL = await getDownloadURL(fileRef);
    const response = await fetch(downloadURL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
    
  } catch (error) {
    console.error(`❌ Erro ao baixar ${fileRef.fullPath}:`, error.message);
    throw error;
  }
}

// Função para corrigir um arquivo sem extensão
async function fixFileExtension(fileRef, metadata) {
  try {
    console.log(`🔧 Corrigindo arquivo: ${fileRef.name}`);
    console.log(`   Content-Type: ${metadata.contentType}`);
    console.log(`   Tamanho: ${metadata.size} bytes`);
    
    // Determinar extensão correta
    const extension = getExtensionFromContentType(metadata.contentType);
    if (!extension) {
      console.log(`   ⚠️ Não foi possível determinar extensão para content-type: ${metadata.contentType}`);
      return false;
    }
    
    const newFileName = fileRef.name + extension;
    console.log(`   📝 Novo nome: ${newFileName}`);
    
    // Baixar arquivo original
    console.log(`   📥 Baixando arquivo original...`);
    const fileData = await downloadFile(fileRef);
    
    // Criar referência para o novo arquivo
    const newFileRef = ref(storage, fileRef.fullPath + extension);
    
    // Upload do arquivo com novo nome
    console.log(`   📤 Fazendo upload com extensão...`);
    const uploadMetadata = {
      contentType: metadata.contentType,
      customMetadata: {
        originalName: fileRef.name,
        fixedAt: new Date().toISOString(),
        fixedBy: 'fix-storage-extensions-script'
      }
    };
    
    await uploadBytes(newFileRef, fileData, uploadMetadata);
    
    // Verificar se o novo arquivo foi criado com sucesso
    const newMetadata = await getMetadata(newFileRef);
    const newDownloadURL = await getDownloadURL(newFileRef);
    
    console.log(`   ✅ Arquivo corrigido criado com sucesso`);
    console.log(`   🔗 Nova URL: ${newDownloadURL}`);
    
    // Testar acesso ao novo arquivo
    const testResponse = await fetch(newDownloadURL, { method: 'HEAD' });
    if (testResponse.ok) {
      console.log(`   ✅ Novo arquivo acessível`);
      
      // Remover arquivo original (opcional - comentado por segurança)
      // console.log(`   🗑️ Removendo arquivo original...`);
      // await deleteObject(fileRef);
      // console.log(`   ✅ Arquivo original removido`);
      
      return true;
    } else {
      console.log(`   ❌ Novo arquivo não acessível: ${testResponse.status}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${fileRef.fullPath}:`, error.message);
    return false;
  }
}

// Função para processar uma pasta de mídia
async function processMediaFolder(mediaType) {
  console.log(`\n📂 Processando pasta: ${mediaType}`);
  
  try {
    const mediaRef = ref(storage, mediaType);
    const mediaList = await listAll(mediaRef);
    
    console.log(`📊 Total de arquivos: ${mediaList.items.length}`);
    console.log(`📊 Total de pastas: ${mediaList.prefixes.length}`);
    
    let filesWithoutExtension = 0;
    let filesFixed = 0;
    let filesSkipped = 0;
    
    // Processar arquivos na raiz da pasta
    for (const itemRef of mediaList.items) {
      if (!hasExtension(itemRef.name)) {
        filesWithoutExtension++;
        console.log(`\n🔍 Arquivo sem extensão encontrado: ${itemRef.name}`);
        
        try {
          const metadata = await getMetadata(itemRef);
          const success = await fixFileExtension(itemRef, metadata);
          
          if (success) {
            filesFixed++;
          } else {
            filesSkipped++;
          }
          
        } catch (error) {
          console.log(`❌ Erro ao processar ${itemRef.name}: ${error.message}`);
          filesSkipped++;
        }
      }
    }
    
    // Processar subpastas (instâncias)
    for (const folderRef of mediaList.prefixes) {
      console.log(`\n📁 Processando subpasta: ${folderRef.name}`);
      
      try {
        const folderList = await listAll(folderRef);
        console.log(`   📊 Arquivos na subpasta: ${folderList.items.length}`);
        
        for (const itemRef of folderList.items) {
          if (!hasExtension(itemRef.name)) {
            filesWithoutExtension++;
            console.log(`\n🔍 Arquivo sem extensão encontrado: ${itemRef.fullPath}`);
            
            try {
              const metadata = await getMetadata(itemRef);
              const success = await fixFileExtension(itemRef, metadata);
              
              if (success) {
                filesFixed++;
              } else {
                filesSkipped++;
              }
              
            } catch (error) {
              console.log(`❌ Erro ao processar ${itemRef.fullPath}: ${error.message}`);
              filesSkipped++;
            }
          }
        }
        
      } catch (error) {
        console.log(`❌ Erro ao processar subpasta ${folderRef.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Resumo para ${mediaType}:`);
    console.log(`   Arquivos sem extensão: ${filesWithoutExtension}`);
    console.log(`   Arquivos corrigidos: ${filesFixed}`);
    console.log(`   Arquivos ignorados: ${filesSkipped}`);
    
    return {
      mediaType,
      filesWithoutExtension,
      filesFixed,
      filesSkipped
    };
    
  } catch (error) {
    console.error(`❌ Erro ao processar pasta ${mediaType}:`, error.message);
    return {
      mediaType,
      error: error.message
    };
  }
}

// Função principal
async function fixStorageExtensions() {
  console.log('🚀 Iniciando correção de extensões no Firebase Storage...');
  console.log('⚠️ ATENÇÃO: Este script irá criar novos arquivos com extensões corretas');
  console.log('⚠️ Os arquivos originais NÃO serão removidos por segurança');
  
  const mediaTypes = ['images', 'audios', 'videos', 'documents', 'stickers'];
  const results = [];
  
  for (const mediaType of mediaTypes) {
    const result = await processMediaFolder(mediaType);
    results.push(result);
    
    // Pausa entre processamentos para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 === RESUMO FINAL ===');
  let totalWithoutExtension = 0;
  let totalFixed = 0;
  let totalSkipped = 0;
  
  for (const result of results) {
    if (result.error) {
      console.log(`❌ ${result.mediaType}: Erro - ${result.error}`);
    } else {
      console.log(`📊 ${result.mediaType}: ${result.filesFixed}/${result.filesWithoutExtension} arquivos corrigidos`);
      totalWithoutExtension += result.filesWithoutExtension;
      totalFixed += result.filesFixed;
      totalSkipped += result.filesSkipped;
    }
  }
  
  console.log(`\n📈 TOTAIS:`);
  console.log(`   Arquivos sem extensão encontrados: ${totalWithoutExtension}`);
  console.log(`   Arquivos corrigidos com sucesso: ${totalFixed}`);
  console.log(`   Arquivos ignorados/com erro: ${totalSkipped}`);
  
  if (totalFixed > 0) {
    console.log(`\n✅ Correção concluída! ${totalFixed} arquivos agora têm extensões corretas.`);
    console.log(`💡 Os arquivos corrigidos devem estar visíveis no Storage e no sistema.`);
  } else {
    console.log(`\n⚠️ Nenhum arquivo foi corrigido. Verifique se há arquivos sem extensão no Storage.`);
  }
}

// Executar correção
fixStorageExtensions().then(() => {
  console.log('\n🎉 Script de correção finalizado!');
}).catch(error => {
  console.error('❌ Erro no script de correção:', error);
});

module.exports = {
  getExtensionFromContentType,
  hasExtension,
  fixFileExtension,
  processMediaFolder,
  fixStorageExtensions
};
