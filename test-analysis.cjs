// Usar fetch nativo do Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

async function testAnalysis() {
  console.log('🧪 Testando endpoint de análise de conversa...');
  
  const testData = {
    messages: [
      {
        id: '1',
        sender: 'client',
        content: 'Olá, gostaria de saber sobre seus produtos',
        timestamp: new Date(Date.now() - 10000).toISOString()
      },
      {
        id: '2',
        sender: 'agent',
        content: 'Olá! Claro, posso te ajudar. Que tipo de produto você está procurando?',
        timestamp: new Date(Date.now() - 8000).toISOString()
      },
      {
        id: '3',
        sender: 'client',
        content: 'Estou interessado em soluções para minha empresa',
        timestamp: new Date(Date.now() - 5000).toISOString()
      }
    ],
    clientInfo: {
      id: 'test-client',
      name: 'Cliente Teste',
      phone: '5512981022013',
      email: 'teste@exemplo.com'
    },
    conversationContext: {
      duration: 5,
      messageCount: 3,
      lastClientMessage: new Date().toISOString(),
      hasUnreadMessages: false,
      previousInteractions: 0
    }
  };

  try {
    console.log('📤 Enviando dados para análise...');
    console.log('Dados:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:9004/api/chat/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📊 Resposta bruta:', responseText);

    if (!response.ok) {
      console.error('❌ Erro na requisição:', response.status, response.statusText);
      console.error('❌ Corpo da resposta:', responseText);
      return;
    }

    try {
      const result = JSON.parse(responseText);
      console.log('✅ Análise concluída com sucesso!');
      console.log('📋 Resultado:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
      console.error('❌ Resposta recebida:', responseText);
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

// Executar o teste
testAnalysis().catch(console.error);