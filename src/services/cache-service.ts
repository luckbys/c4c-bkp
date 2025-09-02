// Sistema de cache otimizado para reduzir consultas ao Firebase
// e melhorar performance da integração WhatsApp

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milliseconds
  accessCount: number;
  lastAccess: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
}

class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheEntry<any>>();
  private stats = { hits: 0, misses: 0 };
  private maxSize = 10000; // Máximo de entradas no cache
  private defaultTTL = 5 * 60 * 1000; // 5 minutos padrão
  private cleanupInterval: NodeJS.Timeout;

  // TTLs específicos por tipo de dados
  private readonly TTL_CONFIG = {
    message: 30 * 60 * 1000,      // 30 minutos - mensagens
    ticket: 15 * 60 * 1000,       // 15 minutos - tickets
    chat: 10 * 60 * 1000,         // 10 minutos - informações de chat
    contact: 60 * 60 * 1000,      // 1 hora - contatos
    instance: 5 * 60 * 1000,      // 5 minutos - status de instâncias
    avatar: 24 * 60 * 60 * 1000,  // 24 horas - avatares
    media: 60 * 60 * 1000,        // 1 hora - URLs de mídia
  };

  private constructor() {
    // Limpeza automática a cada 2 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);

    console.log('🚀 Cache Service inicializado com limpeza automática');
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Armazenar dados no cache com TTL específico
   */
  set<T>(key: string, data: T, type?: keyof typeof this.TTL_CONFIG): void {
    const ttl = type ? this.TTL_CONFIG[type] : this.defaultTTL;
    const now = Date.now();

    // Se o cache está cheio, remover entradas antigas
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccess: now
    });

    console.log(`📦 Cache SET: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Recuperar dados do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    }

    // Verificar se expirou
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ Cache EXPIRED: ${key}`);
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccess = now;
    this.stats.hits++;

    console.log(`✅ Cache HIT: ${key} (acessos: ${entry.accessCount})`);
    return entry.data;
  }

  /**
   * Verificar se uma chave existe no cache e não expirou
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remover entrada específica do cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache DELETE: ${key}`);
    }
    return deleted;
  }

  /**
   * Invalidar cache por padrão (ex: todos os tickets de uma instância)
   */
  invalidatePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);

    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    console.log(`🧹 Cache invalidado por padrão '${pattern}': ${deleted} entradas`);
    return deleted;
  }

  /**
   * Limpeza automática de entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: ${cleaned} entradas expiradas removidas`);
    }
  }

  /**
   * Remover entradas mais antigas quando o cache está cheio
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Cache eviction: ${oldestKey} (LRU)`);
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    // Estimar uso de memória (aproximado)
    const memoryUsage = this.cache.size * 1024; // Estimativa: 1KB por entrada

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalEntries: this.cache.size,
      memoryUsage
    };
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    console.log(`🧹 Cache completamente limpo: ${size} entradas removidas`);
  }

  /**
   * Métodos de conveniência para tipos específicos
   */
  
  // Cache de mensagens
  setMessage(messageId: string, remoteJid: string, data: any): void {
    this.set(`message:${remoteJid}:${messageId}`, data, 'message');
  }

  getMessage(messageId: string, remoteJid: string): any {
    return this.get(`message:${remoteJid}:${messageId}`);
  }

  // Cache de tickets
  setTicket(remoteJid: string, instanceName: string, data: any): void {
    this.set(`ticket:${instanceName}:${remoteJid}`, data, 'ticket');
  }

  getTicket(remoteJid: string, instanceName: string): any {
    return this.get(`ticket:${instanceName}:${remoteJid}`);
  }

  invalidateTickets(instanceName: string): number {
    return this.invalidatePattern(`^ticket:${instanceName}:`);
  }

  // Cache de contatos
  setContact(phone: string, data: any): void {
    this.set(`contact:${phone}`, data, 'contact');
  }

  getContact(phone: string): any {
    return this.get(`contact:${phone}`);
  }

  // Cache de avatares
  setAvatar(phone: string, url: string): void {
    this.set(`avatar:${phone}`, url, 'avatar');
  }

  getAvatar(phone: string): string | null {
    return this.get(`avatar:${phone}`);
  }

  // Cache de URLs de mídia com otimizações
  setMediaUrl(messageId: string, url: string): void {
    // Converter base64 para blob URL se necessário para economizar memória
    const optimizedUrl = this.optimizeMediaUrl(url);
    this.set(`media:${messageId}`, optimizedUrl, 'media');
  }

  getMediaUrl(messageId: string): string | null {
    return this.get(`media:${messageId}`);
  }
  
  // Otimizar URL de mídia (converter base64 para blob se muito grande)
  private optimizeMediaUrl(url: string): string {
    // Se é uma data URL muito grande (>100KB), converter para blob URL
    if (url.startsWith('data:image/') && url.length > 100000) {
      try {
        const blob = this.dataUrlToBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        
        // Agendar limpeza do blob URL após 1 hora
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60 * 60 * 1000);
        
        console.log(`📦 Cache: Convertido data URL grande para blob URL (${url.length} -> blob)`);
        return blobUrl;
      } catch (error) {
        console.error('📦 Cache: Erro ao converter para blob URL:', error);
        return url;
      }
    }
    
    return url;
  }
  
  // Converter data URL para Blob
  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }
  
  // Converter base64 para data URL se necessário
  convertBase64ToDataUrl(base64: string, mimeType: string = 'image/jpeg'): string {
    if (base64.startsWith('data:')) {
      return base64;
    }
    
    // Remover prefixos desnecessários
    const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    return `data:${mimeType};base64,${cleanBase64}`;
  }
  
  // Cache específico para blobs com limpeza automática
  setBlobUrl(key: string, blob: Blob, ttl?: number): string {
    const blobUrl = URL.createObjectURL(blob);
    const customTtl = ttl || 60 * 60 * 1000; // 1 hora padrão
    
    this.set(key, blobUrl, 'media');
    
    // Agendar limpeza do blob URL
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      this.delete(key);
    }, customTtl);
    
    return blobUrl;
  }

  // Cache de status de instâncias
  setInstanceStatus(instanceName: string, status: any): void {
    this.set(`instance:${instanceName}`, status, 'instance');
  }

  getInstanceStatus(instanceName: string): any {
    return this.get(`instance:${instanceName}`);
  }

  /**
   * Destruir o serviço de cache
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    console.log('🛑 Cache Service destruído');
  }
}

// Singleton instance
const cacheService = CacheService.getInstance();

// Named export
export { cacheService, CacheService };

// Default export
export default cacheService;

// Type exports
export type { CacheStats, CacheEntry };

// Cleanup on process exit
process.on('SIGINT', () => {
  cacheService.destroy();
});

process.on('SIGTERM', () => {
  cacheService.destroy();
});