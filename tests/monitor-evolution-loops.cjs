const fs = require('fs');
const path = require('path');

/**
 * Monitor para detectar loops infinitos na Evolution API
 * Analisa logs em tempo real e identifica padrões problemáticos
 */

class EvolutionLoopMonitor {
  constructor() {
    this.requestCounts = new Map();
    this.timeWindows = new Map();
    this.circuitBreakerStates = new Map();
    this.alertThresholds = {
      requestsPerMinute: 30, // Máximo 30 requests por minuto por endpoint
      consecutiveFailures: 5, // Máximo 5 falhas consecutivas
      timeoutThreshold: 30000, // 30 segundos
      retryThreshold: 3 // Máximo 3 retries por operação
    };
    
    this.patterns = {
      evolutionRequest: /🔄 \[EVOLUTION\] Making request to: (.+)/,
      evolutionError: /❌ \[EVOLUTION\] (.+)/,
      retryAttempt: /⚠️ Tentativa (\d+) falhou para (.+)/,
      circuitBreaker: /Circuit breaker (.+): (.+)/,
      timeout: /timeout|TIMEOUT/i,
      mediaFetch: /fetchMediaUrl|downloadMedia|getBase64FromMediaMessage/
    };
  }

  /**
   * Analisar linha de log
   */
  analyzeLine(line, timestamp = Date.now()) {
    const alerts = [];
    
    // Detectar requests da Evolution API
    const requestMatch = line.match(this.patterns.evolutionRequest);
    if (requestMatch) {
      const endpoint = this.extractEndpoint(requestMatch[1]);
      alerts.push(...this.trackRequest(endpoint, timestamp));
    }
    
    // Detectar erros
    const errorMatch = line.match(this.patterns.evolutionError);
    if (errorMatch) {
      alerts.push(...this.trackError(line, timestamp));
    }
    
    // Detectar tentativas de retry
    const retryMatch = line.match(this.patterns.retryAttempt);
    if (retryMatch) {
      const attempt = parseInt(retryMatch[1]);
      const operation = retryMatch[2];
      alerts.push(...this.trackRetry(operation, attempt, timestamp));
    }
    
    // Detectar timeouts
    if (this.patterns.timeout.test(line)) {
      alerts.push({
        type: 'TIMEOUT_DETECTED',
        severity: 'HIGH',
        message: 'Timeout detectado',
        line: line.substring(0, 200),
        timestamp
      });
    }
    
    // Detectar operações de mídia problemáticas
    if (this.patterns.mediaFetch.test(line)) {
      alerts.push(...this.trackMediaOperation(line, timestamp));
    }
    
    return alerts;
  }
  
  /**
   * Extrair endpoint da URL
   */
  extractEndpoint(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }
  
