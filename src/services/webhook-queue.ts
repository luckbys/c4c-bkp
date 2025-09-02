import { firebaseService } from './firebase-service';
import { evolutionApi } from './evolution-api';
import { WebhookHandlers } from './webhook-handlers';
import { EventEmitter } from 'events';

// Import monitor (será definido dinamicamente para evitar dependência circular)
let webhookMonitor: any = null;
try {
  // Importação dinâmica para evitar problemas de dependência circular
  import('../app/api/webhook-monitor/route').then(module => {
    webhookMonitor = module.webhookMonitor;
  });
} catch (error) {
  console.warn('Monitor de webhook não disponível:', error);
}

interface WebhookJob {
  id: string;
  event: string;
  instance: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number; // 1 = highest, 5 = lowest
  batchKey?: string; // For batching similar jobs
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
}

interface BatchJob {
  jobs: WebhookJob[];
  batchKey: string;
  timestamp: number;
}

// Priority mapping for different event types - Otimizado para entrega instantânea
const EVENT_PRIORITIES = {
  'messages.upsert': 1,    // Máxima prioridade - mensagens novas
  'chats.upsert': 1,       // Máxima prioridade - novos chats
  'messages.update': 2,    // Alta prioridade - atualizações de status
  'chats.update': 3,       // Média prioridade - atualizações de chat
  'connection.update': 4,  // Baixa prioridade - status de conexão
  'presence.update': 5     // Menor prioridade - presença online
} as const;

// Eventos que devem ser processados sincronamente (sem fila)
const SYNC_EVENTS = new Set(['messages.upsert', 'chats.upsert']);

// Throttling específico para connection.update
interface ConnectionThrottle {
  lastProcessed: number;
  state: string;
  count: number;
}

class ConnectionUpdateThrottler {
  private throttleMap = new Map<string, ConnectionThrottle>();
  private readonly THROTTLE_WINDOW = 2000; // 2 segundos
  private readonly MAX_SAME_STATE = 3; // Máximo 3 do mesmo estado
  
  shouldThrottle(instance: string, state: string): boolean {
    const key = instance;
    const now = Date.now();
    const existing = this.throttleMap.get(key);
    
    if (!existing) {
      this.throttleMap.set(key, {
        lastProcessed: now,
        state,
        count: 1
      });
      return false;
    }
    
    // Se é o mesmo estado e dentro da janela de throttle
    if (existing.state === state && (now - existing.lastProcessed) < this.THROTTLE_WINDOW) {
      existing.count++;
      
      // Throttle se exceder o limite
      if (existing.count > this.MAX_SAME_STATE) {
        console.log(`🚫 [THROTTLE] connection.update throttled: ${instance} (${state}) - ${existing.count}x`);
        return true;
      }
    } else {
      // Estado diferente ou janela expirou, resetar
      existing.lastProcessed = now;
      existing.state = state;
      existing.count = 1;
    }
    
    return false;
  }
  
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.throttleMap.forEach((throttle, key) => {
      if (now - throttle.lastProcessed > this.THROTTLE_WINDOW * 2) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => this.throttleMap.delete(key));
  }
}

const connectionThrottler = new ConnectionUpdateThrottler();

class WebhookQueue extends EventEmitter {
  // Efficient data structures
  private jobsById = new Map<string, WebhookJob>();
  private pendingQueue: WebhookJob[] = []; // Priority queue
  private processingJobs = new Set<string>();
  private completedJobs = new Set<string>();
  private failedJobs = new Set<string>();
  
  // Processing control
  private processing = false;
  private maxConcurrent = 5; // Increased from 3
  private currentlyProcessing = 0;
  
  // Performance tracking
  private processingTimes: number[] = [];
  private lastThroughputCheck = Date.now();
  private processedSinceLastCheck = 0;
  
