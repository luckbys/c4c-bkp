// Script para encontrar arquivos JPG reais no Firebase Storage
const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getMetadata, getDownloadURL } = require('firebase/storage');
const https = require('https');
const http = require('http');

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

// Função para verificar se arquivo é JPG válido
async function checkIfValidJPG(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve({ valid: false, error: `HTTP ${response.statusCode}` });
        return;
      }
      
      let headerReceived = false;
      const headerBuffer = Buffer.alloc(10);
      let headerIndex = 0;
      
      response.on('data', (chunk) => {
        if (!headerReceived && headerIndex < 10) {
          const bytesToCopy = Math.min(chunk.length, 10 - headerIndex);
          chunk.copy(headerBuffer, headerIndex, 0, bytesToCopy);
          headerIndex += bytesToCopy;
          
          if (headerIndex >= 3) {
            // Verificar assinatura JPG: FF D8 FF
            const isValidJPG = (
              headerBuffer[0] === 0xFF && 
              headerBuffer[1] === 0xD8 && 
              headerBuffer[2] === 0xFF
            );
            
            headerReceived = true;
            req.destroy(); // Parar download
            resolve({ 
              valid: isValidJPG, 
              header: headerBuffer.slice(0, headerIndex).toString('hex')
            });
          }
        }
      });
      
      response.on('end', () => {
        if (!headerReceived) {
          resolve({ valid: false, error: 'Arquivo muito pequeno' });
        }
      });
      
    });
    
    req.on('error', (error) => {
      resolve({ valid: false, error: error.message });
    });
    
    // Timeout de 5 segundos
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ valid: false, error: 'Timeout' });
    });
  });
}

