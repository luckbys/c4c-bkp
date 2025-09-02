import { NextRequest, NextResponse } from 'next/server';
import { webhookQueue } from '@/services/webhook-queue';

// Métricas de performance em tempo real
interface WebhookMetrics {
  latency: {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  throughput: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    totalProcessed: number;
  };
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  sync: {
    syncProcessed: number;
    syncFailed: number;
    avgSyncTime: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    lastProcessed: number;
  };
}

class WebhookMonitor {
  private static instance: WebhookMonitor;
  private latencyHistory: number[] = [];
  private syncLatencyHistory: number[] = [];
  private startTime = Date.now();
  private lastProcessedTime = Date.now();
  private syncProcessedCount = 0;
  private syncFailedCount = 0;
  private totalProcessed = 0;
  private processedInLastSecond = 0;
  private processedInLastMinute = 0;
  private lastSecondReset = Date.now();
  private lastMinuteReset = Date.now();

  static getInstance(): WebhookMonitor {
    if (!WebhookMonitor.instance) {
      WebhookMonitor.instance = new WebhookMonitor();
    }
    return WebhookMonitor.instance;
  }

  recordLatency(latency: number, isSync: boolean = false): void {
    if (isSync) {
      this.syncLatencyHistory.push(latency);
      this.syncProcessedCount++;
      // Manter apenas os últimos 1000 registros para sync
      if (this.syncLatencyHistory.length > 1000) {
        this.syncLatencyHistory.shift();
      }
    } else {
      this.latencyHistory.push(latency);
    }
    
    // Manter apenas os últimos 10000 registros
    if (this.latencyHistory.length > 10000) {
      this.latencyHistory.shift();
    }
    
    this.lastProcessedTime = Date.now();
    this.totalProcessed++;
    
    // Atualizar contadores por segundo e minuto
    const now = Date.now();
    if (now - this.lastSecondReset >= 1000) {
      this.processedInLastSecond = 0;
      this.lastSecondReset = now;
    }
    if (now - this.lastMinuteReset >= 60000) {
      this.processedInLastMinute = 0;
      this.lastMinuteReset = now;
    }
    
    this.processedInLastSecond++;
    this.processedInLastMinute++;
  }

  recordSyncFailure(): void {
    this.syncFailedCount++;
  }

  getMetrics(): WebhookMetrics {
    const queueStats = webhookQueue.getStats();
    const now = Date.now();
    
    // Calcular percentis de latência
    const sortedLatencies = [...this.latencyHistory].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    
    // Calcular latência média para sync
    const avgSyncTime = this.syncLatencyHistory.length > 0 
      ? this.syncLatencyHistory.reduce((a, b) => a + b, 0) / this.syncLatencyHistory.length 
      : 0;
    
    // Determinar status de saúde
    const timeSinceLastProcessed = now - this.lastProcessedTime;
    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (timeSinceLastProcessed > 30000) { // 30 segundos
      healthStatus = 'critical';
    } else if (timeSinceLastProcessed > 10000 || queueStats.failed > queueStats.completed * 0.1) {
      healthStatus = 'degraded';
    }
    
    return {
      latency: {
        average: sortedLatencies.length > 0 
          ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length 
          : 0,
        min: sortedLatencies.length > 0 ? sortedLatencies[0] : 0,
        max: sortedLatencies.length > 0 ? sortedLatencies[sortedLatencies.length - 1] : 0,
        p95: sortedLatencies.length > 0 ? sortedLatencies[p95Index] || 0 : 0,
        p99: sortedLatencies.length > 0 ? sortedLatencies[p99Index] || 0 : 0
      },
      throughput: {
        messagesPerSecond: this.processedInLastSecond,
        messagesPerMinute: this.processedInLastMinute,
        totalProcessed: this.totalProcessed
      },
      queue: {
        pending: queueStats.pending,
        processing: queueStats.processing,
        completed: queueStats.completed,
        failed: queueStats.failed
      },
      sync: {
        syncProcessed: this.syncProcessedCount,
        syncFailed: this.syncFailedCount,
        avgSyncTime: Math.round(avgSyncTime)
      },
      health: {
        status: healthStatus,
        uptime: now - this.startTime,
        lastProcessed: this.lastProcessedTime
      }
    };
  }

  reset(): void {
    this.latencyHistory = [];
    this.syncLatencyHistory = [];
    this.syncProcessedCount = 0;
    this.syncFailedCount = 0;
    this.totalProcessed = 0;
    this.processedInLastSecond = 0;
    this.processedInLastMinute = 0;
    this.startTime = Date.now();
    this.lastProcessedTime = Date.now();
  }
}

const monitor = WebhookMonitor.getInstance();

// Endpoint para obter métricas em tempo real
export async function GET(request: NextRequest) {
  try {
    const metrics = monitor.getMetrics();
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      metrics,
      message: 'Métricas de webhook em tempo real'
    });
  } catch (error) {
    console.error('Erro ao obter métricas de webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para resetar métricas
export async function DELETE(request: NextRequest) {
  try {
    monitor.reset();
    
    return NextResponse.json({
      success: true,
      message: 'Métricas resetadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao resetar métricas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Exportar monitor para uso em outros módulos
export { monitor as webhookMonitor };
export type { WebhookMetrics };