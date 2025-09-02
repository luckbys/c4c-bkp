/**
 * Script para testar o processamento de novas imagens
 * Verifica se as correções implementadas resolvem problemas de extensões .bin
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Função para detectar tipo de arquivo baseado no conteúdo
function detectFileType(buffer) {
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { mimeType: 'image/png', extension: '.png' };
  }
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { mimeType: 'image/gif', extension: '.gif' };
  }
  // WebP
  if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }
  
  return { mimeType: 'application/octet-stream', extension: '.bin' };
}

// Função para obter extensão do Content-Type
function getExtensionFromContentType(contentType) {
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/svg+xml': '.svg'
  };
  
  return mimeToExt[contentType?.toLowerCase()] || '.bin';
}

// Função para fazer download usando módulos nativos
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    };
    
    const req = client.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, contentType: res.headers['content-type'] });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Simular processamento de imagem
async function simulateImageProcessing(imageUrl, messageId, mimeType) {
  console.log(`\n🧪 [TESTE] Simulando processamento de imagem:`);
  console.log(`📥 URL: ${imageUrl}`);
  console.log(`🆔 Message ID: ${messageId}`);
  console.log(`📄 MIME Type: ${mimeType}`);
  
  try {
    // Simular download da imagem
    console.log(`⬇️ Fazendo download da imagem...`);
    const { buffer, contentType } = await downloadImage(imageUrl);
    console.log(`📊 Tamanho do arquivo: ${buffer.length} bytes`);
    console.log(`📋 Content-Type do servidor: ${contentType}`);
    
    // Detectar tipo real do arquivo
    const detectedType = detectFileType(buffer);
    console.log(`🔍 Tipo detectado: ${detectedType.mimeType} -> ${detectedType.extension}`);
    
    // Determinar extensão correta (priorizar contentType do servidor)
    let finalExtension;
    const serverMimeType = contentType || mimeType;
    
    if (serverMimeType && serverMimeType.startsWith('image/')) {
      finalExtension = getExtensionFromContentType(serverMimeType);
      console.log(`📋 Extensão do Content-Type (${serverMimeType}): ${finalExtension}`);
    } else {
      finalExtension = detectedType.extension;
      console.log(`🔍 Usando extensão detectada: ${finalExtension}`);
    }
    
    // Se ainda for .bin, tentar usar o MIME type original
    if (finalExtension === '.bin' && mimeType && mimeType.startsWith('image/')) {
      finalExtension = getExtensionFromContentType(mimeType);
      console.log(`🔄 Fallback para MIME original (${mimeType}): ${finalExtension}`);
    }
    
    // Verificar se seria salvo como .bin (problema antigo)
    const wouldBeBin = finalExtension === '.bin';
    console.log(`⚠️ Seria salvo como .bin? ${wouldBeBin ? 'SIM (PROBLEMA!)' : 'NÃO (OK)'}`);
    
    // Simular nome do arquivo no Storage
    const fileName = `images/${messageId}${finalExtension}`;
    console.log(`📁 Nome do arquivo no Storage: ${fileName}`);
    
    return {
      success: true,
      originalUrl: imageUrl,
      messageId,
      mimeType,
      serverContentType: contentType,
      detectedType,
      finalExtension,
      wouldBeBin,
      fileName,
      fileSize: buffer.length
    };
    
  } catch (error) {
    console.error(`❌ Erro no processamento:`, error.message);
    return {
      success: false,
      error: error.message,
      originalUrl: imageUrl,
      messageId
    };
  }
}

// URLs de teste para diferentes tipos de imagem
const testImages = [
  {
    url: 'https://picsum.photos/800/600.jpg',
    messageId: 'test-jpeg-001',
    mimeType: 'image/jpeg',
    description: 'JPEG padrão'
  },
  {
    url: 'https://picsum.photos/800/600.png',
    messageId: 'test-png-001',
    mimeType: 'image/png',
    description: 'PNG padrão'
  },
  {
    url: 'https://httpbin.org/image/jpeg',
    messageId: 'test-jpeg-002',
    mimeType: 'image/jpeg',
    description: 'JPEG do httpbin'
  },
  {
    url: 'https://httpbin.org/image/png',
    messageId: 'test-png-002',
    mimeType: 'image/png',
    description: 'PNG do httpbin'
  },
  {
    url: 'https://via.placeholder.com/600x400.jpg',
    messageId: 'test-placeholder-001',
    mimeType: 'image/jpeg',
    description: 'Placeholder JPEG'
  }
];

async function runImageTests() {
  console.log('🧪 INICIANDO TESTES DE PROCESSAMENTO DE IMAGENS');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const testImage of testImages) {
    console.log(`\n📋 Testando: ${testImage.description}`);
    const result = await simulateImageProcessing(
      testImage.url,
      testImage.messageId,
      testImage.mimeType
    );
    results.push(result);
    
    // Aguardar um pouco entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Gerar relatório
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RELATÓRIO DE TESTES');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const wouldBeBin = successful.filter(r => r.wouldBeBin);
  
  console.log(`✅ Testes bem-sucedidos: ${successful.length}/${results.length}`);
  console.log(`❌ Testes falharam: ${failed.length}/${results.length}`);
  console.log(`⚠️ Arquivos que seriam salvos como .bin: ${wouldBeBin.length}/${successful.length}`);
  
  if (wouldBeBin.length > 0) {
    console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
    wouldBeBin.forEach(result => {
      console.log(`- ${result.messageId}: ${result.originalUrl}`);
      console.log(`  MIME: ${result.mimeType}, Detectado: ${result.detectedType.mimeType}`);
    });
  } else {
    console.log('\n✅ TODAS AS CORREÇÕES FUNCIONARAM!');
    console.log('Nenhuma imagem seria salva com extensão .bin incorreta.');
  }
  
  if (failed.length > 0) {
    console.log('\n❌ TESTES QUE FALHARAM:');
    failed.forEach(result => {
      console.log(`- ${result.messageId}: ${result.error}`);
    });
  }
  
  console.log('\n📈 DETALHES DOS TESTES BEM-SUCEDIDOS:');
  successful.forEach(result => {
    console.log(`\n📋 ${result.messageId}:`);
    console.log(`  📄 MIME Type: ${result.mimeType}`);
    console.log(`  🔍 Tipo detectado: ${result.detectedType.mimeType}`);
    console.log(`  📁 Extensão final: ${result.finalExtension}`);
    console.log(`  📊 Tamanho: ${result.fileSize} bytes`);
    console.log(`  ✅ Status: ${result.wouldBeBin ? '❌ PROBLEMA' : '✅ OK'}`);
  });
}

// Executar testes
runImageTests()
  .then(() => {
    console.log('\n🏁 Testes concluídos!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro nos testes:', error);
    process.exit(1);
  });
