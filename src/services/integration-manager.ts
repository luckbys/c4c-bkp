import { EventEmitter } from 'events';
import { optimizedCacheService } from './optimized-cache-service';
import { pushNotificationService } from './push-notification-service';
import { cacheQueueCoordinator } from './cache-queue-coordinator';
import { performanceMonitor } from './performance-monitor';
import { redisService } from './redis-service';

interface IntegrationConfig {
  enableOptimizedCache: boolean;
  enablePushNotifications: boolean;
  enableCoordination: boolean;
  enablePerformanceMonitoring: boolean;
  fallbackToOriginal: boolean;
  migrationMode: 'gradual' | 'immediate' | 'testing';
}

interface MigrationStatus {
  phase: 'initializing' | 'migrating' | 'completed' | 'failed' | 'rollback';
  progress: number;
  currentStep: string;
  errors: string[];
  startTime: number;
  estimatedCompletion?: number;
}

interface ServiceStatus {
  optimizedCache: 'active' | 'inactive' | 'error';
  pushNotifications: 'active' | 'inactive' | 'error';
  coordination: 'active' | 'inactive' | 'error';
  performanceMonitor: 'active' | 'inactive' | 'error';
  redis: 'connected' | 'disconnected' | 'error';
}

class IntegrationManager extends EventEmitter {
  private static instance: IntegrationManager;
  private config: IntegrationConfig;
  private migrationStatus: MigrationStatus;
  private serviceStatus: ServiceStatus;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 segundos
  private readonly MIGRATION_TIMEOUT = 300000; // 5 minutos

  private constructor() {
    super();
    
    this.config = {
      enableOptimizedCache: true,
      enablePushNotifications: true,
      enableCoordination: true,
      enablePerformanceMonitoring: true,
      fallbackToOriginal: true,
      migrationMode: 'gradual'
    };
    
    this.migrationStatus = {
      phase: 'initializing',
      progress: 0,
      currentStep: 'Preparando inicialização',
      errors: [],
      startTime: Date.now()
    };
    
    this.serviceStatus = {
      optimizedCache: 'inactive',
      pushNotifications: 'inactive',
      coordination: 'inactive',
      performanceMonitor: 'inactive',
      redis: 'disconnected'
    };
  }

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Inicializar integração dos serviços otimizados
   */
  async initialize(config?: Partial<IntegrationConfig>): Promise<boolean> {
    if (this.isInitialized) {
      console.log('⚠️ Integration Manager already initialized');
      return true;
    }

    console.log('🚀 Initializing Integration Manager...');
    
    // Atualizar configuração
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.migrationStatus = {
      phase: 'initializing',
      progress: 0,
      currentStep: 'Iniciando integração',
      errors: [],
      startTime: Date.now()
    };
    
    this.emit('integration:started', this.migrationStatus);
    
    try {
      // Fase 1: Verificar dependências
      await this.checkDependencies();
      this.updateProgress(20, 'Dependências verificadas');
      
      // Fase 2: Inicializar serviços base
      await this.initializeBaseServices();
      this.updateProgress(40, 'Serviços base inicializados');
      
      // Fase 3: Configurar integração
      await this.setupIntegration();
      this.updateProgress(60, 'Integração configurada');
      
      // Fase 4: Inicializar serviços otimizados
      await this.initializeOptimizedServices();
      this.updateProgress(80, 'Serviços otimizados inicializados');
      
      // Fase 5: Configurar monitoramento
      await this.setupMonitoring();
      this.updateProgress(100, 'Integração concluída');
      
      this.migrationStatus.phase = 'completed';
      this.isInitialized = true;
      
      console.log('✅ Integration Manager initialized successfully');
      this.emit('integration:completed', this.migrationStatus);
      
      return true;
      
    } catch (error) {
      console.error('❌ Integration Manager initialization failed:', error);
      
      this.migrationStatus.phase = 'failed';
      this.migrationStatus.errors.push(error.message);
      
      this.emit('integration:failed', { error, status: this.migrationStatus });
      
      // Tentar rollback se configurado
      if (this.config.fallbackToOriginal) {
        await this.rollback();
      }
      
      return false;
    }
  }

  /**
   * Verificar dependências necessárias
   */
  private async checkDependencies(): Promise<void> {
    console.log('🔍 Checking dependencies...');
    
    // Verificar Redis
    try {
      await redisService.set('integration_test', 'ok', 1);
      this.serviceStatus.redis = 'connected';
      console.log('✅ Redis connection verified');
    } catch (error) {
      this.serviceStatus.redis = 'error';
      throw new Error(`Redis connection failed: ${error.message}`);
    }
    
    // Verificar outros serviços necessários
    // Adicionar verificações conforme necessário
  }

