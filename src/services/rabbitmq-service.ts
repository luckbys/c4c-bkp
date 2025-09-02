import amqp, { Connection, Channel, Message } from 'amqplib';

interface RabbitMQConfig {
  url: string;
  exchange: string;
  queues: {
    outbound: string;
    inbound: string;
    webhooks: string;
  };
  dlqSuffix: string;
}

interface MessagePayload {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content: string;
  ticketId: string;
  contactId: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface WebhookPayload {
  event: string;
  instanceId: string;
  data: Record<string, any>;
  timestamp: number;
}

class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private config: RabbitMQConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor() {
    this.config = {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE_MESSAGES || 'crm.messages',
      queues: {
        outbound: process.env.RABBITMQ_QUEUE_OUTBOUND || 'crm.messages.outbound',
        inbound: process.env.RABBITMQ_QUEUE_INBOUND || 'crm.messages.inbound',
        webhooks: process.env.RABBITMQ_QUEUE_WEBHOOKS || 'crm.webhooks'
      },
      dlqSuffix: process.env.RABBITMQ_DLQ_SUFFIX || '.dlq'
    };
  }

  async connect(): Promise<void> {
    try {
      console.log('🐰 Conectando ao RabbitMQ...');
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      // Configurar event listeners para reconexão
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));

      await this.setupExchangesAndQueues();
      
