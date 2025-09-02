// Debug e correção de URL malformada do Firebase Storage

const fs = require('fs');
const path = require('path');

console.log('🔍 ANÁLISE DE URL MALFORMADA');
console.log('=' .repeat(50));

// URL problemática do log
const malformedUrl = 'https://firebasestorage.googleapis.com/v0/b/cerc-3m1uep.appspot.com/o/images%252Floja%252F2025%252F08%252F3EB07309B3C5FC2324E999.net%252Fo1%252Fv%252Ft24%252Ff2%252Fm269%252FAQMLHyk_66Mv1ax7C2Ltrig6NGNQuaO3_X_DPd81ff0vnZPBU9QGDT_0_-8cdtVt--fvvtTE0Oe3iD2CAAdykiAjxeiMDCbT47Bvp-_x0Q?alt=media&token=e3a99d98-5e0e-4720-a151-a0f9a68e3cf9';

console.log('\n📋 URL ORIGINAL:');
console.log(malformedUrl);

console.log('\n🔍 ANÁLISE DA URL:');
console.log('- Comprimento:', malformedUrl.length);
console.log('- Contém %25:', malformedUrl.includes('%25'));
console.log('- Contém .net:', malformedUrl.includes('.net'));
console.log('- Contém alt=media:', malformedUrl.includes('alt=media'));
console.log('- Contém token:', malformedUrl.includes('token='));

// Analisar o path da URL
const urlObj = new URL(malformedUrl);
console.log('\n🔗 COMPONENTES DA URL:');
console.log('- Protocol:', urlObj.protocol);
console.log('- Host:', urlObj.hostname);
console.log('- Pathname:', urlObj.pathname);
console.log('- Search:', urlObj.search);

// Decodificar o pathname
const decodedPath = decodeURIComponent(urlObj.pathname);
console.log('\n📝 PATH DECODIFICADO:');
console.log(decodedPath);

// Analisar o problema: dupla codificação
console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
if (urlObj.pathname.includes('%252F')) {
  console.log('✅ Dupla codificação detectada (%252F = %2F codificado)');
  console.log('- %252F deveria ser %2F (que representa /)'); 
  console.log('- Isso indica que a URL foi codificada duas vezes');
}

// Tentar corrigir a URL
console.log('\n🛠️ TENTATIVAS DE CORREÇÃO:');

// Correção 1: Decodificar uma vez
const corrected1 = malformedUrl.replace(/%252F/g, '%2F');
console.log('\n1️⃣ Correção 1 (decodificar %252F -> %2F):');
console.log(corrected1);

// Correção 2: Decodificar completamente o path
const corrected2 = `${urlObj.protocol}//${urlObj.hostname}${decodedPath}${urlObj.search}`;
console.log('\n2️⃣ Correção 2 (decodificar path completo):');
console.log(corrected2);

// Correção 3: Extrair apenas o nome do arquivo real
const pathParts = decodedPath.split('/');
console.log('\n3️⃣ Análise do path em partes:');
pathParts.forEach((part, index) => {
  console.log(`  [${index}]: ${part}`);
});

// Identificar o arquivo real
const realFileName = pathParts.find(part => 
  part.includes('3EB07309B3C5FC2324E999') || 
  part.length > 20 && !part.includes('images') && !part.includes('loja')
);

console.log('\n📁 ARQUIVO IDENTIFICADO:');
console.log('Nome do arquivo real:', realFileName);

// Construir URL corrigida
if (realFileName) {
  const corrected3 = `${urlObj.protocol}//${urlObj.hostname}/v0/b/cerc-3m1uep.appspot.com/o/images%2Floja%2F2025%2F08%2F${encodeURIComponent(realFileName)}${urlObj.search}`;
  console.log('\n3️⃣ Correção 3 (URL reconstruída):');
  console.log(corrected3);
}

// Testar se as URLs são válidas
console.log('\n🧪 TESTE DE VALIDADE:');

function testUrl(url, name) {
  try {
    const testUrlObj = new URL(url);
    console.log(`✅ ${name}: URL válida`);
    console.log(`   - Host: ${testUrlObj.hostname}`);
    console.log(`   - Path: ${testUrlObj.pathname}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: URL inválida - ${error.message}`);
    return false;
  }
}

testUrl(malformedUrl, 'URL Original');
testUrl(corrected1, 'Correção 1');
testUrl(corrected2, 'Correção 2');
if (realFileName) {
  const corrected3 = `${urlObj.protocol}//${urlObj.hostname}/v0/b/cerc-3m1uep.appspot.com/o/images%2Floja%2F2025%2F08%2F${encodeURIComponent(realFileName)}${urlObj.search}`;
  testUrl(corrected3, 'Correção 3');
}

// Analisar o que pode estar causando o problema
console.log('\n🔍 POSSÍVEIS CAUSAS:');
console.log('1. Dupla codificação durante o upload/salvamento');
console.log('2. Problema na geração da URL no webhook-handlers.ts');
console.log('3. URL sendo processada incorretamente pelo Evolution API');
console.log('4. Caracteres especiais no nome do arquivo original');

// Verificar se há caracteres problemáticos
const problematicChars = malformedUrl.match(/[^a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]/g);
if (problematicChars) {
  console.log('\n⚠️ CARACTERES PROBLEMÁTICOS ENCONTRADOS:');
  console.log(problematicChars);
} else {
  console.log('\n✅ Nenhum caractere problemático encontrado');
}

// Sugestões de correção
console.log('\n💡 SUGESTÕES DE CORREÇÃO:');
console.log('1. Verificar o código de geração de URL no webhook-handlers.ts');
console.log('2. Implementar sanitização de nomes de arquivo');
console.log('3. Adicionar validação de URL antes do salvamento');
console.log('4. Implementar correção automática de URLs malformadas');

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('1. Examinar webhook-handlers.ts para ver como as URLs são geradas');
console.log('2. Implementar função de correção de URL no MediaComponents.tsx');
console.log('3. Adicionar logs detalhados para rastrear a origem do problema');
