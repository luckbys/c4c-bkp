// Script para debugar problemas de visualização de arquivos JPG
const { initializeApp } = require('firebase/app');
const { getStorage, ref, getDownloadURL, getMetadata } = require('firebase/storage');
const fs = require('fs');
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

// Função para baixar arquivo e analisar
async function downloadAndAnalyzeFile(url, fileName) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      let totalSize = 0;
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
        totalSize += chunk.length;
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // Salvar arquivo localmente para análise
        const localPath = `./temp_${fileName}`;
        fs.writeFileSync(localPath, buffer);
        
        // Analisar cabeçalho do arquivo
        const header = buffer.slice(0, 20);
        const headerHex = header.toString('hex');
        const headerBytes = Array.from(header);
        
        console.log(`\n📁 Arquivo: ${fileName}`);
        console.log(`📏 Tamanho: ${totalSize} bytes`);
        console.log(`🔍 Cabeçalho (hex): ${headerHex}`);
        console.log(`🔍 Cabeçalho (bytes): [${headerBytes.join(', ')}]`);
        
        // Verificar assinatura de arquivo JPG
        const isValidJPG = (
          headerBytes[0] === 0xFF && 
          headerBytes[1] === 0xD8 && 
          headerBytes[2] === 0xFF
        );
        
        console.log(`✅ Assinatura JPG válida: ${isValidJPG ? 'SIM' : 'NÃO'}`);
        
        if (!isValidJPG) {
          console.log('❌ PROBLEMA: Arquivo não tem assinatura JPG válida');
          
          // Verificar outros formatos
          if (headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4E && headerBytes[3] === 0x47) {
            console.log('🔍 Detectado: PNG');
          } else if (headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46) {
            console.log('🔍 Detectado: GIF');
          } else if (headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x46) {
            console.log('🔍 Detectado: WebP');
          } else {
            console.log('🔍 Formato desconhecido ou arquivo corrompido');
          }
        } else {
          console.log('✅ Arquivo JPG válido');
        }
        
        // Verificar final do arquivo JPG
        const footer = buffer.slice(-10);
        const footerHex = footer.toString('hex');
        console.log(`🔍 Final do arquivo (hex): ${footerHex}`);
        
        const hasValidJPGEnd = buffer[buffer.length - 2] === 0xFF && buffer[buffer.length - 1] === 0xD9;
        console.log(`✅ Final JPG válido: ${hasValidJPGEnd ? 'SIM' : 'NÃO'}`);
        
        resolve({
          fileName,
          size: totalSize,
          isValidJPG,
          hasValidJPGEnd,
          headerHex,
          footerHex,
          localPath
        });
      });
      
    }).on('error', reject);
  });
}

// Função para analisar arquivo específico no Firebase
async function analyzeFirebaseFile(filePath) {
  try {
    console.log(`\n🔍 Analisando arquivo: ${filePath}`);
    
    const fileRef = ref(storage, filePath);
    const metadata = await getMetadata(fileRef);
    const downloadURL = await getDownloadURL(fileRef);
    
    console.log('📋 Metadados:');
    console.log(`   Content-Type: ${metadata.contentType}`);
    console.log(`   Tamanho: ${metadata.size} bytes`);
    console.log(`   Criado: ${metadata.timeCreated}`);
    console.log(`   URL: ${downloadURL}`);
    
    // Baixar e analisar o arquivo
    const analysis = await downloadAndAnalyzeFile(downloadURL, filePath.split('/').pop());
    
    return {
      metadata,
      downloadURL,
      analysis
    };
    
  } catch (error) {
    console.error(`❌ Erro ao analisar ${filePath}:`, error.message);
    return null;
  }
}

