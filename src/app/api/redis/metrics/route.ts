import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/services/redis-service';

export interface RedisMetrics {
  // Performance metrics
  cacheHitRate: number;
  cacheMissRate: number;
  totalOperations: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number; // ops/sec
  
  // Memory metrics
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
    byCategory: {
      messages: number;
      tickets: number;
      contacts: number;
      other: number;
    };
  };
  
  // Compression metrics
  compression: {
    totalCompressed: number;
    totalUncompressed: number;
    compressionRatio: number;
    savedBytes: number;
    byAlgorithm: {
      gzip: { ratio: number; count: number };
      lz4: { ratio: number; count: number };
      brotli: { ratio: number; count: number };
    };
  };
  
  // Cluster metrics
  cluster: {
    totalNodes: number;
    activeNodes: number;
    failedNodes: number;
    replicationLag: number;
    uptime: number;
  };
  
  // Cost savings
  costSavings: {
    firebaseCallsReduced: number;
    estimatedMonthlySavings: number;
    bandwidthSaved: number;
  };
  
  // Alerts
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  
  // Historical data for charts
  historical: {
    timestamps: string[];
    hitRates: number[];
    latencies: number[];
    memoryUsage: number[];
    throughput: number[];
  };
}

class RedisMetricsCollector {
  private static instance: RedisMetricsCollector;
  private metricsHistory: Map<string, any[]> = new Map();
  private maxHistoryPoints = 100;
  
  static getInstance(): RedisMetricsCollector {
    if (!RedisMetricsCollector.instance) {
      RedisMetricsCollector.instance = new RedisMetricsCollector();
    }
    return RedisMetricsCollector.instance;
  }
  
  async collectMetrics(): Promise<RedisMetrics> {
    const stats = await redisService.getDetailedStats();
    const clusterInfo = await redisService.getClusterInfo();
    const compressionStats = await redisService.getCompressionStats();
    
    // Calculate performance metrics
    const totalOps = stats.hits + stats.misses;
    const hitRate = totalOps > 0 ? (stats.hits / totalOps) * 100 : 0;
    const missRate = 100 - hitRate;
    
    // Memory usage breakdown
    const memoryBreakdown = await this.getMemoryBreakdown();
    
    // Generate alerts
    const alerts = await this.generateAlerts(stats, memoryBreakdown);
    
    // Update historical data
    const timestamp = new Date().toISOString();
    this.updateHistory('hitRates', hitRate);
    this.updateHistory('latencies', stats.avgLatency);
    this.updateHistory('memoryUsage', memoryBreakdown.percentage);
    this.updateHistory('throughput', stats.throughput);
    this.updateHistory('timestamps', timestamp);
    
    const metrics: RedisMetrics = {
      cacheHitRate: Math.round(hitRate * 100) / 100,
      cacheMissRate: Math.round(missRate * 100) / 100,
      totalOperations: totalOps,
      avgLatency: Math.round(stats.avgLatency * 100) / 100,
      p95Latency: Math.round(stats.p95Latency * 100) / 100,
      p99Latency: Math.round(stats.p99Latency * 100) / 100,
      throughput: Math.round(stats.throughput),
      
      memoryUsage: memoryBreakdown,
      
      compression: {
        totalCompressed: compressionStats.totalCompressed,
        totalUncompressed: compressionStats.totalUncompressed,
        compressionRatio: Math.round(compressionStats.ratio * 100) / 100,
        savedBytes: compressionStats.savedBytes,
        byAlgorithm: compressionStats.byAlgorithm
      },
      
      cluster: {
        totalNodes: clusterInfo.totalNodes,
        activeNodes: clusterInfo.activeNodes,
        failedNodes: clusterInfo.failedNodes,
        replicationLag: clusterInfo.replicationLag,
        uptime: clusterInfo.uptime
      },
      
      costSavings: {
        firebaseCallsReduced: Math.round((hitRate / 100) * totalOps),
        estimatedMonthlySavings: this.calculateMonthlySavings(hitRate, totalOps),
        bandwidthSaved: compressionStats.savedBytes
      },
      
      alerts,
      
      historical: {
        timestamps: this.getHistory('timestamps'),
        hitRates: this.getHistory('hitRates'),
        latencies: this.getHistory('latencies'),
        memoryUsage: this.getHistory('memoryUsage'),
        throughput: this.getHistory('throughput')
      }
    };
    
    return metrics;
  }
  
