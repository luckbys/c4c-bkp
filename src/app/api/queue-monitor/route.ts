import { NextRequest, NextResponse } from 'next/server';
import { webhookQueue } from '@/services/webhook-queue';

/**
 * GET /api/queue-monitor
 * Monitor webhook queue performance and status
 */
export async function GET(request: NextRequest) {
  try {
    const detailedStatus = webhookQueue.getDetailedStatus();
    const stats = webhookQueue.getStats();
    
    // Calculate performance metrics
    const performanceMetrics = {
      efficiency: {
        successRate: stats.totalProcessed > 0 
          ? ((stats.completed / stats.totalProcessed) * 100).toFixed(2) + '%'
          : '0%',
        averageProcessingTime: stats.averageProcessingTime.toFixed(2) + 'ms',
        throughputPerMinute: stats.throughputPerMinute.toFixed(2),
        queueUtilization: detailedStatus.processing > 0 
          ? ((detailedStatus.processing / 5) * 100).toFixed(2) + '%' // maxConcurrent = 5
          : '0%'
      },
      
      queueHealth: {
        status: detailedStatus.queueLength === 0 && detailedStatus.processing === 0 
          ? 'idle' 
          : detailedStatus.queueLength > 100 
            ? 'overloaded' 
            : 'healthy',
        backoffLevel: detailedStatus.backoffMultiplier > 1 
          ? 'active' 
          : 'normal',
        rateLimitStatus: detailedStatus.rateLimitStatus.current >= detailedStatus.rateLimitStatus.limit * 0.8 
          ? 'approaching_limit' 
          : 'normal'
      },
      
      optimizations: {
        batchingActive: detailedStatus.pendingBatches > 0,
        prioritizationEnabled: true,
        adaptiveRateLimiting: detailedStatus.backoffMultiplier > 1,
        eventDrivenProcessing: true
      }
    };
    
    const response = {
      timestamp: new Date().toISOString(),
      queue: {
        pending: detailedStatus.queueLength,
        processing: detailedStatus.processing,
        pendingBatches: detailedStatus.pendingBatches,
        maxConcurrent: 5
      },
      
      statistics: {
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        totalProcessed: stats.totalProcessed
      },
      
      performance: performanceMetrics,
      
      rateLimiting: {
        current: detailedStatus.rateLimitStatus.current,
        limit: detailedStatus.rateLimitStatus.limit,
        windowMs: detailedStatus.rateLimitStatus.windowMs,
        backoffMultiplier: detailedStatus.backoffMultiplier
      },
      
      improvements: [
        '✅ Estrutura de dados eficiente (Map + Priority Queue)',
        '✅ Sistema de eventos (substituiu polling)',
        '✅ Priorização inteligente por tipo de evento',
        '✅ Batching automático para eventos similares',
        '✅ Cache de estatísticas (atualização incremental)',
        '✅ Rate limiting adaptativo com backoff',
        '✅ Cleanup automático de jobs antigos',
        '✅ Retry com backoff exponencial',
        '✅ Processamento paralelo otimizado'
      ]
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[QueueMonitor] Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/queue-monitor
 * Trigger queue operations for testing
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'retry_failed':
        const retriedCount = await webhookQueue.retryFailedJobs();
        return NextResponse.json({ 
          message: `Retried ${retriedCount} failed jobs`,
          retriedCount 
        });
        
      case 'clear_old':
        const clearedCount = webhookQueue.clearOldJobs(24);
        return NextResponse.json({ 
          message: `Cleared ${clearedCount} old jobs`,
          clearedCount 
        });
        
      case 'test_load':
        // Add test jobs to simulate load
        const testJobs = [];
        for (let i = 0; i < 10; i++) {
          const jobId = webhookQueue.addJob(
            'messages.upsert',
            'test-instance',
            { test: true, index: i }
          );
          testJobs.push(jobId);
        }
        return NextResponse.json({ 
          message: `Added ${testJobs.length} test jobs`,
          jobIds: testJobs 
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('[QueueMonitor] Error executing action:', error);
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}