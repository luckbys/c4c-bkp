const { initializeApp } = require('firebase/app');
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
const storage = getStorage(app);

async function checkStorageFiles() {
  console.log('=== ANÁLISE DE ARQUIVOS NO FIREBASE STORAGE ===\n');
  
  try {
    // Listar todas as pastas primeiro
    const rootRef = ref(storage, '');
    const rootResult = await listAll(rootRef);
    
    console.log('📁 Pastas encontradas no Storage:');
    for (const folder of rootResult.prefixes) {
      console.log(`   - ${folder.name}/`);
    }
    
    console.log(`\n📄 Arquivos na raiz: ${rootResult.items.length}`);
    
    // Verificar pasta media/ especificamente
    const mediaRef = ref(storage, 'media/');
    const mediaResult = await listAll(mediaRef);
    const files = mediaResult.items;
    
    console.log(`\nTotal de arquivos encontrados na pasta media/: ${files.length}\n`);
    
    const fileAnalysis = {
      withBinExtension: [],
      withImageExtension: [],
      withoutExtension: [],
      contentTypes: {}
    };
    
    for (const file of files.slice(0, 20)) { // Limitar a 20 arquivos
      const fileName = file.name;
      const metadata = await getMetadata(file);
      
      console.log(`\n📁 Arquivo: ${fileName}`);
      console.log(`   Content-Type: ${metadata.contentType}`);
      console.log(`   Tamanho: ${metadata.size} bytes`);
      console.log(`   Criado em: ${metadata.timeCreated}`);
      
      // Analisar extensão
      if (fileName.endsWith('.bin')) {
        fileAnalysis.withBinExtension.push({
          name: fileName,
          contentType: metadata.contentType,
          size: metadata.size
        });
      } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
        fileAnalysis.withImageExtension.push({
          name: fileName,
          contentType: metadata.contentType,
          size: metadata.size
        });
      } else if (!fileName.includes('.')) {
        fileAnalysis.withoutExtension.push({
          name: fileName,
          contentType: metadata.contentType,
          size: metadata.size
        });
      }
      
      // Contar tipos de conteúdo
      const contentType = metadata.contentType || 'undefined';
      fileAnalysis.contentTypes[contentType] = (fileAnalysis.contentTypes[contentType] || 0) + 1;
    }
    
    console.log('\n=== RESUMO DA ANÁLISE ===');
    console.log(`\n🔴 Arquivos com extensão .bin: ${fileAnalysis.withBinExtension.length}`);
    if (fileAnalysis.withBinExtension.length > 0) {
      fileAnalysis.withBinExtension.forEach(file => {
        console.log(`   - ${file.name} (${file.contentType})`);
      });
    }
    
    console.log(`\n🟢 Arquivos com extensão de imagem: ${fileAnalysis.withImageExtension.length}`);
    if (fileAnalysis.withImageExtension.length > 0) {
      fileAnalysis.withImageExtension.forEach(file => {
        console.log(`   - ${file.name} (${file.contentType})`);
      });
    }
    
    console.log(`\n🟡 Arquivos sem extensão: ${fileAnalysis.withoutExtension.length}`);
    if (fileAnalysis.withoutExtension.length > 0) {
      fileAnalysis.withoutExtension.forEach(file => {
        console.log(`   - ${file.name} (${file.contentType})`);
      });
    }
    
    console.log('\n📊 Tipos de conteúdo encontrados:');
    Object.entries(fileAnalysis.contentTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([contentType, count]) => {
        console.log(`   ${contentType}: ${count} arquivos`);
      });
    
    // Verificar se há problema na geração de extensões
    console.log('\n=== DIAGNÓSTICO ===');
    if (fileAnalysis.withBinExtension.length > 0) {
      console.log('🚨 PROBLEMA IDENTIFICADO:');
      console.log('   Arquivos estão sendo salvos com extensão .bin');
      console.log('   Isso indica que a URL da Evolution API não contém extensão válida');
      console.log('   Solução: Usar o Content-Type para determinar a extensão correta');
    }
    
    if (fileAnalysis.contentTypes['application/octet-stream'] > 0) {
      console.log('🚨 PROBLEMA ADICIONAL:');
      console.log('   Alguns arquivos têm Content-Type como application/octet-stream');
      console.log('   Isso pode causar problemas na renderização');
      console.log('   Solução: Detectar tipo de arquivo pelos bytes do arquivo');
    }
    
  } catch (error) {
    console.error('❌ Erro ao analisar arquivos:', error);
  }
}

checkStorageFiles();