  /**
   * Rastrear requests por endpoint
   */
  trackRequest(endpoint, timestamp) {
    const alerts = [];
    const minute = Math.floor(timestamp / 60000);
    const key = `${endpoint}_${minute}`;
    
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, 0);
    }
    
    this.requestCounts.set(key, this.requestCounts.get(key) + 1);
    
    // Verificar se excedeu o limite
    if (this.requestCounts.get(key) > this.alertThresholds.requestsPerMinute) {
      alerts.push({
        type: 'HIGH_REQUEST_RATE',
        severity: 'CRITICAL',
        message: `Muitos requests para ${endpoint}: ${this.requestCounts.get(key)}/min`,
        endpoint,
        count: this.requestCounts.get(key),
        timestamp
      });
    }
    
    // Limpar dados antigos
    this.cleanOldData(timestamp);
    
    return alerts;
  }
  
  /**
   * Rastrear erros
   */
  trackError(line, timestamp) {
    const alerts = [];
    
    // Detectar padrões de erro que indicam loops
    if (line.includes('Request failed') || line.includes('Network error')) {
      alerts.push({
        type: 'NETWORK_ERROR',
        severity: 'MEDIUM',
        message: 'Erro de rede detectado',
        line: line.substring(0, 200),
        timestamp
      });
    }
    
    if (line.includes('EVOLUTION_TIMEOUT') || line.includes('Request timeout')) {
      alerts.push({
        type: 'EVOLUTION_TIMEOUT',
        severity: 'HIGH',
        message: 'Timeout da Evolution API',
        line: line.substring(0, 200),
        timestamp
      });
    }
    
    return alerts;
  }
  
  /**
   * Rastrear tentativas de retry
   */
  trackRetry(operation, attempt, timestamp) {
    const alerts = [];
    
    if (attempt > this.alertThresholds.retryThreshold) {
      alerts.push({
        type: 'EXCESSIVE_RETRIES',
        severity: 'HIGH',
        message: `Muitas tentativas de retry para ${operation}: ${attempt}`,
        operation,
        attempt,
        timestamp
      });
    }
    
    return alerts;
  }
  
  /**
   * Rastrear operações de mídia
   */
  trackMediaOperation(line, timestamp) {
    const alerts = [];
    
    // Detectar operações de mídia que podem estar em loop
    if (line.includes('Método 1') || line.includes('Método 2') || line.includes('Método 3')) {
      const operationId = this.extractOperationId(line);
      if (operationId) {
        const key = `media_${operationId}`;
        if (!this.timeWindows.has(key)) {
          this.timeWindows.set(key, []);
        }
        
        this.timeWindows.get(key).push(timestamp);
        
        // Verificar se há muitas operações em pouco tempo
        const recentOps = this.timeWindows.get(key).filter(t => timestamp - t < 60000);
        if (recentOps.length > 5) {
          alerts.push({
            type: 'MEDIA_OPERATION_LOOP',
            severity: 'CRITICAL',
            message: `Possível loop em operação de mídia: ${operationId}`,
            operationId,
            count: recentOps.length,
            timestamp
          });
        }
      }
    }
    
    return alerts;
  }
  
  /**
   * Extrair ID da operação
   */
  extractOperationId(line) {
    const matches = line.match(/messageId[:\s]+([A-F0-9]{20,})/i);
    return matches ? matches[1].substring(0, 20) : null;
  }
  
  /**
   * Limpar dados antigos
   */
  cleanOldData(currentTimestamp) {
    const cutoff = currentTimestamp - 300000; // 5 minutos
    
    // Limpar contadores de request antigos
    for (const [key, _] of this.requestCounts) {
      const minute = parseInt(key.split('_').pop());
      if (minute * 60000 < cutoff) {
        this.requestCounts.delete(key);
      }
    }
    
    // Limpar janelas de tempo antigas
    for (const [key, timestamps] of this.timeWindows) {
      const filtered = timestamps.filter(t => t > cutoff);
      if (filtered.length === 0) {
        this.timeWindows.delete(key);
      } else {
        this.timeWindows.set(key, filtered);
      }
    }
  }
  
  /**
   * Obter estatísticas
   */
  getStats() {
    const now = Date.now();
    const stats = {
      activeEndpoints: this.requestCounts.size,
      activeMediaOperations: this.timeWindows.size,
      totalRequests: Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0),
      timestamp: now
    };
    
    return stats;
  }
  
  /**
   * Gerar relatório
   */
  generateReport() {
    const stats = this.getStats();
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      topEndpoints: this.getTopEndpoints(),
      recentAlerts: this.getRecentAlerts(),
      recommendations: this.getRecommendations()
    };
    
    return report;
  }
  
  /**
   * Obter endpoints mais utilizados
   */
  getTopEndpoints() {
    const endpointCounts = new Map();
    
    for (const [key, count] of this.requestCounts) {
      const endpoint = key.substring(0, key.lastIndexOf('_'));
      endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + count);
    }
    
    return Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }
  
  /**
   * Obter alertas recentes
   */
  getRecentAlerts() {
    // Esta seria implementada com um buffer de alertas
    return [];
  }
  
  /**
   * Obter recomendações
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.requestCounts.size > 50) {
      recommendations.push('Considere implementar rate limiting mais agressivo');
    }
    
    if (this.timeWindows.size > 20) {
      recommendations.push('Muitas operações de mídia ativas - verifique possíveis loops');
    }
    
    return recommendations;
  }
}

/**
 * Função principal para monitorar logs
 */
async function monitorLogs() {
  const monitor = new EvolutionLoopMonitor();
  
  console.log('🔍 Iniciando monitor de loops da Evolution API...');
  console.log('📊 Configurações:');
  console.log(`   - Máximo ${monitor.alertThresholds.requestsPerMinute} requests/min por endpoint`);
  console.log(`   - Máximo ${monitor.alertThresholds.consecutiveFailures} falhas consecutivas`);
  console.log(`   - Timeout threshold: ${monitor.alertThresholds.timeoutThreshold}ms`);
  console.log('');
  
  // Simular análise de logs (em produção, isso leria logs reais)
  const sampleLogs = [
    '🔄 [EVOLUTION] Making request to: http://localhost:8080/message/downloadMedia/loja',
    '❌ [EVOLUTION] Request failed: 500 Internal Server Error',
    '⚠️ Tentativa 1 falhou para evolution_media_123: EVOLUTION_TIMEOUT',
    '⚠️ Tentativa 2 falhou para evolution_media_123: EVOLUTION_TIMEOUT',
    '⚠️ Tentativa 3 falhou para evolution_media_123: EVOLUTION_TIMEOUT',
    '🔄 [EVOLUTION] Método 1: Download direto messageId: ABC123DEF456',
    '🔄 [EVOLUTION] Método 2: Endpoint base64 alternativo messageId: ABC123DEF456',
    '❌ Circuit breaker evolution_media: CLOSED -> OPEN (muitas falhas)'
  ];
  
  console.log('📝 Analisando logs de exemplo...');
  
  for (let i = 0; i < sampleLogs.length; i++) {
    const line = sampleLogs[i];
    const alerts = monitor.analyzeLine(line, Date.now() + i * 1000);
    
    console.log(`\n[${i + 1}] ${line}`);
    
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        const icon = alert.severity === 'CRITICAL' ? '🚨' : alert.severity === 'HIGH' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${alert.type}: ${alert.message}`);
      });
    }
  }
  
  // Gerar relatório final
  console.log('\n📊 RELATÓRIO FINAL:');
  const report = monitor.generateReport();
  console.log(JSON.stringify(report, null, 2));
  
  console.log('\n✅ Monitor concluído!');
}

// Executar monitor
if (require.main === module) {
  monitorLogs().catch(console.error);
}

module.exports = { EvolutionLoopMonitor };