  private async getMemoryBreakdown() {
    const memoryInfo = await redisService.getMemoryInfo();
    const categoryUsage = await redisService.getMemoryByCategory();
    
    // Evitar divisão por zero
    const total = memoryInfo.total || 1;
    const used = memoryInfo.used || 0;
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    
    return {
      used,
      total,
      percentage: Math.min(percentage, 100), // Garantir que não exceda 100%
      byCategory: {
        messages: categoryUsage.messages || 0,
        tickets: categoryUsage.tickets || 0,
        contacts: categoryUsage.contacts || 0,
        other: categoryUsage.other || 0
      }
    };
  }
  
  private async generateAlerts(stats: any, memoryBreakdown: any): Promise<RedisMetrics['alerts']> {
    const alerts: RedisMetrics['alerts'] = [];
    
    // Memory usage alert
    if (memoryBreakdown.percentage > 80) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: 'warning',
        message: `Uso de memória alto: ${memoryBreakdown.percentage}%`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // High latency alert
    if (stats.avgLatency > 100) {
      alerts.push({
        id: `latency-${Date.now()}`,
        type: 'warning',
        message: `Latência alta detectada: ${stats.avgLatency}ms`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // Low hit rate alert
    const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;
    if (hitRate < 70) {
      alerts.push({
        id: `hitrate-${Date.now()}`,
        type: 'warning',
        message: `Taxa de acerto baixa: ${hitRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    return alerts;
  }
  
  private calculateMonthlySavings(hitRate: number, totalOps: number): number {
    // Estimativa baseada em custo por operação Firebase
    const firebaseCostPerOp = 0.0001; // $0.0001 por operação
    const opsPerMonth = totalOps * 30 * 24; // Extrapolação mensal
    const savedOps = (hitRate / 100) * opsPerMonth;
    return Math.round(savedOps * firebaseCostPerOp * 100) / 100;
  }
  
  private updateHistory(key: string, value: any): void {
    if (!this.metricsHistory.has(key)) {
      this.metricsHistory.set(key, []);
    }
    
    const history = this.metricsHistory.get(key)!;
    history.push(value);
    
    // Manter apenas os últimos N pontos
    if (history.length > this.maxHistoryPoints) {
      history.shift();
    }
  }
  
  private getHistory(key: string): any[] {
    return this.metricsHistory.get(key) || [];
  }
}

const metricsCollector = RedisMetricsCollector.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1h';
    const category = searchParams.get('category');
    
    console.log('📊 Coletando métricas Redis...', { period, category });
    
    const metrics = await metricsCollector.collectMetrics();
    
    // Filtrar por categoria se especificado
    if (category) {
      const filteredMetrics = {
        ...metrics,
        historical: {
          ...metrics.historical,
          // Filtrar dados históricos por categoria se necessário
        }
      };
      return NextResponse.json(filteredMetrics);
    }
    
    console.log('✅ Métricas coletadas com sucesso', {
      hitRate: metrics.cacheHitRate,
      memoryUsage: metrics.memoryUsage.percentage,
      alerts: metrics.alerts.length
    });
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('❌ Erro ao coletar métricas Redis:', error);
    
    // Retornar métricas padrão em caso de erro
    const fallbackMetrics: RedisMetrics = {
      cacheHitRate: 0,
      cacheMissRate: 100,
      totalOperations: 0,
      avgLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      memoryUsage: {
        used: 0,
        total: 1,
        percentage: 0,
        byCategory: { messages: 0, tickets: 0, contacts: 0, other: 0 }
      },
      compression: {
        totalCompressed: 0,
        totalUncompressed: 0,
        compressionRatio: 0,
        savedBytes: 0,
        byAlgorithm: {
          gzip: { ratio: 0, count: 0 },
          lz4: { ratio: 0, count: 0 },
          brotli: { ratio: 0, count: 0 }
        }
      },
      cluster: {
        totalNodes: 1,
        activeNodes: 0,
        failedNodes: 1,
        replicationLag: 0,
        uptime: 0
      },
      costSavings: {
        firebaseCallsReduced: 0,
        estimatedMonthlySavings: 0,
        bandwidthSaved: 0
      },
      alerts: [{
        id: 'error-connection',
        type: 'error',
        message: 'Erro de conexão com Redis',
        timestamp: new Date(),
        resolved: false
      }],
      historical: {
        timestamps: [],
        hitRates: [],
        latencies: [],
        memoryUsage: [],
        throughput: []
      }
    };
    
    return NextResponse.json(fallbackMetrics, { status: 200 });
  }
}

// Endpoint para limpar histórico
export async function DELETE() {
  try {
    metricsCollector['metricsHistory'].clear();
    return NextResponse.json({ message: 'Histórico de métricas limpo com sucesso' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao limpar histórico' },
      { status: 500 }
    );
  }
}