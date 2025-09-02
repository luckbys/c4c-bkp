import rabbitmqService from './rabbitmq-service';
import evolutionQueueProcessor from './evolution-queue-processor';
import webhookQueueProcessor from './webhook-queue-processor';
import retryManager from './retry-manager';

class RabbitMQManager {
  private isInitialized = false;
  private isStarted = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ RabbitMQ Manager já foi inicializado');
      return;
    }

    try {
      console.log('🚀 Inicializando RabbitMQ Manager...');

      // 1. Conectar ao RabbitMQ
      console.log('📡 Conectando ao RabbitMQ...');
      await rabbitmqService.connect();
      console.log('✅ Conectado ao RabbitMQ');

      // 2. Configurar exchanges e filas
      console.log('⚙️ Configurando exchanges e filas...');
      await rabbitmqService.setupExchangesAndQueues();
      console.log('✅ Exchanges e filas configuradas');

      // 3. Inicializar Retry Manager
      console.log('🔄 Inicializando Retry Manager...');
      await retryManager.start();
      console.log('✅ Retry Manager inicializado');

      this.isInitialized = true;
      console.log('🎉 RabbitMQ Manager inicializado com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao inicializar RabbitMQ Manager:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isStarted) {
      console.log('⚠️ RabbitMQ Manager já está rodando');
      return;
    }

    try {
      console.log('▶️ Iniciando processadores RabbitMQ...');

      // 1. Iniciar processador de mensagens outbound
      console.log('📤 Iniciando processador de mensagens outbound...');
      await evolutionQueueProcessor.start();
      console.log('✅ Processador outbound iniciado');

      // 2. Iniciar processador de webhooks
      console.log('🔗 Iniciando processador de webhooks...');
      await webhookQueueProcessor.start();
      console.log('✅ Processador de webhooks iniciado');

      // 3. Iniciar monitoramento de saúde
      this.startHealthCheck();

      this.isStarted = true;
      console.log('🎉 Todos os processadores RabbitMQ estão rodando!');

    } catch (error) {
      console.error('❌ Erro ao iniciar processadores RabbitMQ:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      console.log('⚠️ RabbitMQ Manager não está rodando');
      return;
    }

    try {
      console.log('⏹️ Parando RabbitMQ Manager...');

      // 1. Parar monitoramento de saúde
      this.stopHealthCheck();

      // 2. Parar processadores
      console.log('📤 Parando processador outbound...');
      await evolutionQueueProcessor.stop();

      console.log('🔗 Parando processador de webhooks...');
      await webhookQueueProcessor.stop();

      // 3. Parar retry manager
      console.log('🔄 Parando Retry Manager...');
      await retryManager.stop();

      // 4. Desconectar do RabbitMQ
      console.log('📡 Desconectando do RabbitMQ...');
      await rabbitmqService.disconnect();

      this.isStarted = false;
      this.isInitialized = false;
      
      console.log('✅ RabbitMQ Manager parado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao parar RabbitMQ Manager:', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    console.log('🔄 Reiniciando RabbitMQ Manager...');
    await this.stop();
    await this.start();
    console.log('✅ RabbitMQ Manager reiniciado');
  }

  private startHealthCheck(): void {
    console.log('💓 Iniciando monitoramento de saúde...');
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Erro no health check:', error);
        
        // Tentar reconectar em caso de falha
        try {
          console.log('🔄 Tentando reconectar...');
          await this.restart();
        } catch (restartError) {
          console.error('❌ Erro ao tentar reconectar:', restartError);
        }
      }
    }, 30000); // Health check a cada 30 segundos
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('💓 Monitoramento de saúde parado');
    }
  }

  private async performHealthCheck(): Promise<void> {
    // Verificar conexão RabbitMQ
    if (!rabbitmqService.isConnected()) {
      throw new Error('RabbitMQ desconectado');
    }

    // Verificar processadores
    if (!evolutionQueueProcessor.isRunning()) {
      console.warn('⚠️ Processador outbound não está rodando');
    }

    if (!webhookQueueProcessor.isRunning()) {
      console.warn('⚠️ Processador de webhooks não está rodando');
    }

    if (!retryManager.isRunning()) {
      console.warn('⚠️ Retry Manager não está rodando');
    }

    // Log de saúde (apenas a cada 5 minutos para não poluir)
    const now = Date.now();
    if (!this.lastHealthLog || now - this.lastHealthLog > 300000) {
      console.log('💚 RabbitMQ Manager está saudável');
      this.lastHealthLog = now;
    }
  }

  private lastHealthLog = 0;

  // Métodos de status
  getStatus(): {
    initialized: boolean;
    started: boolean;
    rabbitmqConnected: boolean;
    processorsRunning: {
      outbound: boolean;
      webhook: boolean;
      retryManager: boolean;
    };
  } {
    return {
      initialized: this.isInitialized,
      started: this.isStarted,
      rabbitmqConnected: rabbitmqService.isConnected(),
      processorsRunning: {
        outbound: evolutionQueueProcessor.isRunning(),
        webhook: webhookQueueProcessor.isRunning(),
        retryManager: retryManager.isRunning()
      }
    };
  }

  async getQueueStats(): Promise<{
    outbound: { messageCount: number; consumerCount: number };
    inbound: { messageCount: number; consumerCount: number };
    webhooks: { messageCount: number; consumerCount: number };
    dlqs: {
      outbound: { messageCount: number };
      inbound: { messageCount: number };
      webhooks: { messageCount: number };
    };
  }> {
    try {
      const [outbound, inbound, webhooks, outboundDLQ, inboundDLQ, webhooksDLQ] = await Promise.all([
        rabbitmqService.getQueueInfo('crm.messages.outbound'),
        rabbitmqService.getQueueInfo('crm.messages.inbound'),
        rabbitmqService.getQueueInfo('crm.webhooks'),
        rabbitmqService.getQueueInfo('crm.messages.outbound.dlq'),
        rabbitmqService.getQueueInfo('crm.messages.inbound.dlq'),
        rabbitmqService.getQueueInfo('crm.webhooks.dlq')
      ]);

      return {
        outbound: {
          messageCount: outbound?.messageCount || 0,
          consumerCount: outbound?.consumerCount || 0
        },
        inbound: {
          messageCount: inbound?.messageCount || 0,
          consumerCount: inbound?.consumerCount || 0
        },
        webhooks: {
          messageCount: webhooks?.messageCount || 0,
          consumerCount: webhooks?.consumerCount || 0
        },
        dlqs: {
          outbound: { messageCount: outboundDLQ?.messageCount || 0 },
          inbound: { messageCount: inboundDLQ?.messageCount || 0 },
          webhooks: { messageCount: webhooksDLQ?.messageCount || 0 }
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas das filas:', error);
      throw error;
    }
  }

  async getRetryStats(): Promise<{ pending: number; dlq: number; success: number }> {
    return await retryManager.getRetryStats();
  }

  // Métodos de controle manual
  async reprocessDLQMessage(messageId: string): Promise<boolean> {
    return await retryManager.reprocessDLQMessage(messageId);
  }

  async purgeQueue(queueName: string): Promise<number> {
    try {
      console.log(`🗑️ Limpando fila ${queueName}...`);
      const purgedCount = await rabbitmqService.purgeQueue(queueName);
      console.log(`✅ ${purgedCount} mensagens removidas da fila ${queueName}`);
      return purgedCount;
    } catch (error) {
      console.error(`❌ Erro ao limpar fila ${queueName}:`, error);
      throw error;
    }
  }
}

// Singleton instance
const rabbitmqManager = new RabbitMQManager();

export default rabbitmqManager;