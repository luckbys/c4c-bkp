// Script para testar a API route do RabbitMQ
const fetch = require('node-fetch');

async function testRabbitMQAPI() {
  console.log('🧪 Testando API route do RabbitMQ...');
  
  const baseUrl = 'http://localhost:9003';
  
  try {
    // 1. Testar status do RabbitMQ
    console.log('\n🔍 1. Verificando status do RabbitMQ...');
    const statusResponse = await fetch(`${baseUrl}/api/rabbitmq/send-message`, {
      method: 'GET'
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status do RabbitMQ:', statusData);
    } else {
      console.log('❌ Erro ao verificar status:', statusResponse.status, await statusResponse.text());
    }
    
    // 2. Testar envio de mensagem
    console.log('\n📤 2. Testando envio de mensagem...');
    const messagePayload = {
      id: `test-msg-${Date.now()}`,
      type: 'text',
      content: 'Mensagem de teste via API RabbitMQ',
      ticketId: 'test-ticket-123',
      contactId: 'test-contact-456',
      userId: 'test-user-789',
      timestamp: Date.now(),
      metadata: {
        sender: {
          id: 'test-user-789',
          name: 'Usuário Teste',
          type: 'agent'
        }
      }
    };
    
    const sendResponse = await fetch(`${baseUrl}/api/rabbitmq/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });
    
    if (sendResponse.ok) {
      const sendData = await sendResponse.json();
      console.log('✅ Mensagem enviada com sucesso:', sendData);
    } else {
      const errorData = await sendResponse.json();
      console.log('❌ Erro ao enviar mensagem:', sendResponse.status, errorData);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testRabbitMQAPI();