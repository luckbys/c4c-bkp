// Importar Firebase v9
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

// Função para listar arquivos de áudio recentes
async function listRecentAudioFiles() {
  try {
    console.log('🎵 Testando acesso à pasta audios/...');
    
    // Primeiro, testar acesso básico
    const audiosRef = ref(storage, 'audios/');
    console.log('📂 Referência criada para audios/');
    
    const result = await listAll(audiosRef);
    console.log('✅ Acesso à pasta audios/ bem-sucedido!');
    
    console.log(`📁 Subpastas encontradas: ${result.prefixes.length}`);
    console.log(`📄 Arquivos na raiz: ${result.items.length}`);
    
    const allFiles = [];
    
    // Verificar arquivos na pasta raiz
    for (const itemRef of result.items) {
      const name = itemRef.name.toLowerCase();
      if (name.endsWith('.ogg') || name.endsWith('.opus') || name.endsWith('.mp3') || name.endsWith('.wav')) {
        try {
          const metadata = await getMetadata(itemRef);
          allFiles.push({ ref: itemRef, metadata });
        } catch (metaError) {
          console.warn(`⚠️ Erro ao obter metadata de ${itemRef.fullPath}:`, metaError.message);
        }
      }
    }
    
    // Verificar apenas as primeiras 3 subpastas para evitar sobrecarga
    const limitedPrefixes = result.prefixes.slice(0, 3);
    for (const folderRef of limitedPrefixes) {
      try {
        console.log(`🔍 Verificando subpasta: ${folderRef.name}`);
        const subResult = await listAll(folderRef);
        
        for (const itemRef of subResult.items) {
          const name = itemRef.name.toLowerCase();
          if (name.endsWith('.ogg') || name.endsWith('.opus') || name.endsWith('.mp3') || name.endsWith('.wav')) {
            try {
              const metadata = await getMetadata(itemRef);
              allFiles.push({ ref: itemRef, metadata });
            } catch (metaError) {
              console.warn(`⚠️ Erro ao obter metadata de ${itemRef.fullPath}:`, metaError.message);
            }
          }
        }
      } catch (subError) {
        console.warn(`⚠️ Erro ao acessar subpasta ${folderRef.fullPath}:`, subError.message);
      }
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    allFiles.sort((a, b) => new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated));
    
    console.log(`\n📊 Total de arquivos de áudio encontrados: ${allFiles.length}`);
    
    // Mostrar os 5 mais recentes
    const recentFiles = allFiles.slice(0, 5);
    
    if (recentFiles.length === 0) {
      console.log('\n📭 Nenhum arquivo de áudio encontrado.');
      return;
    }
    
    console.log('\n🎵 Arquivos de áudio mais recentes:');
    
    recentFiles.forEach((file, index) => {
      const metadata = file.metadata;
      const size = Math.round(metadata.size / 1024);
      const created = new Date(metadata.timeCreated).toLocaleString('pt-BR');
      
      console.log(`\n${index + 1}. 🎵 ${file.ref.fullPath}`);
      console.log(`   📊 Tamanho: ${size} KB`);
      console.log(`   🕒 Criado: ${created}`);
      console.log(`   🎯 Content-Type: ${metadata.contentType || 'N/A'}`);
      
      // Verificar se é OGG/Opus
      if (file.ref.name.toLowerCase().includes('.ogg') || metadata.contentType === 'audio/ogg') {
        console.log(`   ✅ FORMATO OGG DETECTADO!`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar arquivos de áudio:', error);
    console.error('Detalhes do erro:', error.code, error.message);
  }
}



// Função para verificar estrutura de pastas
async function checkAudioFolderStructure() {
  try {
    console.log('\n📂 Verificando estrutura de pastas de áudio...');
    
    const audiosRef = ref(storage, 'audios/');
    const result = await listAll(audiosRef);

    const folders = new Set();
    
    // Verificar pastas diretas
    for (const folderRef of result.prefixes) {
      folders.add(folderRef.name);
      
      // Verificar subpastas
      try {
        const subResult = await listAll(folderRef);
        for (const subFolderRef of subResult.prefixes) {
          folders.add(`${folderRef.name}/${subFolderRef.name}`);
        }
      } catch (subError) {
        console.warn(`⚠️ Erro ao verificar subpasta ${folderRef.fullPath}:`, subError.message);
      }
    }

    console.log(`\n📁 Estrutura de pastas encontrada:`);
    if (folders.size === 0) {
      console.log('   📂 Nenhuma pasta encontrada em audios/');
    } else {
      Array.from(folders).sort().forEach(folder => {
        console.log(`   📂 audios/${folder}/`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  }
}

// Função principal
async function main() {
  console.log('🎧 === TESTE DE ACESSO A ÁUDIOS FIREBASE === 🎧\n');
  
  // Verificar estrutura de pastas
  await checkAudioFolderStructure();
  
  // Listar arquivos recentes
  await listRecentAudioFiles();
  
  console.log('\n✅ Teste concluído com sucesso!');
}

// Executar
main().catch(console.error);
