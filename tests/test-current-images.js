// Teste específico para verificar por que as imagens atuais não estão sendo exibidas

// Dados reais das mensagens obtidas da API
const testMessages = [
  {
    id: "TEST_1755346527023",
    content: "https://firebasestorage.googleapis.com/v0/b/cerc-3m1uep.appspot.com/o/images%2Fteste%2F2025%2F08%2FTEST_IMG_1755346527023.bin?alt=media&token=5da12d90-ff23-410c-8b5d-9a0d5aa16c8e",
    type: "image"
  },
  {
    id: "45dDbatZzABe7f1gbKI0",
    content: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
    type: "image"
  }
];

// Simular as funções do MediaComponents.tsx
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Base64 images
  if (url.startsWith('data:image/')) return true;
  
  // HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  
  // WhatsApp media URLs
  if (url.includes('whatsapp.net') || url.includes('wa.me')) return true;
  
  // Firebase Storage URLs
  if (url.includes('firebasestorage.googleapis.com')) return true;
  
  return false;
}

function fixMalformedUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Corrigir dupla codificação %252F -> %2F
  if (url.includes('%252F')) {
    const fixed = url.replace(/%252F/g, '%2F');
    console.log('🔧 [URL FIX] Corrigindo dupla codificação:', {
      original: url.substring(0, 100) + '...',
      fixed: fixed.substring(0, 100) + '...'
    });
    return fixed;
  }
  
  return url;
}

function processImageUrl(content) {
  if (!content) return null;
  
  // Se já é base64, retornar como está
  if (content.startsWith('data:image/')) {
    console.log('✅ [PROCESS] Base64 detectado');
    return content;
  }
  
  // Se é URL, processar
  if (isValidImageUrl(content)) {
    const fixed = fixMalformedUrl(content);
    console.log('✅ [PROCESS] URL processada:', {
      isValid: true,
      needsFix: content !== fixed,
      result: fixed.substring(0, 100) + '...'
    });
    return fixed;
  }
  
  console.log('❌ [PROCESS] Conteúdo inválido:', content);
  return null;
}

// Simular o comportamento do componente ImageMessage
function simulateImageComponent(message) {
  console.log(`\n🖼️ [ImageMessage] Simulando renderização para: ${message.id}`);
  console.log('📝 [ImageMessage] Content:', {
    type: typeof message.content,
    length: message.content?.length,
    preview: message.content.substring(0, 100) + '...'
  });
  
  // Verificar se é URL válida
  const isValid = isValidImageUrl(message.content);
  console.log('🔍 [ImageMessage] isValidImageUrl:', isValid);
  
  if (!isValid) {
    console.log('❌ [ImageMessage] URL inválida - exibindo placeholder');
    return { status: 'placeholder', reason: 'invalid_url' };
  }
  
  // Processar URL
  const processedUrl = processImageUrl(message.content);
  console.log('🔄 [ImageMessage] processedImageUrl:', processedUrl?.substring(0, 100) + '...');
  
  if (!processedUrl) {
    console.log('❌ [ImageMessage] Processamento falhou - exibindo placeholder');
    return { status: 'placeholder', reason: 'processing_failed' };
  }
  
  // Verificar se precisa de proxy
  const isFirebaseUrl = processedUrl.includes('firebasestorage.googleapis.com');
  const needsProxy = isFirebaseUrl && !processedUrl.startsWith('data:');
  
  console.log('🔍 [ImageMessage] Análise da URL:', {
    isFirebaseUrl,
    needsProxy,
    isBase64: processedUrl.startsWith('data:'),
    hasToken: processedUrl.includes('token=')
  });
  
  if (needsProxy) {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(processedUrl)}`;
    console.log('🔄 [ImageMessage] Usando proxy:', proxyUrl.substring(0, 100) + '...');
    return { 
      status: 'success', 
      finalUrl: proxyUrl,
      method: 'proxy'
    };
  }
  
  console.log('✅ [ImageMessage] Usando URL direta');
  return { 
    status: 'success', 
    finalUrl: processedUrl,
    method: 'direct'
  };
}

// Executar testes
console.log('🧪 === TESTE DE RENDERIZAÇÃO DE IMAGENS ATUAIS ===\n');

testMessages.forEach((message, index) => {
  console.log(`\n📋 TESTE ${index + 1}/${testMessages.length}`);
  console.log('=' .repeat(50));
  
  const result = simulateImageComponent(message);
  
  console.log('🎯 [RESULTADO]:', {
    messageId: message.id,
    status: result.status,
    method: result.method || 'none',
    reason: result.reason || 'none'
  });
  
  if (result.finalUrl) {
    console.log('🔗 [FINAL URL]:', result.finalUrl.substring(0, 150) + '...');
  }
});

console.log('\n🎉 Teste de renderização concluído!');
console.log('\n📊 RESUMO:');
console.log('- Se status = "success": imagem deve ser exibida');
console.log('- Se status = "placeholder": imagem não será exibida');
console.log('- method = "proxy": usando image proxy');
console.log('- method = "direct": carregamento direto');
