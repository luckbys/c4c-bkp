import { EventEmitter } from 'events';
import { optimizedCacheService } from './optimized-cache-service';
import { pushNotificationService } from './push-notification-service';
import { cacheQueueCoordinator } from './cache-queue-coordinator';
import { redisService } from './redis-service';

interface PerformanceMetrics {
  timestamp: number;
  cache: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
    averageResponseTime: number;
    memoryUsage: number;
    redisConnected: boolean;
  };
  notifications: {
    activeConnections: number;
    messagesSent: number;
    averageLatency: number;
    failureRate: number;
  };
  coordination: {
    eventsProcessed: number;
    averageProcessingTime: number;
    queueLength: number;
    errorRate: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    cache: 'healthy' | 'warning' | 'critical';
    notifications: 'healthy' | 'warning' | 'critical';
    coordination: 'healthy' | 'warning' | 'critical';
    redis: 'healthy' | 'warning' | 'critical';
  };
  issues: string[];
  recommendations: string[];
}

interface Alert {
  id: string;
  type: 'performance' | 'error' | 'warning' | 'info';
  component: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  resolved: boolean;
  metadata?: any;
}

interface PerformanceThresholds {
  cache: {
    hitRateMin: number;
    responseTimeMax: number;
    memoryUsageMax: number;
  };
  notifications: {
    latencyMax: number;
    failureRateMax: number;
    connectionMin: number;
  };
  coordination: {
    processingTimeMax: number;
    queueLengthMax: number;
    errorRateMax: number;
  };
  system: {
    cpuUsageMax: number;
    memoryUsageMax: number;
  };
}

