/**
 * Teste simples da função de validação de imagens
 */

/**
 * Valida se o buffer contém dados de imagem válidos
 */
function validateImageBuffer(buffer, expectedType) {
  const uint8Array = new Uint8Array(buffer);
  
  // Verificar se o buffer tem tamanho mínimo
  if (buffer.byteLength < 10) {
    return { isValid: false, error: 'Arquivo muito pequeno' };
  }
  
  // Verificar assinaturas de formato
  const signatures = {
    jpg: uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF,
    jpeg: uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF,
    png: uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47,
    gif: uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46,
    webp: uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50,
    bmp: uint8Array[0] === 0x42 && uint8Array[1] === 0x4D
  };
  
  const detectedType = Object.keys(signatures).find(format => signatures[format]);
  
  if (!detectedType) {
    // Verificar se é texto/HTML (erro comum)
    const textStart = new TextDecoder().decode(uint8Array.slice(0, 100));
    if (textStart.includes('<html') || textStart.includes('<!DOCTYPE') || textStart.includes('<?xml')) {
      return { isValid: false, error: 'Arquivo contém HTML/XML em vez de imagem' };
    }
    
    return { isValid: false, error: 'Formato de imagem não reconhecido' };
  }
  
  // Verificar se o tipo detectado é compatível com o esperado
  const normalizedExpected = expectedType.toLowerCase().replace('image/', '');
  const isCompatible = detectedType === normalizedExpected || 
                      (detectedType === 'jpg' && normalizedExpected === 'jpeg') ||
                      (detectedType === 'jpeg' && normalizedExpected === 'jpg');
  
  return {
    isValid: true,
    detectedType,
    error: isCompatible ? undefined : `Tipo detectado (${detectedType}) não corresponde ao esperado (${normalizedExpected})`
  };
}

/**
 * Testa a validação com arquivos reais baixados
 */
async function testValidationWithRealFiles() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('🧪 Testando validação com arquivos reais...');
  
  const samplesDir = path.join(__dirname, 'downloaded-samples');
  
  if (!fs.existsSync(samplesDir)) {
    console.log('❌ Diretório de amostras não encontrado:', samplesDir);
    return;
  }
  
  const files = fs.readdirSync(samplesDir);
  console.log(`📁 Encontrados ${files.length} arquivos para teste`);
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(samplesDir, file);
    const stats = fs.statSync(filePath);
    
    if (!stats.isFile()) continue;
    
    console.log(`\n📋 Testando: ${file}`);
    
    try {
      const buffer = fs.readFileSync(filePath);
      const expectedType = file.includes('jpg') ? 'image/jpeg' : 'image/jpeg'; // Assumir JPG por padrão
      
      const validation = validateImageBuffer(buffer, expectedType);
      
      console.log('📊 Resultado:', {
        arquivo: file,
        tamanho: `${buffer.length} bytes`,
        válido: validation.isValid,
        tipoDetectado: validation.detectedType,
        erro: validation.error
      });
      
      results.push({
        file,
        size: buffer.length,
        isValid: validation.isValid,
        detectedType: validation.detectedType,
        error: validation.error
      });
      
    } catch (error) {
      console.log('❌ Erro ao processar arquivo:', error.message);
      results.push({
        file,
        isValid: false,
        error: `Erro de leitura: ${error.message}`
      });
    }
  }
  
  // Resumo
  console.log('\n📊 RESUMO DA VALIDAÇÃO:');
  console.log('=' .repeat(50));
  
  const valid = results.filter(r => r.isValid).length;
  const invalid = results.filter(r => !r.isValid).length;
  const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);
  
  console.log(`✅ Arquivos válidos: ${valid}/${results.length} (${Math.round(valid/results.length*100)}%)`);
  console.log(`❌ Arquivos inválidos: ${invalid}/${results.length} (${Math.round(invalid/results.length*100)}%)`);
  console.log(`📦 Tamanho total: ${Math.round(totalSize/1024)} KB`);
  
  // Tipos detectados
  const typeCount = {};
  results.forEach(r => {
    if (r.detectedType) {
      typeCount[r.detectedType] = (typeCount[r.detectedType] || 0) + 1;
    }
  });
  
  if (Object.keys(typeCount).length > 0) {
    console.log('\n🔍 Tipos detectados:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} arquivo(s)`);
    });
  }
  
  // Erros mais comuns
  const errorCount = {};
  results.filter(r => r.error).forEach(r => {
    errorCount[r.error] = (errorCount[r.error] || 0) + 1;
  });
  
  if (Object.keys(errorCount).length > 0) {
    console.log('\n⚠️ Erros mais comuns:');
    Object.entries(errorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .forEach(([error, count]) => {
        console.log(`  ${error}: ${count} arquivo(s)`);
      });
  }
  
  return results;
}

/**
 * Testa a validação com dados simulados
 */
function testValidationWithSimulatedData() {
  console.log('\n🧪 Testando validação com dados simulados...');
  
  const testCases = [
    {
      name: 'JPG válido',
      data: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
      expectedType: 'image/jpeg',
      shouldBeValid: true
    },
    {
      name: 'PNG válido',
      data: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]),
      expectedType: 'image/png',
      shouldBeValid: true
    },
    {
      name: 'HTML em vez de imagem',
      data: new TextEncoder().encode('<!DOCTYPE html><html><head>'),
      expectedType: 'image/jpeg',
      shouldBeValid: false
    },
    {
      name: 'Dados aleatórios',
      data: new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x11, 0x22]),
      expectedType: 'image/jpeg',
      shouldBeValid: false
    },
    {
      name: 'Arquivo muito pequeno',
      data: new Uint8Array([0xFF, 0xD8]),
      expectedType: 'image/jpeg',
      shouldBeValid: false
    }
  ];
  
  let passed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 Teste ${index + 1}: ${testCase.name}`);
    
    const result = validateImageBuffer(testCase.data.buffer, testCase.expectedType);
    const success = result.isValid === testCase.shouldBeValid;
    
    console.log(`${success ? '✅' : '❌'} Resultado:`, {
      válido: result.isValid,
      esperado: testCase.shouldBeValid,
      tipoDetectado: result.detectedType,
      erro: result.error
    });
    
    if (success) passed++;
  });
  
  console.log(`\n📊 Testes simulados: ${passed}/${testCases.length} passaram`);
  return passed === testCases.length;
}

// Executar testes
if (require.main === module) {
  async function runAllTests() {
    console.log('🚀 Iniciando testes de validação...');
    
    // Teste com dados simulados
    const simulatedTestsPassed = testValidationWithSimulatedData();
    
    // Teste com arquivos reais
    await testValidationWithRealFiles();
    
    console.log('\n🏁 Testes concluídos');
    
    if (simulatedTestsPassed) {
      console.log('✅ Sistema de validação funcionando corretamente!');
    } else {
      console.log('❌ Sistema de validação com problemas');
    }
  }
  
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Erro nos testes:', error);
      process.exit(1);
    });
}

module.exports = { validateImageBuffer, testValidationWithRealFiles };
