import rabbitmqService, { MessagePayload, WebhookPayload } from './rabbitmq-service';
import { firebaseService } from './firebase-service';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

interface FailedMessage {
  id: string;
  originalPayload: MessagePayload | WebhookPayload;
  failureReason: string;
  failureCount: number;
  firstFailedAt: string;
  lastFailedAt: string;
  nextRetryAt?: string;
  dlqProcessedAt?: string;
  status: 'retrying' | 'dlq' | 'abandoned';
}

class RetryManager {
  private config: RetryConfig;
  private isProcessingDLQ = false;
  private dlqProcessInterval: NodeJS.Timeout | null = null;
  private retryScheduler = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.config = {
      maxRetries: parseInt(process.env.RABBITMQ_MAX_RETRIES || '3'),
      baseDelay: parseInt(process.env.RABBITMQ_BASE_DELAY || '5000'),
      maxDelay: parseInt(process.env.RABBITMQ_MAX_DELAY || '300000'), // 5 minutos
      backoffMultiplier: parseFloat(process.env.RABBITMQ_BACKOFF_MULTIPLIER || '2'),
      jitterEnabled: process.env.RABBITMQ_JITTER_ENABLED !== 'false'
    };
  }

  async start(): Promise<void> {
    console.log('🔄 Iniciando Retry Manager...');
    
    // Conectar ao RabbitMQ se necessário
    if (!rabbitmqService.isConnected()) {
      await rabbitmqService.connect();
    }

    // Iniciar processamento de Dead Letter Queues
    await this.startDLQProcessing();
    
    // Recuperar mensagens em retry pendentes
    await this.recoverPendingRetries();
    
    console.log('✅ Retry Manager iniciado com sucesso!');
  }

  async stop(): Promise<void> {
    console.log('🛑 Parando Retry Manager...');
    
    this.isProcessingDLQ = false;
    
    if (this.dlqProcessInterval) {
      clearInterval(this.dlqProcessInterval);
      this.dlqProcessInterval = null;
    }
    
    // Cancelar todos os retries agendados
    for (const [messageId, timeout] of this.retryScheduler.entries()) {
      clearTimeout(timeout);
      this.retryScheduler.delete(messageId);
    }
    
    console.log('✅ Retry Manager parado');
  }

  private async startDLQProcessing(): Promise<void> {
    this.isProcessingDLQ = true;
    
    // Processar DLQ de mensagens outbound
    await this.processDLQ('crm.messages.outbound.dlq', 'outbound');
    
    // Processar DLQ de mensagens inbound
    await this.processDLQ('crm.messages.inbound.dlq', 'inbound');
    
    // Processar DLQ de webhooks
    await this.processDLQ('crm.webhooks.dlq', 'webhook');
    
    // Agendar processamento periódico das DLQs
    this.dlqProcessInterval = setInterval(async () => {
      if (this.isProcessingDLQ) {
        await this.processDLQ('crm.messages.outbound.dlq', 'outbound');
        await this.processDLQ('crm.messages.inbound.dlq', 'inbound');
        await this.processDLQ('crm.webhooks.dlq', 'webhook');
      }
    }, 60000); // Processar a cada 1 minuto
  }

  private async processDLQ(queueName: string, type: 'outbound' | 'inbound' | 'webhook'): Promise<void> {
    try {
      const queueInfo = await rabbitmqService.getQueueInfo(queueName);
      
      if (!queueInfo || queueInfo.messageCount === 0) {
        return;
      }
      
      console.log(`🔍 Processando DLQ ${queueName}: ${queueInfo.messageCount} mensagens`);
      
      // Consumir mensagens da DLQ
      await this.consumeDLQMessages(queueName, type);
      
    } catch (error) {
      console.error(`❌ Erro ao processar DLQ ${queueName}:`, error);
    }
  }

  private async consumeDLQMessages(queueName: string, type: 'outbound' | 'inbound' | 'webhook'): Promise<void> {
    // Implementação simplificada - em produção, usar um consumer dedicado
    console.log(`👂 Consumindo mensagens da DLQ: ${queueName}`);
    
    // Por enquanto, apenas registrar as mensagens na DLQ
    await this.logDLQMessage(queueName, type);
  }

  async scheduleRetry(messageId: string, payload: MessagePayload | WebhookPayload, error: Error, attempt: number): Promise<void> {
    try {
      // Verificar se já excedeu o máximo de tentativas
      if (attempt >= this.config.maxRetries) {
        console.log(`❌ Máximo de tentativas atingido para mensagem ${messageId}`);
        await this.moveToDeadLetter(messageId, payload, error, attempt);
        return;
      }
      
      // Calcular delay para próxima tentativa
      const delay = this.calculateRetryDelay(attempt);
      const nextRetryAt = new Date(Date.now() + delay);
      
      console.log(`🔄 Agendando retry ${attempt + 1}/${this.config.maxRetries} para mensagem ${messageId} em ${delay}ms`);
      
      // Salvar informações do retry
      await this.saveRetryInfo(messageId, payload, error, attempt, nextRetryAt);
      
      // Agendar retry
      const timeout = setTimeout(async () => {
        try {
          await this.executeRetry(messageId, payload, attempt + 1);
        } catch (retryError) {
          console.error(`❌ Erro ao executar retry para ${messageId}:`, retryError);
          await this.scheduleRetry(messageId, payload, retryError as Error, attempt + 1);
        } finally {
          this.retryScheduler.delete(messageId);
        }
      }, delay);
      
      this.retryScheduler.set(messageId, timeout);
      
    } catch (error) {
      console.error(`❌ Erro ao agendar retry para ${messageId}:`, error);
    }
  }

  private async executeRetry(messageId: string, payload: MessagePayload | WebhookPayload, attempt: number): Promise<void> {
    console.log(`🚀 Executando retry ${attempt}/${this.config.maxRetries} para mensagem ${messageId}`);
    
    try {
      let success = false;
      
      if ('ticketId' in payload) {
        // É uma MessagePayload
        success = await rabbitmqService.publishOutboundMessage(payload as MessagePayload);
      } else {
        // É uma WebhookPayload
        success = await rabbitmqService.publishWebhook(payload as WebhookPayload);
      }
      
      if (success) {
        console.log(`✅ Retry bem-sucedido para mensagem ${messageId}`);
        await this.markRetrySuccess(messageId);
      } else {
        throw new Error('Falha ao republicar mensagem');
      }
      
    } catch (error) {
      console.error(`❌ Retry falhou para mensagem ${messageId}:`, error);
      await this.scheduleRetry(messageId, payload, error as Error, attempt);
    }
  }

  private async moveToDeadLetter(messageId: string, payload: MessagePayload | WebhookPayload, error: Error, attempts: number): Promise<void> {
    try {
      const failedMessage: FailedMessage = {
        id: messageId,
        originalPayload: payload,
        failureReason: error.message,
        failureCount: attempts,
        firstFailedAt: new Date().toISOString(),
        lastFailedAt: new Date().toISOString(),
        dlqProcessedAt: new Date().toISOString(),
        status: 'dlq'
      };
      
      // Salvar na coleção de mensagens falhadas
      await firebaseService.addDocument('failed_messages', {
        ...failedMessage,
        id: messageId
      });
      
      // Criar notificação para administradores
      await this.createFailureNotification(failedMessage);
      
      console.log(`💀 Mensagem ${messageId} movida para Dead Letter após ${attempts} tentativas`);
      
    } catch (error) {
      console.error(`❌ Erro ao mover mensagem ${messageId} para Dead Letter:`, error);
    }
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff com jitter
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    
    // Aplicar limite máximo
    delay = Math.min(delay, this.config.maxDelay);
    
    // Adicionar jitter para evitar thundering herd
    if (this.config.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random();
      delay += jitter;
    }
    
    return Math.floor(delay);
  }

  private async saveRetryInfo(messageId: string, payload: MessagePayload | WebhookPayload, error: Error, attempt: number, nextRetryAt: Date): Promise<void> {
    try {
      const retryInfo = {
        messageId,
        attempt,
        error: error.message,
        nextRetryAt: nextRetryAt.toISOString(),
        payload: JSON.stringify(payload),
        timestamp: new Date().toISOString()
      };
      
      await firebaseService.addDocument('retry_logs', retryInfo);
      
    } catch (error) {
      console.error(`❌ Erro ao salvar informações de retry para ${messageId}:`, error);
    }
  }

  private async markRetrySuccess(messageId: string): Promise<void> {
    try {
      await firebaseService.addDocument('retry_success', {
        messageId,
        succeededAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Erro ao marcar retry como bem-sucedido para ${messageId}:`, error);
    }
  }

  private async recoverPendingRetries(): Promise<void> {
    try {
      console.log('🔍 Recuperando retries pendentes...');
      
      // Buscar retries que deveriam ter sido executados
      const pendingRetries = await this.getPendingRetries();
      
      for (const retry of pendingRetries) {
        const payload = JSON.parse(retry.payload);
        await this.scheduleRetry(retry.messageId, payload, new Error(retry.error), retry.attempt);
      }
      
      console.log(`✅ ${pendingRetries.length} retries pendentes recuperados`);
      
    } catch (error) {
      console.error('❌ Erro ao recuperar retries pendentes:', error);
    }
  }

  private async getPendingRetries(): Promise<any[]> {
    // Implementação simplificada - buscar no Firebase
    try {
      // Por enquanto, retorna array vazio
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar retries pendentes:', error);
      return [];
    }
  }

  private async logDLQMessage(queueName: string, type: string): Promise<void> {
    try {
      await firebaseService.addDocument('dlq_logs', {
        queueName,
        type,
        timestamp: new Date().toISOString(),
        processed: false
      });
    } catch (error) {
      console.error(`❌ Erro ao registrar mensagem DLQ para ${queueName}:`, error);
    }
  }

  private async createFailureNotification(failedMessage: FailedMessage): Promise<void> {
    try {
      await firebaseService.addDocument('admin_notifications', {
        type: 'message_failure',
        severity: 'high',
        title: 'Mensagem falhou após múltiplas tentativas',
        message: `Mensagem ${failedMessage.id} falhou ${failedMessage.failureCount} vezes. Motivo: ${failedMessage.failureReason}`,
        data: {
          messageId: failedMessage.id,
          failureCount: failedMessage.failureCount,
          failureReason: failedMessage.failureReason
        },
        timestamp: new Date().toISOString(),
        read: false
      });
    } catch (error) {
      console.error('❌ Erro ao criar notificação de falha:', error);
    }
  }

  // Métodos públicos para monitoramento
  async getRetryStats(): Promise<{ pending: number; dlq: number; success: number }> {
    try {
      const stats = {
        pending: this.retryScheduler.size,
        dlq: 0,
        success: 0
      };
      
      // Buscar estatísticas do Firebase (implementação simplificada)
      return stats;
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de retry:', error);
      return { pending: 0, dlq: 0, success: 0 };
    }
  }

  async reprocessDLQMessage(messageId: string): Promise<boolean> {
    try {
      // Buscar mensagem na DLQ e tentar reprocessar
      const failedMessage = await firebaseService.getDocument('failed_messages', messageId);
      
      if (!failedMessage) {
        console.warn(`⚠️ Mensagem ${messageId} não encontrada na DLQ`);
        return false;
      }
      
      const payload = failedMessage.originalPayload;
      await this.scheduleRetry(messageId, payload, new Error('Manual reprocess'), 0);
      
      console.log(`🔄 Reprocessamento manual iniciado para mensagem ${messageId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Erro ao reprocessar mensagem ${messageId}:`, error);
      return false;
    }
  }

  isRunning(): boolean {
    return this.isProcessingDLQ;
  }
}

// Singleton instance
const retryManager = new RetryManager();

export default retryManager;
export type { RetryConfig, FailedMessage };