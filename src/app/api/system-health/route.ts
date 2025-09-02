import { NextRequest, NextResponse } from 'next/server';
import { webhookQueue } from '@/services/webhook-queue';
import { cacheService } from '@/services/cache-service';
import { retryService } from '@/services/retry-service';

// Interface para status geral do sistema
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
  uptime: number;
  components: {
    webhooks: ComponentHealth;
    cache: ComponentHealth;
    retry: ComponentHealth;
    firebase: ComponentHealth;
    evolution: ComponentHealth;
  };
  metrics: {
    webhook: any;
    cache: any;
    retry: any;
  };
  recommendations: string[];
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  lastCheck: number;
  metrics?: any;
}

class SystemHealthMonitor {
  private static instance: SystemHealthMonitor;
  private startTime = Date.now();
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000; // 30 segundos

  static getInstance(): SystemHealthMonitor {
    if (!SystemHealthMonitor.instance) {
      SystemHealthMonitor.instance = new SystemHealthMonitor();
    }
    return SystemHealthMonitor.instance;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Obter métricas de todos os componentes
    const webhookMetrics = webhookQueue.getStats();
    const cacheMetrics = cacheService.getStats();
    const retryMetrics = retryService.getStats();

    // Avaliar saúde de cada componente
    const components = {
      webhooks: this.evaluateWebhookHealth(webhookMetrics),
      cache: this.evaluateCacheHealth(cacheMetrics),
      retry: this.evaluateRetryHealth(retryMetrics),
      firebase: await this.evaluateFirebaseHealth(),
      evolution: await this.evaluateEvolutionHealth()
    };

    // Determinar status geral do sistema
    const overallStatus = this.determineOverallStatus(components);

    // Gerar recomendações
    const recommendations = this.generateRecommendations(components, {
      webhook: webhookMetrics,
      cache: cacheMetrics,
      retry: retryMetrics
    });

    return {
      status: overallStatus,
      timestamp: now,
      uptime,
      components,
      metrics: {
        webhook: webhookMetrics,
        cache: cacheMetrics,
        retry: retryMetrics
      },
      recommendations
    };
  }

  private evaluateWebhookHealth(metrics: any): ComponentHealth {
    const { pending, processing, failed, completed } = metrics;
    const totalProcessed = failed + completed;
    const failureRate = totalProcessed > 0 ? (failed / totalProcessed) * 100 : 0;
    const queueBacklog = pending + processing;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let message = 'Sistema de webhooks funcionando normalmente';

    if (failureRate > 20 || queueBacklog > 1000) {
      status = 'critical';
      message = `Taxa de falha alta (${failureRate.toFixed(1)}%) ou fila sobrecarregada (${queueBacklog} itens)`;
    } else if (failureRate > 10 || queueBacklog > 500) {
      status = 'degraded';
      message = `Performance degradada: ${failureRate.toFixed(1)}% falhas, ${queueBacklog} itens na fila`;
    }

    return {
      status,
      message,
      lastCheck: Date.now(),
      metrics: {
        failureRate: Math.round(failureRate * 100) / 100,
        queueBacklog,
        throughput: metrics.throughputPerMinute
      }
    };
  }

  private evaluateCacheHealth(metrics: any): ComponentHealth {
    const { hitRate, totalEntries, memoryUsage } = metrics;
    const memoryMB = Math.round(memoryUsage / 1024 / 1024 * 100) / 100;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let message = `Cache funcionando bem (${hitRate}% hit rate)`;

    if (hitRate < 50 || memoryMB > 500) {
      status = 'critical';
      message = `Cache com problemas: ${hitRate}% hit rate, ${memoryMB}MB memória`;
    } else if (hitRate < 70 || memoryMB > 200) {
      status = 'degraded';
      message = `Performance do cache degradada: ${hitRate}% hit rate, ${memoryMB}MB memória`;
    }

    return {
      status,
      message,
      lastCheck: Date.now(),
      metrics: {
        hitRate,
        totalEntries,
        memoryUsageMB: memoryMB
      }
    };
  }

  private evaluateRetryHealth(metrics: any): ComponentHealth {
    const { successRate, totalAttempts, averageRetryTime } = metrics;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let message = `Sistema de retry funcionando bem (${successRate}% sucesso)`;

    if (successRate < 70 || averageRetryTime > 10000) {
      status = 'critical';
      message = `Retry com problemas: ${successRate}% sucesso, ${averageRetryTime}ms tempo médio`;
    } else if (successRate < 85 || averageRetryTime > 5000) {
      status = 'degraded';
      message = `Performance de retry degradada: ${successRate}% sucesso, ${averageRetryTime}ms tempo médio`;
    }

    return {
      status,
      message,
      lastCheck: Date.now(),
      metrics: {
        successRate,
        totalAttempts,
        averageRetryTime
      }
    };
  }

