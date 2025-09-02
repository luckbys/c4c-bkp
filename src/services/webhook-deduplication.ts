import crypto from 'crypto';

// Interface para cache de deduplicação
interface DeduplicationEntry {
  hash: string;
  timestamp: number;
  count: number;
  lastSeen: number;
}

// Interface para estatísticas
interface DeduplicationStats {
  totalEvents: number;
  duplicatesFiltered: number;
  uniqueEvents: number;
  filterRate: number;
  cacheSize: number;
}

class WebhookDeduplicationService {
  private cache = new Map<string, DeduplicationEntry>();
  private stats = {
    totalEvents: 0,
    duplicatesFiltered: 0,
    uniqueEvents: 0
  };
  
  // Configurações
  private readonly CACHE_TTL = 30000; // 30 segundos
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CONNECTION_UPDATE_TTL = 5000; // 5 segundos para connection.update
  private readonly CLEANUP_INTERVAL = 60000; // 1 minuto
  
  // Eventos que devem ter deduplicação mais agressiva
  private readonly AGGRESSIVE_DEDUP_EVENTS = new Set([
    'connection.update',
    'presence.update'
  ]);
  
  // Eventos que devem ter deduplicação mais rigorosa
  private readonly STRICT_DEDUP_EVENTS = new Set([
    'messages.upsert'
  ]);
  
  // Eventos que nunca devem ser filtrados (removido messages.upsert para permitir deduplicação)
  private readonly NEVER_FILTER_EVENTS = new Set([
    'chats.upsert'
  ]);
  
  constructor() {
    this.startCleanupTimer();
    console.log('🔄 [DEDUP] Serviço de deduplicação de webhooks inicializado');
  }
  
  /**
   * Verifica se um evento deve ser processado ou filtrado
   */
  shouldProcessEvent(event: string, instance: string, data: any): boolean {
    this.stats.totalEvents++;
    
    // Nunca filtrar eventos críticos
    if (this.NEVER_FILTER_EVENTS.has(event)) {
      this.stats.uniqueEvents++;
      return true;
    }
    
    // Gerar hash único para o evento
    const eventHash = this.generateEventHash(event, instance, data);
    const now = Date.now();
    
    // Verificar se já existe no cache
    const existing = this.cache.get(eventHash);
    
    if (existing) {
      // Determinar TTL baseado no tipo de evento
      const ttl = this.getTTLForEvent(event);
      const isExpired = now - existing.timestamp > ttl;
      
      if (!isExpired) {
        // Evento duplicado dentro da janela de tempo
        existing.count++;
        existing.lastSeen = now;
        this.stats.duplicatesFiltered++;
        
        console.log(`🚫 [DEDUP] Evento duplicado filtrado: ${event} (${instance}) - ${existing.count}x em ${ttl}ms`);
        return false;
      } else {
        // Expirou, atualizar entrada
        existing.timestamp = now;
        existing.count = 1;
        existing.lastSeen = now;
      }
    } else {
      // Novo evento, adicionar ao cache
      this.cache.set(eventHash, {
        hash: eventHash,
        timestamp: now,
        count: 1,
        lastSeen: now
      });
      
      // Limitar tamanho do cache
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        this.cleanupOldEntries();
      }
    }
    
    this.stats.uniqueEvents++;
    return true;
  }
  
  /**
   * Gera hash único para um evento
   */
  private generateEventHash(event: string, instance: string, data: any): string {
    // Para connection.update, usar apenas event + instance + state
    if (event === 'connection.update') {
      const key = `${event}:${instance}:${data?.state || 'unknown'}`;
      return crypto.createHash('md5').update(key).digest('hex');
    }
    
    // Para presence.update, usar event + instance + id
    if (event === 'presence.update') {
      const key = `${event}:${instance}:${data?.id || 'unknown'}`;
      return crypto.createHash('md5').update(key).digest('hex');
    }
    
    // Para messages.upsert, usar messageId específico para evitar duplicatas
    if (event === 'messages.upsert') {
      const messageId = data?.key?.id || data?.messageId || 'unknown';
      const key = `${event}:${instance}:${messageId}`;
      return crypto.createHash('md5').update(key).digest('hex');
    }
    
    // Para outros eventos, usar hash completo dos dados
    const key = `${event}:${instance}:${JSON.stringify(data)}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }
  
  /**
   * Determina TTL baseado no tipo de evento
   */
  private getTTLForEvent(event: string): number {
    if (event === 'connection.update') {
      return this.CONNECTION_UPDATE_TTL;
    }
    
    // TTL mais longo para messages.upsert para evitar duplicatas
    if (event === 'messages.upsert') {
      return 60000; // 1 minuto para mensagens
    }
    
    if (this.AGGRESSIVE_DEDUP_EVENTS.has(event)) {
      return this.CACHE_TTL;
    }
    
    return this.CACHE_TTL / 2; // TTL menor para outros eventos
  }
  
  /**
   * Limpa entradas antigas do cache
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    this.cache.forEach((entry, hash) => {
      if (now - entry.lastSeen > this.CACHE_TTL * 2) {
        entriesToDelete.push(hash);
      }
    });
    
    entriesToDelete.forEach(hash => {
      this.cache.delete(hash);
    });
    
    if (entriesToDelete.length > 0) {
      console.log(`🧹 [DEDUP] Limpeza do cache: ${entriesToDelete.length} entradas removidas`);
    }
  }
  
  /**
   * Timer de limpeza automática
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldEntries();
    }, this.CLEANUP_INTERVAL);
  }
  
  /**
   * Obtém estatísticas de deduplicação
   */
  getStats(): DeduplicationStats {
    const filterRate = this.stats.totalEvents > 0 
      ? (this.stats.duplicatesFiltered / this.stats.totalEvents) * 100 
      : 0;
    
    return {
      totalEvents: this.stats.totalEvents,
      duplicatesFiltered: this.stats.duplicatesFiltered,
      uniqueEvents: this.stats.uniqueEvents,
      filterRate: Math.round(filterRate * 100) / 100,
      cacheSize: this.cache.size
    };
  }
  
  /**
   * Reseta estatísticas
   */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      duplicatesFiltered: 0,
      uniqueEvents: 0
    };
    console.log('📊 [DEDUP] Estatísticas resetadas');
  }
  
  /**
   * Limpa todo o cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [DEDUP] Cache limpo completamente');
  }
  
  /**
   * Obtém informações detalhadas do cache
   */
  getCacheInfo(): Array<{hash: string, count: number, age: number, event: string}> {
    const now = Date.now();
    const info: Array<{hash: string, count: number, age: number, event: string}> = [];
    
    this.cache.forEach((entry, hash) => {
      info.push({
        hash: hash.substring(0, 8) + '...',
        count: entry.count,
        age: now - entry.timestamp,
        event: 'unknown' // Não armazenamos o tipo de evento no cache
      });
    });
    
    return info.sort((a, b) => b.count - a.count);
  }
}

// Singleton instance
export const webhookDeduplication = new WebhookDeduplicationService();
export { WebhookDeduplicationService };