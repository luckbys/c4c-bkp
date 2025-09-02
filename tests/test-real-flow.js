// Teste do fluxo real de processamento de imagem (JavaScript puro)
const fs = require('fs');
const path = require('path');

// Função de validação de imagem (copiada do TypeScript)
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

// Simular o processamento de uma imagem real
async function testRealImageFlow() {
  console.log('=== TESTE DO FLUXO REAL DE PROCESSAMENTO ===\n');
  
  try {
    // Testar com arquivos da pasta downloaded-samples
    const samplesDir = path.join(__dirname, 'downloaded-samples');
    
    if (!fs.existsSync(samplesDir)) {
      console.log('❌ Pasta downloaded-samples não encontrada');
      return;
    }
    
    const files = fs.readdirSync(samplesDir);
    console.log(`📁 Arquivos encontrados: ${files.length}`);
    console.log('📋 Lista de arquivos:', files);
    
    let validFiles = 0;
    let invalidFiles = 0;
    const results = [];
    
    for (const file of files) {
      const filePath = path.join(samplesDir, file);
      const stats = fs.statSync(filePath);
      
      if (!stats.isFile()) continue;
      
      console.log(`\n🔍 Analisando: ${file}`);
      console.log(`📊 Tamanho: ${stats.size} bytes`);
      
      try {
        // Ler o arquivo
        const fileBuffer = fs.readFileSync(filePath);
        
        // Verificar assinatura do arquivo
        const signature = {
          byte1: fileBuffer[0].toString(16).padStart(2, '0').toUpperCase(),
          byte2: fileBuffer[1].toString(16).padStart(2, '0').toUpperCase(),
          byte3: fileBuffer[2].toString(16).padStart(2, '0').toUpperCase()
        };
        
        console.log(`🔍 Assinatura: ${signature.byte1} ${signature.byte2} ${signature.byte3}`);
        
        // Validar como imagem
        const validation = validateImageBuffer(fileBuffer, 'image/jpeg');
        
        const result = {
          file,
          size: stats.size,
          signature: `${signature.byte1} ${signature.byte2} ${signature.byte3}`,
          isValid: validation.isValid,
          detectedType: validation.detectedType,
          error: validation.error
        };
        
        results.push(result);
        
        if (validation.isValid) {
          validFiles++;
          console.log(`✅ VÁLIDO - Tipo: ${validation.detectedType}`);
        } else {
          invalidFiles++;
          console.log(`❌ INVÁLIDO - Erro: ${validation.error}`);
        }
        
        // Se é inválido, verificar se contém texto
        if (!validation.isValid) {
          const textStart = fileBuffer.slice(0, 200).toString('utf8', 0, 100);
          if (textStart.includes('<') || textStart.includes('html') || textStart.includes('xml')) {
            console.log(`🚨 CONTÉM TEXTO/HTML: ${textStart.substring(0, 50)}...`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Erro ao ler arquivo: ${error.message}`);
        invalidFiles++;
        results.push({
          file,
          size: stats.size,
          isValid: false,
          error: `Erro de leitura: ${error.message}`
        });
      }
    }
    
    // Resumo final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA ANÁLISE:');
    console.log('='.repeat(50));
    console.log(`📁 Total de arquivos: ${files.length}`);
    console.log(`✅ Arquivos válidos: ${validFiles}`);
    console.log(`❌ Arquivos inválidos: ${invalidFiles}`);
    
    if (files.length > 0) {
      const validPercentage = ((validFiles / files.length) * 100).toFixed(1);
      const invalidPercentage = ((invalidFiles / files.length) * 100).toFixed(1);
      console.log(`📈 Taxa de validade: ${validPercentage}%`);
      console.log(`📉 Taxa de corrupção: ${invalidPercentage}%`);
    }
    
    console.log('\n📋 DETALHES POR ARQUIVO:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.file}:`);
      console.log(`   📊 Tamanho: ${result.size} bytes`);
      console.log(`   🔍 Assinatura: ${result.signature || 'N/A'}`);
      console.log(`   ✅ Válido: ${result.isValid}`);
      if (result.detectedType) {
        console.log(`   🎯 Tipo: ${result.detectedType}`);
      }
      if (result.error) {
        console.log(`   ❌ Erro: ${result.error}`);
      }
      console.log('');
    });
    
    // Conclusão
    console.log('🎯 CONCLUSÃO:');
    if (invalidFiles > validFiles) {
      console.log('❌ A maioria dos arquivos está corrompida - isso explica o problema!');
      console.log('💡 O sistema de validação está funcionando corretamente ao detectar arquivos inválidos.');
      console.log('🔧 O problema está na origem dos dados (Evolution API ou WhatsApp).');
    } else {
      console.log('✅ A maioria dos arquivos está válida.');
      console.log('🔍 Pode haver outro problema no pipeline de processamento.');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO DURANTE O TESTE:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar o teste
testRealImageFlow().catch(console.error);