class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private alerts: Alert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly MONITORING_INTERVAL = 5000; // 5 segundos
  private readonly ALERT_CLEANUP_INTERVAL = 300000; // 5 minutos
  
  private thresholds: PerformanceThresholds = {
    cache: {
      hitRateMin: 0.8, // 80%
      responseTimeMax: 100, // 100ms
      memoryUsageMax: 500 * 1024 * 1024 // 500MB
    },
    notifications: {
      latencyMax: 50, // 50ms
      failureRateMax: 0.05, // 5%
      connectionMin: 1
    },
    coordination: {
      processingTimeMax: 1000, // 1 segundo
      queueLengthMax: 100,
      errorRateMax: 0.02 // 2%
    },
    system: {
      cpuUsageMax: 80, // 80%
      memoryUsageMax: 1024 * 1024 * 1024 // 1GB
    }
  };

  private constructor() {
    super();
    this.setupEventListeners();
    this.startCleanupInterval();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Configurar listeners para eventos dos serviços
   */
  private setupEventListeners(): void {
    // Cache events
    optimizedCacheService.on('cache:hit', () => {
      this.emit('monitor:cache_hit');
    });

    optimizedCacheService.on('cache:miss', () => {
      this.emit('monitor:cache_miss');
    });

    // Notification events
    pushNotificationService.on('notification:sent', (data) => {
      this.emit('monitor:notification_sent', data);
    });

    pushNotificationService.on('connection:established', () => {
      this.emit('monitor:connection_established');
    });

    pushNotificationService.on('connection:lost', () => {
      this.emit('monitor:connection_lost');
    });

    // Coordination events
    cacheQueueCoordinator.on('coordination:message_processed', (data) => {
      this.emit('monitor:coordination_processed', data);
    });
  }

  /**
   * Iniciar monitoramento
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('⚠️ Performance monitoring already running');
      return;
    }

    console.log('🔍 Starting performance monitoring...');
    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.analyzeHealth();
      } catch (error) {
        console.error('Error in performance monitoring:', error);
        this.createAlert({
          type: 'error',
          component: 'monitor',
          message: `Monitoring error: ${error.message}`,
          severity: 'medium'
        });
      }
    }, this.MONITORING_INTERVAL);

    this.emit('monitor:started');
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping performance monitoring...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitor:stopped');
  }

  /**
   * Coletar métricas de todos os componentes
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();
    
    const metrics: PerformanceMetrics = {
      timestamp,
      cache: await this.collectCacheMetrics(),
      notifications: await this.collectNotificationMetrics(),
      coordination: await this.collectCoordinationMetrics(),
      system: await this.collectSystemMetrics()
    };

    // Adicionar às métricas históricas
    this.metrics.push(metrics);
    
    // Manter apenas o histórico máximo
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    this.emit('monitor:metrics_collected', metrics);
  }

  /**
   * Coletar métricas de cache
   */
  private async collectCacheMetrics(): Promise<PerformanceMetrics['cache']> {
    try {
      const cacheMetrics = optimizedCacheService.getMetrics();
      const redisConnected = await this.checkRedisConnection();
      
      return {
        hitRate: cacheMetrics.hitRate,
        missRate: 1 - cacheMetrics.hitRate,
        totalRequests: cacheMetrics.totalRequests,
        averageResponseTime: cacheMetrics.averageResponseTime,
        memoryUsage: cacheMetrics.memoryUsage,
        redisConnected
      };
    } catch (error) {
      console.error('Error collecting cache metrics:', error);
      return {
        hitRate: 0,
        missRate: 1,
        totalRequests: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        redisConnected: false
      };
    }
  }

  /**
   * Coletar métricas de notificações
   */
  private async collectNotificationMetrics(): Promise<PerformanceMetrics['notifications']> {
    try {
      const notificationStats = pushNotificationService.getStatistics();
      
      return {
        activeConnections: notificationStats.activeConnections,
        messagesSent: notificationStats.messagesSent,
        averageLatency: notificationStats.averageLatency,
        failureRate: notificationStats.failureRate
      };
    } catch (error) {
      console.error('Error collecting notification metrics:', error);
      return {
        activeConnections: 0,
        messagesSent: 0,
        averageLatency: 0,
        failureRate: 1
      };
    }
  }

  /**
   * Coletar métricas de coordenação
   */
  private async collectCoordinationMetrics(): Promise<PerformanceMetrics['coordination']> {
    try {
      const coordinationMetrics = cacheQueueCoordinator.getMetrics();
      
      return {
        eventsProcessed: coordinationMetrics.eventsProcessed,
        averageProcessingTime: coordinationMetrics.averageProcessingTime,
        queueLength: 0, // Implementar se necessário
        errorRate: coordinationMetrics.errors / Math.max(coordinationMetrics.eventsProcessed, 1)
      };
    } catch (error) {
      console.error('Error collecting coordination metrics:', error);
      return {
        eventsProcessed: 0,
        averageProcessingTime: 0,
        queueLength: 0,
        errorRate: 1
      };
    }
  }

  /**
   * Coletar métricas do sistema
   */
  private async collectSystemMetrics(): Promise<PerformanceMetrics['system']> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;
      
      // CPU usage seria mais complexo de calcular precisamente
      // Por simplicidade, usando uma estimativa baseada no uso de memória
      const cpuUsage = Math.min((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100, 100);
      
      return {
        cpuUsage,
        memoryUsage: memoryUsage.heapUsed,
        uptime
      };
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0
      };
    }
  }

  /**
   * Verificar conexão com Redis
   */
  private async checkRedisConnection(): Promise<boolean> {
    try {
      await redisService.set('health_check', 'ok', 1);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Analisar saúde do sistema
   */
  private async analyzeHealth(): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const healthStatus = this.calculateHealthStatus(latestMetrics);
    
    // Verificar se há problemas e criar alertas
    await this.checkThresholds(latestMetrics);
    
    this.emit('monitor:health_analyzed', healthStatus);
  }

  /**
   * Calcular status de saúde
   */
  private calculateHealthStatus(metrics: PerformanceMetrics): HealthStatus {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Analisar cache
    const cacheHealth = this.analyzeCacheHealth(metrics.cache, issues, recommendations);
    
    // Analisar notificações
    const notificationsHealth = this.analyzeNotificationsHealth(metrics.notifications, issues, recommendations);
    
    // Analisar coordenação
    const coordinationHealth = this.analyzeCoordinationHealth(metrics.coordination, issues, recommendations);
    
    // Analisar Redis
    const redisHealth = metrics.cache.redisConnected ? 'healthy' : 'critical';
    if (!metrics.cache.redisConnected) {
      issues.push('Redis connection lost');
      recommendations.push('Check Redis server status and network connectivity');
    }
    
    // Determinar saúde geral
    const componentHealths = [cacheHealth, notificationsHealth, coordinationHealth, redisHealth];
    const overall = this.determineOverallHealth(componentHealths);
    
    return {
      overall,
      components: {
        cache: cacheHealth,
        notifications: notificationsHealth,
        coordination: coordinationHealth,
        redis: redisHealth
      },
      issues,
      recommendations
    };
  }

  /**
   * Analisar saúde do cache
   */
  private analyzeCacheHealth(
    cache: PerformanceMetrics['cache'],
    issues: string[],
    recommendations: string[]
  ): 'healthy' | 'warning' | 'critical' {
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (cache.hitRate < this.thresholds.cache.hitRateMin) {
      health = cache.hitRate < 0.5 ? 'critical' : 'warning';
      issues.push(`Low cache hit rate: ${(cache.hitRate * 100).toFixed(1)}%`);
      recommendations.push('Review cache TTL settings and cache key patterns');
    }
    
    if (cache.averageResponseTime > this.thresholds.cache.responseTimeMax) {
      health = cache.averageResponseTime > 500 ? 'critical' : 'warning';
      issues.push(`High cache response time: ${cache.averageResponseTime}ms`);
      recommendations.push('Optimize cache queries and consider Redis performance tuning');
    }
    
    if (cache.memoryUsage > this.thresholds.cache.memoryUsageMax) {
      health = 'warning';
      issues.push(`High cache memory usage: ${(cache.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
      recommendations.push('Implement cache cleanup policies and review TTL settings');
    }
    
    return health;
  }

  /**
   * Analisar saúde das notificações
   */
  private analyzeNotificationsHealth(
    notifications: PerformanceMetrics['notifications'],
    issues: string[],
    recommendations: string[]
  ): 'healthy' | 'warning' | 'critical' {
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (notifications.failureRate > this.thresholds.notifications.failureRateMax) {
      health = notifications.failureRate > 0.2 ? 'critical' : 'warning';
      issues.push(`High notification failure rate: ${(notifications.failureRate * 100).toFixed(1)}%`);
      recommendations.push('Check WebSocket connections and network stability');
    }
    
    if (notifications.averageLatency > this.thresholds.notifications.latencyMax) {
      health = notifications.averageLatency > 200 ? 'critical' : 'warning';
      issues.push(`High notification latency: ${notifications.averageLatency}ms`);
      recommendations.push('Optimize notification processing and check network performance');
    }
    
    if (notifications.activeConnections < this.thresholds.notifications.connectionMin) {
      health = 'warning';
      issues.push('No active notification connections');
      recommendations.push('Verify WebSocket server is running and clients can connect');
    }
    
    return health;
  }

  /**
   * Analisar saúde da coordenação
   */
  private analyzeCoordinationHealth(
    coordination: PerformanceMetrics['coordination'],
    issues: string[],
    recommendations: string[]
  ): 'healthy' | 'warning' | 'critical' {
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (coordination.averageProcessingTime > this.thresholds.coordination.processingTimeMax) {
      health = coordination.averageProcessingTime > 5000 ? 'critical' : 'warning';
      issues.push(`High coordination processing time: ${coordination.averageProcessingTime}ms`);
      recommendations.push('Optimize event processing logic and consider parallel processing');
    }
    
    if (coordination.queueLength > this.thresholds.coordination.queueLengthMax) {
      health = coordination.queueLength > 500 ? 'critical' : 'warning';
      issues.push(`High coordination queue length: ${coordination.queueLength}`);
      recommendations.push('Increase processing capacity or optimize event handling');
    }
    
    if (coordination.errorRate > this.thresholds.coordination.errorRateMax) {
      health = coordination.errorRate > 0.1 ? 'critical' : 'warning';
      issues.push(`High coordination error rate: ${(coordination.errorRate * 100).toFixed(1)}%`);
      recommendations.push('Review error logs and fix underlying issues');
    }
    
    return health;
  }

  /**
   * Determinar saúde geral
   */
  private determineOverallHealth(
    componentHealths: ('healthy' | 'warning' | 'critical')[]
  ): 'healthy' | 'warning' | 'critical' {
    if (componentHealths.includes('critical')) {
      return 'critical';
    }
    if (componentHealths.includes('warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Verificar thresholds e criar alertas
   */
  private async checkThresholds(metrics: PerformanceMetrics): Promise<void> {
    // Cache thresholds
    if (metrics.cache.hitRate < this.thresholds.cache.hitRateMin) {
      this.createAlert({
        type: 'performance',
        component: 'cache',
        message: `Cache hit rate below threshold: ${(metrics.cache.hitRate * 100).toFixed(1)}%`,
        severity: metrics.cache.hitRate < 0.5 ? 'critical' : 'high',
        metadata: { hitRate: metrics.cache.hitRate, threshold: this.thresholds.cache.hitRateMin }
      });
    }
    
    // Notification thresholds
    if (metrics.notifications.failureRate > this.thresholds.notifications.failureRateMax) {
      this.createAlert({
        type: 'error',
        component: 'notifications',
        message: `Notification failure rate above threshold: ${(metrics.notifications.failureRate * 100).toFixed(1)}%`,
        severity: metrics.notifications.failureRate > 0.2 ? 'critical' : 'high',
        metadata: { failureRate: metrics.notifications.failureRate, threshold: this.thresholds.notifications.failureRateMax }
      });
    }
    
    // System thresholds
    if (metrics.system.memoryUsage > this.thresholds.system.memoryUsageMax) {
      this.createAlert({
        type: 'warning',
        component: 'system',
        message: `Memory usage above threshold: ${(metrics.system.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        severity: 'medium',
        metadata: { memoryUsage: metrics.system.memoryUsage, threshold: this.thresholds.system.memoryUsageMax }
      });
    }
  }

  /**
   * Criar alerta
   */
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...alertData
    };
    
    this.alerts.push(alert);
    this.emit('monitor:alert_created', alert);
    
    console.warn(`🚨 Alert [${alert.severity}]: ${alert.message}`);
  }

  /**
   * Resolver alerta
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.emit('monitor:alert_resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Iniciar limpeza automática de alertas
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.ALERT_CLEANUP_INTERVAL;
      
      const initialCount = this.alerts.length;
      this.alerts = this.alerts.filter(alert => 
        !alert.resolved || alert.timestamp > cutoff
      );
      
      const cleanedCount = initialCount - this.alerts.length;
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old alerts`);
      }
    }, this.ALERT_CLEANUP_INTERVAL);
  }

  /**
   * Obter métricas históricas
   */
  getMetrics(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Obter métricas mais recentes
   */
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Obter todos os alertas
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Obter status de saúde atual
   */
  getCurrentHealth(): HealthStatus | null {
    const latestMetrics = this.getLatestMetrics();
    return latestMetrics ? this.calculateHealthStatus(latestMetrics) : null;
  }

  /**
   * Configurar thresholds personalizados
   */
  setThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('monitor:thresholds_updated', this.thresholds);
  }

  /**
   * Obter thresholds atuais
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Gerar relatório de performance
   */
  generateReport(timeRange?: { start: number; end: number }): {
    summary: any;
    metrics: PerformanceMetrics[];
    alerts: Alert[];
    health: HealthStatus | null;
  } {
    let filteredMetrics = this.metrics;
    let filteredAlerts = this.alerts;
    
    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
      filteredAlerts = this.alerts.filter(
        a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }
    
    const summary = this.calculateSummary(filteredMetrics, filteredAlerts);
    
    return {
      summary,
      metrics: filteredMetrics,
      alerts: filteredAlerts,
      health: this.getCurrentHealth()
    };
  }

  /**
   * Calcular resumo das métricas
   */
  private calculateSummary(metrics: PerformanceMetrics[], alerts: Alert[]): any {
    if (metrics.length === 0) {
      return {
        period: 'No data',
        averages: {},
        totals: {},
        alerts: { total: 0, byType: {}, bySeverity: {} }
      };
    }
    
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    
    return {
      period: {
        start: first.timestamp,
        end: last.timestamp,
        duration: last.timestamp - first.timestamp
      },
      averages: {
        cacheHitRate: metrics.reduce((sum, m) => sum + m.cache.hitRate, 0) / metrics.length,
        cacheResponseTime: metrics.reduce((sum, m) => sum + m.cache.averageResponseTime, 0) / metrics.length,
        notificationLatency: metrics.reduce((sum, m) => sum + m.notifications.averageLatency, 0) / metrics.length,
        coordinationProcessingTime: metrics.reduce((sum, m) => sum + m.coordination.averageProcessingTime, 0) / metrics.length
      },
      totals: {
        cacheRequests: metrics.reduce((sum, m) => sum + m.cache.totalRequests, 0),
        notificationsSent: metrics.reduce((sum, m) => sum + m.notifications.messagesSent, 0),
        eventsProcessed: metrics.reduce((sum, m) => sum + m.coordination.eventsProcessed, 0)
      },
      alerts: {
        total: alerts.length,
        byType: this.groupBy(alerts, 'type'),
        bySeverity: this.groupBy(alerts, 'severity')
      }
    };
  }

  /**
   * Agrupar array por propriedade
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  /**
   * Parar monitor e limpar recursos
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Performance Monitor...');
    
    this.stopMonitoring();
    this.removeAllListeners();
    
    // Limpar dados
    this.metrics = [];
    this.alerts = [];
    
    console.log('✅ Performance Monitor shutdown complete');
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
export { PerformanceMonitor };
export type { PerformanceMetrics, HealthStatus, Alert, PerformanceThresholds };