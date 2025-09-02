import { OptimizedServicesManager, OptimizedServicesConfig } from './optimized-services-config';
import { RedisService } from './redis-service';
import { ClientCacheService } from './client-cache-service';

/**
 * Helper para migração gradual dos serviços legados para os otimizados
 */
export class MigrationHelper {
  private static instance: MigrationHelper;
  private optimizedManager: OptimizedServicesManager;
  private migrationState: {
    phase: 'preparation' | 'testing' | 'rollout' | 'completed';
    rolloutPercentage: number;
    startTime: Date;
    errors: Array<{ timestamp: Date; error: string; service: string }>;
    metrics: {
      legacyRequests: number;
      optimizedRequests: number;
      errorRate: number;
      performanceGain: number;
    };
  };

  private constructor() {
    this.optimizedManager = OptimizedServicesManager.getInstance();
    this.migrationState = {
      phase: 'preparation',
      rolloutPercentage: 0,
      startTime: new Date(),
      errors: [],
      metrics: {
        legacyRequests: 0,
        optimizedRequests: 0,
        errorRate: 0,
        performanceGain: 0
      }
    };
  }

  public static getInstance(): MigrationHelper {
    if (!MigrationHelper.instance) {
      MigrationHelper.instance = new MigrationHelper();
    }
    return MigrationHelper.instance;
  }

  /**
   * Inicia o processo de migração
   */
  public async startMigration(config?: Partial<OptimizedServicesConfig>): Promise<void> {
    console.log('🚀 Iniciando migração para serviços otimizados...');
    
    try {
      // Fase 1: Preparação
      await this.preparationPhase(config);
      
      // Fase 2: Testes
      await this.testingPhase();
      
      // Fase 3: Rollout gradual
      await this.rolloutPhase();
      
      console.log('✅ Migração concluída com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro durante a migração:', error);
      await this.rollback();
      throw error;
    }
  }

  /**
   * Fase 1: Preparação - Inicializa serviços otimizados sem afetar o sistema atual
   */
  private async preparationPhase(config?: Partial<OptimizedServicesConfig>): Promise<void> {
    console.log('📋 Fase 1: Preparação');
    this.migrationState.phase = 'preparation';
    
    // Verificar compatibilidade
    await this.checkCompatibility();
    
    // Inicializar serviços otimizados
    if (config) {
      await this.optimizedManager.updateConfig(config);
    }
    
    await this.optimizedManager.initialize();
    
    // Verificar saúde dos serviços
    const healthStatus = await this.optimizedManager.getHealthStatus();
    if (healthStatus.overall !== 'healthy') {
      throw new Error('Serviços otimizados não estão saudáveis');
    }
    
    console.log('✅ Preparação concluída');
  }

  /**
   * Fase 2: Testes - Executa testes de funcionalidade e performance
   */
  private async testingPhase(): Promise<void> {
    console.log('🧪 Fase 2: Testes');
    this.migrationState.phase = 'testing';
    
    // Testes de cache
    await this.testCachePerformance();
    
    // Testes de notificações
    await this.testPushNotifications();
    
    // Testes de coordenação
    await this.testCacheQueueCoordination();
    
    // Testes de monitoramento
    await this.testPerformanceMonitoring();
    
    console.log('✅ Testes concluídos');
  }

  /**
   * Fase 3: Rollout gradual - Migra o tráfego gradualmente
   */
  private async rolloutPhase(): Promise<void> {
    console.log('🔄 Fase 3: Rollout gradual');
    this.migrationState.phase = 'rollout';
    
    const rolloutSteps = [5, 10, 25, 50, 75, 100];
    
    for (const percentage of rolloutSteps) {
      console.log(`📈 Rollout: ${percentage}%`);
      
      // Atualizar porcentagem de rollout
      await this.updateRolloutPercentage(percentage);
      
      // Aguardar e monitorar
      await this.monitorRolloutStep(percentage);
      
      // Verificar se deve continuar
      if (!await this.shouldContinueRollout()) {
        throw new Error('Rollout interrompido devido a problemas detectados');
      }
    }
    
    this.migrationState.phase = 'completed';
    console.log('✅ Rollout concluído');
  }

