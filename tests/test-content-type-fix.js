// Teste para verificar as correções de content-type

// Simular buffer de imagem JPEG
const jpegBuffer = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, // JPEG header
  0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
]);

// Simular buffer de imagem PNG
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A // PNG header
]);

// Função de detecção de tipo de arquivo (copiada do media-upload.ts)
function detectFileTypeFromBuffer(buffer) {
  if (!buffer || buffer.length < 8) {
    return null;
  }

  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }

  // WebP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }

  // BMP
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'image/bmp';
  }

  return null;
}

// Função de validação de imagem (simplificada do media-upload.ts)
function validateImageBuffer(buffer, expectedContentType) {
  const detectedType = detectFileTypeFromBuffer(buffer);
  
  const typeMapping = {
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp'
  };

  let correctedContentType = expectedContentType;
  if (detectedType && detectedType !== expectedContentType) {
    correctedContentType = detectedType;
  }

  return {
    isValid: detectedType !== null,
    detectedType,
    correctedContentType
  };
}

console.log('=== TESTE DE CORREÇÃO DE CONTENT-TYPE ===\n');

// Teste 1: JPEG com content-type incorreto
console.log('1. Teste JPEG com application/octet-stream:');
const jpegResult = validateImageBuffer(jpegBuffer, 'application/octet-stream');
console.log('- Tipo detectado:', jpegResult.detectedType);
console.log('- Content-type corrigido:', jpegResult.correctedContentType);
console.log('- É válido:', jpegResult.isValid);
console.log('');

// Teste 2: PNG com content-type incorreto
console.log('2. Teste PNG com application/octet-stream:');
const pngResult = validateImageBuffer(pngBuffer, 'application/octet-stream');
console.log('- Tipo detectado:', pngResult.detectedType);
console.log('- Content-type corrigido:', pngResult.correctedContentType);
console.log('- É válido:', pngResult.isValid);
console.log('');

// Teste 3: Verificar se a detecção funciona diretamente
console.log('3. Teste de detecção direta:');
console.log('- JPEG detectado como:', detectFileTypeFromBuffer(jpegBuffer));
console.log('- PNG detectado como:', detectFileTypeFromBuffer(pngBuffer));
console.log('');

console.log('=== RESULTADO ===');
if (jpegResult.correctedContentType === 'image/jpeg' && pngResult.correctedContentType === 'image/png') {
  console.log('✅ SUCESSO: As correções de content-type estão funcionando!');
  console.log('✅ Imagens com application/octet-stream serão corrigidas automaticamente.');
} else {
  console.log('❌ ERRO: As correções não estão funcionando como esperado.');
}
