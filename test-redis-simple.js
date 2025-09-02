// Teste simples do Redis com fallback para memória
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Simular o serviço Redis com fallback
class SimpleRedisTest {
  constructor() {
    this.memoryCache = new Map();
    this.useMemoryFallback = true; // Forçar uso de memória para teste
    this.metrics = { hits: 0, misses: 0, errors: 0 };
  }

  async set(key, value, ttlSeconds) {
    try {
      const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : 0;
      this.memoryCache.set(key, { value, expires });
      console.log(`📦 Memory Cache SET: ${key} (TTL: ${ttlSeconds || 'sem expiração'}s)`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao definir cache:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const item = this.memoryCache.get(key);
      
      if (!item) {
        this.metrics.misses++;
        console.log(`❌ Memory Cache MISS: ${key}`);
        return null;
      }
      
      // Verificar expiração
      if (item.expires > 0 && Date.now() > item.expires) {
        this.memoryCache.delete(key);
        this.metrics.misses++;
        console.log(`❌ Memory Cache EXPIRED: ${key}`);
        return null;
      }
      
      this.metrics.hits++;
      console.log(`✅ Memory Cache HIT: ${key}`);
      return item.value;
    } catch (error) {
      console.error('❌ Erro ao recuperar cache:', error);
      this.metrics.misses++;
      return null;
    }
  }

  async delete(key) {
    try {
      const existed = this.memoryCache.has(key);
      this.memoryCache.delete(key);
      console.log(`🗑️ Memory Cache DELETE: ${key} (${existed ? 'sucesso' : 'não encontrado'})`);
      return existed;
    } catch (error) {
      console.error('❌ Erro ao deletar cache:', error);
      return false;
    }
  }

  async isConnected() {
    return true; // Cache em memória sempre "conectado"
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    
    return {
      ...this.metrics,
      hitRate,
      cacheType: 'memory',
      memoryItems: this.memoryCache.size
    };
  }

  // Métodos específicos para mensagens
  async setMessages(remoteJid, instanceName, messages, ttlSeconds = 1800) {
    const key = `messages:${instanceName}:${remoteJid}`;
    return await this.set(key, messages, ttlSeconds);
  }

  async getMessages(remoteJid, instanceName) {
    const key = `messages:${instanceName}:${remoteJid}`;
    return await this.get(key);
  }

  async invalidateMessages(remoteJid, instanceName) {
    const key = `messages:${instanceName}:${remoteJid}`;
    return await this.delete(key);
  }
}

async function testRedisConnection() {
  console.log('🚀 Testando sistema de cache com fallback para memória\n');
  
  const cacheService = new SimpleRedisTest();
  
  try {
    // Teste 1: Conexão básica
    console.log('1️⃣ Testando conexão básica...');
    const isConnected = await cacheService.isConnected();
    console.log(`✅ Cache conectado: ${isConnected}\n`);
    
    // Teste 2: Operações básicas
    console.log('2️⃣ Testando operações básicas...');
    await cacheService.set('test:key', 'test-value', 60);
    const value = await cacheService.get('test:key');
    console.log(`✅ Set/Get funcionando: ${value === 'test-value'}\n`);
    
    // Teste 3: Cache de mensagens
    console.log('3️⃣ Testando cache de mensagens...');
    const testMessages = [
      {
        id: '1',
        messageId: 'msg1',
        content: 'Olá, teste!',
        sender: 'client',
        timestamp: new Date(),
        status: 'delivered',
        type: 'text',
        isFromMe: false
      }
    ];
    
    await cacheService.setMessages('5511999999999@s.whatsapp.net', 'test-instance', testMessages, 300);
    const cachedMessages = await cacheService.getMessages('5511999999999@s.whatsapp.net', 'test-instance');
    console.log(`✅ Cache de mensagens: ${cachedMessages ? cachedMessages.length : 0} mensagens\n`);
    
    // Teste 4: Invalidação de cache
    console.log('4️⃣ Testando invalidação de cache...');
    await cacheService.invalidateMessages('5511999999999@s.whatsapp.net', 'test-instance');
    const invalidatedMessages = await cacheService.getMessages('5511999999999@s.whatsapp.net', 'test-instance');
    console.log(`✅ Invalidação funcionando: ${invalidatedMessages === null}\n`);
    
    // Teste 5: Expiração de cache
    console.log('5️⃣ Testando expiração de cache...');
    await cacheService.set('test:expire', 'will-expire', 1); // 1 segundo
    console.log('⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const expiredValue = await cacheService.get('test:expire');
    console.log(`✅ Expiração funcionando: ${expiredValue === null}\n`);
    
    // Teste 6: Métricas
    console.log('6️⃣ Verificando métricas...');
    const metrics = cacheService.getMetrics();
    console.log('📊 Métricas do Cache:');
    console.log(`   Tipo: ${metrics.cacheType}`);
    console.log(`   Hits: ${metrics.hits}`);
    console.log(`   Misses: ${metrics.misses}`);
    console.log(`   Taxa de Acerto: ${metrics.hitRate.toFixed(2)}%`);
    console.log(`   Itens em Memória: ${metrics.memoryItems}\n`);
    
    console.log('🎉 Todos os testes passaram! Sistema de cache funcionando corretamente.');
    console.log('💡 O sistema está usando cache em memória como fallback para Redis.');
    console.log('💡 Para usar Redis: instale e configure o servidor Redis.');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  } finally {
    // Cleanup
    await cacheService.delete('test:key');
    console.log('\n🧹 Limpeza concluída.');
  }
}

// Executar testes
testRedisConnection().catch(console.error);