const amqp = require('amqplib');

// Configuração do RabbitMQ
const RABBITMQ_URL = 'amqp://guest:Devs@0101@n8n-rabbitmq.05pdov.easypanel.host:5672/';

async function testRabbitMQConnection() {
  console.log('🧪 Testando conexão RabbitMQ...');
  console.log(`📡 URL: ${RABBITMQ_URL}`);
  
  let connection = null;
  let channel = null;
  
  try {
    // Tentar conectar
    console.log('\n🔌 Conectando ao RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Criar canal
    console.log('\n📺 Criando canal...');
    channel = await connection.createChannel();
    console.log('✅ Canal criado com sucesso!');
    
    // Verificar se consegue criar exchange
    console.log('\n🔄 Testando criação de exchange...');
    await channel.assertExchange('test.exchange', 'topic', { durable: true });
    console.log('✅ Exchange criado com sucesso!');
    
    // Verificar se consegue criar fila
    console.log('\n📋 Testando criação de fila...');
    await channel.assertQueue('test.queue', { durable: true });
    console.log('✅ Fila criada com sucesso!');
    
    // Testar envio de mensagem
    console.log('\n📤 Testando envio de mensagem...');
    const testMessage = {
      id: 'test-msg-' + Date.now(),
      content: 'Teste de conexão RabbitMQ',
      timestamp: Date.now()
    };
    
    const published = channel.publish(
      'test.exchange',
      'test.routing.key',
      Buffer.from(JSON.stringify(testMessage)),
      { persistent: true }
    );
    
    if (published) {
      console.log('✅ Mensagem enviada com sucesso!');
    } else {
      console.log('❌ Falha ao enviar mensagem');
    }
    
    console.log('\n🎉 Todos os testes passaram! RabbitMQ está funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Problema: Hostname não encontrado');
      console.log('- Verifique se o IP 212.85.0.57 está correto');
      console.log('- Verifique sua conexão com a internet');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Problema: Conexão recusada');
      console.log('- Verifique se o RabbitMQ está rodando na VPS');
      console.log('- Verifique se a porta 5672 está aberta');
    } else if (error.message.includes('ACCESS_REFUSED')) {
      console.log('\n💡 Problema: Acesso negado');
      console.log('- Verifique as credenciais (guest/Devs@0101)');
      console.log('- Verifique se o usuário tem permissões');
    } else {
      console.log('\n💡 Erro desconhecido:', error);
    }
    
  } finally {
    // Limpar recursos
    if (channel) {
      try {
        await channel.close();
        console.log('\n🔌 Canal fechado');
      } catch (error) {
        console.log('⚠️ Erro ao fechar canal:', error.message);
      }
    }
    
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Conexão fechada');
      } catch (error) {
        console.log('⚠️ Erro ao fechar conexão:', error.message);
      }
    }
  }
}

// Executar teste
testRabbitMQConnection();