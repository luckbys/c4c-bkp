/**
 * Script para corrigir URLs malformadas do Firebase Storage
 * Implementa correção automática de dupla codificação
 */

// Função para corrigir URLs malformadas
function fixMalformedUrl(originalUrl) {
  console.log('🔧 [URL FIX] URL original:', originalUrl);
  
  if (!originalUrl || typeof originalUrl !== 'string') {
    return originalUrl;
  }
  
  // Verificar se é uma URL do Firebase Storage
  if (!originalUrl.includes('firebasestorage.googleapis.com')) {
    return originalUrl;
  }
  
  try {
    const url = new URL(originalUrl);
    
    // Verificar se há dupla codificação no path (%252F)
    if (url.pathname.includes('%252F')) {
      console.log('🔧 [URL FIX] Detectada dupla codificação, corrigindo...');
      
      // Correção 1: Decodificar apenas %252F para %2F
      let fixedPath = url.pathname.replace(/%252F/g, '%2F');
      
      // Construir URL corrigida
      const fixedUrl = `${url.protocol}//${url.host}${fixedPath}${url.search}`;
      
      console.log('🔧 [URL FIX] URL corrigida:', fixedUrl);
      
      // Validar se a URL corrigida é válida
      try {
        new URL(fixedUrl);
        return fixedUrl;
      } catch (e) {
        console.warn('🔧 [URL FIX] URL corrigida inválida, usando original:', e.message);
        return originalUrl;
      }
    }
    
    // Se não há dupla codificação, retornar original
    return originalUrl;
    
  } catch (error) {
    console.warn('🔧 [URL FIX] Erro ao processar URL:', error.message);
    return originalUrl;
  }
}

// Função para testar a correção
function testUrlFix() {
  console.log('🧪 [TEST] Testando correção de URLs malformadas...');
  
  const testUrls = [
    // URL malformada com dupla codificação
    'https://firebasestorage.googleapis.com/v0/b/cerc-3m1uep.appspot.com/o/images%252Floja%252F2025%252F08%252F3EB07309B3C5FC2324E999.net%252Fo1%252Fv%252Ft24%252Ff2%252Fm269%252FAQMLHyk_66Mv1ax7C2Ltrig6NGNQuaO3_X_DPd81ff0vnZPBU9QGDT_0_-8cdtVt--fvvtTE0Oe3iD2CAAdykiAjxeiMDCbT47Bvp-_x0Q?alt=media&token=e3a99d98-5e0e-4720-a151-a0f9a68e3cf9',
    
    // URL normal (não deve ser alterada)
    'https://firebasestorage.googleapis.com/v0/b/cerc-3m1uep.appspot.com/o/images%2Floja%2F2025%2F08%2Ftest.jpg?alt=media&token=abc123',
    
    // URL não Firebase (não deve ser alterada)
    'https://example.com/image.jpg',
    
    // URL inválida
    null,
    undefined,
    ''
  ];
  
  testUrls.forEach((url, index) => {
    console.log(`\n🧪 [TEST ${index + 1}] Testando:`, url);
    const fixed = fixMalformedUrl(url);
    console.log(`🧪 [TEST ${index + 1}] Resultado:`, fixed);
    console.log(`🧪 [TEST ${index + 1}] Alterado:`, url !== fixed);
  });
}

// Executar teste
testUrlFix();

// Exportar função para uso no frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fixMalformedUrl };
}

console.log('\n✅ [URL FIX] Script de correção de URLs criado com sucesso!');
console.log('📋 [URL FIX] Para usar no frontend, adicione a função fixMalformedUrl ao MediaComponents.tsx');
console.log('📋 [URL FIX] Exemplo de uso: const correctedUrl = fixMalformedUrl(originalUrl);');
