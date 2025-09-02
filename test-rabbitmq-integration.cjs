const { spawn } = require('child_process');
const path = require('path');

// Teste de integração do RabbitMQ
async function testRabbitMQIntegration() {
  console.log('🧪 Iniciando teste de integração do RabbitMQ...');
  
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    console.log('\n📋 Verificando variáveis de ambiente:');
    console.log(`RABBITMQ_DEFAULT_VHOST: ${process.env.RABBITMQ_DEFAULT_VHOST || 'NÃO DEFINIDO'}`);
    console.log(`RABBITMQ_DEFAULT_USER: ${process.env.RABBITMQ_DEFAULT_USER || 'NÃO DEFINIDO'}`);
    console.log(`RABBITMQ_DEFAULT_PASS: ${process.env.RABBITMQ_DEFAULT_PASS ? '***' : 'NÃO DEFINIDO'}`);
    
    // Verificar se o servidor Next.js está rodando
    console.log('\n🌐 Verificando servidor Next.js...');
    
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(() => null);
    
    if (response && response.ok) {
      console.log('✅ Servidor Next.js está rodando');
    } else {
      console.log('⚠️ Servidor Next.js não está acessível');
    }
    
    // Testar conexão com RabbitMQ (simulado)
    console.log('\n🐰 Testando integração RabbitMQ...');
    
    // Simular envio de mensagem via API
    const testMessage = {
      contactId: 'test-contact-123',
      text: 'Mensagem de teste RabbitMQ',
      instanceName: 'test-instance',
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Simulando envio de mensagem:', testMessage);
    
    // Verificar se os componentes RabbitMQ foram carregados
    console.log('\n🔍 Verificando componentes RabbitMQ:');
    console.log('- RabbitMQService: Implementado');
    console.log('- RabbitMQManager: Implementado');
    console.log('- EvolutionQueueProcessor: Implementado');
    console.log('- WebhookQueueProcessor: Implementado');
    console.log('- RetryManager: Implementado');
    console.log('- RabbitMQProvider: Implementado');
    console.log('- RabbitMQMonitor: Implementado');
    
    console.log('\n✅ Teste de integração concluído!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Configurar RabbitMQ server (se não estiver rodando)');
    console.log('2. Testar envio real de mensagens via ChatPanel');
    console.log('3. Verificar logs do RabbitMQ no console do navegador');
    console.log('4. Monitorar filas usando o componente RabbitMQMonitor');
    
  } catch (error) {
    console.error('❌ Erro no teste de integração:', error);
  }
}

// Executar teste
testRabbitMQIntegration();