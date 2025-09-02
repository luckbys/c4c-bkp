// Sistema de retry inteligente e fallback para garantir entrega de mensagens
// Implementa estratégias adaptativas baseadas no tipo de erro e histórico

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface RetryAttempt {
  attempt: number;
  timestamp: number;
  error: string;
  delay: number;
}

interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryTime: number;
  successRate: number;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

class RetryService {
  private static instance: RetryService;
  private retryHistory = new Map<string, RetryAttempt[]>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private stats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    retryTimes: [] as number[]
  };

  // Configurações do Circuit Breaker
  private readonly CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 3, // Abrir após 3 falhas consecutivas
    recoveryTimeout: 30000, // 30 segundos para tentar novamente
    successThreshold: 2 // 2 sucessos para fechar o circuito
  };

  // Configurações específicas por tipo de operação (otimizadas para evitar loops)
  private readonly RETRY_CONFIGS: Record<string, RetryConfig> = {
    // Mensagens críticas - retry reduzido para evitar loops
    'message_critical': {
      maxRetries: 2,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2.0,
      jitter: true
    },
    // Mensagens normais
    'message_normal': {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffMultiplier: 2.5,
      jitter: true
    },
    // Operações de Firebase
    'firebase': {
      maxRetries: 2,
      baseDelay: 1500,
      maxDelay: 12000,
      backoffMultiplier: 2.5,
      jitter: true
    },
    // Webhooks
    'webhook': {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 6000,
      backoffMultiplier: 2.0,
      jitter: true
    },
    // Evolution API - reduzido para evitar loops
    'evolution_api': {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 3.0,
      jitter: true
    },
    // Evolution API para mídia - muito reduzido para evitar loops infinitos
    'evolution_media': {
      maxRetries: 1,
      baseDelay: 3000,
      maxDelay: 15000,
      backoffMultiplier: 2.0,
      jitter: true
    },
    // Mídia indisponível - apenas 1 retry para evitar loops
    'media_unavailable': {
      maxRetries: 1,
      baseDelay: 10000,
      maxDelay: 30000,
      backoffMultiplier: 2.0,
      jitter: true
    },
    // Processamento específico de imagens - reduzido
    'image_processing': {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 12000,
      backoffMultiplier: 2.5,
      jitter: true
    },

    // Configuração para uploads do MinIO
    'minio_upload': {
      maxRetries: 2,
      baseDelay: 1500,
      maxDelay: 8000,
      backoffMultiplier: 2.0,
      jitter: true
    }
  };

  // Erros que devem ser tratados com retry imediato
  private readonly IMMEDIATE_RETRY_ERRORS = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'socket hang up',
    'network timeout',
    'EVOLUTION_TIMEOUT',
    'EVOLUTION_SERVER_ERROR',
    'EVOLUTION_RATE_LIMIT'
  ];

  // Erros relacionados a mídia indisponível
  private readonly MEDIA_UNAVAILABLE_ERRORS = [
    'MEDIA_NOT_FOUND',
    'MEDIA_EXPIRED',
    'MEDIA_UNAVAILABLE',
    'FILE_NOT_FOUND',
    'IMAGE_NOT_FOUND',
    'THUMBNAIL_UNAVAILABLE',
    'BASE64_CORRUPTED',
    '404'
  ];

  // Erros específicos de processamento de imagem
  private readonly IMAGE_PROCESSING_ERRORS = [
    'INVALID_IMAGE_FORMAT',
    'IMAGE_DECODE_ERROR',
    'CORRUPTED_IMAGE_DATA',
    'UNSUPPORTED_IMAGE_TYPE',
    'IMAGE_TOO_LARGE',
    'BASE64_INVALID'
  ];

  // Erros que não devem ser retentados
  private readonly NON_RETRYABLE_ERRORS = [
    'INVALID_API_KEY',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'MALFORMED_REQUEST',
    'EVOLUTION_NOT_FOUND',
    'EVOLUTION_CLIENT_ERROR'
  ];

  private constructor() {
    console.log('🔄 Retry Service inicializado com configurações adaptativas');
  }

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * Verificar estado do circuit breaker
   */
  private checkCircuitBreaker(operationType: string): boolean {
    const circuitKey = `circuit_${operationType}`;
    const circuit = this.circuitBreakers.get(circuitKey);
    
    if (!circuit) {
      // Inicializar circuit breaker
      this.circuitBreakers.set(circuitKey, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      });
      return true;
    }
    
    const now = Date.now();
    
    switch (circuit.state) {
      case 'OPEN':
        // Verificar se é hora de tentar novamente
        if (now - circuit.lastFailureTime > this.CIRCUIT_BREAKER_CONFIG.recoveryTimeout) {
          console.log(`🔄 Circuit breaker ${operationType}: OPEN -> HALF_OPEN (timeout expirado)`);
          circuit.state = 'HALF_OPEN';
          circuit.successCount = 0;
          return true;
        }
        console.log(`❌ Circuit breaker ${operationType}: OPEN - operação bloqueada`);
        return false;
        
      case 'HALF_OPEN':
      case 'CLOSED':
        return true;
        
      default:
        return true;
    }
  }
  
  /**
   * Registrar sucesso no circuit breaker
   */
  private recordCircuitSuccess(operationType: string): void {
    const circuitKey = `circuit_${operationType}`;
    const circuit = this.circuitBreakers.get(circuitKey);
    
    if (!circuit) return;
    
    circuit.successCount++;
    circuit.failureCount = 0;
    
    if (circuit.state === 'HALF_OPEN' && circuit.successCount >= this.CIRCUIT_BREAKER_CONFIG.successThreshold) {
      console.log(`✅ Circuit breaker ${operationType}: HALF_OPEN -> CLOSED (sucessos suficientes)`);
      circuit.state = 'CLOSED';
    }
  }
  
  /**
   * Registrar falha no circuit breaker
   */
  private recordCircuitFailure(operationType: string): void {
    const circuitKey = `circuit_${operationType}`;
    const circuit = this.circuitBreakers.get(circuitKey);
    
    if (!circuit) return;
    
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    circuit.successCount = 0;
    
    if (circuit.failureCount >= this.CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      console.log(`❌ Circuit breaker ${operationType}: ${circuit.state} -> OPEN (muitas falhas)`);
      circuit.state = 'OPEN';
    }
  }

  /**
   * Executar operação com retry inteligente e circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: keyof typeof this.RETRY_CONFIGS,
    operationId?: string
  ): Promise<T> {
    const id = operationId || `${operationType}_${Date.now()}`;
    
    // Verificar circuit breaker antes de tentar
    if (!this.checkCircuitBreaker(operationType)) {
      throw new Error(`CIRCUIT_BREAKER_OPEN: Operação ${operationType} bloqueada por circuit breaker`);
    }
    
    let config = this.RETRY_CONFIGS[operationType];
    const startTime = Date.now();
    let lastError: any;

    console.log(`🔄 Iniciando operação com retry: ${id} (tipo: ${operationType})`);

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        // Sucesso - registrar no circuit breaker
        this.recordCircuitSuccess(operationType);
        
        if (attempt > 1) {
          this.recordSuccess(id, attempt, Date.now() - startTime);
          console.log(`✅ Operação bem-sucedida após ${attempt - 1} retries: ${id}`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || error.toString();
        
        // Verificar se é um erro não-retentável
        if (this.isNonRetryableError(errorMessage)) {
          console.error(`❌ Erro não-retentável para ${id}: ${errorMessage}`);
          this.recordFailure(id, attempt, errorMessage);
          throw error;
        }
        
        // Determinar estratégia de retry baseada no tipo de operação e erro
        let retryType = operationType;
        if (this.isImageProcessingError(error)) {
          retryType = 'image_processing'; // Usar retry específico para processamento de imagem
          config = this.RETRY_CONFIGS[retryType];
          console.log(`🖼️ Erro de processamento de imagem detectado, usando estratégia específica`);
        } else if (this.isMediaUnavailableError(error)) {
          retryType = 'media_unavailable'; // Usar retry específico para mídia indisponível
          config = this.RETRY_CONFIGS[retryType];
          console.log(`🔄 Mídia indisponível detectada, usando estratégia de retry específica`);
        } else if (this.shouldRetryImmediately(errorMessage)) {
          retryType = 'message_critical'; // Usar retry mais agressivo para erros de rede
          config = this.RETRY_CONFIGS[retryType];
        }
        
        // Se é a última tentativa, falhar
        if (attempt > config.maxRetries) {
          console.error(`❌ Operação falhou permanentemente após ${config.maxRetries} retries: ${id}`);
          this.recordFailure(id, attempt, errorMessage);
          this.recordCircuitFailure(operationType); // Registrar falha no circuit breaker
          throw error;
        }
        
        // Calcular delay para próxima tentativa
        const delay = this.calculateDelay(config, attempt, errorMessage);
        
        console.warn(`⚠️ Tentativa ${attempt} falhou para ${id}: ${errorMessage}. Retry em ${delay}ms`);
        
        // Registrar tentativa
        this.recordAttempt(id, attempt, errorMessage, delay);
        
        // Aguardar antes da próxima tentativa
        await this.sleep(delay);
      }
    }

    throw new Error(`Operação falhou após todas as tentativas: ${id}`);
  }

  /**
   * Calcular delay adaptativo baseado no tipo de erro e histórico
   */
  private calculateDelay(config: RetryConfig, attempt: number, errorMessage: string): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Aplicar delay máximo
    delay = Math.min(delay, config.maxDelay);
    
    // Retry imediato para certos tipos de erro na primeira tentativa
    if (attempt === 1 && this.shouldRetryImmediately(errorMessage)) {
      delay = 50; // 50ms para retry imediato
    }
    
    // Aplicar jitter para evitar thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% de jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(delay, 0);
  }

  /**
   * Verificar se deve fazer retry imediato
   */
  private shouldRetryImmediately(errorMessage: string): boolean {
    return this.IMMEDIATE_RETRY_ERRORS.some(error => 
      errorMessage.toLowerCase().includes(error.toLowerCase())
    );
  }

  /**
   * Verificar se é um erro não-retentável
   */
  private isNonRetryableError(errorMessage: string): boolean {
    return this.NON_RETRYABLE_ERRORS.some(error => 
      errorMessage.toLowerCase().includes(error.toLowerCase())
    );
  }

  /**
   * Verificar se é um erro de mídia indisponível
   */
  private isMediaUnavailableError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code || error?.status?.toString() || '';
    
    return this.MEDIA_UNAVAILABLE_ERRORS.some(mediaError => 
      errorMessage.toLowerCase().includes(mediaError.toLowerCase()) || 
      errorCode.includes(mediaError)
    );
  }

  /**
   * Verificar se o erro é relacionado ao processamento de imagem
   */
  private isImageProcessingError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    return this.IMAGE_PROCESSING_ERRORS.some(errorType => 
      errorMessage.toLowerCase().includes(errorType.toLowerCase())
    );
  }

  /**
   * Registrar tentativa de retry
   */
  private recordAttempt(id: string, attempt: number, error: string, delay: number): void {
    if (!this.retryHistory.has(id)) {
      this.retryHistory.set(id, []);
    }
    
    this.retryHistory.get(id)!.push({
      attempt,
      timestamp: Date.now(),
      error,
      delay
    });
    
    this.stats.totalAttempts++;
  }

  /**
   * Registrar sucesso após retries
   */
  private recordSuccess(id: string, totalAttempts: number, totalTime: number): void {
    this.stats.successfulRetries++;
    this.stats.retryTimes.push(totalTime);
    
    // Limpar histórico após sucesso
    this.retryHistory.delete(id);
  }

  /**
   * Registrar falha permanente
   */
  private recordFailure(id: string, totalAttempts: number, finalError: string): void {
    this.stats.failedRetries++;
    
    console.error(`📊 Falha permanente registrada: ${id} após ${totalAttempts} tentativas. Erro final: ${finalError}`);
  }

  /**
   * Implementar fallback para operações críticas
   */
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationType: keyof typeof this.RETRY_CONFIGS,
    operationId?: string
  ): Promise<T> {
    try {
      // Tentar operação primária com retry
      return await this.executeWithRetry(primaryOperation, operationType, operationId);
    } catch (primaryError) {
      console.warn(`⚠️ Operação primária falhou, tentando fallback: ${operationId}`);
      
      try {
        // Tentar fallback com retry reduzido
        const fallbackConfig = { ...this.RETRY_CONFIGS[operationType] };
        fallbackConfig.maxRetries = Math.max(1, Math.floor(fallbackConfig.maxRetries / 2));
        
        return await this.executeWithRetry(fallbackOperation, operationType, `${operationId}_fallback`);
      } catch (fallbackError) {
        console.error(`❌ Tanto operação primária quanto fallback falharam: ${operationId}`);
        throw new Error(`Operação e fallback falharam. Primário: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  }

  /**
   * Obter estatísticas de retry
   */
  getStats(): RetryStats {
    const totalRetries = this.stats.successfulRetries + this.stats.failedRetries;
    const averageRetryTime = this.stats.retryTimes.length > 0 
      ? this.stats.retryTimes.reduce((a, b) => a + b, 0) / this.stats.retryTimes.length 
      : 0;
    const successRate = totalRetries > 0 ? (this.stats.successfulRetries / totalRetries) * 100 : 0;

    return {
      totalAttempts: this.stats.totalAttempts,
      successfulRetries: this.stats.successfulRetries,
      failedRetries: this.stats.failedRetries,
      averageRetryTime: Math.round(averageRetryTime),
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Obter histórico de retries para uma operação
   */
  getRetryHistory(operationId: string): RetryAttempt[] {
    return this.retryHistory.get(operationId) || [];
  }

  /**
   * Limpar histórico antigo
   */
  cleanupHistory(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    const historyEntries = Array.from(this.retryHistory.entries());
    for (const [id, attempts] of historyEntries) {
      const lastAttempt = attempts[attempts.length - 1];
      if (lastAttempt && lastAttempt.timestamp < oneHourAgo) {
        this.retryHistory.delete(id);
      }
    }
  }

  /**
   * Utilitário para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resetar estatísticas
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      retryTimes: []
    };
    this.retryHistory.clear();
    console.log('📊 Estatísticas de retry resetadas');
  }
}

// Singleton instance
export const retryService = RetryService.getInstance();
export default retryService;
export type { RetryStats, RetryAttempt, RetryConfig };
export { RetryService };

// Cleanup automático a cada hora
setInterval(() => {
  retryService.cleanupHistory();
}, 60 * 60 * 1000);