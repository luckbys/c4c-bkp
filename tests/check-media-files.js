// Script para verificar arquivos de mídia no Firebase Storage
const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getMetadata, getDownloadURL } = require('firebase/storage');

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

async function checkMediaFiles() {
  console.log('🔍 Verificando arquivos de mídia no Firebase Storage...');
  
  try {
    // Verificar pasta raiz para listar todas as pastas disponíveis
    console.log('\n📁 Listando pastas na raiz do Storage:');
    const rootRef = ref(storage, '');
    const rootList = await listAll(rootRef);
    
    console.log(`Pastas encontradas: ${rootList.prefixes.length}`);
    for (const folderRef of rootList.prefixes) {
      console.log(`  📂 ${folderRef.name}`);
    }
    
    console.log(`Arquivos na raiz: ${rootList.items.length}`);
    for (const itemRef of rootList.items) {
      console.log(`  📄 ${itemRef.name}`);
    }
    
    // Verificar pasta 'media' especificamente
    console.log('\n📁 Verificando pasta "media":');
    try {
      const mediaRef = ref(storage, 'media');
      const mediaList = await listAll(mediaRef);
      
      console.log(`Subpastas em media: ${mediaList.prefixes.length}`);
      for (const folderRef of mediaList.prefixes) {
        console.log(`  📂 media/${folderRef.name}`);
        
        // Listar arquivos em cada subpasta
        try {
          const subfolderList = await listAll(folderRef);
          console.log(`    Arquivos: ${subfolderList.items.length}`);
          
          // Analisar alguns arquivos
          for (const itemRef of subfolderList.items.slice(0, 5)) {
            try {
              const metadata = await getMetadata(itemRef);
              console.log(`    📄 ${itemRef.name}`);
              console.log(`       Tamanho: ${metadata.size} bytes`);
              console.log(`       Content-Type: ${metadata.contentType}`);
              console.log(`       Criado: ${metadata.timeCreated}`);
              
              // Tentar obter URL de download
              try {
                const downloadURL = await getDownloadURL(itemRef);
                console.log(`       ✅ URL gerada com sucesso`);
                
                // Testar acesso à URL
                const response = await fetch(downloadURL, { method: 'HEAD' });
                console.log(`       📊 Status HTTP: ${response.status}`);
                
                if (response.ok) {
                  console.log(`       ✅ Arquivo acessível`);
                } else {
                  console.log(`       ❌ Arquivo não acessível: ${response.statusText}`);
                }
              } catch (urlError) {
                console.log(`       ❌ Erro ao gerar URL: ${urlError.message}`);
              }
              
            } catch (metaError) {
              console.log(`    ❌ Erro ao obter metadata de ${itemRef.name}: ${metaError.message}`);
            }
          }
        } catch (subError) {
          console.log(`    ❌ Erro ao listar ${folderRef.name}: ${subError.message}`);
        }
      }
      
      console.log(`Arquivos diretos em media: ${mediaList.items.length}`);
      for (const itemRef of mediaList.items.slice(0, 10)) {
        try {
          const metadata = await getMetadata(itemRef);
          console.log(`  📄 ${itemRef.name}`);
          console.log(`     Tamanho: ${metadata.size} bytes`);
          console.log(`     Content-Type: ${metadata.contentType}`);
          
          // Verificar se é um arquivo de imagem válido
          if (metadata.contentType && metadata.contentType.startsWith('image/')) {
            try {
              const downloadURL = await getDownloadURL(itemRef);
              const response = await fetch(downloadURL, { method: 'HEAD' });
              
              if (response.ok) {
                console.log(`     ✅ Imagem acessível`);
              } else {
                console.log(`     ❌ Imagem não acessível: ${response.status}`);
              }
            } catch (testError) {
              console.log(`     ❌ Erro ao testar imagem: ${testError.message}`);
            }
          }
          
        } catch (error) {
          console.log(`  ❌ Erro ao analisar ${itemRef.name}: ${error.message}`);
        }
      }
      
    } catch (mediaError) {
      console.log(`❌ Erro ao acessar pasta media: ${mediaError.message}`);
    }
    
    // Verificar outras pastas que podem conter arquivos
    const foldersToCheck = ['images', 'avatars', 'temp'];
    
    for (const folderName of foldersToCheck) {
      console.log(`\n📁 Verificando pasta "${folderName}":`);
      try {
        const folderRef = ref(storage, folderName);
        const folderList = await listAll(folderRef);
        
        console.log(`Subpastas: ${folderList.prefixes.length}`);
        console.log(`Arquivos: ${folderList.items.length}`);
        
        if (folderList.items.length > 0) {
          console.log('Primeiros arquivos:');
          for (const itemRef of folderList.items.slice(0, 3)) {
            try {
              const metadata = await getMetadata(itemRef);
              console.log(`  📄 ${itemRef.name} (${metadata.size} bytes, ${metadata.contentType})`);
            } catch (error) {
              console.log(`  ❌ ${itemRef.name}: ${error.message}`);
            }
          }
        }
        
      } catch (error) {
        console.log(`❌ Erro ao acessar pasta ${folderName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkMediaFiles().then(() => {
  console.log('\n🏁 Verificação concluída!');
}).catch(error => {
  console.error('❌ Erro na verificação:', error);
});

module.exports = { checkMediaFiles };