  // Cached stats (updated incrementally)
  private cachedStats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0,
    averageProcessingTime: 0,
    throughputPerMinute: 0
  };

  // Adaptive rate limiting
  private rateLimitWindow = 60000; // 1 minute
  private maxRequestsPerWindow = 150; // Increased from 100
  private requestTimestamps: number[] = [];
  private backoffMultiplier = 1;
  
  // Batching
  private batchTimeout = 50; // ms
  private maxBatchSize = 10;
  private pendingBatches = new Map<string, BatchJob>();
  
  // Cleanup
  private cleanupInterval?: NodeJS.Timeout;
  private maxCompletedJobs = 1000;

  constructor() {
    super();
    this.startProcessing();
    this.setupCleanup();
    
    // Event listeners for optimization
    this.on('jobAdded', () => this.processNextBatch());
    this.on('jobCompleted', () => this.processNextBatch());
    
    // Clean up old request timestamps every minute
    setInterval(() => {
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(
        timestamp => now - timestamp < this.rateLimitWindow
      );
      
      // Limpar throttler de connection.update
      connectionThrottler.cleanup();
    }, 60000);
  }
  
  private setupCleanup() {
    // Auto cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedJobs();
    }, 5 * 60 * 1000);
  }
  
  private cleanupCompletedJobs() {
    if (this.completedJobs.size > this.maxCompletedJobs) {
      const jobsToRemove = Array.from(this.completedJobs).slice(0, this.completedJobs.size - this.maxCompletedJobs);
      jobsToRemove.forEach(jobId => {
        this.completedJobs.delete(jobId);
        this.jobsById.delete(jobId);
      });
    }
    
    // Also cleanup failed jobs older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.failedJobs.forEach(jobId => {
      const job = this.jobsById.get(jobId);
      if (job && job.timestamp < oneHourAgo) {
        this.failedJobs.delete(jobId);
        this.jobsById.delete(jobId);
      }
    });
  }

  /**
   * Add a job to the queue with intelligent batching and prioritization
   * Eventos críticos são processados sincronamente para entrega instantânea
   */
  addJob(event: string, instance: string, data: any): string {
    // Throttling específico para connection.update
    if (event === 'connection.update') {
      const state = data?.state || 'unknown';
      if (connectionThrottler.shouldThrottle(instance, state)) {
        // Retornar ID fictício para evento throttled
        const throttledId = `throttled-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        console.log(`🚫 [WEBHOOK-QUEUE] connection.update throttled: ${throttledId}`);
        return throttledId;
      }
    }
    
    const priority = EVENT_PRIORITIES[event as keyof typeof EVENT_PRIORITIES] || 5;
    const batchKey = this.getBatchKey(event, instance, data);
    
    const job: WebhookJob = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      instance,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      priority,
      batchKey
    };

    // Store in efficient data structures
    this.jobsById.set(job.id, job);
    
    // ⚡ PROCESSAMENTO SÍNCRONO para eventos críticos (entrega instantânea)
    if (SYNC_EVENTS.has(event)) {
      console.log(`[WebhookQueue] 🚀 Processamento SÍNCRONO para evento crítico: ${job.id} (${event})`);
      this.processSyncJob(job);
      return job.id;
    }
    
    // Try to batch similar jobs
    if (batchKey && this.shouldBatch(event)) {
      this.addToBatch(job, batchKey);
    } else {
      this.insertByPriority(job);
    }
    
    this.updateStatsIncremental('pending', 1);
    
    // Log reduzido para connection.update
    if (event === 'connection.update') {
      console.log(`[WebhookQueue] Connection job: ${job.id} (${data?.state || 'unknown'})`);
    } else {
      console.log(`[WebhookQueue] Job added: ${job.id} (${event}, priority: ${priority})`);
    }
    
    // Emit event for processing
    this.emit('jobAdded', job);
    
    return job.id;
  }
  
  private getBatchKey(event: string, instance: string, data: any): string | undefined {
    // Only batch certain types of events
    if (event === 'presence.update') {
      return `presence-${instance}-${data?.id || 'unknown'}`;
    }
    if (event === 'chats.update') {
      return `chats-${instance}`;
    }
    return undefined;
  }
  
  private shouldBatch(event: string): boolean {
    return ['presence.update', 'chats.update'].includes(event);
  }
  
  private addToBatch(job: WebhookJob, batchKey: string) {
    if (!this.pendingBatches.has(batchKey)) {
      this.pendingBatches.set(batchKey, {
        jobs: [],
        batchKey,
        timestamp: Date.now()
      });
      
      // Schedule batch processing
      setTimeout(() => {
        this.processBatch(batchKey);
      }, this.batchTimeout);
    }
    
    const batch = this.pendingBatches.get(batchKey)!;
    batch.jobs.push(job);
    
    // Process immediately if batch is full
    if (batch.jobs.length >= this.maxBatchSize) {
      this.processBatch(batchKey);
    }
  }
  
  private processBatch(batchKey: string) {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.jobs.length === 0) return;
    
    // Add all jobs to pending queue with priority
    batch.jobs.forEach(job => {
      this.insertByPriority(job);
    });
    
    this.pendingBatches.delete(batchKey);
  }
  
  /**
   * Processamento síncrono para eventos críticos (sem fila)
   */
  private async processSyncJob(job: WebhookJob): Promise<void> {
    const startTime = Date.now();
    
    try {
      job.status = 'processing';
      console.log(`[WebhookQueue] ⚡ Processando SINCRONAMENTE: ${job.id} (${job.event})`);
      
      // Processar imediatamente sem fila
       await WebhookHandlers.processWebhookEvent(job.event, job.instance, job.data);
       
       job.status = 'completed';
       this.completedJobs.add(job.id);
       
       const processingTime = Date.now() - startTime;
       
       // Registrar métricas de performance
       if (webhookMonitor) {
         webhookMonitor.recordLatency(processingTime, true);
       }
       
       console.log(`[WebhookQueue] ✅ Evento crítico processado INSTANTANEAMENTE: ${job.id} (${processingTime}ms)`);
       
       this.emit('jobCompleted', job);
      
    } catch (error) {
      console.error(`[WebhookQueue] ❌ Erro no processamento síncrono: ${job.id}:`, error);
      
      // Para eventos críticos, tentar retry imediato uma vez
      if (job.retryCount < 1) {
        job.retryCount++;
        console.log(`[WebhookQueue] 🔄 Retry imediato para evento crítico: ${job.id}`);
        setTimeout(() => this.processSyncJob(job), 100); // Retry em 100ms
      } else {
         job.status = 'failed';
         this.failedJobs.add(job.id);
         
         // Registrar falha no monitor
         if (webhookMonitor) {
           webhookMonitor.recordSyncFailure();
         }
         
         console.error(`[WebhookQueue] ❌ Evento crítico falhou permanentemente: ${job.id}`);
       }
    }
  }

  private insertByPriority(job: WebhookJob) {
    // Binary search for insertion point based on priority
    let left = 0;
    let right = this.pendingQueue.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.pendingQueue[mid].priority <= job.priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    this.pendingQueue.splice(left, 0, job);
  }

  /**
   * Check if request is within adaptive rate limits
   */
  private isWithinRateLimit(): boolean {
    const now = Date.now();
    
    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );
    
    // Adaptive rate limiting based on current performance
    const currentLimit = Math.floor(this.maxRequestsPerWindow / this.backoffMultiplier);
    return this.requestTimestamps.length < currentLimit;
  }

  /**
   * Record a request for rate limiting
   */
  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Start processing the queue with event-driven approach
   */
  private async startProcessing() {
    if (this.processing) return;
    
    this.processing = true;
    console.log('[WebhookQueue] Starting event-driven queue processing');
    
    // Initial processing
    this.processAvailableJobs();
  }
  
  /**
   * Process all available jobs up to concurrency limit
   */
  private async processAvailableJobs() {
    while (this.processing && 
           this.currentlyProcessing < this.maxConcurrent && 
           this.pendingQueue.length > 0 && 
           this.isWithinRateLimit()) {
      
      const job = this.pendingQueue.shift();
      if (!job) break;
      
      // Process job asynchronously
      this.processJob(job).catch(error => {
        console.error('[WebhookQueue] Error in job processing:', error);
      });
    }
    
    // Apply adaptive backoff if rate limited
    if (!this.isWithinRateLimit()) {
      this.applyBackoff();
    }
  }
  
  /**
   * Apply adaptive backoff when rate limited
   */
  private applyBackoff() {
    const backoffTime = Math.min(1000 * this.backoffMultiplier, 10000); // Max 10 seconds
    this.backoffMultiplier = Math.min(this.backoffMultiplier * 1.5, 5); // Max 5x multiplier
    
    console.log(`[WebhookQueue] Rate limited, backing off for ${backoffTime}ms`);
    
    setTimeout(() => {
      this.processAvailableJobs();
    }, backoffTime);
  }
  
  /**
   * Reset backoff when processing is successful
   */
  private resetBackoff() {
    this.backoffMultiplier = 1;
  }

  /**
   * Process a single job with enhanced error handling and performance tracking
   */
  private async processJob(job: WebhookJob): Promise<void> {
    const startTime = Date.now();
    
    job.status = 'processing';
    this.processingJobs.add(job.id);
    this.currentlyProcessing++;
    this.recordRequest();
    this.updateStatsIncremental('pending', -1);
    this.updateStatsIncremental('processing', 1);

    try {
      console.log(`[WebhookQueue] Processing job: ${job.id} (${job.event}, priority: ${job.priority})`);
      
      // Process the webhook event using the appropriate handler
      await WebhookHandlers.processWebhookEvent(job.event, job.instance, job.data);

      job.status = 'completed';
      this.processingJobs.delete(job.id);
      this.completedJobs.add(job.id);
      this.updateStatsIncremental('processing', -1);
      this.updateStatsIncremental('completed', 1);
      
      // Track processing time
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      
      // Registrar métricas de performance
      if (webhookMonitor) {
        webhookMonitor.recordLatency(processingTime, false);
      }
      
      // Reset backoff on successful processing
      this.resetBackoff();
      
      console.log(`[WebhookQueue] Job completed: ${job.id} (${processingTime}ms)`);
      this.emit('jobCompleted', job);
      
    } catch (error) {
      console.error(`[WebhookQueue] Error processing job ${job.id}:`, error);
      job.retryCount++;
      
      // Calculate exponential backoff delay for retries
      const retryDelay = Math.min(1000 * Math.pow(2, job.retryCount - 1), 30000); // Max 30 seconds
      
      if (job.retryCount >= job.maxRetries) {
        job.status = 'failed';
        this.processingJobs.delete(job.id);
        this.failedJobs.add(job.id);
        this.updateStatsIncremental('processing', -1);
        this.updateStatsIncremental('failed', 1);
        console.error(`[WebhookQueue] Job failed permanently: ${job.id} after ${job.retryCount} attempts`);
      } else {
        job.status = 'pending';
        this.processingJobs.delete(job.id);
        
        // Schedule retry with exponential backoff
        setTimeout(() => {
          this.insertByPriority(job);
          this.updateStatsIncremental('pending', 1);
          this.emit('jobAdded', job);
        }, retryDelay);
        
        this.updateStatsIncremental('processing', -1);
        console.log(`[WebhookQueue] Job scheduled for retry: ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries}) in ${retryDelay}ms`);
      }
    } finally {
      this.currentlyProcessing--;
      
      // Continue processing if there are more jobs
      if (this.pendingQueue.length > 0 && this.currentlyProcessing < this.maxConcurrent) {
        setImmediate(() => this.processAvailableJobs());
      }
    }
  }



  /**
   * Get queue statistics (cached for performance)
   */
  getStats(): QueueStats {
    // Update throughput calculation
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastThroughputCheck;
    
    if (timeSinceLastCheck >= 60000) { // Update every minute
      this.cachedStats.throughputPerMinute = (this.processedSinceLastCheck / timeSinceLastCheck) * 60000;
      this.lastThroughputCheck = now;
      this.processedSinceLastCheck = 0;
    }
    
    // Update average processing time
    if (this.processingTimes.length > 0) {
      const sum = this.processingTimes.reduce((a, b) => a + b, 0);
      this.cachedStats.averageProcessingTime = sum / this.processingTimes.length;
      
      // Keep only last 100 processing times for rolling average
      if (this.processingTimes.length > 100) {
        this.processingTimes = this.processingTimes.slice(-100);
      }
    }
    
    return { ...this.cachedStats };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { queueLength: number; processing: number; stats: QueueStats } {
    return {
      queueLength: this.pendingQueue.length,
      processing: this.currentlyProcessing,
      stats: this.getStats()
    };
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(): Promise<number> {
    const failedJobIds = Array.from(this.failedJobs);
    let retriedCount = 0;
    
    for (const jobId of failedJobIds) {
      const job = this.jobsById.get(jobId);
      if (job && job.status === 'failed') {
        job.status = 'pending';
        job.retryCount = 0;
        this.failedJobs.delete(jobId);
        this.insertByPriority(job);
        this.updateStatsIncremental('failed', -1);
        this.updateStatsIncremental('pending', 1);
        retriedCount++;
      }
    }
    
    console.log(`Retrying ${retriedCount} failed jobs`);
    return retriedCount;
  }

  /**
   * Clear completed jobs older than specified time
   */
  clearOldJobs(olderThanHours = 24): number {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let removedCount = 0;
    
    // Clear old completed jobs
    for (const jobId of this.completedJobs) {
      const job = this.jobsById.get(jobId);
      if (job && job.timestamp < cutoffTime) {
        this.completedJobs.delete(jobId);
        this.jobsById.delete(jobId);
        this.updateStatsIncremental('completed', -1);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`Cleared ${removedCount} old completed jobs`);
    }
    
    return removedCount;
  }

  /**
   * Update queue statistics incrementally (much more efficient)
   */
  private updateStatsIncremental(type: 'pending' | 'processing' | 'completed' | 'failed', delta: number) {
    this.cachedStats[type] += delta;
    
    if (type === 'completed' || type === 'failed') {
      this.cachedStats.totalProcessed += delta;
      this.processedSinceLastCheck += delta;
    }
  }

  /**
   * Process next batch of jobs
   */
  private processNextBatch(): void {
    // Process any pending batches that have timed out
    const now = Date.now();
    for (const [batchKey, batch] of this.pendingBatches.entries()) {
      if (now - batch.timestamp >= this.batchTimeout) {
        this.processBatch(batchKey);
      }
    }
  }

  /**
   * Stop processing and cleanup
   */
  stop(): void {
    this.processing = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    console.log('[WebhookQueue] Queue processing stopped');
  }
  
  /**
   * Get detailed queue information for monitoring
   */
  getDetailedStatus(): {
    queueLength: number;
    processing: number;
    stats: QueueStats;
    pendingBatches: number;
    backoffMultiplier: number;
    rateLimitStatus: {
      current: number;
      limit: number;
      windowMs: number;
    };
  } {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    ).length;
    
    return {
      queueLength: this.pendingQueue.length,
      processing: this.currentlyProcessing,
      stats: this.getStats(),
      pendingBatches: this.pendingBatches.size,
      backoffMultiplier: this.backoffMultiplier,
      rateLimitStatus: {
        current: recentRequests,
        limit: Math.floor(this.maxRequestsPerWindow / this.backoffMultiplier),
        windowMs: this.rateLimitWindow
      }
    };
  }
}

// Export singleton instance
export const webhookQueue = new WebhookQueue();
export type { WebhookJob, QueueStats };