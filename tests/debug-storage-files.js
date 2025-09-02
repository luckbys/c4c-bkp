// Script para debugar arquivos salvos no Firebase Storage
const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getMetadata, getDownloadURL } = require('firebase/storage');

// Configuração do Firebase (usar as mesmas configurações do projeto)
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

async function debugStorageFiles() {
  console.log('🔍 Analisando arquivos no Firebase Storage...');
  
  try {
    // Listar arquivos na pasta images
    const imagesRef = ref(storage, 'images');
    const imagesList = await listAll(imagesRef);
    
    console.log(`\n📁 Encontrados ${imagesList.items.length} arquivos na pasta images:`);
    
    for (const itemRef of imagesList.items.slice(0, 10)) { // Analisar apenas os primeiros 10
      try {
        const metadata = await getMetadata(itemRef);
        const downloadURL = await getDownloadURL(itemRef);
        
        console.log(`\n📄 Arquivo: ${itemRef.name}`);
        console.log(`   📊 Tamanho: ${metadata.size} bytes`);
        console.log(`   🏷️  Content-Type: ${metadata.contentType}`);
        console.log(`   📅 Criado em: ${metadata.timeCreated}`);
        console.log(`   🔗 URL: ${downloadURL}`);
        
        // Verificar se o arquivo pode ser acessado
        try {
          const response = await fetch(downloadURL, { method: 'HEAD' });
          console.log(`   ✅ Status HTTP: ${response.status}`);
          console.log(`   📋 Headers:`);
          console.log(`      Content-Type: ${response.headers.get('content-type')}`);
          console.log(`      Content-Length: ${response.headers.get('content-length')}`);
        } catch (fetchError) {
          console.log(`   ❌ Erro ao acessar arquivo: ${fetchError.message}`);
        }
        
        // Verificar extensão do arquivo
        const extension = itemRef.name.split('.').pop();
        console.log(`   🔧 Extensão: ${extension}`);
        
        // Verificar se a extensão corresponde ao Content-Type
        const expectedContentTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'bin': 'application/octet-stream'
        };
        
        const expectedType = expectedContentTypes[extension.toLowerCase()];
        if (expectedType && metadata.contentType !== expectedType) {
          console.log(`   ⚠️  PROBLEMA: Content-Type não corresponde à extensão!`);
          console.log(`      Esperado: ${expectedType}`);
          console.log(`      Atual: ${metadata.contentType}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao analisar ${itemRef.name}: ${error.message}`);
      }
    }
    
    // Verificar outras pastas de mídia
    const mediaFolders = ['audios', 'videos', 'documents', 'stickers'];
    
    for (const folder of mediaFolders) {
      try {
        const folderRef = ref(storage, folder);
        const folderList = await listAll(folderRef);
        console.log(`\n📁 Pasta ${folder}: ${folderList.items.length} arquivos`);
      } catch (error) {
        console.log(`\n📁 Pasta ${folder}: Erro ao acessar - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao analisar Storage:', error);
  }
}

// Função para testar download de um arquivo específico
async function testFileDownload(fileName) {
  console.log(`\n🧪 Testando download do arquivo: ${fileName}`);
  
  try {
    const fileRef = ref(storage, `images/loja/2025/08/${fileName}`);
    const downloadURL = await getDownloadURL(fileRef);
    
    console.log(`🔗 URL de download: ${downloadURL}`);
    
    // Tentar fazer download
    const response = await fetch(downloadURL);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`📏 Content-Length: ${response.headers.get('content-length')}`);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log(`✅ Download bem-sucedido: ${buffer.byteLength} bytes`);
      
      // Verificar se é uma imagem válida (primeiros bytes)
      const uint8Array = new Uint8Array(buffer.slice(0, 10));
      const header = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`🔍 Header do arquivo: ${header}`);
      
      // Verificar assinaturas de arquivo conhecidas
      const signatures = {
        'ff d8 ff': 'JPEG',
        '89 50 4e 47': 'PNG',
        '47 49 46 38': 'GIF',
        '52 49 46 46': 'WEBP'
      };
      
      for (const [sig, type] of Object.entries(signatures)) {
        if (header.startsWith(sig)) {
          console.log(`✅ Arquivo identificado como: ${type}`);
          break;
        }
      }
    } else {
      console.log(`❌ Erro no download: ${response.statusText}`);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao testar download: ${error.message}`);
  }
}

// Executar análise
debugStorageFiles().then(() => {
  console.log('\n🏁 Análise concluída!');
}).catch(error => {
  console.error('❌ Erro na análise:', error);
});

// Exportar funções para uso manual
module.exports = {
  debugStorageFiles,
  testFileDownload
};
