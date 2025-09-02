import { NextRequest, NextResponse } from 'next/server';
import { webhookDeduplication } from '@/services/webhook-deduplication';

// Endpoint para gerenciar deduplicação de webhooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'stats':
        const stats = webhookDeduplication.getStats();
        return NextResponse.json({
          success: true,
          stats,
          message: 'Estatísticas de deduplicação obtidas com sucesso'
        });
        
      case 'cache':
        const cacheInfo = webhookDeduplication.getCacheInfo();
        return NextResponse.json({
          success: true,
          cache: cacheInfo,
          message: 'Informações do cache obtidas com sucesso'
        });
        
      default:
        // Status geral
        const generalStats = webhookDeduplication.getStats();
        const generalCache = webhookDeduplication.getCacheInfo();
        
        return NextResponse.json({
          success: true,
          message: 'Webhook Deduplication Service Status',
          stats: generalStats,
          cache: {
            entries: generalCache.length,
            topDuplicates: generalCache.slice(0, 5)
          },
          config: {
            cacheTTL: '30 segundos',
            connectionUpdateTTL: '5 segundos',
            maxCacheSize: 1000,
            cleanupInterval: '1 minuto'
          },
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Erro ao obter status de deduplicação:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'reset-stats':
        webhookDeduplication.resetStats();
        return NextResponse.json({
          success: true,
          message: 'Estatísticas de deduplicação resetadas com sucesso'
        });
        
      case 'clear-cache':
        webhookDeduplication.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Cache de deduplicação limpo com sucesso'
        });
        
      case 'test-deduplication':
        const { event, instance, data } = body;
        if (!event || !instance) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Parâmetros obrigatórios: event, instance' 
            },
            { status: 400 }
          );
        }
        
        const shouldProcess = webhookDeduplication.shouldProcessEvent(event, instance, data || {});
        return NextResponse.json({
          success: true,
          shouldProcess,
          message: shouldProcess 
            ? 'Evento seria processado (não é duplicado)' 
            : 'Evento seria filtrado (duplicado detectado)',
          testData: { event, instance, data }
        });
        
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Ação não reconhecida',
            availableActions: ['reset-stats', 'clear-cache', 'test-deduplication']
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erro ao processar ação de deduplicação:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Endpoint para documentação da API
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    message: 'Webhook Deduplication Management API',
    endpoints: {
      'GET /': 'Status geral do serviço de deduplicação',
      'GET /?action=stats': 'Estatísticas detalhadas',
      'GET /?action=cache': 'Informações do cache',
      'POST / {action: "reset-stats"}': 'Resetar estatísticas',
      'POST / {action: "clear-cache"}': 'Limpar cache',
      'POST / {action: "test-deduplication", event, instance, data}': 'Testar deduplicação'
    },
    examples: {
      testDeduplication: {
        method: 'POST',
        body: {
          action: 'test-deduplication',
          event: 'connection.update',
          instance: 'loja',
          data: { state: 'connecting', statusReason: 200 }
        }
      }
    }
  });
}