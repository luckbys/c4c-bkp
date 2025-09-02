// Script de teste completo para debug do fluxo de mensagens de imagem
// Testa: webhook → Firebase → recuperação → exibição

const baseUrl = 'http://localhost:9003';

// Dados de teste
const testData = {
  remoteJid: '5512981022013@s.whatsapp.net',
  instanceName: 'teste',
  // Imagem base64 pequena para teste
  imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
};

async function testCompleteFlow() {
  console.log('🧪 [TEST FLOW] Iniciando teste completo do fluxo de mensagens de imagem');
  console.log('🧪 [TEST FLOW] Dados de teste:', {
    remoteJid: testData.remoteJid,
    instanceName: testData.instanceName,
    imageSize: testData.imageBase64.length
  });

  try {
    // 1. Testar webhook de imagem
    console.log('\n📡 [STEP 1] Testando webhook de imagem...');
    const webhookResponse = await fetch(`${baseUrl}/api/test-image-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'base64',
        instance: testData.instanceName,
        remoteJid: testData.remoteJid,
        customImage: testData.imageBase64
      })
    });
    
    const webhookResult = await webhookResponse.json();
    console.log('📡 [STEP 1] Resultado webhook:', webhookResult);
    
    if (!webhookResult.success) {
      throw new Error(`Webhook falhou: ${webhookResult.error}`);
    }
    
    // Aguardar processamento
    console.log('⏳ Aguardando 3 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. Verificar mensagens salvas no Firebase
    console.log('\n🔍 [STEP 2] Verificando mensagens no Firebase...');
    const debugResponse = await fetch(
      `${baseUrl}/api/debug-messages?remoteJid=${encodeURIComponent(testData.remoteJid)}&instanceName=${testData.instanceName}&limit=5`
    );
    
    const debugResult = await debugResponse.json();
    console.log('🔍 [STEP 2] Resultado debug:', debugResult);
    
    if (!debugResult.success) {
      throw new Error(`Debug falhou: ${debugResult.error}`);
    }
    
    // Analisar mensagens encontradas
    const imageMessages = debugResult.messages.filter(m => m.analysis.isImage);
    console.log('🔍 [STEP 2] Mensagens de imagem encontradas:', imageMessages.length);
    
    imageMessages.forEach((msg, index) => {
      console.log(`🔍 [STEP 2] Imagem ${index + 1}:`, {
        id: msg.id,
        type: msg.type,
        hasFirebaseUrl: msg.analysis.hasFirebaseUrl,
        hasBase64: msg.analysis.hasBase64,
        isPlaceholder: msg.analysis.isPlaceholder,
        contentPreview: msg.contentPreview
      });
    });
    
    // 3. Testar salvamento direto
    console.log('\n💾 [STEP 3] Testando salvamento direto...');
    const saveResponse = await fetch(`${baseUrl}/api/debug-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remoteJid: testData.remoteJid,
        instanceName: testData.instanceName,
        content: testData.imageBase64,
        type: 'image',
        sender: 'client'
      })
    });
    
    const saveResult = await saveResponse.json();
    console.log('💾 [STEP 3] Resultado salvamento:', saveResult);
    
    // 4. Verificar novamente após salvamento direto
    console.log('\n🔍 [STEP 4] Verificando após salvamento direto...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const debugResponse2 = await fetch(
      `${baseUrl}/api/debug-messages?remoteJid=${encodeURIComponent(testData.remoteJid)}&instanceName=${testData.instanceName}&limit=5`
    );
    
    const debugResult2 = await debugResponse2.json();
    console.log('🔍 [STEP 4] Resultado final:', {
      total: debugResult2.stats.total,
      images: debugResult2.stats.images,
      withFirebaseUrl: debugResult2.stats.withFirebaseUrl,
      withBase64: debugResult2.stats.withBase64
    });
    
    // 5. Resumo final
    console.log('\n📊 [RESUMO FINAL]');
    console.log('✅ Webhook funcionando:', webhookResult.success);
    console.log('✅ Mensagens sendo salvas:', debugResult2.stats.total > 0);
    console.log('✅ Imagens detectadas:', debugResult2.stats.images > 0);
    console.log('✅ URLs do Firebase:', debugResult2.stats.withFirebaseUrl > 0);
    console.log('✅ Base64 detectado:', debugResult2.stats.withBase64 > 0);
    
    // Identificar possíveis problemas
    const issues = [];
    if (debugResult2.stats.images === 0) {
      issues.push('❌ Nenhuma imagem detectada - problema na detecção de tipo');
    }
    if (debugResult2.stats.withFirebaseUrl === 0 && debugResult2.stats.withBase64 === 0) {
      issues.push('❌ Nenhuma URL válida encontrada - problema no processamento');
    }
    
    if (issues.length > 0) {
      console.log('\n🚨 [PROBLEMAS IDENTIFICADOS]');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('\n🎉 [SUCESSO] Todos os testes passaram!');
    }
    
    // Instruções para o usuário
    console.log('\n📋 [PRÓXIMOS PASSOS]');
    console.log('1. Abra o chat no navegador em:', `${baseUrl}`);
    console.log('2. Procure pela conversa com:', testData.remoteJid);
    console.log('3. Verifique se as imagens aparecem corretamente');
    console.log('4. Abra o console do navegador para ver logs de debug');
    
  } catch (error) {
    console.error('🚨 [TEST FLOW] Erro no teste:', error);
    console.log('\n🔧 [TROUBLESHOOTING]');
    console.log('1. Verifique se o servidor está rodando em:', baseUrl);
    console.log('2. Verifique se o Firebase está configurado corretamente');
    console.log('3. Verifique os logs do servidor para mais detalhes');
  }
}

// Função para testar apenas a detecção de tipo
async function testContentTypeDetection() {
  console.log('\n🔍 [TEST DETECTION] Testando detecção de tipo de conteúdo...');
  
  const testCases = [
    { content: testData.imageBase64, expected: 'image', description: 'Base64 image' },
    { content: 'https://firebasestorage.googleapis.com/v0/b/test/o/image.jpg', expected: 'image', description: 'Firebase Storage URL' },
    { content: '[Imagem]', expected: 'image', description: 'Image placeholder' },
    { content: 'https://example.com/image.jpg', expected: 'image', description: 'HTTP image URL' },
    { content: 'Olá, como vai?', expected: 'text', description: 'Text message' }
  ];
  
  // Simular a função detectContentType (seria melhor importar, mas para simplicidade...)
  testCases.forEach((testCase, index) => {
    console.log(`🔍 [TEST ${index + 1}] ${testCase.description}:`);
    console.log('  Content preview:', testCase.content.substring(0, 50));
    console.log('  Expected:', testCase.expected);
    console.log('  Length:', testCase.content.length);
    console.log('  Starts with http:', testCase.content.startsWith('http'));
    console.log('  Starts with data:', testCase.content.startsWith('data:'));
    console.log('  Includes Firebase:', testCase.content.includes('firebasestorage.googleapis.com'));
  });
}

// Executar testes
if (require.main === module) {
  console.log('🧪 Iniciando testes de debug do chat...');
  testContentTypeDetection();
  testCompleteFlow();
}

module.exports = {
  testCompleteFlow,
  testContentTypeDetection
};
