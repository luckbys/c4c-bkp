import { NextRequest, NextResponse } from 'next/server';
import { OptimizedServicesManager } from '@/services/optimized-services-config';
import { MigrationHelper } from '@/services/migration-helper';

/**
 * API para gerenciar serviços otimizados
 * GET /api/optimized - Obtém status dos serviços
 * POST /api/optimized/init - Inicializa serviços otimizados
 * POST /api/optimized/migrate - Inicia migração
 * DELETE /api/optimized - Encerra serviços
 */

/**
 * GET /api/optimized
 * Retorna o status atual dos serviços otimizados
 */
export async function GET() {
  try {
    const optimizedServices = OptimizedServicesManager.getInstance();
    const migrationHelper = MigrationHelper.getInstance();
    
    const healthStatus = await optimizedServices.getHealthStatus();
    const metrics = await optimizedServices.getMetrics();
    const migrationStatus = migrationHelper.getMigrationStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        health: healthStatus,
        metrics,
        migration: migrationStatus,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter status dos serviços otimizados:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * POST /api/optimized/init
 * Inicializa os serviços otimizados
 */
export async function POST(request: NextRequest) {
  try {
    const optimizedServices = OptimizedServicesManager.getInstance();
    const body = await request.json().catch(() => ({}));
    const { config, force = false } = body;
    
    // Verificar se já estão inicializados
    const currentStatus = await optimizedServices.getHealthStatus();
    if (currentStatus.overall === 'healthy' && !force) {
      return NextResponse.json({
        success: true,
        message: 'Serviços otimizados já estão inicializados',
        data: currentStatus
      });
    }
    
    // Inicializar serviços
    if (config) {
      await optimizedServices.updateConfig(config);
    }
    
    await optimizedServices.initialize();
    
    const healthStatus = await optimizedServices.getHealthStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Serviços otimizados inicializados com sucesso',
      data: healthStatus
    });
    
  } catch (error) {
    console.error('Erro ao inicializar serviços otimizados:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao inicializar serviços otimizados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/optimized
 * Encerra os serviços otimizados
 */
export async function DELETE() {
  try {
    const optimizedServices = OptimizedServicesManager.getInstance();
    await optimizedServices.shutdown();
    
    return NextResponse.json({
      success: true,
      message: 'Serviços otimizados encerrados com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao encerrar serviços otimizados:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao encerrar serviços otimizados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}