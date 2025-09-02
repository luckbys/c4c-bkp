import Redis from 'ioredis';
import { EventEmitter } from 'events';
import type { Message, Ticket, Client } from '../components/crm/types';

interface CacheEntry<T> {
  data: T;
  version: number;
  timestamp: number;
  dependencies: string[];
  accessCount: number;
  lastAccess: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  avgLatency: number;
  memoryUsage: number;
}

interface TTLConfig {
  HOT_DATA: number;    // 5 min - dados acessados frequentemente
  WARM_DATA: number;   // 15 min - dados acessados moderadamente  
  COLD_DATA: number;   // 1 hora - dados acessados raramente
  MESSAGES: number;    // 30 min
  TICKETS: number;     // 10 min
  COUNTERS: number;    // 1 min
  METRICS: number;     // 30 seg
}

class OptimizedCacheService extends EventEmitter {
  private static instance: OptimizedCacheService;
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private accessStats: Map<string, { count: number; lastAccess: number }> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    hitRate: 0,
    avgLatency: 0,
    memoryUsage: 0
  };
  
  private readonly TTL_CONFIG: TTLConfig = {
    HOT_DATA: 300,    // 5 min
    WARM_DATA: 900,   // 15 min
    COLD_DATA: 3600,  // 1 hora
    MESSAGES: 1800,   // 30 min
    TICKETS: 600,     // 10 min
    COUNTERS: 60,     // 1 min
    METRICS: 30       // 30 seg
  };

  private constructor() {
    super();
    this.initializeRedis();
    this.startMetricsCollection();
    this.startMemoryCleanup();
  }

  static getInstance(): OptimizedCacheService {
    if (!OptimizedCacheService.instance) {
      OptimizedCacheService.instance = new OptimizedCacheService();
    }
    return OptimizedCacheService.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      await this.redis.connect();
      console.log('🚀 Optimized Redis Cache connected');
      
      this.redis.on('error', (error) => {
        this.metrics.errors++;
        this.emit('error', error);
      });
      
    } catch (error) {
      console.warn('⚠️ Redis not available, using memory fallback');
      this.redis = null;
    }
  }

  /**
   * Cache inteligente com versionamento e dependências
   */
  async setWithVersion<T>(
    key: string, 
    data: T, 
    dataType: keyof TTLConfig,
    dependencies: string[] = []
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const accessFrequency = this.getAccessFrequency(key);
      const ttl = this.calculateSmartTTL(dataType, accessFrequency);
      
      const entry: CacheEntry<T> = {
        data,
        version: Date.now(),
        timestamp: Date.now(),
        dependencies,
        accessCount: 0,
        lastAccess: Date.now()
      };

      // Invalidar dependências automaticamente
      await this.invalidateDependencies(dependencies);
      
      if (this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(entry));
      } else {
        this.memoryCache.set(key, {
          ...entry,
          timestamp: Date.now() + (ttl * 1000)
        });
      }

      this.updateLatencyMetrics(Date.now() - startTime);
      this.emit('cache:set', { key, dataType, ttl });
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Error setting cache with version:', error);
      return false;
    }
  }

  /**
   * Busca inteligente com fallback hierárquico
   */
  async getWithFallback<T>(key: string): Promise<{
    data: T | null;
    source: 'redis' | 'memory' | 'fallback';
    version?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Tentar Redis primeiro
      if (this.redis) {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const entry: CacheEntry<T> = JSON.parse(redisData);
          this.updateAccessStats(key);
          this.metrics.hits++;
          this.updateLatencyMetrics(Date.now() - startTime);
          
          return {
            data: entry.data,
            source: 'redis',
            version: entry.version
          };
        }
      }

      // Fallback para memória
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.timestamp > Date.now()) {
        this.updateAccessStats(key);
        this.metrics.hits++;
        this.updateLatencyMetrics(Date.now() - startTime);
        
        return {
          data: memoryEntry.data,
          source: 'memory',
          version: memoryEntry.version
        };
      }

      // Tentar reconstruir a partir de dependências
      const fallbackData = await this.tryFallbackReconstruction<T>(key);
      if (fallbackData) {
        return {
          data: fallbackData,
          source: 'fallback'
        };
      }

      this.metrics.misses++;
      this.updateLatencyMetrics(Date.now() - startTime);
      
      return { data: null, source: 'redis' };
      
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Error getting cache with fallback:', error);
      return { data: null, source: 'redis' };
    }
  }

  /**
   * Invalidação inteligente de dependências
   */
  private async invalidateDependencies(dependencies: string[]): Promise<void> {
    if (dependencies.length === 0) return;
    
    try {
      const pipeline = this.redis?.pipeline();
      
      for (const dep of dependencies) {
        if (this.redis && pipeline) {
          pipeline.del(dep);
        }
        this.memoryCache.delete(dep);
      }
      
      if (pipeline) {
        await pipeline.exec();
      }
      
      this.emit('cache:invalidate', { dependencies });
      
    } catch (error) {
      console.error('❌ Error invalidating dependencies:', error);
    }
  }

  /**
   * Cálculo inteligente de TTL baseado em padrões de acesso
   */
  private calculateSmartTTL(dataType: keyof TTLConfig, accessFrequency: number): number {
    const baseTTL = this.TTL_CONFIG[dataType] || 600;
    
    // Ajustar TTL baseado na frequência de acesso
    if (accessFrequency > 10) {
      return Math.min(baseTTL * 0.5, this.TTL_CONFIG.HOT_DATA);
    }
    if (accessFrequency > 5) {
      return baseTTL;
    }
    return Math.max(baseTTL * 2, this.TTL_CONFIG.COLD_DATA);
  }

  /**
   * Obter frequência de acesso para uma chave
   */
  private getAccessFrequency(key: string): number {
    const stats = this.accessStats.get(key);
    if (!stats) return 0;
    
    const timeDiff = Date.now() - stats.lastAccess;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff > 0 ? stats.count / hoursDiff : stats.count;
  }

  /**
   * Atualizar estatísticas de acesso
   */
  private updateAccessStats(key: string): void {
    const current = this.accessStats.get(key) || { count: 0, lastAccess: Date.now() };
    this.accessStats.set(key, {
      count: current.count + 1,
      lastAccess: Date.now()
    });
  }

  /**
   * Tentar reconstrução via fallback
   */
  private async tryFallbackReconstruction<T>(key: string): Promise<T | null> {
    // Implementar lógica específica de reconstrução baseada no tipo de chave
    if (key.includes('tickets:') && key.includes(':list')) {
      return await this.reconstructTicketsList<T>(key);
    }
    
    if (key.includes('messages:')) {
      return await this.reconstructMessages<T>(key);
    }
    
    return null;
  }

  /**
   * Reconstruir lista de tickets a partir de caches individuais
   */
  private async reconstructTicketsList<T>(key: string): Promise<T | null> {
    try {
      const instanceName = key.split(':')[1];
      const pattern = `ticket:${instanceName}:*`;
      
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        const tickets: any[] = [];
        
        for (const ticketKey of keys) {
          const ticketData = await this.redis.get(ticketKey);
          if (ticketData) {
            const entry: CacheEntry<any> = JSON.parse(ticketData);
            tickets.push(entry.data);
          }
        }
        
        if (tickets.length > 0) {
          console.log(`🔄 Reconstructed ${tickets.length} tickets from individual cache`);
          return tickets as T;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error reconstructing tickets list:', error);
      return null;
    }
  }

  /**
   * Reconstruir mensagens (implementação específica)
   */
  private async reconstructMessages<T>(key: string): Promise<T | null> {
    // Implementar lógica específica para reconstrução de mensagens
    return null;
  }

  /**
   * Atualizar métricas de latência
   */
  private updateLatencyMetrics(latency: number): void {
    this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;
  }

  /**
   * Coleta de métricas em tempo real
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateHitRate();
      this.updateMemoryUsage();
      this.emit('metrics:update', this.metrics);
    }, 30000); // A cada 30 segundos
  }

  /**
   * Limpeza automática de memória
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      this.cleanExpiredMemoryCache();
      this.cleanOldAccessStats();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  private cleanExpiredMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired memory cache entries`);
    }
  }

  private cleanOldAccessStats(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    let cleaned = 0;
    
    for (const [key, stats] of this.accessStats.entries()) {
      if (now - stats.lastAccess > maxAge) {
        this.accessStats.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old access stats`);
    }
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  private updateMemoryUsage(): void {
    this.metrics.memoryUsage = this.memoryCache.size;
  }

  /**
   * Obter métricas detalhadas
   */
  getDetailedMetrics(): CacheMetrics & {
    accessStats: Map<string, { count: number; lastAccess: number }>;
    memoryEntries: number;
    redisConnected: boolean;
  } {
    return {
      ...this.metrics,
      accessStats: this.accessStats,
      memoryEntries: this.memoryCache.size,
      redisConnected: this.redis !== null
    };
  }

  /**
   * Reset métricas
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      hitRate: 0,
      avgLatency: 0,
      memoryUsage: 0
    };
  }

  /**
   * Desconectar e limpar recursos
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
    this.memoryCache.clear();
    this.accessStats.clear();
    this.removeAllListeners();
  }
}

export const optimizedCacheService = OptimizedCacheService.getInstance();
export { OptimizedCacheService };
export type { CacheEntry, CacheMetrics, TTLConfig };