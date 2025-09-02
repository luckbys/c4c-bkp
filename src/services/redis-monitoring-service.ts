import { getRedisClusterService } from './redis-cluster-service';
import type { CacheMetrics, MemoryStats } from './redis-cluster-service';

interface PerformanceAlert {
  id: string;
  type: 'memory' | 'performance' | 'error' | 'compression';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

interface AccessPattern {
  key: string;
  accessCount: number;
  lastAccess: Date;
  avgResponseTime: number;
  hitRate: number;
}

interface OptimizationSuggestion {
  type: 'ttl' | 'compression' | 'memory' | 'pattern';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedImpact: string;
  implementation: string;
}

interface DashboardData {
  overview: {
    totalKeys: number;
    hitRate: number;
    memoryUsage: number;
    compressionRatio: number;
    responseTime: number;
  };
  metrics: CacheMetrics;
  memory: MemoryStats;
  alerts: PerformanceAlert[];
  patterns: AccessPattern[];
  suggestions: OptimizationSuggestion[];
  trends: {
    hitRateHistory: Array<{ timestamp: Date; value: number }>;
    memoryHistory: Array<{ timestamp: Date; value: number }>;
    responseTimeHistory: Array<{ timestamp: Date; value: number }>;
  };
}

class RedisMonitoringService {
  private redisService = getRedisClusterService();
  private alerts: PerformanceAlert[] = [];
  private accessPatterns: Map<string, AccessPattern> = new Map();
  private performanceHistory: {
    hitRate: Array<{ timestamp: Date; value: number }>;
    memory: Array<{ timestamp: Date; value: number }>;
    responseTime: Array<{ timestamp: Date; value: number }>;
  } = {
    hitRate: [],
    memory: [],
    responseTime: []
  };
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds = {
    memoryUsage: 85, // %
    hitRate: 70, // %
    responseTime: 200, // ms
    compressionRatio: 2.0 // mínimo
  };

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Monitoramento principal a cada 30 segundos
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.analyzePatterns();
      await this.checkAlerts();
      this.cleanupOldData();
    }, 30 * 1000);

    console.log('📊 Redis Monitoring Service iniciado');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.redisService.getAdvancedMetrics();
      const timestamp = new Date();

      // Calcular hit rate
      const hitRate = metrics.cache.hits + metrics.cache.misses > 0 
        ? (metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100 
        : 0;

      // Armazenar histórico
      this.performanceHistory.hitRate.push({ timestamp, value: hitRate });
      this.performanceHistory.memory.push({ timestamp, value: metrics.memory.memoryUsagePercent });
      
      // Simular tempo de resposta (em produção, seria medido)
      const responseTime = await this.measureResponseTime();
      this.performanceHistory.responseTime.push({ timestamp, value: responseTime });

      // Limitar histórico a últimas 100 entradas
      Object.values(this.performanceHistory).forEach(history => {
        if (history.length > 100) {
          history.splice(0, history.length - 100);
        }
      });

    } catch (error) {
      console.error('❌ Erro ao coletar métricas:', error);
      this.createAlert('error', 'high', 'Falha na coleta de métricas', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async measureResponseTime(): Promise<number> {
    const start = Date.now();
    try {
      await this.redisService.get('__health_check__');
      return Date.now() - start;
    } catch (error) {
      return Date.now() - start;
    }
  }

  private async analyzePatterns(): Promise<void> {
    // Análise de padrões de acesso seria implementada aqui
    // Por enquanto, vamos simular alguns padrões
    const commonPatterns = [
      'messages:*',
      'tickets:*',
      'contacts:*',
      'instances:*'
    ];

    for (const pattern of commonPatterns) {
      const accessCount = Math.floor(Math.random() * 1000);
      const hitRate = 70 + Math.random() * 25; // 70-95%
      
      this.accessPatterns.set(pattern, {
        key: pattern,
        accessCount,
        lastAccess: new Date(),
        avgResponseTime: 20 + Math.random() * 80, // 20-100ms
        hitRate
      });
    }
  }

  private async checkAlerts(): Promise<void> {
    try {
      const metrics = await this.redisService.getAdvancedMetrics();
      const health = await this.redisService.healthCheck();

      // Verificar uso de memória
      if (metrics.memory.memoryUsagePercent > this.alertThresholds.memoryUsage) {
        this.createAlert(
          'memory',
          metrics.memory.memoryUsagePercent > 95 ? 'critical' : 'high',
          `Uso de memória alto: ${metrics.memory.memoryUsagePercent.toFixed(1)}%`,
          { memoryUsage: metrics.memory.memoryUsagePercent }
        );
      }

      // Verificar hit rate
      const hitRate = metrics.cache.hits + metrics.cache.misses > 0 
        ? (metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100 
        : 0;

      if (hitRate < this.alertThresholds.hitRate) {
        this.createAlert(
          'performance',
          hitRate < 50 ? 'high' : 'medium',
          `Hit rate baixo: ${hitRate.toFixed(1)}%`,
          { hitRate }
        );
      }

      // Verificar compressão
      if (metrics.compression.avgRatio < this.alertThresholds.compressionRatio) {
        this.createAlert(
          'compression',
          'medium',
          `Taxa de compressão baixa: ${metrics.compression.avgRatio.toFixed(2)}x`,
          { compressionRatio: metrics.compression.avgRatio }
        );
      }

      // Verificar saúde geral
      if (health.status === 'unhealthy') {
        this.createAlert(
          'error',
          'critical',
          'Redis Cluster em estado não saudável',
          { healthDetails: health.details }
        );
      }

    } catch (error) {
      console.error('❌ Erro ao verificar alertas:', error);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metadata?: any
  ): void {
    // Verificar se já existe um alerta similar não resolvido
    const existingAlert = this.alerts.find(alert => 
      !alert.resolved && 
      alert.type === type && 
      alert.message === message
    );

    if (existingAlert) {
      // Atualizar timestamp do alerta existente
      existingAlert.timestamp = new Date();
      return;
    }

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.unshift(alert);
    
    // Limitar a 50 alertas
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50);
    }

    console.log(`🚨 Alerta ${severity}: ${message}`);
  }

  private generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Sugestões baseadas nos padrões de acesso
    const lowHitRatePatterns = Array.from(this.accessPatterns.values())
      .filter(pattern => pattern.hitRate < 60);

    if (lowHitRatePatterns.length > 0) {
      suggestions.push({
        type: 'ttl',
        priority: 'high',
        description: 'Ajustar TTL para padrões com baixo hit rate',
        estimatedImpact: 'Aumento de 15-25% no hit rate',
        implementation: 'Aumentar TTL para chaves frequentemente acessadas'
      });
    }

    // Sugestões de compressão
    suggestions.push({
      type: 'compression',
      priority: 'medium',
      description: 'Implementar compressão adaptativa',
      estimatedImpact: 'Redução de 30-50% no uso de memória',
      implementation: 'Ajustar threshold de compressão baseado no tipo de dados'
    });

    // Sugestões de memória
    suggestions.push({
      type: 'memory',
      priority: 'medium',
      description: 'Otimizar políticas de eviction',
      estimatedImpact: 'Melhoria de 20% na eficiência de memória',
      implementation: 'Implementar LRU com scoring baseado em frequência'
    });

    // Sugestões de padrões
    suggestions.push({
      type: 'pattern',
      priority: 'low',
      description: 'Implementar cache warming para padrões críticos',
      estimatedImpact: 'Redução de 40% na latência inicial',
      implementation: 'Pré-carregar dados críticos durante períodos de baixa carga'
    });

    return suggestions;
  }

  private cleanupOldData(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Resolver alertas antigos automaticamente
    this.alerts.forEach(alert => {
      if (!alert.resolved && alert.timestamp < oneHourAgo) {
        alert.resolved = true;
      }
    });

    // Remover alertas muito antigos
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneDayAgo);
  }

  // API pública para dashboard
  async getDashboardData(): Promise<DashboardData> {
    try {
      const metrics = await this.redisService.getAdvancedMetrics();
      const health = await this.redisService.healthCheck();
      
      const hitRate = metrics.cache.hits + metrics.cache.misses > 0 
        ? (metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100 
        : 0;

      const responseTime = this.performanceHistory.responseTime.length > 0
        ? this.performanceHistory.responseTime[this.performanceHistory.responseTime.length - 1].value
        : 0;

      return {
        overview: {
          totalKeys: metrics.cache.sets, // Aproximação
          hitRate,
          memoryUsage: metrics.memory.memoryUsagePercent,
          compressionRatio: metrics.compression.avgRatio,
          responseTime
        },
        metrics: metrics.cache,
        memory: metrics.memory,
        alerts: this.alerts.filter(alert => !alert.resolved).slice(0, 10),
        patterns: Array.from(this.accessPatterns.values()).slice(0, 10),
        suggestions: this.generateOptimizationSuggestions(),
        trends: {
          hitRateHistory: this.performanceHistory.hitRate.slice(-20),
          memoryHistory: this.performanceHistory.memory.slice(-20),
          responseTimeHistory: this.performanceHistory.responseTime.slice(-20)
        }
      };
    } catch (error) {
      console.error('❌ Erro ao gerar dados do dashboard:', error);
      throw error;
    }
  }

  async getDetailedReport(): Promise<{
    summary: {
      period: string;
      totalRequests: number;
      avgHitRate: number;
      avgResponseTime: number;
      totalAlerts: number;
    };
    performance: {
      bestPatterns: AccessPattern[];
      worstPatterns: AccessPattern[];
      peakUsageTimes: Array<{ time: string; usage: number }>;
    };
    recommendations: {
      immediate: OptimizationSuggestion[];
      longTerm: OptimizationSuggestion[];
    };
  }> {
    const patterns = Array.from(this.accessPatterns.values());
    const suggestions = this.generateOptimizationSuggestions();
    
    const avgHitRate = this.performanceHistory.hitRate.length > 0
      ? this.performanceHistory.hitRate.reduce((sum, item) => sum + item.value, 0) / this.performanceHistory.hitRate.length
      : 0;

    const avgResponseTime = this.performanceHistory.responseTime.length > 0
      ? this.performanceHistory.responseTime.reduce((sum, item) => sum + item.value, 0) / this.performanceHistory.responseTime.length
      : 0;

    return {
      summary: {
        period: 'Últimas 24 horas',
        totalRequests: patterns.reduce((sum, p) => sum + p.accessCount, 0),
        avgHitRate,
        avgResponseTime,
        totalAlerts: this.alerts.filter(a => !a.resolved).length
      },
      performance: {
        bestPatterns: patterns
          .sort((a, b) => b.hitRate - a.hitRate)
          .slice(0, 5),
        worstPatterns: patterns
          .sort((a, b) => a.hitRate - b.hitRate)
          .slice(0, 5),
        peakUsageTimes: this.performanceHistory.memory
          .slice(-24)
          .map((item, index) => ({
            time: `${index}:00`,
            usage: item.value
          }))
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 5)
      },
      recommendations: {
        immediate: suggestions.filter(s => s.priority === 'high'),
        longTerm: suggestions.filter(s => s.priority === 'medium' || s.priority === 'low')
      }
    };
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Alerta resolvido: ${alert.message}`);
      return true;
    }
    return false;
  }

  updateThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    console.log('⚙️ Thresholds de alerta atualizados:', this.alertThresholds);
  }

  async exportMetrics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = await this.getDashboardData();
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Implementar exportação CSV
      const csvLines = [
        'Timestamp,HitRate,MemoryUsage,ResponseTime',
        ...data.trends.hitRateHistory.map((item, index) => 
          `${item.timestamp.toISOString()},${item.value},${data.trends.memoryHistory[index]?.value || 0},${data.trends.responseTimeHistory[index]?.value || 0}`
        )
      ];
      return csvLines.join('\n');
    }
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.alerts = [];
    this.accessPatterns.clear();
    this.performanceHistory = { hitRate: [], memory: [], responseTime: [] };
    
    console.log('🛑 Redis Monitoring Service destruído');
  }
}

// Singleton instance
let redisMonitoringService: RedisMonitoringService;

export function getRedisMonitoringService(): RedisMonitoringService {
  if (!redisMonitoringService) {
    redisMonitoringService = new RedisMonitoringService();
  }
  return redisMonitoringService;
}

export { RedisMonitoringService };
export type { PerformanceAlert, AccessPattern, OptimizationSuggestion, DashboardData };