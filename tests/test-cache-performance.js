/**
 * Script de teste para validar a redução nas leituras do Firestore
 * Este script testa a eficácia do sistema de cache Redis implementado
 */

const fetch = require('node-fetch');
const { performance } = require('perf_hooks');

// Configuração do teste
const CONFIG = {
  baseUrl: 'http://localhost:9004',
  instanceName: 'loja',
  testDuration: 60000, // 1 minuto
  requestInterval: 2000, // 2 segundos entre requests
  warmupRequests: 5
};

class CachePerformanceTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      firestoreReads: 0,
      avgResponseTime: 0,
      responseTimes: [],
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  async makeRequest(endpoint, options = {}) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${CONFIG.baseUrl}${endpoint}`, options);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data,
        responseTime,
        cached: data.meta?.cached || false,
        source: data.meta?.source || 'unknown'
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      return {
        success: false,
        error: error.message,
        responseTime,
        cached: false,
        source: 'error'
      };
    }
  }

  async testTicketsEndpoint() {
    console.log('🧪 Testando endpoint /api/tickets...');
    
    const result = await this.makeRequest(`/api/tickets?instance=${CONFIG.instanceName}`);
    
    this.results.totalRequests++;
    this.results.responseTimes.push(result.responseTime);
    
    if (result.success) {
      if (result.cached) {
        this.results.cacheHits++;
        console.log(`✅ Cache HIT - ${result.responseTime.toFixed(2)}ms - Source: ${result.source}`);
      } else {
        this.results.cacheMisses++;
        this.results.firestoreReads++;
        console.log(`💾 Cache MISS - ${result.responseTime.toFixed(2)}ms - Source: ${result.source}`);
      }
      
      const ticketCount = result.data.tickets?.length || 0;
      console.log(`   📊 ${ticketCount} tickets retornados`);
    } else {
      this.results.errors++;
      console.log(`❌ Erro: ${result.error} - ${result.responseTime.toFixed(2)}ms`);
    }
    
    return result;
  }

  async testCacheMetrics() {
    console.log('📈 Testando endpoint /api/cache-metrics...');
    
    const result = await this.makeRequest(`/api/cache-metrics?instance=${CONFIG.instanceName}`);
    
    if (result.success) {
      const metrics = result.data;
      console.log('📊 Métricas de Cache:');
      console.log(`   Hit Rate: ${metrics.performance?.cacheHitRate?.toFixed(1) || 0}%`);
      console.log(`   Leituras Evitadas: ${metrics.performance?.estimatedFirestoreReadsAvoided || 0}`);
      console.log(`   Total Tickets: ${metrics.cache?.tickets?.counters?.total || 0}`);
      console.log(`   Redis Conectado: ${metrics.cache?.redis?.connected ? 'Sim' : 'Não'}`);
    }
    
    return result;
  }

  async warmupCache() {
    console.log('🔥 Aquecendo cache...');
    
    for (let i = 0; i < CONFIG.warmupRequests; i++) {
      await this.testTicketsEndpoint();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('🔥 Cache aquecido!');
  }

  async clearCache() {
    console.log('🧹 Limpando cache...');
    
    const result = await this.makeRequest(
      `/api/cache-metrics?instance=${CONFIG.instanceName}&type=all`,
      { method: 'DELETE' }
    );
    
    if (result.success) {
      console.log(`🧹 Cache limpo: ${result.data.deletedEntries} entradas removidas`);
    } else {
      console.log(`❌ Erro ao limpar cache: ${result.error}`);
    }
    
    return result;
  }

  async runLoadTest() {
    console.log('🚀 Iniciando teste de carga...');
    console.log(`⏱️  Duração: ${CONFIG.testDuration / 1000}s`);
    console.log(`🔄 Intervalo: ${CONFIG.requestInterval}ms`);
    
    this.results.startTime = Date.now();
    const endTime = this.results.startTime + CONFIG.testDuration;
    
    while (Date.now() < endTime) {
      await this.testTicketsEndpoint();
      
      // Aguardar intervalo entre requests
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestInterval));
    }
    
    this.results.endTime = Date.now();
    console.log('🏁 Teste de carga concluído!');
  }

  calculateResults() {
    const totalTime = this.results.endTime - this.results.startTime;
    const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
    const hitRate = (this.results.cacheHits / this.results.totalRequests) * 100;
    const requestsPerSecond = (this.results.totalRequests / totalTime) * 1000;
    
    this.results.avgResponseTime = avgResponseTime;
    
    return {
      ...this.results,
      totalTime,
      hitRate,
      requestsPerSecond,
      estimatedFirestoreReduction: this.results.cacheHits
    };
  }

  printResults() {
    const results = this.calculateResults();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADOS DO TESTE DE PERFORMANCE');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração Total: ${(results.totalTime / 1000).toFixed(1)}s`);
    console.log(`🔄 Total de Requests: ${results.totalRequests}`);
    console.log(`📈 Requests/segundo: ${results.requestsPerSecond.toFixed(2)}`);
    console.log(`⚡ Tempo Médio de Resposta: ${results.avgResponseTime.toFixed(2)}ms`);
    console.log('');
    console.log('🎯 MÉTRICAS DE CACHE:');
    console.log(`✅ Cache Hits: ${results.cacheHits} (${results.hitRate.toFixed(1)}%)`);
    console.log(`💾 Cache Misses: ${results.cacheMisses}`);
    console.log(`🔥 Leituras Firestore: ${results.firestoreReads}`);
    console.log(`💰 Leituras Evitadas: ${results.estimatedFirestoreReduction}`);
    console.log(`❌ Erros: ${results.errors}`);
    console.log('');
    console.log('💡 ECONOMIA ESTIMADA:');
    const reductionPercentage = ((results.estimatedFirestoreReduction / results.totalRequests) * 100);
    console.log(`📉 Redução de Leituras: ${reductionPercentage.toFixed(1)}%`);
    
    if (results.hitRate > 70) {
      console.log('🎉 EXCELENTE! Taxa de cache hit acima de 70%');
    } else if (results.hitRate > 50) {
      console.log('👍 BOM! Taxa de cache hit acima de 50%');
    } else {
      console.log('⚠️  ATENÇÃO! Taxa de cache hit baixa, considere ajustar TTLs');
    }
    
    console.log('='.repeat(60));
  }

  async runFullTest() {
    try {
      console.log('🚀 Iniciando Teste Completo de Performance do Cache');
      console.log('='.repeat(60));
      
      // 1. Limpar cache para começar do zero
      await this.clearCache();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Testar métricas iniciais
      await this.testCacheMetrics();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Aquecer cache
      await this.warmupCache();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 4. Executar teste de carga
      await this.runLoadTest();
      
      // 5. Testar métricas finais
      console.log('\n📈 Métricas finais:');
      await this.testCacheMetrics();
      
      // 6. Exibir resultados
      this.printResults();
      
    } catch (error) {
      console.error('❌ Erro durante o teste:', error);
    }
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  const tester = new CachePerformanceTester();
  tester.runFullTest().then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = CachePerformanceTester;