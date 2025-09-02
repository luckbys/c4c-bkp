import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { webhookQueue } from '@/services/webhook-queue';
import { webhookDeduplication } from '@/services/webhook-deduplication';

// Rate limiting para webhooks
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests por minuto por instância

// Função para verificar rate limit
function checkRateLimit(instanceName: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = instanceName || 'unknown';
  
  let rateLimitData = rateLimitMap.get(key);
  
  // Reset se a janela expirou
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }
  
  rateLimitData.count++;
  rateLimitMap.set(key, rateLimitData);
  
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - rateLimitData.count);
  const allowed = rateLimitData.count <= RATE_LIMIT_MAX_REQUESTS;
  
  return { allowed, remaining };
}

// Webhook handler for Evolution API events
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const headersList = await headers();
    const apiKey = headersList.get('apikey');
    
    // Validate API key (optional security measure)
    if (process.env.EVOLUTION_WEBHOOK_SECRET && apiKey !== process.env.EVOLUTION_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event, instance, data } = body;
    
    // Verificar rate limit
    const rateLimit = checkRateLimit(instance);
    if (!rateLimit.allowed) {
      console.warn(`🚨 [WEBHOOK] Rate limit excedido para instância ${instance}. Rejeitando requisição.`);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
        }, 
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString(),
            'Retry-After': Math.ceil(RATE_LIMIT_WINDOW / 1000).toString()
          }
        }
      );
    }

    // Verificar deduplicação antes de processar
    const shouldProcess = webhookDeduplication.shouldProcessEvent(event, instance, data);
    
    if (!shouldProcess) {
      // Evento duplicado filtrado
      return NextResponse.json({ 
        success: true, 
        filtered: true,
        message: 'Duplicate event filtered',
        processingTime: Date.now() - startTime
      }, {
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-Deduplication-Filtered': 'true'
        }
      });
    }

    // Log apenas eventos importantes para reduzir spam
    const importantEvents = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'];
    if (importantEvents.includes(event)) {
      console.log(`📨 [WEBHOOK] ${event} recebido para instância ${instance}`);
    }

    // Add webhook job to queue for async processing
    const jobId = await webhookQueue.addJob(event, instance, data);
    
    const processingTime = Date.now() - startTime;
    
    // Log apenas se demorar mais que 100ms
    if (processingTime > 100) {
      console.log(`⏱️ [WEBHOOK] Job ${jobId} processado em ${processingTime}ms`);
    }

    return NextResponse.json({ 
      success: true, 
      jobId,
      message: 'Webhook queued for processing',
      processingTime
    }, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [WEBHOOK] Erro após ${processingTime}ms:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add endpoint to get queue status and rate limit info
export async function GET(request: NextRequest) {
  try {
    const queueStatus = webhookQueue.getQueueStatus();
    
    // Obter estatísticas de rate limit
    const rateLimitStats: Record<string, any> = {};
    rateLimitMap.forEach((data, instance) => {
      const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - data.count);
      const resetIn = Math.max(0, data.resetTime - Date.now());
      
      rateLimitStats[instance] = {
        requests: data.count,
        remaining,
        resetIn: Math.ceil(resetIn / 1000),
        limit: RATE_LIMIT_MAX_REQUESTS
      };
    });
    
    // Obter estatísticas de deduplicação
    const deduplicationStats = webhookDeduplication.getStats();
    
    return NextResponse.json({
      message: 'Evolution API Webhook endpoint is active',
      queue: queueStatus,
      rateLimit: {
        window: RATE_LIMIT_WINDOW / 1000,
        maxRequests: RATE_LIMIT_MAX_REQUESTS,
        instances: rateLimitStats
      },
      deduplication: deduplicationStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}