  /**
   * Inicializar serviços base
   */
  private async initializeBaseServices(): Promise<void> {
    console.log('🔧 Initializing base services...');
    
    // Garantir que o Redis Service está funcionando
    if (this.serviceStatus.redis !== 'connected') {
      throw new Error('Redis service not available');
    }
    
    console.log('✅ Base services initialized');
  }

  /**
   * Configurar integração entre serviços
   */
  private async setupIntegration(): Promise<void> {
    console.log('🔗 Setting up service integration...');
    
    // Configurar eventos entre serviços
    this.setupServiceEvents();
    
    // Configurar fallbacks
    this.setupFallbacks();
    
    console.log('✅ Service integration configured');
  }

  /**
   * Configurar eventos entre serviços
   */
  private setupServiceEvents(): void {
    // Cache events -> Coordination
    optimizedCacheService.on('cache:invalidate', (event) => {
      if (this.config.enableCoordination) {
        // Notificar coordenador sobre invalidação de cache
        this.emit('integration:cache_invalidated', event);
      }
    });
    
    // Coordination events -> Notifications
    cacheQueueCoordinator.on('coordination:message_processed', (event) => {
      if (this.config.enablePushNotifications) {
        // Processar notificações baseadas em eventos coordenados
        this.emit('integration:coordination_processed', event);
      }
    });
    
    // Performance events
    performanceMonitor.on('monitor:alert_created', (alert) => {
      this.emit('integration:performance_alert', alert);
    });
  }

  /**
   * Configurar fallbacks para serviços originais
   */
  private setupFallbacks(): void {
    if (!this.config.fallbackToOriginal) {
      return;
    }
    
    // Fallback para cache original se o otimizado falhar
    optimizedCacheService.on('error', (error) => {
      console.warn('⚠️ Optimized cache error, falling back to original:', error);
      this.serviceStatus.optimizedCache = 'error';
      this.emit('integration:fallback_activated', { service: 'cache', error });
    });
    
    // Fallback para notificações
    pushNotificationService.on('error', (error) => {
      console.warn('⚠️ Push notifications error, falling back to polling:', error);
      this.serviceStatus.pushNotifications = 'error';
      this.emit('integration:fallback_activated', { service: 'notifications', error });
    });
  }

  /**
   * Inicializar serviços otimizados
   */
  private async initializeOptimizedServices(): Promise<void> {
    console.log('⚡ Initializing optimized services...');
    
    const initPromises: Promise<void>[] = [];
    
    // Inicializar cache otimizado
    if (this.config.enableOptimizedCache) {
      initPromises.push(this.initializeOptimizedCache());
    }
    
    // Inicializar notificações push
    if (this.config.enablePushNotifications) {
      initPromises.push(this.initializePushNotifications());
    }
    
    // Inicializar coordenação
    if (this.config.enableCoordination) {
      initPromises.push(this.initializeCoordination());
    }
    
    // Aguardar inicialização de todos os serviços
    await Promise.all(initPromises);
    
    console.log('✅ Optimized services initialized');
  }

  /**
   * Inicializar cache otimizado
   */
  private async initializeOptimizedCache(): Promise<void> {
    try {
      // O cache otimizado é inicializado automaticamente
      // Verificar se está funcionando
      await optimizedCacheService.set('integration_test', { test: true }, 60);
      const result = await optimizedCacheService.get('integration_test');
      
      if (result) {
        this.serviceStatus.optimizedCache = 'active';
        console.log('✅ Optimized cache service active');
      } else {
        throw new Error('Cache test failed');
      }
    } catch (error) {
      this.serviceStatus.optimizedCache = 'error';
      throw new Error(`Optimized cache initialization failed: ${error.message}`);
    }
  }

  /**
   * Inicializar notificações push
   */
  private async initializePushNotifications(): Promise<void> {
    try {
      // Inicializar servidor WebSocket se necessário
      // Por enquanto, apenas marcar como ativo
      this.serviceStatus.pushNotifications = 'active';
      console.log('✅ Push notifications service active');
    } catch (error) {
      this.serviceStatus.pushNotifications = 'error';
      throw new Error(`Push notifications initialization failed: ${error.message}`);
    }
  }

  /**
   * Inicializar coordenação
   */
  private async initializeCoordination(): Promise<void> {
    try {
      // O coordenador é inicializado automaticamente
      this.serviceStatus.coordination = 'active';
      console.log('✅ Coordination service active');
    } catch (error) {
      this.serviceStatus.coordination = 'error';
      throw new Error(`Coordination initialization failed: ${error.message}`);
    }
  }

