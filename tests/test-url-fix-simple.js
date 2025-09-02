/**
 * Teste simples da correção de URL malformada
 */

// Função para corrigir URLs malformadas
function fixMalformedUrl(originalUrl) {
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
      console.log('🔧 Detectada dupla codificação, corrigindo...');
      
      // Correção: Decodificar apenas %252F para %2F
      let fixedPath = url.pathname.replace(/%252F/g, '%2F');
      
      // Construir URL corrigida
      const fixedUrl = `${url.protocol}//${url.host}${fixedPath}${url.search}`;
      
      console.log('✅ URL corrigida com sucesso!');
      return fixedUrl;
    }
    
    return originalUrl;
    
  } catch (error) {
    console.warn('❌ Erro ao processar URL:', error.message);
    return originalUrl;
  }
}

// Testar com a URL problemática
const malformedUrl = 'https://firebasestorage.googleapis.com/v0/b/cerc-3m1uep.appspot.com/o/images%252Floja%252F2025%252F08%252F3EB07309B3C5FC2324E999.net%252Fo1%252Fv%252Ft24%252Ff2%252Fm269%252FAQMLHyk_66Mv1ax7C2Ltrig6NGNQuaO3_X_DPd81ff0vnZPBU9QGDT_0_-8cdtVt--fvvtTE0Oe3iD2CAAdykiAjxeiMDCbT47Bvp-_x0Q?alt=media&token=e3a99d98-5e0e-4720-a151-a0f9a68e3cf9';

console.log('🧪 Testando correção de URL malformada...');
console.log('📥 URL original:');
console.log(malformedUrl);
console.log('\n🔧 Processando...');

const fixedUrl = fixMalformedUrl(malformedUrl);

console.log('\n📤 URL corrigida:');
console.log(fixedUrl);

console.log('\n📊 Comparação:');
console.log('- URL foi alterada:', malformedUrl !== fixedUrl);
console.log('- Contém %252F (original):', malformedUrl.includes('%252F'));
console.log('- Contém %252F (corrigida):', fixedUrl.includes('%252F'));
console.log('- Contém %2F (corrigida):', fixedUrl.includes('%2F'));

// Testar se a URL corrigida é válida
try {
  new URL(fixedUrl);
  console.log('✅ URL corrigida é válida!');
} catch (e) {
  console.log('❌ URL corrigida é inválida:', e.message);
}

console.log('\n🎯 Resultado: A correção deve transformar %252F em %2F para resolver a dupla codificação.');
