const amqp = require('amqplib');

// Configurações para conectar ao RabbitMQ na VPS
// Usando IP correto fornecido pelo usuário
const RABBITMQ_CONFIG = {
  url: 'amqp://guest:Devs@0101@212.85.0.57:5672/',
  exchange: 'crm.messages',
  queues: {
    outbound: 'crm.messages.outbound',
    inbound: 'crm.messages.inbound',
    webhooks: 'crm.webhooks'
  }
};

async function testRabbitMQVPS() {
  console.log('🧪 Testando conexão com RabbitMQ na VPS...');
  console.log(`📡 URL: ${RABBITMQ_CONFIG.url}`);
  
  let connection = null;
  let channel = null;
  
  try {
    // Tentar conectar
    console.log('\n🔌 Conectando ao RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_CONFIG.url);
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Criar canal
    console.log('\n📺 Criando canal...');
    channel = await connection.createChannel();
    console.log('✅ Canal criado com sucesso!');
    
    // Verificar/criar exchange
    console.log('\n🔄 Configurando exchange...');
    await channel.assertExchange(RABBITMQ_CONFIG.exchange, 'topic', {
      durable: true
    });
    console.log(`✅ Exchange '${RABBITMQ_CONFIG.exchange}' configurado!`);
    
    // Verificar/criar filas
    console.log('\n📋 Configurando filas...');
    for (const [name, queueName] of Object.entries(RABBITMQ_CONFIG.queues)) {
      await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': RABBITMQ_CONFIG.exchange,
          'x-dead-letter-routing-key': `${queueName}.dlq`
        }
      });
      
      // Criar DLQ correspondente
      await channel.assertQueue(`${queueName}.dlq`, {
        durable: true
      });
      
      console.log(`✅ Fila '${queueName}' e DLQ configuradas!`);
    }
    
    // Testar envio de mensagem
    console.log('\n📤 Testando envio de mensagem...');
    const testMessage = {
      id: 'test-' + Date.now(),
      type: 'text',
      content: 'Mensagem de teste da VPS',
      ticketId: 'test-ticket',
      contactId: 'test-contact',
      timestamp: Date.now(),
      metadata: {
        source: 'vps-test',
        environment: 'development'
      }
    };
    
    const published = channel.publish(
      RABBITMQ_CONFIG.exchange,
      RABBITMQ_CONFIG.queues.outbound,
      Buffer.from(JSON.stringify(testMessage)),
      {
        persistent: true,
        messageId: testMessage.id,
        timestamp: testMessage.timestamp
      }
    );
    
    if (published) {
      console.log('✅ Mensagem enviada com sucesso!');
      console.log(`📝 ID da mensagem: ${testMessage.id}`);
    } else {
      console.log('⚠️ Mensagem não pôde ser enviada (buffer cheio)');
    }
    
    // Verificar estatísticas das filas
    console.log('\n📊 Verificando estatísticas das filas...');
    for (const [name, queueName] of Object.entries(RABBITMQ_CONFIG.queues)) {
      try {
        const queueInfo = await channel.checkQueue(queueName);
        console.log(`📋 ${name}: ${queueInfo.messageCount} mensagens, ${queueInfo.consumerCount} consumidores`);
      } catch (error) {
        console.log(`⚠️ Erro ao verificar fila ${queueName}:`, error.message);
      }
    }
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Copie o arquivo .env.rabbitmq.example para .env.local');
    console.log('2. Ajuste as configurações conforme necessário');
    console.log('3. Reinicie o servidor Next.js');
    console.log('4. Teste o envio de mensagens via ChatPanel');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Dicas para resolver:');
      console.log('- Verifique se o hostname está correto');
      console.log('- Verifique se a VPS está acessível');
      console.log('- Verifique se a porta 5672 está aberta');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Dicas para resolver:');
      console.log('- Verifique se o RabbitMQ está rodando na VPS');
      console.log('- Verifique se a porta 5672 está aberta');
      console.log('- Verifique as configurações de firewall');
    } else if (error.message.includes('ACCESS_REFUSED')) {
      console.log('\n💡 Dicas para resolver:');
      console.log('- Verifique as credenciais (usuário/senha)');
      console.log('- Verifique se o usuário tem permissões adequadas');
      console.log('- Verifique se o vhost está correto');
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
testRabbitMQVPS();