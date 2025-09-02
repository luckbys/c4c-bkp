import { EventEmitter } from 'events';
import { optimizedCacheService } from './optimized-cache-service';
import { pushNotificationService } from './push-notification-service';
import { redisService } from './redis-service';
import type { Message, Ticket, Client } from '../components/crm/types';

interface CoordinationEvent {
  type: 'message' | 'ticket' | 'contact' | 'status_change';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  instanceName: string;
  data?: any;
  timestamp: number;
  correlationId: string;
}

interface ProcessingResult {
  success: boolean;
  cacheInvalidated: boolean;
  notificationsSent: number;
  errors: string[];
  processingTime: number;
}

interface CoordinationMetrics {
  eventsProcessed: number;
  averageProcessingTime: number;
  cacheInvalidations: number;
  notificationsSent: number;
  errors: number;
  lastProcessedAt: number;
}

class CacheQueueCoordinator extends EventEmitter {
  private static instance: CacheQueueCoordinator;
  private processingQueue: CoordinationEvent[] = [];
  private isProcessing = false;
  private metrics: CoordinationMetrics = {
    eventsProcessed: 0,
    averageProcessingTime: 0,
    cacheInvalidations: 0,
    notificationsSent: 0,
    errors: 0,
    lastProcessedAt: 0
  };
  
