import { NextRequest, NextResponse } from 'next/server';
import { getRedisMonitoringService } from '@/services/redis-monitoring-service';
import { getRedisClusterService } from '@/services/redis-cluster-service';

const monitoring = getRedisMonitoringService();
const redisCluster = getRedisClusterService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';

    switch (type) {
      case 'dashboard':
        const dashboardData = await monitoring.getDashboardData();
        return NextResponse.json(dashboardData);

      case 'health':
        const health = await redisCluster.healthCheck();
        return NextResponse.json(health);

      case 'metrics':
        const metrics = await redisCluster.getAdvancedMetrics();
        return NextResponse.json(metrics);

      case 'report':
        const report = await monitoring.getDetailedReport();
        return NextResponse.json(report);

      case 'export':
        const format = searchParams.get('format') as 'json' | 'csv' || 'json';
        const exportData = await monitoring.exportMetrics(format);
        
        if (format === 'csv') {
          return new NextResponse(exportData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="redis-metrics.csv"'
            }
          });
        }
        
        return NextResponse.json(JSON.parse(exportData));

      default:
        return NextResponse.json(
          { error: 'Tipo de consulta inválido' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ Erro na API do dashboard Redis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'resolve_alert':
        const { alertId } = data;
        const resolved = monitoring.resolveAlert(alertId);
        
        if (resolved) {
          return NextResponse.json({ success: true, message: 'Alerta resolvido' });
        } else {
          return NextResponse.json(
            { error: 'Alerta não encontrado' },
            { status: 404 }
          );
        }

      case 'update_thresholds':
        const { thresholds } = data;
        monitoring.updateThresholds(thresholds);
        return NextResponse.json({ success: true, message: 'Thresholds atualizados' });

      case 'invalidate_cache':
        const { pattern } = data;
        const deletedCount = await redisCluster.invalidatePattern(pattern);
        return NextResponse.json({ 
          success: true, 
          message: `${deletedCount} chaves invalidadas`,
          deletedCount 
        });

      case 'add_warmup_pattern':
        const { warmupPattern } = data;
        redisCluster.addWarmupPattern(warmupPattern);
        return NextResponse.json({ success: true, message: 'Padrão de warming adicionado' });

      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ Erro na ação do dashboard Redis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}