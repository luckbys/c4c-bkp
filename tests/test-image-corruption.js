// Script para testar corrupção de imagens durante o processo de upload
const { initializeApp } = require('firebase/app');
const { getStorage, ref, getDownloadURL, getMetadata } = require('firebase/storage');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

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
async function downloadAndAnalyze(url, fileName) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    console.log(`\n🔍 Analisando: ${fileName}`);
    console.log(`📥 URL: ${url}`);
    
    const req = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.log(`❌ HTTP ${response.statusCode}: ${response.statusText}`);
        resolve({
          fileName,
          success: false,
          error: `HTTP ${response.statusCode}`,
          contentType: response.headers['content-type']
        });
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
        const contentType = response.headers['content-type'] || 'unknown';
        
        console.log(`📊 Tamanho: ${totalSize} bytes`);
        console.log(`📄 Content-Type: ${contentType}`);
        
        // Analisar cabeçalho do arquivo
        const header = buffer.slice(0, 16);
        const headerHex = header.toString('hex');
        
        console.log(`🔍 Cabeçalho (hex): ${headerHex}`);
        console.log(`🔍 Cabeçalho (bytes): [${Array.from(header).join(', ')}]`);
        
        // Verificar assinaturas de formato
        const signatures = {
          jpg: buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF,
          png: buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47,
          gif: buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46,
          webp: buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50,
          pdf: buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
        };
        
        const detectedFormat = Object.keys(signatures).find(format => signatures[format]);
        
        console.log(`🎯 Formato detectado: ${detectedFormat || 'DESCONHECIDO'}`);
        
        // Verificar se é texto/HTML (erro comum)
        const isText = buffer.slice(0, 100).toString('utf8').includes('<html') || 
                      buffer.slice(0, 100).toString('utf8').includes('<!DOCTYPE');
        
        if (isText) {
          console.log(`⚠️ ARQUIVO É HTML/TEXTO:`);
          console.log(buffer.slice(0, 200).toString('utf8'));
        }
        
        // Salvar arquivo para análise manual (apenas primeiros arquivos)
        const outputDir = './downloaded-samples';
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const extension = detectedFormat || 'unknown';
        const outputPath = path.join(outputDir, `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`);
        
        try {
          fs.writeFileSync(outputPath, buffer);
          console.log(`💾 Arquivo salvo: ${outputPath}`);
        } catch (saveError) {
          console.log(`❌ Erro ao salvar: ${saveError.message}`);
        }
        
        resolve({
          fileName,
          success: true,
          size: totalSize,
          contentType,
          detectedFormat,
          isValidImage: !!detectedFormat && ['jpg', 'png', 'gif', 'webp'].includes(detectedFormat),
          isText,
          headerHex,
          savedPath: outputPath
        });
      });
      
    });
    
    req.on('error', (error) => {
      console.log(`❌ Erro na requisição: ${error.message}`);
      resolve({
        fileName,
        success: false,
        error: error.message
      });
    });
    
    // Timeout de 10 segundos
    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`❌ Timeout na requisição`);
      resolve({
        fileName,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

// Função principal para testar corrupção
async function testImageCorruption() {
  console.log('🚀 TESTE DE CORRUPÇÃO DE IMAGENS');
  console.log('=====================================\n');
  
  // Lista de arquivos problemáticos identificados anteriormente
  const problematicFiles = [
    'images/loja/2025/08/6340435368E56248CCE89C3959FD54F4.jpg',
    'images/loja/2025/08/3EB0617F614E2A6514D9BE.jpg',
    'images/loja/2025/08/3EB06995B20E1D6782104E.jpg',
    'images/loja/2025/08/3EB04E65EE4F0CFBD5C23F.jpg',
    'images/loja/2025/08/3EB0A02F5914B158B955C0.jpg'
  ];
  
  // Lista de arquivos válidos para comparação
  const validFiles = [
    'images/teste/2025/08/test-1755571255830.jpg',
    'images/teste/2025/08/test-1755571255831.jpg'
  ];
  
  const allFiles = [...problematicFiles, ...validFiles];
  const results = [];
  
  console.log(`📋 Testando ${allFiles.length} arquivos...\n`);
  
  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    const fileName = path.basename(filePath);
    
    try {
      // Obter URL de download do Firebase
      const fileRef = ref(storage, filePath);
      const downloadURL = await getDownloadURL(fileRef);
      const metadata = await getMetadata(fileRef);
      
      console.log(`\n${i + 1}/${allFiles.length} - ${fileName}`);
      console.log(`📁 Caminho: ${filePath}`);
      console.log(`📄 Content-Type no Storage: ${metadata.contentType}`);
      console.log(`📏 Tamanho no Storage: ${metadata.size} bytes`);
      console.log(`🕐 Criado: ${new Date(metadata.timeCreated).toLocaleString('pt-BR')}`);
      
      // Baixar e analisar
      const analysis = await downloadAndAnalyze(downloadURL, fileName);
      
      results.push({
        filePath,
        fileName,
        storageContentType: metadata.contentType,
        storageSize: metadata.size,
        timeCreated: metadata.timeCreated,
        downloadURL,
        ...analysis
      });
      
    } catch (error) {
      console.log(`\n${i + 1}/${allFiles.length} - ${fileName}`);
      console.log(`❌ Erro ao acessar arquivo: ${error.message}`);
      
      results.push({
        filePath,
        fileName,
        success: false,
        error: error.message
      });
    }
  }
  
  // Análise dos resultados
  console.log('\n\n🔍 ANÁLISE DOS RESULTADOS');
  console.log('==========================\n');
  
  const validImages = results.filter(r => r.success && r.isValidImage);
  const corruptedImages = results.filter(r => r.success && !r.isValidImage);
  const failedDownloads = results.filter(r => !r.success);
  
  console.log(`✅ Imagens válidas: ${validImages.length}`);
  console.log(`❌ Imagens corrompidas: ${corruptedImages.length}`);
  console.log(`🚫 Falhas no download: ${failedDownloads.length}`);
  
  if (validImages.length > 0) {
    console.log('\n✅ IMAGENS VÁLIDAS:');
    validImages.forEach((img, index) => {
      console.log(`   ${index + 1}. ${img.fileName}`);
      console.log(`      Formato: ${img.detectedFormat}`);
      console.log(`      Tamanho: ${img.size} bytes`);
      console.log(`      Content-Type: ${img.contentType}`);
    });
  }
  
  if (corruptedImages.length > 0) {
    console.log('\n❌ IMAGENS CORROMPIDAS:');
    corruptedImages.forEach((img, index) => {
      console.log(`   ${index + 1}. ${img.fileName}`);
      console.log(`      Content-Type no Storage: ${img.storageContentType}`);
      console.log(`      Content-Type no Download: ${img.contentType}`);
      console.log(`      Tamanho: ${img.size} bytes`);
      console.log(`      Cabeçalho: ${img.headerHex}`);
      console.log(`      É texto: ${img.isText ? 'SIM' : 'NÃO'}`);
      console.log(`      Arquivo salvo: ${img.savedPath}`);
    });
  }
  
  if (failedDownloads.length > 0) {
    console.log('\n🚫 FALHAS NO DOWNLOAD:');
    failedDownloads.forEach((img, index) => {
      console.log(`   ${index + 1}. ${img.fileName}`);
      console.log(`      Erro: ${img.error}`);
    });
  }
  
  // Análise de padrões
  console.log('\n\n📊 ANÁLISE DE PADRÕES');
  console.log('======================\n');
  
  // Padrão de Content-Type
  const contentTypes = {};
  results.filter(r => r.success).forEach(r => {
    const ct = r.storageContentType || 'unknown';
    contentTypes[ct] = (contentTypes[ct] || 0) + 1;
  });
  
  console.log('📄 Content-Types no Storage:');
  Object.entries(contentTypes).forEach(([ct, count]) => {
    const validCount = results.filter(r => r.storageContentType === ct && r.isValidImage).length;
    console.log(`   ${ct}: ${count} arquivos (${validCount} válidos)`);
  });
  
  // Padrão de tamanho
  const sizes = results.filter(r => r.success && r.size).map(r => r.size);
  if (sizes.length > 0) {
    const avgSize = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    
    console.log('\n📏 Análise de tamanhos:');
    console.log(`   Tamanho médio: ${avgSize} bytes`);
    console.log(`   Menor arquivo: ${minSize} bytes`);
    console.log(`   Maior arquivo: ${maxSize} bytes`);
    
    // Arquivos muito pequenos podem estar corrompidos
    const smallFiles = results.filter(r => r.success && r.size && r.size < 1000);
    if (smallFiles.length > 0) {
      console.log(`   ⚠️ Arquivos suspeitos (< 1KB): ${smallFiles.length}`);
      smallFiles.forEach(f => {
        console.log(`      - ${f.fileName}: ${f.size} bytes`);
      });
    }
  }
  
  // Recomendações
  console.log('\n\n💡 RECOMENDAÇÕES');
  console.log('=================\n');
  
  if (corruptedImages.length === 0) {
    console.log('✅ Nenhuma imagem corrompida encontrada!');
    console.log('   O problema pode estar na visualização do browser.');
  } else {
    const corruptionRate = (corruptedImages.length / results.filter(r => r.success).length) * 100;
    console.log(`⚠️ Taxa de corrupção: ${corruptionRate.toFixed(1)}%`);
    
    if (corruptedImages.some(img => img.isText)) {
      console.log('🚨 PROBLEMA CRÍTICO: Alguns arquivos são HTML/texto em vez de imagens!');
      console.log('   Isso indica que a Evolution API está retornando páginas de erro.');
      console.log('   Verifique:');
      console.log('   1. Configuração da Evolution API');
      console.log('   2. Autenticação e permissões');
      console.log('   3. URLs de mídia sendo geradas');
    }
    
    if (corruptedImages.some(img => img.storageContentType === 'application/octet-stream')) {
      console.log('⚠️ Arquivos com Content-Type genérico detectados.');
      console.log('   Implementar validação de formato antes do upload.');
    }
    
    console.log('\n🔧 Ações sugeridas:');
    console.log('   1. Verificar logs da Evolution API durante upload');
    console.log('   2. Implementar validação de formato de arquivo');
    console.log('   3. Adicionar retry com validação de integridade');
    console.log('   4. Monitorar URLs de mídia geradas pela Evolution API');
  }
  
  console.log('\n🏁 Análise concluída!');
  console.log(`📁 Arquivos de amostra salvos em: ./downloaded-samples/`);
  
  return results;
}

// Executar teste
testImageCorruption().then((results) => {
  console.log('\n✅ Teste concluído com sucesso!');
}).catch(error => {
  console.error('❌ Erro durante o teste:', error);
});

module.exports = {
  testImageCorruption,
  downloadAndAnalyze
};