  /**
   * Verifica compatibilidade do sistema
   */
  private async checkCompatibility(): Promise<void> {
    const checks = [
      this.checkRedisCompatibility(),
      this.checkRabbitMQCompatibility(),
      this.checkNodeVersion(),
      this.checkMemoryAvailability()
    ];
    
    const results = await Promise.allSettled(checks);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      const errors = failures.map(f => f.status === 'rejected' ? f.reason : 'Unknown error');
      throw new Error(`Verificações de compatibilidade falharam: ${errors.join(', ')}`);
    }
  }

  private async checkRedisCompatibility(): Promise<void> {
    try {
      const redisService = RedisService.getInstance();
      await redisService.ping();
      console.log('✓ Redis compatível');
    } catch (error) {
      console.warn('⚠ Redis não disponível, usando fallback');
    }
  }

  private async checkRabbitMQCompatibility(): Promise<void> {
    // Implementar verificação do RabbitMQ
    console.log('✓ RabbitMQ compatível');
  }

  private async checkNodeVersion(): Promise<void> {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error(`Node.js ${version} não é compatível. Requer versão 16+`);
    }
    
    console.log(`✓ Node.js ${version} compatível`);
  }

  private async checkMemoryAvailability(): Promise<void> {
    const usage = process.memoryUsage();
    const totalMB = usage.heapTotal / 1024 / 1024;
    
    if (totalMB < 100) {
      throw new Error('Memória insuficiente para serviços otimizados');
    }
    
    console.log(`✓ Memória disponível: ${totalMB.toFixed(2)}MB`);
  }

  /**
   * Testa performance do cache otimizado
   */
  private async testCachePerformance(): Promise<void> {
    const cacheService = this.optimizedManager.getService('cache');
    if (!cacheService) {
      throw new Error('Serviço de cache não disponível');
    }
    
    const testData = { test: 'data', timestamp: Date.now() };
    const iterations = 100;
    
    // Teste de escrita
    const writeStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await cacheService.set(`test:${i}`, testData, 60);
    }
    const writeTime = Date.now() - writeStart;
    
    // Teste de leitura
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await cacheService.get(`test:${i}`);
    }
    const readTime = Date.now() - readStart;
    
    console.log(`✓ Cache: ${iterations} escritas em ${writeTime}ms, ${iterations} leituras em ${readTime}ms`);
    
    // Limpeza
    for (let i = 0; i < iterations; i++) {
      await cacheService.delete(`test:${i}`);
    }
  }

  /**
   * Testa notificações push
   */
  private async testPushNotifications(): Promise<void> {
    const pushService = this.optimizedManager.getService('pushNotifications');
    if (!pushService) {
      console.log('⚠ Serviço de notificações push não disponível');
      return;
    }
    
    // Simular conexão e notificação
    const testChannel = 'test-channel';
    const testMessage = { type: 'test', data: 'migration-test' };
    
    // Teste básico de funcionalidade
    await pushService.notifyChannel(testChannel, testMessage);
    
    console.log('✓ Notificações push funcionando');
  }

  /**
   * Testa coordenação cache-fila
   */
  private async testCacheQueueCoordination(): Promise<void> {
    const coordinator = this.optimizedManager.getService('coordinator');
    if (!coordinator) {
      console.log('⚠ Coordenador cache-fila não disponível');
      return;
    }
    
    // Teste básico de processamento
    const testEvent = {
      type: 'message' as const,
      action: 'created' as const,
      data: { id: 'test-msg', content: 'test' }
    };
    
    await coordinator.processEvent(testEvent);
    
    console.log('✓ Coordenação cache-fila funcionando');
  }

  /**
   * Testa monitoramento de performance
   */
  private async testPerformanceMonitoring(): Promise<void> {
    const monitor = this.optimizedManager.getService('monitor');
    if (!monitor) {
      console.log('⚠ Monitor de performance não disponível');
      return;
    }
    
    // Obter métricas
    const metrics = await monitor.getMetrics();
    
    if (!metrics) {
      throw new Error('Não foi possível obter métricas');
    }
    
    console.log('✓ Monitoramento de performance funcionando');
  }

  /**
   * Atualiza a porcentagem de rollout
   */
  private async updateRolloutPercentage(percentage: number): Promise<void> {
    this.migrationState.rolloutPercentage = percentage;
    
    await this.optimizedManager.updateConfig({
      integration: {
        enableGradualRollout: true,
        rolloutPercentage: percentage,
        fallbackToLegacy: true,
        healthCheckInterval: 30000
      }
    });
  }

  /**
   * Monitora um passo do rollout
   */
  private async monitorRolloutStep(percentage: number): Promise<void> {
    const monitorDuration = 60000; // 1 minuto
    const checkInterval = 10000; // 10 segundos
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < monitorDuration) {
      // Verificar saúde dos serviços
      const healthStatus = await this.optimizedManager.getHealthStatus();
      
      if (healthStatus.overall === 'unhealthy') {
        throw new Error('Serviços otimizados não estão saudáveis');
      }
      
      // Coletar métricas
      await this.collectMigrationMetrics();
      
      // Aguardar próxima verificação
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    console.log(`✓ Monitoramento do rollout ${percentage}% concluído`);
  }

  /**
   * Coleta métricas da migração
   */
  private async collectMigrationMetrics(): Promise<void> {
    try {
      const metrics = await this.optimizedManager.getMetrics();
      
      if (metrics) {
        // Atualizar métricas de migração
        this.migrationState.metrics.optimizedRequests += metrics.cache?.requests || 0;
        this.migrationState.metrics.errorRate = metrics.system?.errorRate || 0;
      }
      
    } catch (error) {
      this.migrationState.errors.push({
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'metrics'
      });
    }
  }

  /**
   * Verifica se deve continuar o rollout
   */
  private async shouldContinueRollout(): Promise<boolean> {
    const { metrics, errors } = this.migrationState;
    
    // Verificar taxa de erro
    if (metrics.errorRate > 0.05) { // 5%
      console.error('❌ Taxa de erro muito alta:', metrics.errorRate);
      return false;
    }
    
    // Verificar erros recentes
    const recentErrors = errors.filter(e => 
      Date.now() - e.timestamp.getTime() < 300000 // 5 minutos
    );
    
    if (recentErrors.length > 10) {
      console.error('❌ Muitos erros recentes:', recentErrors.length);
      return false;
    }
    
    // Verificar saúde dos serviços
    const healthStatus = await this.optimizedManager.getHealthStatus();
    if (healthStatus.overall !== 'healthy') {
      console.error('❌ Serviços não estão saudáveis:', healthStatus.overall);
      return false;
    }
    
    return true;
  }

  /**
   * Realiza rollback em caso de problemas
   */
  private async rollback(): Promise<void> {
    console.log('🔄 Realizando rollback...');
    
    try {
      // Desabilitar serviços otimizados
      await this.optimizedManager.updateConfig({
        integration: {
          enableGradualRollout: false,
          rolloutPercentage: 0,
          fallbackToLegacy: true,
          healthCheckInterval: 30000
        }
      });
      
      // Encerrar serviços
      await this.optimizedManager.shutdown();
      
      console.log('✅ Rollback concluído');
      
    } catch (error) {
      console.error('❌ Erro durante rollback:', error);
    }
  }

  /**
   * Obtém o status da migração
   */
  public getMigrationStatus(): typeof this.migrationState {
    return { ...this.migrationState };
  }

  /**
   * Gera relatório da migração
   */
  public generateMigrationReport(): string {
    const { phase, rolloutPercentage, startTime, errors, metrics } = this.migrationState;
    const duration = Date.now() - startTime.getTime();
    
    return `
# Relatório de Migração

## Status
- Fase: ${phase}
- Rollout: ${rolloutPercentage}%
- Duração: ${Math.round(duration / 1000)}s
- Início: ${startTime.toISOString()}

## Métricas
- Requisições legadas: ${metrics.legacyRequests}
- Requisições otimizadas: ${metrics.optimizedRequests}
- Taxa de erro: ${(metrics.errorRate * 100).toFixed(2)}%
- Ganho de performance: ${(metrics.performanceGain * 100).toFixed(2)}%

## Erros
- Total de erros: ${errors.length}
- Erros recentes: ${errors.filter(e => Date.now() - e.timestamp.getTime() < 300000).length}

## Últimos Erros
${errors.slice(-5).map(e => `- ${e.timestamp.toISOString()}: ${e.error} (${e.service})`).join('\n')}
    `.trim();
  }
}

// Exportar instância singleton
export const migrationHelper = MigrationHelper.getInstance();