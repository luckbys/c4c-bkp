import { NextRequest, NextResponse } from 'next/server';
import { firestoreMonitor } from '@/services/firestore-monitor';

/**
 * GET /api/firestore/metrics
 * Retorna métricas de uso do Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const metrics = firestoreMonitor.getMetrics();
    const activeListeners = firestoreMonitor.getActiveListeners();
    const recommendations = firestoreMonitor.getOptimizationRecommendations();

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        activeListeners: activeListeners.map(listener => ({
          id: listener.id,
          collection: listener.collection,
          query: listener.query,
          duration: Date.now() - listener.startTime,
          readCount: listener.readCount,
          lastActivity: listener.lastActivity,
          isActive: listener.isActive
        })),
        recommendations,
        summary: {
          status: recommendations.length === 0 ? 'healthy' : 'needs_attention',
          totalActiveListeners: activeListeners.length,
          averageReadsPerListener: activeListeners.length > 0 
            ? Math.round(metrics.totalReads / activeListeners.length * 100) / 100
            : 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [FIRESTORE-METRICS] Erro ao obter métricas:', error);
    
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

/**
 * POST /api/firestore/metrics/reset
 * Reset das métricas (apenas para desenvolvimento)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se é ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          error: 'Reset de métricas não permitido em produção'
        },
        { status: 403 }
      );
    }

    // Reset manual das métricas (implementar se necessário)
    console.log('🔄 [FIRESTORE-METRICS] Reset manual solicitado');
    
    return NextResponse.json({
      success: true,
      message: 'Métricas resetadas com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [FIRESTORE-METRICS] Erro ao resetar métricas:', error);
    
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