  private readonly BATCH_SIZE = 10;
  private readonly PROCESSING_INTERVAL = 1000; // 1 segundo
  private readonly MAX_RETRY_ATTEMPTS = 3;
  
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.startProcessing();
    this.setupEventListeners();
  }

  static getInstance(): CacheQueueCoordinator {
    if (!CacheQueueCoordinator.instance) {
      CacheQueueCoordinator.instance = new CacheQueueCoordinator();
    }
    return CacheQueueCoordinator.instance;
  }

  /**
   * Configurar listeners para eventos do sistema
   */
  private setupEventListeners(): void {
    // Escutar eventos do cache otimizado
    optimizedCacheService.on('cache:set', (event) => {
      this.emit('coordination:cache_updated', event);
    });

    optimizedCacheService.on('cache:invalidate', (event) => {
      this.emit('coordination:cache_invalidated', event);
    });

    // Escutar eventos de notificações push
    pushNotificationService.on('notification:sent', (event) => {
      this.emit('coordination:notification_sent', event);
    });
  }

  /**
   * Processar evento de mensagem do RabbitMQ
   */
  async processRabbitMQMessage(message: any): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      cacheInvalidated: false,
      notificationsSent: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // 1. Extrair informações da mensagem
      const event = this.parseRabbitMQMessage(message);
      if (!event) {
        result.errors.push('Failed to parse RabbitMQ message');
        return result;
      }

      // 2. Processar lógica de negócio
      await this.processBusinessLogic(event);

      // 3. Invalidar cache relacionado
      const cacheResult = await this.invalidateRelatedCache(event);
      result.cacheInvalidated = cacheResult.success;
      if (!cacheResult.success) {
        result.errors.push(...cacheResult.errors);
      }

      // 4. Notificar clientes via WebSocket
      const notificationResult = await this.notifyClients(event);
      result.notificationsSent = notificationResult.count;
      if (!notificationResult.success) {
        result.errors.push(...notificationResult.errors);
      }

      // 5. Atualizar métricas
      await this.updateMetrics(event);

      result.success = result.errors.length === 0;
      this.metrics.eventsProcessed++;
      
    } catch (error) {
      result.errors.push(`Processing error: ${error.message}`);
      this.metrics.errors++;
    } finally {
      result.processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(result.processingTime);
      this.metrics.lastProcessedAt = Date.now();
    }

    this.emit('coordination:message_processed', { event: message, result });
    return result;
  }

  /**
   * Processar evento de ticket
   */
  async processTicketEvent(
    action: 'create' | 'update' | 'delete',
    ticket: Ticket,
    instanceName: string
  ): Promise<ProcessingResult> {
    const event: CoordinationEvent = {
      type: 'ticket',
      action,
      entityId: ticket.id,
      instanceName,
      data: ticket,
      timestamp: Date.now(),
      correlationId: `ticket_${ticket.id}_${Date.now()}`
    };

    return await this.processEvent(event);
  }

  /**
   * Processar evento de mensagem
   */
  async processMessageEvent(
    action: 'create' | 'update' | 'delete',
    message: Message,
    instanceName: string
  ): Promise<ProcessingResult> {
    const event: CoordinationEvent = {
      type: 'message',
      action,
      entityId: message.id || '',
      instanceName,
      data: message,
      timestamp: Date.now(),
      correlationId: `message_${message.id}_${Date.now()}`
    };

    return await this.processEvent(event);
  }

  /**
   * Processar evento genérico
   */
  private async processEvent(event: CoordinationEvent): Promise<ProcessingResult> {
    // Adicionar à fila de processamento
    this.processingQueue.push(event);
    
    // Se não estiver processando, iniciar processamento imediato
    if (!this.isProcessing) {
      return await this.processNextBatch();
    }
    
    // Retornar resultado pendente
    return {
      success: true,
      cacheInvalidated: false,
      notificationsSent: 0,
      errors: [],
      processingTime: 0
    };
  }

  /**
   * Processar próximo lote de eventos
   */
  private async processNextBatch(): Promise<ProcessingResult> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return {
        success: true,
        cacheInvalidated: false,
        notificationsSent: 0,
        errors: [],
        processingTime: 0
      };
    }

    this.isProcessing = true;
    const batch = this.processingQueue.splice(0, this.BATCH_SIZE);
    const results: ProcessingResult[] = [];

    try {
      // Processar eventos em paralelo (com cuidado para dependências)
      const promises = batch.map(event => this.processSingleEvent(event));
      const batchResults = await Promise.allSettled(promises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            cacheInvalidated: false,
            notificationsSent: 0,
            errors: [`Batch processing error: ${result.reason}`],
            processingTime: 0
          });
        }
      }
      
    } finally {
      this.isProcessing = false;
    }

    // Consolidar resultados
    return this.consolidateResults(results);
  }

  /**
   * Processar evento individual
   */
  private async processSingleEvent(event: CoordinationEvent): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      cacheInvalidated: false,
      notificationsSent: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // 1. Processar lógica de negócio específica
      await this.processBusinessLogic(event);

      // 2. Invalidar cache relacionado
      const cacheResult = await this.invalidateRelatedCache(event);
      result.cacheInvalidated = cacheResult.success;
      if (!cacheResult.success) {
        result.errors.push(...cacheResult.errors);
      }

      // 3. Notificar clientes
      const notificationResult = await this.notifyClients(event);
      result.notificationsSent = notificationResult.count;
      if (!notificationResult.success) {
        result.errors.push(...notificationResult.errors);
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Event processing error: ${error.message}`);
    } finally {
      result.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Processar lógica de negócio específica
   */
  private async processBusinessLogic(event: CoordinationEvent): Promise<void> {
    switch (event.type) {
      case 'ticket':
        await this.processTicketBusinessLogic(event);
        break;
      case 'message':
        await this.processMessageBusinessLogic(event);
        break;
      case 'contact':
        await this.processContactBusinessLogic(event);
        break;
      case 'status_change':
        await this.processStatusChangeBusinessLogic(event);
        break;
    }
  }

  /**
   * Invalidar cache relacionado ao evento
   */
  private async invalidateRelatedCache(event: CoordinationEvent): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const patterns = this.getCachePatterns(event);
      
      for (const pattern of patterns) {
        try {
          await redisService.invalidatePattern(pattern);
          this.metrics.cacheInvalidations++;
        } catch (error) {
          errors.push(`Failed to invalidate pattern ${pattern}: ${error.message}`);
        }
      }
      
      // Invalidar cache específico baseado no tipo de evento
      await this.invalidateSpecificCache(event);
      
    } catch (error) {
      errors.push(`Cache invalidation error: ${error.message}`);
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Obter padrões de cache para invalidação
   */
  private getCachePatterns(event: CoordinationEvent): string[] {
    const patterns: string[] = [];
    const { type, instanceName, entityId } = event;
    
    switch (type) {
      case 'ticket':
        patterns.push(
          `tickets:${instanceName}:*`,
          `ticket:${instanceName}:${entityId}`,
          `tickets:${instanceName}:counters`,
          `tickets:${instanceName}:metrics`
        );
        break;
        
      case 'message':
        patterns.push(
          `messages:${instanceName}:*`,
          `ticket:${instanceName}:*` // Mensagens afetam tickets
        );
        break;
        
      case 'contact':
        patterns.push(
          `contact:${entityId}`,
          `contacts:*`
        );
        break;
    }
    
    return patterns;
  }

  /**
   * Invalidar cache específico
   */
  private async invalidateSpecificCache(event: CoordinationEvent): Promise<void> {
    switch (event.type) {
      case 'ticket':
        if (event.data) {
          await redisService.invalidateTicket(event.instanceName, event.entityId);
        }
        break;
        
      case 'message':
        if (event.data && event.data.remoteJid) {
          await redisService.invalidateMessages(event.data.remoteJid, event.instanceName);
        }
        break;
    }
  }

  /**
   * Notificar clientes via WebSocket
   */
  private async notifyClients(event: CoordinationEvent): Promise<{
    success: boolean;
    count: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalCount = 0;
    
    try {
      const channels = this.getNotificationChannels(event);
      
      for (const channel of channels) {
        try {
          const count = await pushNotificationService.notifyUpdate(
            channel,
            {
              type: event.type,
              action: event.action,
              entityId: event.entityId,
              data: event.data,
              timestamp: event.timestamp
            },
            {
              instanceName: event.instanceName,
              priority: this.getNotificationPriority(event)
            }
          );
          
          totalCount += count;
          this.metrics.notificationsSent += count;
          
        } catch (error) {
          errors.push(`Failed to notify channel ${channel}: ${error.message}`);
        }
      }
      
    } catch (error) {
      errors.push(`Notification error: ${error.message}`);
    }
    
    return {
      success: errors.length === 0,
      count: totalCount,
      errors
    };
  }

  /**
   * Obter canais de notificação para o evento
   */
  private getNotificationChannels(event: CoordinationEvent): string[] {
    const channels: string[] = [];
    const { type, instanceName } = event;
    
    // Canal geral da instância
    channels.push(`instance:${instanceName}`);
    
    // Canais específicos por tipo
    switch (type) {
      case 'ticket':
        channels.push(
          `tickets:${instanceName}`,
          `ticket:${instanceName}:${event.entityId}`
        );
        break;
        
      case 'message':
        channels.push(
          `messages:${instanceName}`,
          `chat:${instanceName}:${event.data?.remoteJid || 'unknown'}`
        );
        break;
        
      case 'contact':
        channels.push(`contacts:${instanceName}`);
        break;
    }
    
    return channels;
  }

  /**
   * Obter prioridade da notificação
   */
  private getNotificationPriority(event: CoordinationEvent): 'high' | 'normal' | 'low' {
    if (event.type === 'message') return 'high';
    if (event.type === 'ticket' && event.action === 'create') return 'high';
    if (event.type === 'status_change') return 'normal';
    return 'low';
  }

  /**
   * Processar lógica de negócio específica para tickets
   */
  private async processTicketBusinessLogic(event: CoordinationEvent): Promise<void> {
    // Implementar lógica específica para tickets
    console.log(`Processing ticket ${event.action}: ${event.entityId}`);
  }

  /**
   * Processar lógica de negócio específica para mensagens
   */
  private async processMessageBusinessLogic(event: CoordinationEvent): Promise<void> {
    // Implementar lógica específica para mensagens
    console.log(`Processing message ${event.action}: ${event.entityId}`);
  }

  /**
   * Processar lógica de negócio específica para contatos
   */
  private async processContactBusinessLogic(event: CoordinationEvent): Promise<void> {
    // Implementar lógica específica para contatos
    console.log(`Processing contact ${event.action}: ${event.entityId}`);
  }

  /**
   * Processar lógica de negócio específica para mudanças de status
   */
  private async processStatusChangeBusinessLogic(event: CoordinationEvent): Promise<void> {
    // Implementar lógica específica para mudanças de status
    console.log(`Processing status change ${event.action}: ${event.entityId}`);
  }

  /**
   * Parsear mensagem do RabbitMQ
   */
  private parseRabbitMQMessage(message: any): CoordinationEvent | null {
    try {
      // Implementar parsing específico baseado na estrutura das mensagens RabbitMQ
      return {
        type: message.type || 'message',
        action: message.action || 'create',
        entityId: message.entityId || message.id || '',
        instanceName: message.instanceName || '',
        data: message.data || message,
        timestamp: message.timestamp || Date.now(),
        correlationId: message.correlationId || `rabbitmq_${Date.now()}`
      };
    } catch (error) {
      console.error('Error parsing RabbitMQ message:', error);
      return null;
    }
  }

  /**
   * Consolidar resultados de um lote
   */
  private consolidateResults(results: ProcessingResult[]): ProcessingResult {
    return {
      success: results.every(r => r.success),
      cacheInvalidated: results.some(r => r.cacheInvalidated),
      notificationsSent: results.reduce((sum, r) => sum + r.notificationsSent, 0),
      errors: results.flatMap(r => r.errors),
      processingTime: Math.max(...results.map(r => r.processingTime))
    };
  }

  /**
   * Atualizar métricas
   */
  private async updateMetrics(event: CoordinationEvent): Promise<void> {
    // Implementar atualização de métricas específicas
  }

  /**
   * Atualizar tempo médio de processamento
   */
  private updateAverageProcessingTime(processingTime: number): void {
    if (this.metrics.eventsProcessed === 0) {
      this.metrics.averageProcessingTime = processingTime;
    } else {
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime + processingTime) / 2;
    }
  }

  /**
   * Iniciar processamento automático
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (this.processingQueue.length > 0) {
        await this.processNextBatch();
      }
    }, this.PROCESSING_INTERVAL);
  }

  /**
   * Obter métricas de coordenação
   */
  getMetrics(): CoordinationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset métricas
   */
  resetMetrics(): void {
    this.metrics = {
      eventsProcessed: 0,
      averageProcessingTime: 0,
      cacheInvalidations: 0,
      notificationsSent: 0,
      errors: 0,
      lastProcessedAt: 0
    };
  }

  /**
   * Parar coordenador
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Cache Queue Coordinator...');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    // Processar eventos restantes
    while (this.processingQueue.length > 0) {
      await this.processNextBatch();
    }
    
    this.removeAllListeners();
    console.log('✅ Cache Queue Coordinator shutdown complete');
  }
}

export const cacheQueueCoordinator = CacheQueueCoordinator.getInstance();
export { CacheQueueCoordinator };
export type { CoordinationEvent, ProcessingResult, CoordinationMetrics };