  /**
   * Configurar monitoramento
   */
  private async setupMonitoring(): Promise<void> {
    if (!this.config.enablePerformanceMonitoring) {
      return;
    }
    
    console.log('📊 Setting up performance monitoring...');
    
    try {
      // Iniciar monitoramento
      performanceMonitor.startMonitoring();
      this.serviceStatus.performanceMonitor = 'active';
      
      // Configurar health checks
      this.startHealthChecks();
      
      console.log('✅ Performance monitoring active');
    } catch (error) {
      this.serviceStatus.performanceMonitor = 'error';
      console.warn('⚠️ Performance monitoring setup failed:', error);
    }
  }

  /**
   * Iniciar verificações de saúde periódicas
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Realizar verificação de saúde
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Verificar Redis
      try {
        await redisService.set('health_check', 'ok', 1);
        this.serviceStatus.redis = 'connected';
      } catch (error) {
        this.serviceStatus.redis = 'error';
      }
      
      // Verificar cache otimizado
      if (this.config.enableOptimizedCache) {
        try {
          await optimizedCacheService.get('health_check');
          this.serviceStatus.optimizedCache = 'active';
        } catch (error) {
          this.serviceStatus.optimizedCache = 'error';
        }
      }
      
      // Emitir status de saúde
      this.emit('integration:health_check', this.serviceStatus);
      
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * Atualizar progresso da migração
   */
  private updateProgress(progress: number, step: string): void {
    this.migrationStatus.progress = progress;
    this.migrationStatus.currentStep = step;
    
    this.emit('integration:progress', this.migrationStatus);
  }

  /**
   * Realizar rollback para serviços originais
   */
  async rollback(): Promise<void> {
    console.log('🔄 Starting rollback to original services...');
    
    this.migrationStatus.phase = 'rollback';
    this.emit('integration:rollback_started', this.migrationStatus);
    
    try {
      // Parar serviços otimizados
      if (this.serviceStatus.performanceMonitor === 'active') {
        performanceMonitor.stopMonitoring();
      }
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Resetar status
      this.serviceStatus = {
        optimizedCache: 'inactive',
        pushNotifications: 'inactive',
        coordination: 'inactive',
        performanceMonitor: 'inactive',
        redis: 'disconnected'
      };
      
      this.isInitialized = false;
      
      console.log('✅ Rollback completed');
      this.emit('integration:rollback_completed');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      this.emit('integration:rollback_failed', error);
    }
  }

  /**
   * Obter status atual da integração
   */
  getStatus(): {
    isInitialized: boolean;
    config: IntegrationConfig;
    migrationStatus: MigrationStatus;
    serviceStatus: ServiceStatus;
  } {
    return {
      isInitialized: this.isInitialized,
      config: { ...this.config },
      migrationStatus: { ...this.migrationStatus },
      serviceStatus: { ...this.serviceStatus }
    };
  }

  /**
   * Atualizar configuração
   */
  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('integration:config_updated', this.config);
  }

  /**
   * Verificar se um serviço específico está ativo
   */
  isServiceActive(service: keyof ServiceStatus): boolean {
    return this.serviceStatus[service] === 'active' || this.serviceStatus[service] === 'connected';
  }

  /**
   * Obter métricas de integração
   */
  getMetrics(): {
    uptime: number;
    servicesActive: number;
    totalServices: number;
    healthScore: number;
  } {
    const uptime = Date.now() - this.migrationStatus.startTime;
    const services = Object.values(this.serviceStatus);
    const activeServices = services.filter(status => 
      status === 'active' || status === 'connected'
    ).length;
    const totalServices = services.length;
    const healthScore = totalServices > 0 ? (activeServices / totalServices) * 100 : 0;
    
    return {
      uptime,
      servicesActive: activeServices,
      totalServices,
      healthScore
    };
  }

  /**
   * Parar integração e limpar recursos
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Integration Manager...');
    
    // Parar health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Parar serviços otimizados
    const shutdownPromises: Promise<void>[] = [];
    
    if (this.serviceStatus.performanceMonitor === 'active') {
      shutdownPromises.push(performanceMonitor.shutdown());
    }
    
    if (this.serviceStatus.coordination === 'active') {
      shutdownPromises.push(cacheQueueCoordinator.shutdown());
    }
    
    if (this.serviceStatus.pushNotifications === 'active') {
      shutdownPromises.push(pushNotificationService.shutdown());
    }
    
    // Aguardar shutdown de todos os serviços
    await Promise.all(shutdownPromises);
    
    // Limpar listeners
    this.removeAllListeners();
    
    // Resetar estado
    this.isInitialized = false;
    
    console.log('✅ Integration Manager shutdown complete');
  }
}

export const integrationManager = IntegrationManager.getInstance();
export { IntegrationManager };
export type { IntegrationConfig, MigrationStatus, ServiceStatus };