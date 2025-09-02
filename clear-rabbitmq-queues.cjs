const amqp = require('amqplib');

async function clearRabbitMQQueues() {
  let connection;
  let channel;
  
  try {
    console.log('🔗 Conectando ao RabbitMQ...');
    
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    console.log('✅ Conectado ao RabbitMQ');
    
    // Lista de filas para deletar
    const queuesToDelete = [
      'crm.messages.outbound',
      'crm.messages.inbound', 
      'crm.webhooks',
      'crm.messages.outbound.dlq',
      'crm.messages.inbound.dlq',
      'crm.webhooks.dlq'
    ];
    
    console.log('🗑️ Deletando filas existentes...');
    
    for (const queueName of queuesToDelete) {
      try {
        await channel.deleteQueue(queueName);
        console.log(`✅ Fila '${queueName}' deletada`);
      } catch (error) {
        console.log(`⚠️ Fila '${queueName}' não existe ou erro ao deletar:`, error.message);
      }
    }
    
    // Também deletar o exchange se necessário
    try {
      await channel.deleteExchange('crm.messages');
      console.log('✅ Exchange \'crm.messages\' deletado');
    } catch (error) {
      console.log('⚠️ Exchange não existe ou erro ao deletar:', error.message);
    }
    
    console.log('🎉 Limpeza concluída! Agora o RabbitMQ pode recriar as filas com as configurações corretas.');
    
  } catch (error) {
    console.error('❌ Erro ao limpar filas:', error);
  } finally {
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
}

clearRabbitMQQueues();