// Função para testar URLs específicas
async function testSpecificFiles() {
  console.log('🧪 Testando arquivos JPG específicos...');
  
  // Lista de arquivos para testar (baseado na imagem mostrada)
  const filesToTest = [
    'images/loja/2025/08/28D0C2618F406CD36E906FA079D182FF.enc',
    'images/loja/2025/08/3EB0AE55E4F0CB1D3C2F.jpg',
    'images/loja/2025/08/3EB0A02F39148108B950C0.jpg'
  ];
  
  const results = [];
  
  for (const filePath of filesToTest) {
    const result = await analyzeFirebaseFile(filePath);
    if (result) {
      results.push(result);
    }
  }
  
  // Análise comparativa
  console.log('\n\n=== ANÁLISE COMPARATIVA ===');
  
  const jpgFiles = results.filter(r => r.analysis.isValidJPG);
  const invalidFiles = results.filter(r => !r.analysis.isValidJPG);
  
  console.log(`✅ Arquivos JPG válidos: ${jpgFiles.length}`);
  console.log(`❌ Arquivos inválidos: ${invalidFiles.length}`);
  
  if (invalidFiles.length > 0) {
    console.log('\n⚠️ PROBLEMAS ENCONTRADOS:');
    invalidFiles.forEach(file => {
      console.log(`   - ${file.analysis.fileName}: Não é um JPG válido`);
      console.log(`     Content-Type: ${file.metadata.contentType}`);
      console.log(`     Cabeçalho: ${file.analysis.headerHex.substring(0, 12)}...`);
    });
  }
  
  // Verificar se há padrão nos problemas
  console.log('\n\n=== DIAGNÓSTICO ===');
  
  const encFiles = results.filter(r => r.analysis.fileName.endsWith('.enc'));
  if (encFiles.length > 0) {
    console.log('🔍 Arquivos .enc encontrados:');
    encFiles.forEach(file => {
      console.log(`   - ${file.analysis.fileName}`);
      console.log(`     É JPG válido: ${file.analysis.isValidJPG}`);
      console.log(`     Content-Type: ${file.metadata.contentType}`);
    });
  }
  
  const applicationOctetFiles = results.filter(r => r.metadata.contentType === 'application/octet-stream');
  if (applicationOctetFiles.length > 0) {
    console.log('\n🔍 Arquivos com application/octet-stream:');
    applicationOctetFiles.forEach(file => {
      console.log(`   - ${file.analysis.fileName}`);
      console.log(`     É JPG válido: ${file.analysis.isValidJPG}`);
      console.log(`     Extensão: ${file.analysis.fileName.split('.').pop()}`);
    });
  }
  
  // Recomendações
  console.log('\n\n=== RECOMENDAÇÕES ===');
  
  if (invalidFiles.length > 0) {
    console.log('❌ Problemas de visualização identificados:');
    console.log('   1. Arquivos não são JPG válidos apesar da extensão');
    console.log('   2. Possível corrupção durante upload/processamento');
    console.log('   3. Arquivo pode estar em formato diferente (PNG, WebP, etc.)');
    
    console.log('\n💡 Soluções sugeridas:');
    console.log('   1. Verificar processo de upload da Evolution API');
    console.log('   2. Implementar validação de formato antes do salvamento');
    console.log('   3. Converter arquivos para JPG válido se necessário');
    console.log('   4. Adicionar logs detalhados no processo de upload');
  } else {
    console.log('✅ Todos os arquivos testados são JPG válidos');
    console.log('💡 Problema pode estar na visualização/browser');
  }
  
  return results;
}

// Executar análise
testSpecificFiles().then((results) => {
  console.log('\n🏁 Análise concluída!');
  console.log(`📊 Total de arquivos analisados: ${results.length}`);
  
  // Limpar arquivos temporários
  results.forEach(result => {
    try {
      if (fs.existsSync(result.analysis.localPath)) {
        fs.unlinkSync(result.analysis.localPath);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao limpar ${result.analysis.localPath}:`, error.message);
    }
  });
  
}).catch(error => {
  console.error('❌ Erro na análise:', error);
});

module.exports = {
  analyzeFirebaseFile,
  downloadAndAnalyzeFile,
  testSpecificFiles
};