      this.reconnectAttempts = 0;
      console.log('✅ RabbitMQ conectado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao conectar ao RabbitMQ:', error);
      await this.handleReconnect();
    }
  }

  private async setupExchangesAndQueues(): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('Canal não está disponível');
      }

      console.log('⚙️ Configurando exchanges...');
      
      // Criar exchange principal
      await this.channel.assertExchange(this.config.exchange, 'topic', {
        durable: true,
        autoDelete: false
      });

      console.log('⚙️ Configurando filas...');
      
      // Configurar filas principais
      await this.setupQueue(this.config.queues.outbound);
      await this.setupQueue(this.config.queues.inbound);
      await this.setupQueue(this.config.queues.webhooks);
      
      // Configurar Dead Letter Queues
      await this.setupDLQ(`${this.config.queues.outbound}${this.config.dlqSuffix}`);
      await this.setupDLQ(`${this.config.queues.inbound}${this.config.dlqSuffix}`);
      await this.setupDLQ(`${this.config.queues.webhooks}${this.config.dlqSuffix}`);
      
      console.log('✅ Exchanges e filas configuradas');
      
    } catch (error) {
      console.error('❌ Erro ao configurar exchanges e filas:', error);
      throw error;
    }
  }

  private async setupQueue(queueName: string): Promise<void> {
    if (!this.channel) return;
    
    await this.channel.assertQueue(queueName, {
      durable: true,
      autoDelete: false,
      arguments: {
        'x-message-ttl': 3600000, // 1 hora
        'x-dead-letter-exchange': this.config.exchange,
        'x-dead-letter-routing-key': `${queueName}${this.config.dlqSuffix}`
      }
    });
    
    // Bind queue to exchange
    const routingKey = queueName.includes('outbound') ? 'message.outbound' : 
                      queueName.includes('inbound') ? 'message.inbound' : 'webhook.*';
    await this.channel.bindQueue(queueName, this.config.exchange, routingKey);
  }

  private async setupDLQ(dlqName: string): Promise<void> {
    if (!this.channel) return;
    
    await this.channel.assertQueue(dlqName, {
      durable: true,
      autoDelete: false,
      arguments: {
        'x-message-ttl': 86400000 // 24 horas
      }
    });
    
    // Bind DLQ to exchange
    await this.channel.bindQueue(dlqName, this.config.exchange, dlqName);
  }

  private async handleConnectionError(error: Error): Promise<void> {
    console.error('❌ Erro na conexão RabbitMQ:', error);
    await this.handleReconnect();
  }

  private async handleConnectionClose(): Promise<void> {
    console.warn('⚠️ Conexão RabbitMQ fechada');
    await this.handleReconnect();
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  async publishOutboundMessage(message: MessagePayload): Promise<boolean> {
    try {
      if (!this.channel) {
        console.warn('⚠️ Canal RabbitMQ não disponível, tentando reconectar...');
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Não foi possível estabelecer conexão com RabbitMQ');
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = this.channel.publish(
        this.config.exchange,
        'message.outbound',
        messageBuffer,
        {
          persistent: true,
          messageId: message.id,
          timestamp: Date.now(),
          headers: {
            ticketId: message.ticketId,
            contactId: message.contactId,
            type: message.type
          }
        }
      );

      if (published) {
        console.log(`📤 Mensagem enviada para fila outbound: ${message.id}`);
      }

      return published;
    } catch (error) {
      console.error('❌ Erro ao publicar mensagem outbound:', error);
      return false;
    }
  }

  async publishInboundMessage(message: MessagePayload): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Não foi possível estabelecer conexão com RabbitMQ');
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = this.channel.publish(
        this.config.exchange,
        'message.inbound',
        messageBuffer,
        {
          persistent: true,
          messageId: message.id,
          timestamp: Date.now(),
          headers: {
            ticketId: message.ticketId,
            contactId: message.contactId,
            type: message.type
          }
        }
      );

      if (published) {
        console.log(`📥 Mensagem enviada para fila inbound: ${message.id}`);
      }

      return published;
    } catch (error) {
      console.error('❌ Erro ao publicar mensagem inbound:', error);
      return false;
    }
  }

  async publishWebhook(webhook: WebhookPayload): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Não foi possível estabelecer conexão com RabbitMQ');
      }

      const webhookBuffer = Buffer.from(JSON.stringify(webhook));
      const published = this.channel.publish(
        this.config.exchange,
        `webhook.${webhook.event}`,
        webhookBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
          headers: {
            event: webhook.event,
            instanceId: webhook.instanceId
          }
        }
      );

      if (published) {
        console.log(`🔗 Webhook enviado para fila: ${webhook.event}`);
      }

      return published;
    } catch (error) {
      console.error('❌ Erro ao publicar webhook:', error);
      return false;
    }
  }

  async consumeOutboundMessages(callback: (message: MessagePayload) => Promise<void>): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('Não foi possível estabelecer conexão com RabbitMQ');
    }

    await this.channel.consume(this.config.queues.outbound, async (msg: Message | null) => {
      if (!msg) return;

      try {
        const message: MessagePayload = JSON.parse(msg.content.toString());
        await callback(message);
        this.channel?.ack(msg);
        console.log(`✅ Mensagem outbound processada: ${message.id}`);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem outbound:', error);
        this.channel?.nack(msg, false, false); // Enviar para DLQ
      }
    });

    console.log('👂 Consumindo mensagens outbound...');
  }

  async consumeInboundMessages(callback: (message: MessagePayload) => Promise<void>): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('Não foi possível estabelecer conexão com RabbitMQ');
    }

    await this.channel.consume(this.config.queues.inbound, async (msg: Message | null) => {
      if (!msg) return;

      try {
        const message: MessagePayload = JSON.parse(msg.content.toString());
        await callback(message);
        this.channel?.ack(msg);
        console.log(`✅ Mensagem inbound processada: ${message.id}`);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem inbound:', error);
        this.channel?.nack(msg, false, false); // Enviar para DLQ
      }
    });

    console.log('👂 Consumindo mensagens inbound...');
  }

  async consumeWebhooks(callback: (webhook: WebhookPayload) => Promise<void>): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('Não foi possível estabelecer conexão com RabbitMQ');
    }

    await this.channel.consume(this.config.queues.webhooks, async (msg: Message | null) => {
      if (!msg) return;

      try {
        const webhook: WebhookPayload = JSON.parse(msg.content.toString());
        await callback(webhook);
        this.channel?.ack(msg);
        console.log(`✅ Webhook processado: ${webhook.event}`);
      } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        this.channel?.nack(msg, false, false); // Enviar para DLQ
      }
    });

    console.log('👂 Consumindo webhooks...');
  }

  async getQueueInfo(queueName: string): Promise<{ messageCount: number; consumerCount: number } | null> {
    try {
      if (!this.channel) {
        throw new Error('Canal não está disponível');
      }

      const queueInfo = await this.channel.checkQueue(queueName);
      return {
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount
      };
    } catch (error) {
      console.error(`❌ Erro ao obter informações da fila ${queueName}:`, error);
      return null;
    }
  }

  async purgeQueue(queueName: string): Promise<number> {
    try {
      if (!this.channel) {
        throw new Error('Canal não está disponível');
      }

      const result = await this.channel.purgeQueue(queueName);
      return result.messageCount;
    } catch (error) {
      console.error(`❌ Erro ao limpar fila ${queueName}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      console.log('🔌 Conexão RabbitMQ fechada');
    } catch (error) {
      console.error('❌ Erro ao fechar conexão RabbitMQ:', error);
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

// Singleton instance
const rabbitmqService = new RabbitMQService();

export default rabbitmqService;
export type { MessagePayload, WebhookPayload };