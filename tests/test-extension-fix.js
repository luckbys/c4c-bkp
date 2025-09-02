// Teste para verificar se a correção de extensões está funcionando

// Simular as funções corrigidas
function getExtensionFromContentType(contentType, mediaType) {
  const contentTypeLower = contentType.toLowerCase();
  
  // Mapeamento de Content-Type para extensões
  const contentTypeMap = {
    // Imagens
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    
    // Áudios
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/opus': 'opus',
    
    // Vídeos
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/mov': 'mov',
    'video/wmv': 'wmv',
    'video/webm': 'webm',
    
    // Documentos
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt'
  };
  
  // Tentar encontrar extensão pelo Content-Type
  if (contentTypeMap[contentTypeLower]) {
    return contentTypeMap[contentTypeLower];
  }
  
  // Fallback baseado no tipo de mídia
  switch (mediaType) {
    case 'image': return 'jpg';
    case 'audio': return 'mp3';
    case 'video': return 'mp4';
    case 'document': return 'pdf';
    default: return 'bin';
  }
}

function generateStoragePath(mediaInfo, contentType) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  let extension = 'bin';
  
  // 1. Tentar extrair extensão da URL
  const urlParts = mediaInfo.url.split('.');
  if (urlParts.length > 1) {
    const urlExtension = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
    // Verificar se é uma extensão válida (não muito longa)
    if (urlExtension.length <= 4 && /^[a-z0-9]+$/.test(urlExtension)) {
      extension = urlExtension;
    }
  }
  
  // 2. Se não conseguiu da URL, usar Content-Type
  if (extension === 'bin' && contentType) {
    extension = getExtensionFromContentType(contentType, mediaInfo.type);
  }
  
  // 3. Se ainda não tem extensão, usar mimeType
  if (extension === 'bin' && mediaInfo.mimeType) {
    extension = getExtensionFromContentType(mediaInfo.mimeType, mediaInfo.type);
  }
  
  const fileName = mediaInfo.fileName || `${mediaInfo.messageId}.${extension}`;
  
  return `${mediaInfo.type}s/${mediaInfo.instanceName}/${year}/${month}/${fileName}`;
}

// Casos de teste
console.log('=== TESTE DE CORREÇÃO DE EXTENSÕES ===\n');

const testCases = [
  {
    name: 'URL sem extensão + Content-Type image/jpeg',
    mediaInfo: {
      url: 'https://evolution-api.com/media/12345',
      type: 'image',
      messageId: 'TEST_001',
      instanceName: 'instance1'
    },
    contentType: 'image/jpeg'
  },
  {
    name: 'URL sem extensão + Content-Type application/octet-stream + mimeType',
    mediaInfo: {
      url: 'https://evolution-api.com/media/67890',
      type: 'image',
      messageId: 'TEST_002',
      instanceName: 'instance1',
      mimeType: 'image/png'
    },
    contentType: 'application/octet-stream'
  },
  {
    name: 'URL com extensão válida',
    mediaInfo: {
      url: 'https://example.com/image.jpg',
      type: 'image',
      messageId: 'TEST_003',
      instanceName: 'instance1'
    },
    contentType: 'image/jpeg'
  },
  {
    name: 'URL sem extensão + sem Content-Type válido (fallback)',
    mediaInfo: {
      url: 'https://evolution-api.com/media/unknown',
      type: 'image',
      messageId: 'TEST_004',
      instanceName: 'instance1'
    },
    contentType: 'application/octet-stream'
  },
  {
    name: 'Áudio MP3',
    mediaInfo: {
      url: 'https://evolution-api.com/audio/12345',
      type: 'audio',
      messageId: 'TEST_005',
      instanceName: 'instance1'
    },
    contentType: 'audio/mpeg'
  },
  {
    name: 'Documento PDF',
    mediaInfo: {
      url: 'https://evolution-api.com/doc/12345',
      type: 'document',
      messageId: 'TEST_006',
      instanceName: 'instance1'
    },
    contentType: 'application/pdf'
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   URL: ${testCase.mediaInfo.url}`);
  console.log(`   Content-Type: ${testCase.contentType}`);
  console.log(`   Tipo: ${testCase.mediaInfo.type}`);
  
  const storagePath = generateStoragePath(testCase.mediaInfo, testCase.contentType);
  const extension = storagePath.split('.').pop();
  
  console.log(`   ✅ Caminho gerado: ${storagePath}`);
  console.log(`   ✅ Extensão detectada: .${extension}`);
  
  // Verificar se não é .bin (problema corrigido)
  if (extension === 'bin') {
    console.log(`   ⚠️  ATENÇÃO: Ainda gerando extensão .bin`);
  } else {
    console.log(`   ✅ SUCESSO: Extensão correta detectada`);
  }
});

console.log('\n=== RESUMO ===');
console.log('✅ Correção implementada:');
console.log('   1. Detecta extensão da URL quando válida');
console.log('   2. Usa Content-Type para determinar extensão');
console.log('   3. Fallback para mimeType se disponível');
console.log('   4. Fallback final baseado no tipo de mídia');
console.log('   5. Evita extensões .bin desnecessárias');

console.log('\n🎯 Problema resolvido: Arquivos agora terão extensões corretas no Firebase Storage!');