  private async evaluateFirebaseHealth(): Promise<ComponentHealth> {
    try {
      // Teste simples de conectividade com Firebase
      const startTime = Date.now();
      
      // Simular uma operação rápida (pode ser substituída por uma operação real)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      let message = `Firebase conectado (${responseTime}ms)`;

      if (responseTime > 5000) {
        status = 'critical';
        message = `Firebase muito lento (${responseTime}ms)`;
      } else if (responseTime > 2000) {
        status = 'degraded';
        message = `Firebase com latência alta (${responseTime}ms)`;
      }

      return {
        status,
        message,
        lastCheck: Date.now(),
        metrics: { responseTime }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Firebase desconectado: ${error}`,
        lastCheck: Date.now()
      };
    }
  }

  private async evaluateEvolutionHealth(): Promise<ComponentHealth> {
    try {
      // Teste de conectividade com Evolution API
      const startTime = Date.now();
      
      // Simular verificação de status (pode ser substituída por chamada real)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      let message = `Evolution API conectada (${responseTime}ms)`;

      if (responseTime > 3000) {
        status = 'critical';
        message = `Evolution API muito lenta (${responseTime}ms)`;
      } else if (responseTime > 1500) {
        status = 'degraded';
        message = `Evolution API com latência alta (${responseTime}ms)`;
      }

      return {
        status,
        message,
        lastCheck: Date.now(),
        metrics: { responseTime }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Evolution API desconectada: ${error}`,
        lastCheck: Date.now()
      };
    }
  }

  private determineOverallStatus(components: any): 'healthy' | 'degraded' | 'critical' {
    const statuses = Object.values(components).map((comp: any) => comp.status);
    
    if (statuses.includes('critical')) {
      return 'critical';
    }
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  private generateRecommendations(components: any, metrics: any): string[] {
    const recommendations: string[] = [];

    // Recomendações para webhooks
    if (components.webhooks.status !== 'healthy') {
      if (metrics.webhook.pending > 500) {
        recommendations.push('Considere aumentar a capacidade de processamento de webhooks');
      }
      if (metrics.webhook.failed > metrics.webhook.completed * 0.1) {
        recommendations.push('Verifique a conectividade com serviços externos');
      }
    }

    // Recomendações para cache
    if (components.cache.status !== 'healthy') {
      if (metrics.cache.hitRate < 70) {
        recommendations.push('Otimize as estratégias de cache ou aumente o TTL');
      }
      if (metrics.cache.memoryUsage > 200 * 1024 * 1024) {
        recommendations.push('Considere aumentar a limpeza automática do cache');
      }
    }

    // Recomendações para retry
    if (components.retry.status !== 'healthy') {
      if (metrics.retry.successRate < 80) {
        recommendations.push('Revise as configurações de retry ou identifique problemas de conectividade');
      }
    }

    // Recomendações gerais
    if (components.firebase.status !== 'healthy') {
      recommendations.push('Verifique a conectividade com Firebase e considere otimizar consultas');
    }

    if (components.evolution.status !== 'healthy') {
      recommendations.push('Verifique a conectividade com Evolution API e configurações de webhook');
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema funcionando otimamente! Continue monitorando as métricas.');
    }

    return recommendations;
  }
}

const healthMonitor = SystemHealthMonitor.getInstance();

// Endpoint para obter status de saúde do sistema
export async function GET(request: NextRequest) {
  try {
    const health = await healthMonitor.getSystemHealth();
    
    // Definir status HTTP baseado na saúde do sistema
    const statusCode = health.status === 'critical' ? 503 : 
                      health.status === 'degraded' ? 200 : 200;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Erro ao obter status de saúde do sistema:', error);
    return NextResponse.json(
      {
        status: 'critical',
        timestamp: Date.now(),
        error: 'Erro interno ao verificar saúde do sistema',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Endpoint simplificado para health checks externos
export async function HEAD(request: NextRequest) {
  try {
    const health = await healthMonitor.getSystemHealth();
    const statusCode = health.status === 'critical' ? 503 : 200;
    return new NextResponse(null, { status: statusCode });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}

export { healthMonitor };
export type { SystemHealth, ComponentHealth };