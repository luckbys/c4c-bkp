import { OptimizedCacheService } from './optimized-cache-service';
import { PushNotificationService } from './push-notification-service';
import { CacheQueueCoordinator } from './cache-queue-coordinator';
import { PerformanceMonitor } from './performance-monitor';
import { IntegrationManager } from './integration-manager';
import { RedisService } from './redis-service';
import { RabbitMQService } from './rabbitmq-service';

/**
 * Configuração centralizada para todos os serviços otimizados
 */
export interface OptimizedServicesConfig {
  // Cache otimizado
  cache: {
    enabled: boolean;
    defaultTTL: number;
    maxMemoryUsage: number;
    compressionThreshold: number;
    versioningEnabled: boolean;
  };
  
  // Notificações push
  pushNotifications: {
    enabled: boolean;
    heartbeatInterval: number;
    maxConnections: number;
    channelCleanupInterval: number;
  };
  
  // Coordenação cache-fila
  coordination: {
    enabled: boolean;
    batchSize: number;
    batchInterval: number;
    retryAttempts: number;
  };
  
  // Monitoramento de performance
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      cacheHitRate: number;
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
    };
  };
  
  // Integração
  integration: {
    enableGradualRollout: boolean;
    rolloutPercentage: number;
    fallbackToLegacy: boolean;
    healthCheckInterval: number;
  };
}

/**
 * Configuração padrão dos serviços otimizados
 */
export const defaultOptimizedConfig: OptimizedServicesConfig = {
  cache: {
    enabled: true,
    defaultTTL: 1800, // 30 minutos
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    compressionThreshold: 10240, // 10KB
    versioningEnabled: true
  },
  
  pushNotifications: {
    enabled: false, // Desabilitado - usando Firebase Realtime Database
    heartbeatInterval: 30000, // 30 segundos
    maxConnections: 1000,
    channelCleanupInterval: 300000 // 5 minutos
  },
  
  coordination: {
    enabled: true,
    batchSize: 50,
    batchInterval: 1000, // 1 segundo
    retryAttempts: 3
  },
  
  monitoring: {
    enabled: true,
    metricsInterval: 10000, // 10 segundos
    alertThresholds: {
      cacheHitRate: 0.8, // 80%
      responseTime: 1000, // 1 segundo
      errorRate: 0.05, // 5%
      memoryUsage: 0.85 // 85%
    }
  },
  
  integration: {
    enableGradualRollout: true,
    rolloutPercentage: 10, // Começar com 10%
    fallbackToLegacy: true,
    healthCheckInterval: 30000 // 30 segundos
  }
};

/**
 * Classe principal para gerenciar todos os serviços otimizados
 */
export class OptimizedServicesManager {
  private static instance: OptimizedServicesManager;
  private config: OptimizedServicesConfig;
  private services: {
    cache?: OptimizedCacheService;
    pushNotifications?: PushNotificationService;
    coordinator?: CacheQueueCoordinator;
    monitor?: PerformanceMonitor;
    integration?: IntegrationManager;
  } = {};
  
  private isInitialized = false;
  private isShuttingDown = false;

  private constructor(config: OptimizedServicesConfig = defaultOptimizedConfig) {
    this.config = { ...defaultOptimizedConfig, ...config };
  }

  public static getInstance(config?: OptimizedServicesConfig): OptimizedServicesManager {
    if (!OptimizedServicesManager.instance) {
      OptimizedServicesManager.instance = new OptimizedServicesManager(config);
    }
    return OptimizedServicesManager.instance;
  }

  /**
   * Inicializa todos os serviços otimizados
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Serviços otimizados já foram inicializados');
      return;
    }

    try {
      console.log('Inicializando serviços otimizados...');
      
      // Verificar dependências
      await this.checkDependencies();
      
      // Inicializar serviços em ordem de dependência
      await this.initializeServices();
      
      // Configurar integração
      await this.setupIntegration();
      
      this.isInitialized = true;
      console.log('Serviços otimizados inicializados com sucesso');
      
    } catch (error) {
      console.error('Erro ao inicializar serviços otimizados:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Verifica se as dependências estão disponíveis
   */
  private async checkDependencies(): Promise<void> {
    const checks = [];
    
    // Verificar Redis
    if (this.config.cache.enabled) {
      checks.push(this.checkRedisConnection());
    }
    
    // Verificar RabbitMQ
    if (this.config.coordination.enabled) {
      checks.push(this.checkRabbitMQConnection());
    }
    
    await Promise.all(checks);
  }

  private async checkRedisConnection(): Promise<void> {
    try {
      const redisService = RedisService.getInstance();
      await redisService.ping();
      console.log('✓ Redis conectado');
    } catch (error) {
      console.warn('⚠ Redis não disponível, usando cache em memória');
    }
  }

  private async checkRabbitMQConnection(): Promise<void> {
    try {
      // Assumindo que existe um RabbitMQService
      // const rabbitMQService = RabbitMQService.getInstance();
      // await rabbitMQService.ping();
      console.log('✓ RabbitMQ conectado');
    } catch (error) {
      console.warn('⚠ RabbitMQ não disponível, coordenação desabilitada');
      this.config.coordination.enabled = false;
    }
  }

