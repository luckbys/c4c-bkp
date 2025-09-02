// Teste de conexão RabbitMQ com as novas credenciais
const amqp = require('amqplib');

async function testRabbitMQConnection() {
  console.log('🧪 Testando conexão RabbitMQ com novas credenciais...');
  
  const RABBITMQ_URL = 'amqp://guest:Devs@0101@n8n-rabbitmq.05pdov.easypanel.host:5672/';
  console.log(`📡 URL: ${RABBITMQ_URL}`);
  
  let connection = null;
  let channel = null;
  
  try {
    console.log('\n🔌 Conectando ao RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    console.log('✅ Conectado com sucesso!');
    
    console.log('\n📺 Criando canal...');
    channel = await connection.createChannel();
    console.log('✅ Canal criado com sucesso!');
    
    console.log('\n🔧 Testando exchange...');
    await channel.assertExchange('crm.messages', 'topic', { durable: true });
    console.log('✅ Exchange configurado!');
    
    console.log('\n📋 Testando fila...');
    await channel.assertQueue('crm.messages.outbound', { durable: true });
    console.log('✅ Fila configurada!');
    
    console.log('\n🎉 Todos os testes passaram! RabbitMQ está funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.log('\n🔍 Possíveis soluções:');
    console.log('- Verifique se o RabbitMQ está rodando localmente');
    console.log('- Confirme as credenciais: guest/Devs@0101');
    console.log('- Verifique se a porta 5672 está disponível');
    console.log('- Tente instalar e iniciar o RabbitMQ server');
  } finally {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
  }
}

testRabbitMQConnection();