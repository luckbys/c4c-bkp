// Serviço para validar conectividade de webhooks e implementar fallbacks
import { retryService } from './retry-service';

interface WebhookConnectivityStatus {
  isReachable: boolean;
  lastChecked: number;
  consecutiveFailures: number;
  isCircuitOpen: boolean;
}

class WebhookConnectivityService {
  private static instance: WebhookConnectivityService;
  private connectivityStatus = new Map<string, WebhookConnectivityStatus>();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Abrir circuito após 5 falhas consecutivas
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto para tentar novamente
  private readonly CONNECTIVITY_CHECK_INTERVAL = 30000; // Verificar a cada 30 segundos
  private readonly REQUEST_TIMEOUT = 5000; // 5 segundos timeout para verificação

  private constructor() {
    console.log('🔗 Webhook Connectivity Service inicializado');
  }

  static getInstance(): WebhookConnectivityService {
    if (!WebhookConnectivityService.instance) {
      WebhookConnectivityService.instance = new WebhookConnectivityService();
    }
    return WebhookConnectivityService.instance;
  }

  /**
   * Verificar se um webhook está acessível
   */
  async checkWebhookConnectivity(webhookUrl: string): Promise<boolean> {
    try {
      console.log(`🔗 [WEBHOOK] Verificando conectividade: ${webhookUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Evolution-API-Connectivity-Check'
        }
      });
      
      clearTimeout(timeoutId);
      
      const isReachable = response.status < 500; // Aceitar 2xx, 3xx, 4xx como "reachable"
      
      console.log(`🔗 [WEBHOOK] Conectividade ${webhookUrl}: ${isReachable ? '✅ OK' : '❌ FALHA'} (status: ${response.status})`);
      
      this.updateConnectivityStatus(webhookUrl, isReachable);
      return isReachable;
      
    } catch (error: any) {
      console.error(`🔗 [WEBHOOK] Erro de conectividade ${webhookUrl}:`, {
        error: error.message,
        name: error.name
      });
      
      this.updateConnectivityStatus(webhookUrl, false);
      return false;
    }
  }

  /**
   * Atualizar status de conectividade
   */
  private updateConnectivityStatus(webhookUrl: string, isReachable: boolean): void {
    const current = this.connectivityStatus.get(webhookUrl) || {
      isReachable: true,
      lastChecked: 0,
      consecutiveFailures: 0,
      isCircuitOpen: false
    };

    const updated: WebhookConnectivityStatus = {
      isReachable,
      lastChecked: Date.now(),
      consecutiveFailures: isReachable ? 0 : current.consecutiveFailures + 1,
      isCircuitOpen: false
    };

    // Verificar se deve abrir o circuit breaker
    if (updated.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      updated.isCircuitOpen = true;
      console.warn(`🚨 [WEBHOOK] Circuit breaker ABERTO para ${webhookUrl} após ${updated.consecutiveFailures} falhas consecutivas`);
    }

    this.connectivityStatus.set(webhookUrl, updated);
  }

  /**
   * Verificar se o circuit breaker está aberto
   */
  isCircuitOpen(webhookUrl: string): boolean {
    const status = this.connectivityStatus.get(webhookUrl);
    if (!status || !status.isCircuitOpen) {
      return false;
    }

    // Verificar se é hora de tentar novamente
    const timeSinceLastCheck = Date.now() - status.lastChecked;
    if (timeSinceLastCheck > this.CIRCUIT_BREAKER_TIMEOUT) {
      console.log(`🔄 [WEBHOOK] Tentando reabrir circuit breaker para ${webhookUrl}`);
      status.isCircuitOpen = false;
      this.connectivityStatus.set(webhookUrl, status);
      return false;
    }

    return true;
  }

  /**
   * Validar webhook antes de configurar
   */
  async validateWebhookBeforeConfiguration(webhookUrl: string): Promise<{
    isValid: boolean;
    reason?: string;
    shouldConfigure: boolean;
  }> {
    try {
      // Verificar se o circuit breaker está aberto
      if (this.isCircuitOpen(webhookUrl)) {
        return {
          isValid: false,
          reason: 'Circuit breaker aberto - webhook indisponível',
          shouldConfigure: false
        };
      }

      // Verificar conectividade
      const isReachable = await this.checkWebhookConnectivity(webhookUrl);
      
      if (!isReachable) {
        return {
          isValid: false,
          reason: 'Webhook não está acessível',
          shouldConfigure: false
        };
      }

      return {
        isValid: true,
        shouldConfigure: true
      };
      
    } catch (error: any) {
      console.error(`🔗 [WEBHOOK] Erro na validação de ${webhookUrl}:`, error);
      return {
        isValid: false,
        reason: `Erro na validação: ${error.message}`,
        shouldConfigure: false
      };
    }
  }

  /**
   * Obter status de conectividade
   */
  getConnectivityStatus(webhookUrl: string): WebhookConnectivityStatus | null {
    return this.connectivityStatus.get(webhookUrl) || null;
  }

  /**
   * Obter estatísticas de todos os webhooks
   */
  getAllConnectivityStats(): Record<string, WebhookConnectivityStatus> {
    const stats: Record<string, WebhookConnectivityStatus> = {};
    this.connectivityStatus.forEach((status, url) => {
      stats[url] = { ...status };
    });
    return stats;
  }

  /**
   * Resetar circuit breaker manualmente
   */
  resetCircuitBreaker(webhookUrl: string): void {
    const status = this.connectivityStatus.get(webhookUrl);
    if (status) {
      status.isCircuitOpen = false;
      status.consecutiveFailures = 0;
      this.connectivityStatus.set(webhookUrl, status);
      console.log(`🔄 [WEBHOOK] Circuit breaker resetado manualmente para ${webhookUrl}`);
    }
  }

  /**
   * Limpar status antigos
   */
  cleanupOldStatus(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    this.connectivityStatus.forEach((status, url) => {
      if (now - status.lastChecked > maxAge) {
        this.connectivityStatus.delete(url);
        console.log(`🧹 [WEBHOOK] Status antigo removido para ${url}`);
      }
    });
  }
}

export const webhookConnectivity = WebhookConnectivityService.getInstance();