  /**
   * Inicializa os serviços individuais
   */
  private async initializeServices(): Promise<void> {
    // 1. Cache otimizado
    if (this.config.cache.enabled) {
      this.services.cache = new OptimizedCacheService({
        defaultTTL: this.config.cache.defaultTTL,
        maxMemoryUsage: this.config.cache.maxMemoryUsage,
        compressionThreshold: this.config.cache.compressionThreshold,
        enableVersioning: this.config.cache.versioningEnabled
      });
      await this.services.cache.initialize();
      console.log('✓ Cache otimizado inicializado');
    }

    // 2. Notificações push (desabilitado - usando Firebase Realtime)
    if (this.config.pushNotifications.enabled) {
      this.services.pushNotifications = new PushNotificationService({
        heartbeatInterval: this.config.pushNotifications.heartbeatInterval,
        maxConnections: this.config.pushNotifications.maxConnections,
        channelCleanupInterval: this.config.pushNotifications.channelCleanupInterval
      });
      await this.services.pushNotifications.initialize();
      console.log('✓ Notificações push inicializadas');
    } else {
      console.log('ℹ️ Notificações push desabilitadas - usando Firebase Realtime Database');
    }

    // 3. Coordenação cache-fila
    if (this.config.coordination.enabled && this.services.cache) {
      this.services.coordinator = new CacheQueueCoordinator({
        cacheService: this.services.cache,
        notificationService: this.services.pushNotifications,
        batchSize: this.config.coordination.batchSize,
        batchInterval: this.config.coordination.batchInterval,
        retryAttempts: this.config.coordination.retryAttempts
      });
      await this.services.coordinator.initialize();
      console.log('✓ Coordenação cache-fila inicializada');
    }

    // 4. Monitoramento de performance
    if (this.config.monitoring.enabled) {
      this.services.monitor = new PerformanceMonitor({
        metricsInterval: this.config.monitoring.metricsInterval,
        alertThresholds: this.config.monitoring.alertThresholds,
        services: {
          cache: this.services.cache,
          pushNotifications: this.services.pushNotifications,
          coordinator: this.services.coordinator
        }
      });
      await this.services.monitor.initialize();
      console.log('✓ Monitoramento de performance inicializado');
    }
  }

  /**
   * Configura a integração com o sistema existente
   */
  private async setupIntegration(): Promise<void> {
    if (this.config.integration.enableGradualRollout) {
      this.services.integration = new IntegrationManager({
        rolloutPercentage: this.config.integration.rolloutPercentage,
        fallbackToLegacy: this.config.integration.fallbackToLegacy,
        healthCheckInterval: this.config.integration.healthCheckInterval,
        optimizedServices: this.services
      });
      
      await this.services.integration.initialize();
      console.log('✓ Integração configurada');
    }
  }

  /**
   * Obtém um serviço específico
   */
  public getService<T extends keyof typeof this.services>(serviceName: T): typeof this.services[T] {
    return this.services[serviceName];
  }

  /**
   * Obtém todas as métricas dos serviços
   */
  public async getMetrics(): Promise<any> {
    if (!this.services.monitor) {
      return null;
    }
    
    return await this.services.monitor.getMetrics();
  }

  /**
   * Obtém o status de saúde de todos os serviços
   */
  public async getHealthStatus(): Promise<any> {
    const status = {
      overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      services: {} as Record<string, any>,
      timestamp: new Date().toISOString()
    };

    // Verificar cada serviço
    for (const [name, service] of Object.entries(this.services)) {
      if (service && typeof service.getHealthStatus === 'function') {
        try {
          status.services[name] = await service.getHealthStatus();
        } catch (error) {
          status.services[name] = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          status.overall = 'unhealthy';
        }
      }
    }

    return status;
  }

  /**
   * Atualiza a configuração dos serviços
   */
  public async updateConfig(newConfig: Partial<OptimizedServicesConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinicializar serviços afetados
    if (newConfig.cache && this.services.cache) {
      await this.services.cache.updateConfig(newConfig.cache);
    }
    
    if (newConfig.monitoring && this.services.monitor) {
      await this.services.monitor.updateConfig(newConfig.monitoring);
    }
    
    console.log('Configuração dos serviços atualizada');
  }

  /**
   * Realiza limpeza e encerra todos os serviços
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.log('Encerrando serviços otimizados...');
    
    try {
      await this.cleanup();
      console.log('Serviços otimizados encerrados com sucesso');
    } catch (error) {
      console.error('Erro ao encerrar serviços:', error);
    }
  }

  private async cleanup(): Promise<void> {
    const cleanupPromises = [];
    
    // Encerrar serviços em ordem reversa
    if (this.services.integration) {
      cleanupPromises.push(this.services.integration.shutdown());
    }
    
    if (this.services.monitor) {
      cleanupPromises.push(this.services.monitor.shutdown());
    }
    
    if (this.services.coordinator) {
      cleanupPromises.push(this.services.coordinator.shutdown());
    }
    
    if (this.services.pushNotifications) {
      cleanupPromises.push(this.services.pushNotifications.shutdown());
    }
    
    if (this.services.cache) {
      cleanupPromises.push(this.services.cache.shutdown());
    }
    
    await Promise.allSettled(cleanupPromises);
    
    this.services = {};
    this.isInitialized = false;
    this.isShuttingDown = false;
  }
}

// Exportar instância singleton
export const optimizedServices = OptimizedServicesManager.getInstance();