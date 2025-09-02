const fetch = require('node-fetch');

// Teste da correção do Evolution API
async function testEvolutionFix() {
  console.log('🧪 Testando correção do Evolution API...');
  
  try {
    // 1. Teste de diagnóstico
    console.log('\n1. 📊 Executando diagnóstico...');
    const diagResponse = await fetch('http://localhost:9003/api/test/evolution-send', {
      method: 'GET'
    });
    
    const diagData = await diagResponse.json();
    console.log('Diagnóstico:', JSON.stringify(diagData, null, 2));
    
    if (!diagData.success) {
      console.error('❌ Diagnóstico falhou');
      return;
    }
    
    // 2. Verificar se há instâncias disponíveis
    const connectivity = diagData.diagnostics.connectivity;
    if (connectivity.status !== 'connected' || connectivity.instancesCount === 0) {
      console.error('❌ Nenhuma instância conectada disponível');
      console.log('Instâncias disponíveis:', connectivity.instances);
      return;
    }
    
    const instanceName = connectivity.instances[0].name;
    console.log(`✅ Usando instância: ${instanceName}`);
    
    // 3. Teste de envio de mensagem
    console.log('\n2. 📤 Testando envio de mensagem...');
    const testPayload = {
      instanceName: instanceName,
      remoteJid: '5511999999999', // Número de teste
      text: 'Teste de correção do agente IA - ' + new Date().toLocaleTimeString(),
      testMode: true
    };
    
    console.log('Payload de teste:', testPayload);
    
    const sendResponse = await fetch('http://localhost:9003/api/test/evolution-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const sendData = await sendResponse.json();
    console.log('\nResultado do envio:', JSON.stringify(sendData, null, 2));
    
    if (sendData.success) {
      console.log('\n✅ SUCESSO! O envio de mensagens está funcionando!');
      console.log('📋 Detalhes:', {
        messageId: sendData.data?.response?.key?.id,
        duration: sendData.data?.duration,
        normalizedJid: sendData.data?.normalizedJid
      });
    } else {
      console.log('\n❌ FALHA no envio de mensagens');
      console.log('🔍 Análise do erro:', sendData.details?.analysis);
      console.log('💡 Sugestões:', sendData.details?.analysis?.suggestions);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste
testEvolutionFix();