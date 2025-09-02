import { NextRequest, NextResponse } from 'next/server';
import { RedisService } from '@/services/redis-service';

// Instância do Redis para métricas
const redisService = RedisService.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    const detailed = searchParams.get('detailed') === 'true';

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Instance name is required' },
        { status: 400 }
      );
    }

    // Coletar métricas de cache
    const metrics = {
      instance: instanceName,
      timestamp: new Date().toISOString(),
      cache: {
        tickets: {
          stats: await redisService.getCacheStats(`api:tickets:${instanceName}:stats`),
          counters: await redisService.getTicketCounters(instanceName),
          metrics: await redisService.getTicketMetrics(instanceName)
        },
        redis: {
          connected: true, // TODO: implementar verificação de conexão
          memory: null, // TODO: implementar se necessário
        }
      },
      performance: {
        estimatedFirestoreReadsAvoided: 0,
        cacheHitRate: 0,
        avgResponseTime: null
      }
    };

    // Calcular métricas de performance
    const ticketStats = metrics.cache.tickets.stats;
    if (ticketStats) {
      metrics.performance.cacheHitRate = ticketStats.hitRate;
      metrics.performance.estimatedFirestoreReadsAvoided = ticketStats.hits;
    }

    // Métricas detalhadas se solicitado
    if (detailed) {
      const detailedMetrics = {
        ...metrics,
        detailed: {
          cacheKeys: {
            tickets: await redisService.exists(`tickets:${instanceName}:list`),
            counters: await redisService.exists(`tickets:${instanceName}:counters`),
            metrics: await redisService.exists(`tickets:${instanceName}:metrics`)
          },
          statusCaches: {
            open: await redisService.getTicketsByStatus(instanceName, 'open'),
            pending: await redisService.getTicketsByStatus(instanceName, 'pending'),
            resolved: await redisService.getTicketsByStatus(instanceName, 'resolved'),
            closed: await redisService.getTicketsByStatus(instanceName, 'closed')
          }
        }
      };
      
      return NextResponse.json(detailedMetrics);
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching cache metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache metrics' },
      { status: 500 }
    );
  }
}

// Endpoint para limpar cache
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    const type = searchParams.get('type') || 'all';

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Instance name is required' },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    switch (type) {
      case 'tickets':
        deletedCount = await redisService.invalidateTickets(instanceName);
        break;
      case 'all':
      default:
        deletedCount = await redisService.invalidatePattern(`*${instanceName}*`);
        break;
    }

    return NextResponse.json({
      message: `Cache cleared for instance ${instanceName}`,
      type,
      deletedEntries: deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

// Endpoint para estatísticas globais de cache
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, instanceName } = body;

    if (action === 'warm-cache' && instanceName) {
      // Implementar cache warming se necessário
      return NextResponse.json({
        message: `Cache warming initiated for ${instanceName}`,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'global-stats') {
      // Estatísticas globais de todas as instâncias
      const globalStats = {
        timestamp: new Date().toISOString(),
        totalCacheEntries: 0, // TODO: implementar contagem global
        totalHits: 0,
        totalMisses: 0,
        globalHitRate: 0,
        estimatedFirestoreReadsAvoided: 0,
        cacheSizeEstimate: '0 MB' // TODO: implementar se necessário
      };

      return NextResponse.json(globalStats);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing cache action:', error);
    return NextResponse.json(
      { error: 'Failed to process cache action' },
      { status: 500 }
    );
  }
}