import { NextRequest, NextResponse } from 'next/server';
import { migrationHelper } from '@/services/migration-helper';
import { OptimizedServicesConfig } from '@/services/optimized-services-config';

/**
 * API para gerenciar migração dos serviços
 * POST /api/optimized/migrate - Inicia processo de migração
 * GET /api/optimized/migrate - Obtém status da migração
 */

/**
 * GET /api/optimized/migrate
 * Retorna o status atual da migração
 */
export async function GET() {
  try {
    const migrationStatus = migrationHelper.getMigrationStatus();
    const report = migrationHelper.generateMigrationReport();
    
    return NextResponse.json({
      success: true,
      data: {
        status: migrationStatus,
        report,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter status da migração:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * POST /api/optimized/migrate
 * Inicia o processo de migração para serviços otimizados
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { config, skipTests = false, rolloutSteps } = body;
    
    // Verificar se já existe uma migração em andamento
    const currentStatus = migrationHelper.getMigrationStatus();
    if (currentStatus.phase !== 'preparation' && currentStatus.phase !== 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Migração já está em andamento',
        data: currentStatus
      }, { status: 409 });
    }
    
    // Validar configuração se fornecida
    if (config) {
      const validationResult = validateMigrationConfig(config);
      if (!validationResult.valid) {
        return NextResponse.json({
          success: false,
          error: 'Configuração inválida',
          details: validationResult.errors
        }, { status: 400 });
      }
    }
    
    // Iniciar migração em background
    startMigrationProcess(config, { skipTests, rolloutSteps })
      .catch(error => {
        console.error('Erro durante migração:', error);
      });
    
    return NextResponse.json({
      success: true,
      message: 'Processo de migração iniciado',
      data: {
        phase: 'preparation',
        startTime: new Date().toISOString(),
        config: config || 'default'
      }
    });
    
  } catch (error) {
    console.error('Erro ao iniciar migração:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao iniciar migração',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * Valida a configuração de migração
 */
function validateMigrationConfig(config: Partial<OptimizedServicesConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validar configuração de cache
  if (config.cache) {
    if (config.cache.defaultTTL && (config.cache.defaultTTL < 60 || config.cache.defaultTTL > 86400)) {
      errors.push('TTL padrão deve estar entre 60 e 86400 segundos');
    }
    
    if (config.cache.maxMemoryUsage && config.cache.maxMemoryUsage < 10 * 1024 * 1024) {
      errors.push('Uso máximo de memória deve ser pelo menos 10MB');
    }
  }
  
  // Validar configuração de notificações
  if (config.pushNotifications) {
    if (config.pushNotifications.heartbeatInterval && config.pushNotifications.heartbeatInterval < 5000) {
      errors.push('Intervalo de heartbeat deve ser pelo menos 5 segundos');
    }
    
    if (config.pushNotifications.maxConnections && config.pushNotifications.maxConnections < 10) {
      errors.push('Máximo de conexões deve ser pelo menos 10');
    }
  }
  
  // Validar configuração de coordenação
  if (config.coordination) {
    if (config.coordination.batchSize && (config.coordination.batchSize < 1 || config.coordination.batchSize > 1000)) {
      errors.push('Tamanho do lote deve estar entre 1 e 1000');
    }
    
    if (config.coordination.batchInterval && config.coordination.batchInterval < 100) {
      errors.push('Intervalo do lote deve ser pelo menos 100ms');
    }
  }
  
  // Validar configuração de monitoramento
  if (config.monitoring?.alertThresholds) {
    const thresholds = config.monitoring.alertThresholds;
    
    if (thresholds.cacheHitRate && (thresholds.cacheHitRate < 0 || thresholds.cacheHitRate > 1)) {
      errors.push('Taxa de acerto do cache deve estar entre 0 e 1');
    }
    
    if (thresholds.errorRate && (thresholds.errorRate < 0 || thresholds.errorRate > 1)) {
      errors.push('Taxa de erro deve estar entre 0 e 1');
    }
  }
  
  // Validar configuração de integração
  if (config.integration) {
    if (config.integration.rolloutPercentage && 
        (config.integration.rolloutPercentage < 0 || config.integration.rolloutPercentage > 100)) {
      errors.push('Porcentagem de rollout deve estar entre 0 e 100');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Inicia o processo de migração em background
 */
async function startMigrationProcess(
  config?: Partial<OptimizedServicesConfig>,
  options: { skipTests?: boolean; rolloutSteps?: number[] } = {}
): Promise<void> {
  try {
    console.log('🚀 Iniciando processo de migração...');
    
    // Customizar processo baseado nas opções
    if (options.skipTests) {
      console.log('⚠ Pulando fase de testes (não recomendado)');
    }
    
    if (options.rolloutSteps) {
      console.log('📊 Usando passos de rollout customizados:', options.rolloutSteps);
    }
    
    // Iniciar migração
    await migrationHelper.startMigration(config);
    
    console.log('✅ Migração concluída com sucesso');
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    
    // Tentar rollback automático
    try {
      console.log('🔄 Tentando rollback automático...');
      // O rollback já é chamado internamente pelo migrationHelper
    } catch (rollbackError) {
      console.error('❌ Erro durante rollback:', rollbackError);
    }
    
    throw error;
  }
}

/**
 * PUT /api/optimized/migrate
 * Atualiza configurações durante a migração
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;
    
    const currentStatus = migrationHelper.getMigrationStatus();
    
    switch (action) {
      case 'pause':
        // Implementar pausa da migração
        return NextResponse.json({
          success: true,
          message: 'Migração pausada (funcionalidade em desenvolvimento)'
        });
        
      case 'resume':
        // Implementar retomada da migração
        return NextResponse.json({
          success: true,
          message: 'Migração retomada (funcionalidade em desenvolvimento)'
        });
        
      case 'rollback':
        // Forçar rollback
        if (currentStatus.phase === 'completed') {
          return NextResponse.json({
            success: false,
            error: 'Não é possível fazer rollback de uma migração concluída'
          }, { status: 400 });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Rollback iniciado (funcionalidade em desenvolvimento)'
        });
        
      case 'update-config':
        if (!config) {
          return NextResponse.json({
            success: false,
            error: 'Configuração não fornecida'
          }, { status: 400 });
        }
        
        const validationResult = validateMigrationConfig(config);
        if (!validationResult.valid) {
          return NextResponse.json({
            success: false,
            error: 'Configuração inválida',
            details: validationResult.errors
          }, { status: 400 });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Configuração atualizada (funcionalidade em desenvolvimento)'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Ação não reconhecida',
          validActions: ['pause', 'resume', 'rollback', 'update-config']
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Erro ao atualizar migração:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}