// Função para listar arquivos JPG recentes
async function findRecentJPGFiles() {
  console.log('🔍 Buscando arquivos JPG no Firebase Storage...');
  
  const jpgFiles = [];
  
  try {
    // Verificar pasta de imagens
    const imagesRef = ref(storage, 'images');
    const imagesResult = await listAll(imagesRef);
    
    // Verificar subpastas (instâncias)
    for (const instanceRef of imagesResult.prefixes) {
      console.log(`📁 Verificando instância: ${instanceRef.name}`);
      
      const instanceResult = await listAll(instanceRef);
      
      // Verificar subpastas de ano
      for (const yearRef of instanceResult.prefixes) {
        const yearResult = await listAll(yearRef);
        
        // Verificar subpastas de mês
        for (const monthRef of yearResult.prefixes) {
          const monthResult = await listAll(monthRef);
          
          // Verificar arquivos JPG
          for (const fileRef of monthResult.items) {
            if (fileRef.name.toLowerCase().endsWith('.jpg') || fileRef.name.toLowerCase().endsWith('.jpeg')) {
              try {
                const metadata = await getMetadata(fileRef);
                jpgFiles.push({
                  name: fileRef.name,
                  fullPath: fileRef.fullPath,
                  contentType: metadata.contentType,
                  size: metadata.size,
                  timeCreated: new Date(metadata.timeCreated)
                });
              } catch (error) {
                console.log(`   ⚠️ Erro ao obter metadados de ${fileRef.name}:`, error.message);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error.message);
  }
  
  return jpgFiles;
}

// Função principal
async function analyzeJPGFiles() {
  console.log('🚀 Iniciando análise de arquivos JPG...');
  
  // 1. Encontrar arquivos JPG
  const jpgFiles = await findRecentJPGFiles();
  
  console.log(`\n📊 Encontrados ${jpgFiles.length} arquivos JPG`);
  
  if (jpgFiles.length === 0) {
    console.log('❌ Nenhum arquivo JPG encontrado!');
    return;
  }
  
  // 2. Ordenar por data (mais recente primeiro)
  jpgFiles.sort((a, b) => b.timeCreated - a.timeCreated);
  
  // 3. Analisar os 10 mais recentes
  const filesToAnalyze = jpgFiles.slice(0, 10);
  
  console.log('\n🔍 Analisando os 10 arquivos JPG mais recentes...');
  
  const results = [];
  
  for (let i = 0; i < filesToAnalyze.length; i++) {
    const file = filesToAnalyze[i];
    console.log(`\n${i + 1}. ${file.name}`);
    console.log(`   📁 Caminho: ${file.fullPath}`);
    console.log(`   📄 Content-Type: ${file.contentType}`);
    console.log(`   📏 Tamanho: ${file.size} bytes`);
    console.log(`   🕐 Criado: ${file.timeCreated.toLocaleString('pt-BR')}`);
    
    try {
      // Obter URL de download
      const fileRef = ref(storage, file.fullPath);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Verificar se é JPG válido
      const jpgCheck = await checkIfValidJPG(downloadURL);
      
      console.log(`   ✅ JPG válido: ${jpgCheck.valid ? 'SIM' : 'NÃO'}`);
      if (!jpgCheck.valid) {
        console.log(`   ❌ Problema: ${jpgCheck.error || 'Assinatura inválida'}`);
        if (jpgCheck.header) {
          console.log(`   🔍 Cabeçalho: ${jpgCheck.header}`);
        }
      }
      
      results.push({
        ...file,
        downloadURL,
        isValidJPG: jpgCheck.valid,
        jpgCheck
      });
      
    } catch (error) {
      console.log(`   ❌ Erro ao analisar: ${error.message}`);
      results.push({
        ...file,
        isValidJPG: false,
        error: error.message
      });
    }
  }
  
  // 4. Análise dos resultados
  console.log('\n\n=== RESUMO DA ANÁLISE ===');
  
  const validJPGs = results.filter(r => r.isValidJPG);
  const invalidJPGs = results.filter(r => !r.isValidJPG);
  
  console.log(`✅ Arquivos JPG válidos: ${validJPGs.length}/${results.length}`);
  console.log(`❌ Arquivos JPG inválidos: ${invalidJPGs.length}/${results.length}`);
  
  if (validJPGs.length > 0) {
    console.log('\n✅ ARQUIVOS VÁLIDOS:');
    validJPGs.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
      console.log(`      Content-Type: ${file.contentType}`);
      console.log(`      URL: ${file.downloadURL}`);
    });
  }
  
  if (invalidJPGs.length > 0) {
    console.log('\n❌ ARQUIVOS INVÁLIDOS:');
    invalidJPGs.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
      console.log(`      Content-Type: ${file.contentType}`);
      console.log(`      Problema: ${file.jpgCheck?.error || file.error || 'Assinatura inválida'}`);
      if (file.jpgCheck?.header) {
        console.log(`      Cabeçalho: ${file.jpgCheck.header}`);
      }
    });
  }
  
  // 5. Análise de padrões
  console.log('\n\n=== ANÁLISE DE PADRÕES ===');
  
  const octetStreamFiles = results.filter(r => r.contentType === 'application/octet-stream');
  if (octetStreamFiles.length > 0) {
    console.log(`🔍 Arquivos com application/octet-stream: ${octetStreamFiles.length}`);
    const validOctetStream = octetStreamFiles.filter(r => r.isValidJPG).length;
    console.log(`   Válidos: ${validOctetStream}/${octetStreamFiles.length}`);
  }
  
  const imageJpegFiles = results.filter(r => r.contentType === 'image/jpeg');
  if (imageJpegFiles.length > 0) {
    console.log(`🔍 Arquivos com image/jpeg: ${imageJpegFiles.length}`);
    const validImageJpeg = imageJpegFiles.filter(r => r.isValidJPG).length;
    console.log(`   Válidos: ${validImageJpeg}/${imageJpegFiles.length}`);
  }
  
  // 6. Recomendações
  console.log('\n\n=== RECOMENDAÇÕES ===');
  
  if (invalidJPGs.length === 0) {
    console.log('✅ Todos os arquivos JPG são válidos!');
    console.log('💡 O problema pode estar na visualização do browser ou cache');
  } else {
    const percentageInvalid = (invalidJPGs.length / results.length) * 100;
    console.log(`⚠️ ${percentageInvalid.toFixed(1)}% dos arquivos JPG são inválidos`);
    
    if (percentageInvalid > 50) {
      console.log('🚨 PROBLEMA CRÍTICO: Mais da metade dos arquivos são inválidos');
      console.log('💡 Sugestões:');
      console.log('   1. Verificar processo de upload da Evolution API');
      console.log('   2. Implementar validação de formato no servidor');
      console.log('   3. Adicionar conversão automática para JPG válido');
    } else {
      console.log('⚠️ Problema moderado com alguns arquivos');
      console.log('💡 Sugestões:');
      console.log('   1. Investigar casos específicos de falha');
      console.log('   2. Melhorar tratamento de content-types genéricos');
    }
  }
  
  return results;
}

// Executar análise
analyzeJPGFiles().then((results) => {
  console.log('\n🏁 Análise concluída!');
}).catch(error => {
  console.error('❌ Erro na análise:', error);
});

module.exports = {
  findRecentJPGFiles,
  checkIfValidJPG,
  analyzeJPGFiles
};
