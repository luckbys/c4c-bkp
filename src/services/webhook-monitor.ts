// Monitor de webhooks para detectar e corrigir problemas automaticamente
import { webhookConnectivity } from './webhook-connectivity';
import { evolutionApi } from './evolution-api';

interface WebhookMonitorStats {
  totalChecks: number;
  failedChecks: number;
  autoFixAttempts: number;
  successfulFixes: number;
  lastCheck: number;
  isMonitoring: boolean;
}

class WebhookMonitorService {
  private static instance: WebhookMonitorService;
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30 segundos
  private readonly WEBHOOK_URLS = new Set<string>();
  private stats: WebhookMonitorStats = {
    totalChecks: 0,
    failedChecks: 0,
    autoFixAttempts: 0,
    successfulFixes: 0,
    lastCheck: 0,
    isMonitoring: false
  };

  private constructor() {
    console.log('🔍 Webhook Monitor Service inicializado');
  }

  static getInstance(): WebhookMonitorService {
    if (!WebhookMonitorService.instance) {
      WebhookMonitorService.instance = new WebhookMonitorService();
    }
    return WebhookMonitorService.instance;
  }

  /**
   * Iniciar monitoramento automático
   */
  startMonitoring(): void {
    if (this.monitorInterval) {
      console.log('🔍 [MONITOR] Monitoramento já está ativo');
      return;
    }

    console.log(`🔍 [MONITOR] Iniciando monitoramento de webhooks (intervalo: ${this.CHECK_INTERVAL / 1000}s)`);
    
    this.stats.isMonitoring = true;
    
    this.monitorInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.CHECK_INTERVAL);

    // Executar primeira verificação imediatamente
    this.performHealthCheck();
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.stats.isMonitoring = false;
      console.log('🔍 [MONITOR] Monitoramento parado');
    }
  }

  /**
   * Adicionar URL de webhook para monitoramento
   */
  addWebhookUrl(url: string): void {
    this.WEBHOOK_URLS.add(url);
    console.log(`🔍 [MONITOR] URL adicionada ao monitoramento: ${url}`);
  }

  /**
   * Remover URL de webhook do monitoramento
   */
  removeWebhookUrl(url: string): void {
    this.WEBHOOK_URLS.delete(url);
    console.log(`🔍 [MONITOR] URL removida do monitoramento: ${url}`);
  }

  /**
   * Executar verificação de saúde
   */
  private async performHealthCheck(): Promise<void> {
    try {
      this.stats.totalChecks++;
      this.stats.lastCheck = Date.now();

      console.log(`🔍 [MONITOR] Executando verificação de saúde (${this.WEBHOOK_URLS.size} URLs)`);

      for (const webhookUrl of this.WEBHOOK_URLS) {
        await this.checkAndFixWebhook(webhookUrl);
      }

      // Limpar status antigos
      webhookConnectivity.cleanupOldStatus();

    } catch (error: any) {
      console.error('🔍 [MONITOR] Erro na verificação de saúde:', error.message);
    }
  }

  /**
   * Verificar e corrigir webhook específico
   */
  private async checkAndFixWebhook(webhookUrl: string): Promise<void> {
    try {
      const isReachable = await webhookConnectivity.checkWebhookConnectivity(webhookUrl);
      
      if (!isReachable) {
        this.stats.failedChecks++;
        console.warn(`⚠️ [MONITOR] Webhook não acessível: ${webhookUrl}`);
        
        // Tentar correção automática
        await this.attemptAutoFix(webhookUrl);
      } else {
        // Reset circuit breaker se estava aberto
        const status = webhookConnectivity.getConnectivityStatus(webhookUrl);
        if (status?.isCircuitOpen) {
          webhookConnectivity.resetCircuitBreaker(webhookUrl);
          console.log(`✅ [MONITOR] Circuit breaker resetado para ${webhookUrl}`);
        }
      }
      
    } catch (error: any) {
      console.error(`🔍 [MONITOR] Erro ao verificar ${webhookUrl}:`, error.message);
    }
  }

  /**
   * Tentar correção automática
   */
  private async attemptAutoFix(webhookUrl: string): Promise<void> {
    try {
      this.stats.autoFixAttempts++;
      
      console.log(`🔧 [MONITOR] Tentando correção automática para ${webhookUrl}`);
      
      // Estratégia 1: Verificar se o serviço local está rodando
      if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
        console.log(`🔧 [MONITOR] Detectado webhook local, verificando serviço...`);
        
        // Aguardar um pouco e tentar novamente
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const retryResult = await webhookConnectivity.checkWebhookConnectivity(webhookUrl);
        if (retryResult) {
          console.log(`✅ [MONITOR] Webhook local recuperado: ${webhookUrl}`);
          this.stats.successfulFixes++;
          return;
        }
      }
      
      // Estratégia 2: Reconfigurar webhook com configurações mais conservadoras
      console.log(`🔧 [MONITOR] Tentando reconfiguração conservadora...`);
      
      // Extrair nome da instância do URL (assumindo padrão)
      const instanceMatch = webhookUrl.match(/instance[=/]([^&/?]+)/);
      if (instanceMatch) {
        const instanceName = instanceMatch[1];
        
        try {
          await evolutionApi.configureWebhook(instanceName, webhookUrl);
          console.log(`✅ [MONITOR] Webhook reconfigurado para instância ${instanceName}`);
          this.stats.successfulFixes++;
        } catch (configError: any) {
          console.error(`❌ [MONITOR] Falha na reconfiguração:`, configError.message);
        }
      }
      
    } catch (error: any) {
      console.error(`🔧 [MONITOR] Falha na correção automática:`, error.message);
    }
  }

  /**
   * Obter estatísticas do monitor
   */
  getStats(): WebhookMonitorStats {
    return { ...this.stats };
  }

  /**
   * Obter status detalhado
   */
  getDetailedStatus(): {
    monitor: WebhookMonitorStats;
    webhooks: Record<string, any>;
    connectivity: Record<string, any>;
  } {
    const webhookStatus: Record<string, any> = {};
    
    this.WEBHOOK_URLS.forEach(url => {
      const status = webhookConnectivity.getConnectivityStatus(url);
      webhookStatus[url] = {
        isMonitored: true,
        status: status || 'not_checked'
      };
    });
    
    return {
      monitor: this.getStats(),
      webhooks: webhookStatus,
      connectivity: webhookConnectivity.getAllConnectivityStats()
    };
  }

  /**
   * Forçar verificação manual
   */
  async forceHealthCheck(): Promise<void> {
    console.log('🔍 [MONITOR] Executando verificação manual...');
    await this.performHealthCheck();
  }

  /**
   * Reset estatísticas
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      failedChecks: 0,
      autoFixAttempts: 0,
      successfulFixes: 0,
      lastCheck: 0,
      isMonitoring: this.stats.isMonitoring
    };
    console.log('🔍 [MONITOR] Estatísticas resetadas');
  }
}

export const webhookMonitor = WebhookMonitorService.getInstance();

// Auto-inicializar monitoramento se estiver em produção
if (process.env.NODE_ENV === 'production') {
  // Aguardar um pouco antes de iniciar para evitar problemas de inicialização
  setTimeout(() => {
    webhookMonitor.addWebhookUrl('http://localhost:9003/api/webhooks/evolution');
    webhookMonitor.startMonitoring();
  }, 10000); // 10 segundos
}