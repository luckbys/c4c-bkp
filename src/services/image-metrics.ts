// Serviço de métricas para monitoramento de carregamento de imagens

interface ImageMetrics {
  totalAttempts: number;
  successfulLoads: number;
  failedLoads: number;
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  retryAttempts: number;
  base64Conversions: number;
  blobUrlCreations: number;
}

interface ImageLoadEvent {
  messageId: string;
  method: 'cache' | 'direct_url' | 'evolution_api' | 'base64' | 'blob';
  success: boolean;
  loadTime?: number;
  errorType?: string;
  retryCount?: number;
  imageSize?: number;
}

class ImageMetricsService {
  private static instance: ImageMetricsService;
  private metrics: ImageMetrics = {
    totalAttempts: 0,
    successfulLoads: 0,
    failedLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLoadTime: 0,
    retryAttempts: 0,
    base64Conversions: 0,
    blobUrlCreations: 0
  };
  
  private loadTimes: number[] = [];
  private recentEvents: ImageLoadEvent[] = [];
  private maxRecentEvents = 100;

  private constructor() {
    // Log métricas a cada 5 minutos
    setInterval(() => {
      this.logMetricsSummary();
    }, 5 * 60 * 1000);
  }

  static getInstance(): ImageMetricsService {
    if (!ImageMetricsService.instance) {
      ImageMetricsService.instance = new ImageMetricsService();
    }
    return ImageMetricsService.instance;
  }

  /**
   * Registrar tentativa de carregamento de imagem
   */
  recordImageLoadAttempt(messageId: string, method: ImageLoadEvent['method']): void {
    this.metrics.totalAttempts++;
    
    if (method === 'cache') {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    console.log(`🖼️ [METRICS] Tentativa de carregamento: ${messageId} via ${method}`);
  }

  /**
   * Registrar sucesso no carregamento
   */
  recordImageLoadSuccess(event: Omit<ImageLoadEvent, 'success'>): void {
    this.metrics.successfulLoads++;
    
    if (event.loadTime) {
      this.loadTimes.push(event.loadTime);
      this.updateAverageLoadTime();
    }
    
    if (event.method === 'base64') {
      this.metrics.base64Conversions++;
    }
    
    if (event.method === 'blob') {
      this.metrics.blobUrlCreations++;
    }
    
    const fullEvent: ImageLoadEvent = { ...event, success: true };
    this.addRecentEvent(fullEvent);
    
    console.log(`🖼️ [METRICS] ✅ Sucesso: ${event.messageId} via ${event.method} (${event.loadTime}ms)`);
  }

  /**
   * Registrar falha no carregamento
   */
  recordImageLoadFailure(event: Omit<ImageLoadEvent, 'success'>): void {
    this.metrics.failedLoads++;
    
    if (event.retryCount) {
      this.metrics.retryAttempts += event.retryCount;
    }
    
    const fullEvent: ImageLoadEvent = { ...event, success: false };
    this.addRecentEvent(fullEvent);
    
    console.log(`🖼️ [METRICS] ❌ Falha: ${event.messageId} via ${event.method} - ${event.errorType}`);
  }

  /**
   * Obter métricas atuais
   */
  getMetrics(): ImageMetrics & { successRate: number; cacheHitRate: number } {
    const successRate = this.metrics.totalAttempts > 0 
      ? (this.metrics.successfulLoads / this.metrics.totalAttempts) * 100 
      : 0;
    
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 
      ? (this.metrics.cacheHits / totalCacheRequests) * 100 
      : 0;
    
    return {
      ...this.metrics,
      successRate: Math.round(successRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }

  /**
   * Obter eventos recentes
   */
  getRecentEvents(): ImageLoadEvent[] {
    return [...this.recentEvents];
  }

  /**
   * Obter estatísticas de falhas
   */
  getFailureStats(): { [errorType: string]: number } {
    const failureStats: { [errorType: string]: number } = {};
    
    this.recentEvents
      .filter(event => !event.success && event.errorType)
      .forEach(event => {
        const errorType = event.errorType!;
        failureStats[errorType] = (failureStats[errorType] || 0) + 1;
      });
    
    return failureStats;
  }

  /**
   * Reset das métricas
   */
  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulLoads: 0,
      failedLoads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTime: 0,
      retryAttempts: 0,
      base64Conversions: 0,
      blobUrlCreations: 0
    };
    
    this.loadTimes = [];
    this.recentEvents = [];
    
    console.log('🖼️ [METRICS] Métricas resetadas');
  }

  private updateAverageLoadTime(): void {
    if (this.loadTimes.length === 0) return;
    
    const sum = this.loadTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageLoadTime = Math.round(sum / this.loadTimes.length);
    
    // Manter apenas os últimos 100 tempos para evitar uso excessivo de memória
    if (this.loadTimes.length > 100) {
      this.loadTimes = this.loadTimes.slice(-100);
    }
  }

  private addRecentEvent(event: ImageLoadEvent): void {
    this.recentEvents.push({
      ...event,
      // Adicionar timestamp implícito
    });
    
    // Manter apenas os eventos mais recentes
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents = this.recentEvents.slice(-this.maxRecentEvents);
    }
  }

  private logMetricsSummary(): void {
    const metrics = this.getMetrics();
    const failureStats = this.getFailureStats();
    
    console.log('🖼️ [METRICS SUMMARY] ==========================================');
    console.log(`🖼️ [METRICS] Total de tentativas: ${metrics.totalAttempts}`);
    console.log(`🖼️ [METRICS] Taxa de sucesso: ${metrics.successRate}%`);
    console.log(`🖼️ [METRICS] Taxa de cache hit: ${metrics.cacheHitRate}%`);
    console.log(`🖼️ [METRICS] Tempo médio de carregamento: ${metrics.averageLoadTime}ms`);
    console.log(`🖼️ [METRICS] Conversões base64: ${metrics.base64Conversions}`);
    console.log(`🖼️ [METRICS] Blob URLs criadas: ${metrics.blobUrlCreations}`);
    console.log(`🖼️ [METRICS] Tentativas de retry: ${metrics.retryAttempts}`);
    
    if (Object.keys(failureStats).length > 0) {
      console.log('🖼️ [METRICS] Tipos de falhas:');
      Object.entries(failureStats).forEach(([errorType, count]) => {
        console.log(`🖼️ [METRICS]   ${errorType}: ${count}`);
      });
    }
    
    console.log('🖼️ [METRICS] ==========================================');
  }
}

// Singleton instance
export const imageMetrics = ImageMetricsService.getInstance();
export default imageMetrics;
export type { ImageMetrics, ImageLoadEvent };
export { ImageMetricsService };