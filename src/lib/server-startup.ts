// Arquivo de inicialização automática do servidor
import rabbitmqManager from '@/services/rabbitmq-manager';

interface StartupConfig {
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  startupDelay: number;
}

class ServerStartup {
  private static instance: ServerStartup;
  private isInitialized = false;
  private isInitializing = false;
  private retryCount = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  
  private config: StartupConfig = {
    maxRetries: 5,
    retryDelay: 10000, // 10 segundos
    healthCheckInterval: 30000, // 30 segundos
    startupDelay: 2000 // 2 segundos
  };

  private constructor() {
    // Configurar handlers para shutdown graceful
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
  }

  static getInstance(): ServerStartup {
    if (!ServerStartup.instance) {
      ServerStartup.instance = new ServerStartup();
    }
    return ServerStartup.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ [SERVER STARTUP] Servidor já foi inicializado');
      return;
    }

    if (this.isInitializing) {
      console.log('⚠️ [SERVER STARTUP] Inicialização já está em andamento');
      return;
    }

    this.isInitializing = true;
    const startTime = Date.now();

    try {
      console.log(`🚀 [SERVER STARTUP] Inicializando serviços do servidor... (Tentativa ${this.retryCount + 1}/${this.config.maxRetries})`);
      console.log(`⏱️ [SERVER STARTUP] Timestamp: ${new Date().toISOString()}`);
      
      // Aguardar um pouco para garantir que o servidor esteja pronto
      console.log(`⏳ [SERVER STARTUP] Aguardando ${this.config.startupDelay}ms para estabilização...`);
      await new Promise(resolve => setTimeout(resolve, this.config.startupDelay));
      
      // Verificar se o ambiente está pronto
      await this.performEnvironmentChecks();
      
      // Inicializar RabbitMQ Manager automaticamente
      console.log('📡 [SERVER STARTUP] Inicializando RabbitMQ Manager...');
      const rabbitmqStartTime = Date.now();
      
      await rabbitmqManager.start();
      
      const rabbitmqDuration = Date.now() - rabbitmqStartTime;
      console.log(`✅ [SERVER STARTUP] RabbitMQ Manager inicializado com sucesso! (${rabbitmqDuration}ms)`);
      
      // Verificar saúde dos serviços
      await this.performHealthChecks();
      
      this.isInitialized = true;
      this.isInitializing = false;
      this.retryCount = 0;
      
      const totalDuration = Date.now() - startTime;
      console.log(`🎉 [SERVER STARTUP] Todos os serviços foram inicializados com sucesso! (${totalDuration}ms)`);
      
      // Iniciar monitoramento de saúde
      this.startHealthMonitoring();
      
    } catch (error) {
      this.isInitializing = false;
      const duration = Date.now() - startTime;
      
      console.error(`❌ [SERVER STARTUP] Erro ao inicializar serviços (${duration}ms):`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        retryCount: this.retryCount,
        timestamp: new Date().toISOString()
      });
      
      // Verificar se deve tentar novamente
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1); // Backoff exponencial
        
        console.log(`🔄 [SERVER STARTUP] Tentando novamente em ${delay}ms... (${this.retryCount}/${this.config.maxRetries})`);
        
        setTimeout(() => {
          this.initialize();
        }, delay);
      } else {
        console.error(`💀 [SERVER STARTUP] Máximo de tentativas excedido (${this.config.maxRetries}). Inicialização falhou definitivamente.`);
        // Não resetar isInitialized para evitar loops infinitos
      }
    }
  }

  private async performEnvironmentChecks(): Promise<void> {
    console.log('🔍 [SERVER STARTUP] Verificando ambiente...');
    
    // Verificar variáveis de ambiente essenciais
    const requiredEnvVars = ['RABBITMQ_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missingVars.join(', ')}`);
    }
    
    console.log('✅ [SERVER STARTUP] Verificações de ambiente concluídas');
  }

  private async performHealthChecks(): Promise<void> {
    console.log('🏥 [SERVER STARTUP] Verificando saúde dos serviços...');
    
    try {
      // Verificar status do RabbitMQ
      const rabbitmqStatus = await rabbitmqManager.getStatus();
      console.log('📊 [SERVER STARTUP] Status RabbitMQ:', rabbitmqStatus);
      
      if (!rabbitmqStatus.rabbitmqConnected) {
         throw new Error('RabbitMQ não está conectado');
       }
      
      console.log('✅ [SERVER STARTUP] Verificações de saúde concluídas');
    } catch (error) {
      console.error('❌ [SERVER STARTUP] Falha na verificação de saúde:', error);
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    console.log(`💓 [SERVER STARTUP] Iniciando monitoramento de saúde (intervalo: ${this.config.healthCheckInterval}ms)`);
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        const status = await rabbitmqManager.getStatus();
        if (!status.rabbitmqConnected) {
           console.warn('⚠️ [HEALTH CHECK] RabbitMQ desconectado, tentando reconectar...');
           await rabbitmqManager.start();
         }
      } catch (error) {
        console.error('❌ [HEALTH CHECK] Erro no monitoramento:', error);
      }
    }, this.config.healthCheckInterval);
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('🛑 [SERVER STARTUP] Iniciando shutdown graceful...');
    await this.shutdown();
    process.exit(0);
  }

  async shutdown(): Promise<void> {
    try {
      console.log('⏹️ [SERVER STARTUP] Parando serviços...');
      
      // Parar monitoramento de saúde
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = undefined;
        console.log('💓 [SERVER STARTUP] Monitoramento de saúde parado');
      }
      
      // Parar RabbitMQ Manager
      await rabbitmqManager.stop();
      
      this.isInitialized = false;
      this.isInitializing = false;
      this.retryCount = 0;
      
      console.log('✅ [SERVER STARTUP] Serviços parados com sucesso!');
    } catch (error) {
      console.error('❌ [SERVER STARTUP] Erro ao parar serviços:', error);
    }
  }

  // Métodos públicos para monitoramento
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      retryCount: this.retryCount,
      hasHealthMonitoring: !!this.healthCheckTimer
    };
  }

  async forceRestart(): Promise<void> {
    console.log('🔄 [SERVER STARTUP] Forçando reinicialização...');
    await this.shutdown();
    this.retryCount = 0;
    await this.initialize();
  }
}

const serverStartup = ServerStartup.getInstance();

export default serverStartup;