import Redis, { Cluster } from 'ioredis';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import { performance } from 'perf_hooks';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface ClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  options: {
    enableReadyCheck: boolean;
    redisOptions: {
      password?: string;
      retryDelayOnFailover: number;
      maxRetriesPerRequest: number;
    };
    scaleReads: 'master' | 'slave' | 'all';
    maxRedirections: number;
  };
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
}

interface MemoryStats {
  usedMemory: number;
  maxMemory: number;
  memoryUsagePercent: number;
  evictedKeys: number;
  hitRate: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  compressions: number;
  decompressions: number;
  totalCompressionSaved: number;
  avgCompressionRatio: number;
}

class RedisClusterService {
  private cluster: Cluster | Redis;
  private l2Cache: Map<string, { data: any; timestamp: number; accessCount: number }> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    compressions: 0,
    decompressions: 0,
    totalCompressionSaved: 0,
    avgCompressionRatio: 0
  };
  private compressionThreshold = 1024; // 1KB
  private l2CacheMaxSize = 1000;
  private l2CacheTTL = 5 * 60 * 1000; // 5 minutos
  private memoryMonitorInterval?: NodeJS.Timeout;
  private warmupPatterns: string[] = [];

  constructor() {
    this.initializeCluster();
    this.startMemoryMonitoring();
    this.startCacheWarming();
  }

  private initializeCluster(): void {
    const config: ClusterConfig = {
      nodes: [
        { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') }
      ],
      options: {
        enableReadyCheck: true,
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        },
        scaleReads: 'all',
        maxRedirections: 16
      }
    };

    try {
      this.cluster = new Redis.Cluster(config.nodes, config.options);
      
      this.cluster.on('connect', () => {
        console.log('🔗 Redis Cluster conectado com sucesso');
      });

      this.cluster.on('error', (error) => {
        console.error('❌ Erro no Redis Cluster:', error);
      });

      this.cluster.on('node error', (error: Error, node: any) => {
        console.error(`❌ Erro no nó ${node.options?.host}:${node.options?.port}:`, error);
      });

    } catch (error) {
      console.error('❌ Falha ao inicializar Redis Cluster:', error);
      // Fallback para instância única
      this.cluster = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });
    }
  }

  // Compressão automática para dados grandes
  private async compressData(data: string): Promise<{ compressed: Buffer; stats: CompressionStats }> {
    const startTime = performance.now();
    const originalSize = Buffer.byteLength(data, 'utf8');
    
    if (originalSize < this.compressionThreshold) {
      return {
        compressed: Buffer.from(data, 'utf8'),
        stats: {
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          compressionTime: 0
        }
      };
    }

    const compressed = await gzipAsync(data);
    const compressionTime = performance.now() - startTime;
    const compressionRatio = originalSize / compressed.length;

    this.metrics.compressions++;
    this.metrics.totalCompressionSaved += (originalSize - compressed.length);
    this.updateCompressionRatio(compressionRatio);

    console.log(`📦 Compressão: ${originalSize}B → ${compressed.length}B (${compressionRatio.toFixed(2)}x)`);

    return {
      compressed,
      stats: {
        originalSize,
        compressedSize: compressed.length,
        compressionRatio,
        compressionTime
      }
    };
  }

  private async decompressData(compressed: Buffer): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Verificar se os dados estão comprimidos (magic number do gzip)
      if (compressed.length >= 2 && compressed[0] === 0x1f && compressed[1] === 0x8b) {
        const decompressed = await gunzipAsync(compressed);
        this.metrics.decompressions++;
        
        const decompressionTime = performance.now() - startTime;
        console.log(`📦 Descompressão: ${compressed.length}B → ${decompressed.length}B (${decompressionTime.toFixed(2)}ms)`);
        
        return decompressed.toString('utf8');
      } else {
        // Dados não comprimidos
        return compressed.toString('utf8');
      }
    } catch (error) {
      console.error('❌ Erro na descompressão:', error);
      return compressed.toString('utf8');
    }
  }

  // Cache distribuído com compressão
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const { compressed } = await this.compressData(serialized);
      
      const pipeline = this.cluster.pipeline();
      pipeline.set(key, compressed);
      
      if (ttl) {
        pipeline.expire(key, Math.floor(ttl / 1000));
      }
      
      await pipeline.exec();
      this.metrics.sets++;
      
      // Adicionar ao L2 cache para acesso rápido
      this.addToL2Cache(key, value);
      
      console.log(`✅ Cache SET distribuído: ${key}`);
    } catch (error) {
      console.error(`❌ Erro ao definir cache distribuído ${key}:`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Verificar L2 cache primeiro
      const l2Result = this.getFromL2Cache<T>(key);
      if (l2Result) {
        this.metrics.hits++;
        console.log(`⚡ L2 Cache HIT: ${key}`);
        return l2Result;
      }

      const compressed = await this.cluster.getBuffer(key);
      
      if (!compressed) {
        this.metrics.misses++;
        console.log(`❌ Cache MISS: ${key}`);
        return null;
      }

      const decompressed = await this.decompressData(compressed);
      const value = JSON.parse(decompressed);
      
      this.metrics.hits++;
      
      // Adicionar ao L2 cache
      this.addToL2Cache(key, value);
      
      console.log(`✅ Cache HIT distribuído: ${key}`);
      return value;
    } catch (error) {
      console.error(`❌ Erro ao obter cache distribuído ${key}:`, error);
      this.metrics.misses++;
      return null;
    }
  }

  // L2 Cache (memória local) para dados frequentemente acessados
  private addToL2Cache(key: string, value: any): void {
    // Implementar LRU se o cache estiver cheio
    if (this.l2Cache.size >= this.l2CacheMaxSize) {
      this.evictLRUFromL2Cache();
    }

    this.l2Cache.set(key, {
      data: value,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  private getFromL2Cache<T>(key: string): T | null {
    const entry = this.l2Cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar TTL
    if (Date.now() - entry.timestamp > this.l2CacheTTL) {
      this.l2Cache.delete(key);
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.timestamp = Date.now();
    
    return entry.data;
  }

  private evictLRUFromL2Cache(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let lowestAccess = Infinity;

    // Encontrar entrada menos recentemente usada com menor contagem de acesso
    for (const [key, entry] of this.l2Cache.entries()) {
      const score = entry.timestamp / entry.accessCount; // Score baseado em tempo e frequência
      
      if (score < oldestTime / lowestAccess) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        lowestAccess = entry.accessCount;
      }
    }

    if (oldestKey) {
      this.l2Cache.delete(oldestKey);
      console.log(`🗑️ L2 Cache LRU eviction: ${oldestKey}`);
    }
  }

  // Cache warming - pré-carregamento inteligente
  private startCacheWarming(): void {
    setInterval(async () => {
      await this.performCacheWarming();
    }, 10 * 60 * 1000); // A cada 10 minutos
  }

  private async performCacheWarming(): Promise<void> {
    console.log('🔥 Iniciando cache warming...');
    
    for (const pattern of this.warmupPatterns) {
      try {
        const keys = await this.cluster.keys(pattern);
        
        // Pré-carregar chaves mais acessadas
        for (const key of keys.slice(0, 50)) { // Limitar a 50 chaves por padrão
          await this.get(key);
        }
      } catch (error) {
        console.error(`❌ Erro no cache warming para padrão ${pattern}:`, error);
      }
    }
    
    console.log('✅ Cache warming concluído');
  }

  addWarmupPattern(pattern: string): void {
    if (!this.warmupPatterns.includes(pattern)) {
      this.warmupPatterns.push(pattern);
      console.log(`🔥 Padrão de warming adicionado: ${pattern}`);
    }
  }

  // Monitoramento de memória
  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(async () => {
      await this.checkMemoryUsage();
    }, 30 * 1000); // A cada 30 segundos
  }

  private async checkMemoryUsage(): Promise<void> {
    try {
      const info = await (this.cluster as any).info('memory');
      const stats = this.parseMemoryInfo(info);
      
      if (stats.memoryUsagePercent > 80) {
        console.warn(`⚠️ Uso de memória alto: ${stats.memoryUsagePercent}%`);
        await this.performEmergencyCleanup();
      }
      
      if (stats.memoryUsagePercent > 90) {
        console.error(`🚨 Uso de memória crítico: ${stats.memoryUsagePercent}%`);
        await this.performAggressiveCleanup();
      }
    } catch (error) {
      console.error('❌ Erro ao monitorar memória:', error);
    }
  }

  private parseMemoryInfo(info: string): MemoryStats {
    const lines = info.split('\r\n');
    const stats: any = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    const usedMemory = parseInt(stats.used_memory || '0');
    const maxMemory = parseInt(stats.maxmemory || '0') || usedMemory * 2;
    
    return {
      usedMemory,
      maxMemory,
      memoryUsagePercent: (usedMemory / maxMemory) * 100,
      evictedKeys: parseInt(stats.evicted_keys || '0'),
      hitRate: this.calculateHitRate()
    };
  }

  private async performEmergencyCleanup(): Promise<void> {
    console.log('🧹 Iniciando limpeza de emergência...');
    
    // Limpar L2 cache
    const l2Size = this.l2Cache.size;
    this.l2Cache.clear();
    
    // Limpar chaves expiradas
    await this.cleanupExpiredKeys();
    
    console.log(`✅ Limpeza de emergência concluída. L2 cache: ${l2Size} → 0`);
  }

  private async performAggressiveCleanup(): Promise<void> {
    console.log('🚨 Iniciando limpeza agressiva...');
    
    // Limpar dados menos acessados
    const patterns = ['temp:*', 'cache:old:*', 'session:expired:*'];
    
    for (const pattern of patterns) {
      try {
        const keys = await this.cluster.keys(pattern);
        if (keys.length > 0) {
          await this.cluster.del(...keys);
          console.log(`🗑️ Removidas ${keys.length} chaves do padrão ${pattern}`);
        }
      } catch (error) {
        console.error(`❌ Erro na limpeza agressiva para ${pattern}:`, error);
      }
    }
  }

  private async cleanupExpiredKeys(): Promise<void> {
    // Redis limpa automaticamente chaves expiradas, mas podemos forçar
    try {
      await this.cluster.eval(`
        local keys = redis.call('keys', '*')
        local expired = 0
        for i=1,#keys do
          local ttl = redis.call('ttl', keys[i])
          if ttl == -1 then
            -- Chave sem TTL, verificar se é antiga
            local lastAccess = redis.call('object', 'idletime', keys[i])
            if lastAccess and lastAccess > 3600 then -- 1 hora
              redis.call('del', keys[i])
              expired = expired + 1
            end
          end
        end
        return expired
      `, 0);
    } catch (error) {
      console.error('❌ Erro na limpeza de chaves expiradas:', error);
    }
  }

  // Invalidação em cascata otimizada
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.cluster.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      // Usar pipeline para melhor performance
      const pipeline = this.cluster.pipeline();
      keys.forEach(key => {
        pipeline.del(key);
        // Remover do L2 cache também
        this.l2Cache.delete(key);
      });
      
      await pipeline.exec();
      this.metrics.deletes += keys.length;
      
      console.log(`🧹 Invalidação em cascata: ${keys.length} chaves removidas para padrão '${pattern}'`);
      return keys.length;
    } catch (error) {
      console.error(`❌ Erro na invalidação do padrão ${pattern}:`, error);
      return 0;
    }
  }

  // Métricas e estatísticas
  private calculateHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  private updateCompressionRatio(ratio: number): void {
    const totalCompressions = this.metrics.compressions;
    this.metrics.avgCompressionRatio = 
      ((this.metrics.avgCompressionRatio * (totalCompressions - 1)) + ratio) / totalCompressions;
  }

  async getAdvancedMetrics(): Promise<{
    cache: CacheMetrics;
    memory: MemoryStats;
    compression: {
      totalSaved: number;
      avgRatio: number;
      totalCompressions: number;
    };
    l2Cache: {
      size: number;
      maxSize: number;
      hitRate: number;
    };
  }> {
    const memoryStats = await this.checkMemoryUsage().then(async () => 
      this.parseMemoryInfo(await (this.cluster as any).info('memory'))
    ).catch(() => ({
      usedMemory: 0,
      maxMemory: 0,
      memoryUsagePercent: 0,
      evictedKeys: 0,
      hitRate: 0
    }));

    return {
      cache: { ...this.metrics },
      memory: memoryStats,
      compression: {
        totalSaved: this.metrics.totalCompressionSaved,
        avgRatio: this.metrics.avgCompressionRatio,
        totalCompressions: this.metrics.compressions
      },
      l2Cache: {
        size: this.l2Cache.size,
        maxSize: this.l2CacheMaxSize,
        hitRate: this.calculateHitRate()
      }
    };
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      cluster: boolean;
      memory: boolean;
      performance: boolean;
    };
  }> {
    try {
      const start = performance.now();
      await this.cluster.ping();
      const responseTime = performance.now() - start;
      
      const memoryInfo = await (this.cluster as any).info('memory');
      const memoryStats = this.parseMemoryInfo(memoryInfo);
      
      const details = {
        cluster: true,
        memory: memoryStats.memoryUsagePercent < 90,
        performance: responseTime < 100 // menos de 100ms
      };
      
      const healthyCount = Object.values(details).filter(Boolean).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyCount === 3) status = 'healthy';
      else if (healthyCount >= 2) status = 'degraded';
      else status = 'unhealthy';
      
      return { status, details };
    } catch (error) {
      console.error('❌ Health check falhou:', error);
      return {
        status: 'unhealthy',
        details: {
          cluster: false,
          memory: false,
          performance: false
        }
      };
    }
  }

  // Cleanup ao destruir
  async destroy(): Promise<void> {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.l2Cache.clear();
    
    if (this.cluster) {
      await this.cluster.quit();
    }
    
    console.log('🛑 Redis Cluster Service destruído');
  }
}

// Singleton instance
let redisClusterService: RedisClusterService;

export function getRedisClusterService(): RedisClusterService {
  if (!redisClusterService) {
    redisClusterService = new RedisClusterService();
  }
  return redisClusterService;
}

export { RedisClusterService };
export type { CompressionStats, MemoryStats, CacheMetrics };