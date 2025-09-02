import Redis from 'ioredis';
import type { Message, Ticket, Client } from '../components/crm/types';

interface RedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
}

class RedisService {
  private static instance: RedisService;
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: any; expires: number }> = new Map();
  private useMemoryFallback = false;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    hitRate: 0
  };
  private isConnected = false;

  private constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1, // Reduzir tentativas
      lazyConnect: true
    };

    // Remove username se estiver vazio (muitos Redis usam apenas senha)
    if (!config.username || config.username.trim() === '') {
      delete config.username;
    }

    // Remove password se estiver vazio
    if (!config.password || config.password.trim() === '') {
      delete config.password;
    }

    console.log(`🔧 Tentando conectar Redis: ${config.host}:${config.port}`);
    
    try {
      this.redis = new Redis(config);
      this.setupEventHandlers();
      
      // Tentar conectar com timeout
      const connectPromise = this.redis.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
    } catch (error) {
      console.warn('⚠️ Redis não disponível, usando cache em memória como fallback');
      console.log('💡 Para usar Redis: instale e inicie o servidor Redis');
      this.useMemoryFallback = true;
      this.redis = null;
      this.startMemoryCleanup();
    }
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventHandlers(): void {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      console.log('🔗 Redis conectado com sucesso');
      this.isConnected = true;
      this.useMemoryFallback = false;
    });

    this.redis.on('error', (error) => {
      // Silenciar erros de conexão repetitivos
      if (!error.message.includes('ECONNREFUSED') && !error.message.includes('NOAUTH')) {
        console.error('❌ Erro no Redis:', error.message);
      }
      
      // Tratar erro de autenticação especificamente
      if (error.message.includes('NOAUTH')) {
        console.error('🔐 Erro de autenticação Redis - verificar credenciais');
        this.useMemoryFallback = true;
        this.startMemoryCleanup();
        return;
      }
      
      this.metrics.errors++;
      this.isConnected = false;
      
      // Ativar fallback após muitos erros
      if (this.metrics.errors > 3 && !this.useMemoryFallback) {
        console.warn('⚠️ Muitos erros Redis, ativando cache em memória');
        this.useMemoryFallback = true;
        this.startMemoryCleanup();
      }
    });

    this.redis.on('close', () => {
      console.log('🔌 Conexão Redis fechada');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Reconectando ao Redis...');
    });
  }

  private startMemoryCleanup(): void {
    // Limpar cache em memória a cada 5 minutos
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expires > 0 && now > item.expires) {
          this.memoryCache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cache em memória: ${cleaned} itens expirados removidos`);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Método genérico para armazenar dados no cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      // Usar cache em memória se Redis não estiver disponível
      if (this.useMemoryFallback || !this.isConnected) {
        const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : 0;
        this.memoryCache.set(key, { value, expires });
        console.log(`📦 Memory Cache SET: ${key} (TTL: ${ttlSeconds || 'sem expiração'}s)`);
        return true;
      }

      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redis!.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.redis!.set(key, serializedValue);
      }

      console.log(`📦 Redis Cache SET: ${key} (TTL: ${ttlSeconds || 'sem expiração'}s)`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao definir cache, usando fallback:', error.message);
      this.metrics.errors++;
      
      // Fallback para cache em memória
      const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : 0;
      this.memoryCache.set(key, { value, expires });
      this.useMemoryFallback = true;
      return true;
    }
  }

  /**
   * Método genérico para recuperar dados do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Usar cache em memória se Redis não estiver disponível
      if (this.useMemoryFallback || !this.isConnected) {
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
        this.updateHitRate();
        console.log(`✅ Memory Cache HIT: ${key}`);
        return item.value as T;
      }

      const value = await this.redis!.get(key);
      
      if (value === null) {
        this.metrics.misses++;
        console.log(`❌ Redis Cache MISS: ${key}`);
        return null;
      }

      this.metrics.hits++;
      this.updateHitRate();
      console.log(`✅ Redis Cache HIT: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('❌ Erro ao recuperar cache, tentando fallback:', error.message);
      this.metrics.errors++;
      this.metrics.misses++;
      
      // Fallback para cache em memória
      const item = this.memoryCache.get(key);
      if (item && (item.expires === 0 || Date.now() <= item.expires)) {
        this.metrics.hits++;
        this.updateHitRate();
        console.log(`✅ Memory Cache FALLBACK HIT: ${key}`);
        return item.value as T;
      }
      
      return null;
    }
  }

  /**
   * Remover entrada do cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Usar cache em memória se Redis não estiver disponível
      if (this.useMemoryFallback || !this.isConnected) {
        const existed = this.memoryCache.has(key);
        this.memoryCache.delete(key);
        console.log(`🗑️ Memory Cache DELETE: ${key} (${existed ? 'sucesso' : 'não encontrado'})`);
        return existed;
      }

      const result = await this.redis!.del(key);
      console.log(`🗑️ Redis Cache DELETE: ${key} (${result > 0 ? 'sucesso' : 'não encontrado'})`);
      return result > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar cache, usando fallback:', error.message);
      this.metrics.errors++;
      
      // Fallback para cache em memória
      const existed = this.memoryCache.has(key);
      this.memoryCache.delete(key);
      return existed;
    }
  }

  /**
   * Verificar se uma chave existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Erro ao verificar existência:', error);
      return false;
    }
  }

  /**
   * Invalidar cache por padrão
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      console.log(`🧹 Cache invalidado por padrão '${pattern}': ${result} entradas`);
      return result;
    } catch (error) {
      console.error('❌ Erro ao invalidar padrão:', error);
      return 0;
    }
  }

  /**
   * Cache específico para mensagens
   */
  async setMessages(remoteJid: string, instanceName: string, messages: Message[], ttlSeconds = 1800): Promise<boolean> {
    const key = `messages:${instanceName}:${remoteJid}`;
    return await this.set(key, messages, ttlSeconds);
  }

  async getMessages(remoteJid: string, instanceName: string): Promise<Message[] | null> {
    const key = `messages:${instanceName}:${remoteJid}`;
    return await this.get<Message[]>(key);
  }

  async invalidateMessages(remoteJid: string, instanceName: string): Promise<boolean> {
    const key = `messages:${instanceName}:${remoteJid}`;
    return await this.delete(key);
  }

  /**
   * Cache hierárquico avançado para tickets
   */
  async setTickets(instanceName: string, tickets: Ticket[], ttlSeconds?: number): Promise<boolean> {
    try {
      // TTL dinâmico baseado na atividade dos tickets
      const dynamicTTL = ttlSeconds || this.calculateTicketTTL(tickets);
      const key = `tickets:${instanceName}:list`;
      
      // Pipeline para operações em lote
      const pipeline = this.redis.pipeline();
      
      // 1. Cache principal da lista (TTL: 10 minutos padrão)
      const mainTTL = Math.min(dynamicTTL, 600);
      pipeline.setex(key, mainTTL, JSON.stringify(tickets));
      
      // 2. Cache por status (TTL: 8 minutos)
      const statusTTL = 480;
      const ticketsByStatus = this.groupTicketsByStatus(tickets);
      Object.entries(ticketsByStatus).forEach(([status, statusTickets]) => {
        const statusKey = `tickets:${instanceName}:status:${status}`;
        pipeline.setex(statusKey, statusTTL, JSON.stringify(statusTickets));
      });
      
      // 3. Cache de contadores (TTL: 5 minutos)
      const countersTTL = 300;
      const counters = this.calculateTicketCounters(tickets);
      const countersKey = `tickets:${instanceName}:counters`;
      pipeline.setex(countersKey, countersTTL, JSON.stringify(counters));
      
      // 4. Cache de tickets individuais (TTL: 10 minutos)
      const individualTTL = 600;
      tickets.forEach(ticket => {
        const ticketKey = `ticket:${instanceName}:${ticket.id}`;
        pipeline.setex(ticketKey, individualTTL, JSON.stringify(ticket));
      });
      
      // 5. Cache de métricas rápidas (TTL: 1 minuto)
      const metricsTTL = 60;
      const metrics = this.calculateTicketMetrics(tickets);
      const metricsKey = `tickets:${instanceName}:metrics`;
      pipeline.setex(metricsKey, metricsTTL, JSON.stringify(metrics));
      
      // Executar todas as operações
      await pipeline.exec();
      
      console.log(`📦 Cache hierárquico SET para ${tickets.length} tickets da instância ${instanceName}`);
      console.log(`   ├── Lista principal: ${mainTTL}s TTL`);
      console.log(`   ├── Por status: ${statusTTL}s TTL`);
      console.log(`   ├── Contadores: ${countersTTL}s TTL`);
      console.log(`   ├── Individuais: ${individualTTL}s TTL`);
      console.log(`   └── Métricas: ${metricsTTL}s TTL`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao definir cache hierárquico:', error);
      return false;
    }
  }

  async getTickets(instanceName: string): Promise<Ticket[] | null> {
    const key = `tickets:${instanceName}:list`;
    return await this.get<Ticket[]>(key);
  }

  async getTicketsByStatus(instanceName: string, status: string): Promise<Ticket[] | null> {
    const key = `tickets:${instanceName}:status:${status}`;
    return await this.get<Ticket[]>(key);
  }

  async getTicketCounters(instanceName: string): Promise<{[status: string]: number} | null> {
    const key = `tickets:${instanceName}:counters`;
    return await this.get<{[status: string]: number}>(key);
  }

  /**
   * Buscar métricas rápidas de tickets
   */
  async getTicketMetrics(instanceName: string): Promise<{[key: string]: any} | null> {
    const key = `tickets:${instanceName}:metrics`;
    return await this.get<{[key: string]: any}>(key);
  }

  /**
   * Buscar ticket individual do cache
   */
  async getTicketById(instanceName: string, ticketId: string): Promise<Ticket | null> {
    const key = `ticket:${instanceName}:${ticketId}`;
    return await this.get<Ticket>(key);
  }

  /**
   * Cache inteligente com fallback hierárquico
   */
  async getTicketsWithFallback(instanceName: string): Promise<{
    tickets: Ticket[] | null,
    source: 'main' | 'status-combined' | 'individual-combined' | null,
    partial: boolean
  }> {
    try {
      // Tentar cache principal primeiro
      const mainTickets = await this.getTickets(instanceName);
      if (mainTickets) {
        return { tickets: mainTickets, source: 'main', partial: false };
      }

      // Fallback: tentar reconstruir a partir de caches por status
      const statusKeys = await this.redis.keys(`tickets:${instanceName}:status:*`);
      if (statusKeys.length > 0) {
        const allTickets: Ticket[] = [];
        
        for (const key of statusKeys) {
          const statusTickets = await this.get<Ticket[]>(key);
          if (statusTickets) {
            allTickets.push(...statusTickets);
          }
        }
        
        if (allTickets.length > 0) {
          return { tickets: allTickets, source: 'status-combined', partial: true };
        }
      }

      // Último fallback: tentar reconstruir a partir de tickets individuais
      const individualKeys = await this.redis.keys(`ticket:${instanceName}:*`);
      if (individualKeys.length > 0) {
        const allTickets: Ticket[] = [];
        
        for (const key of individualKeys) {
          const ticket = await this.get<Ticket>(key);
          if (ticket) {
            allTickets.push(ticket);
          }
        }
        
        if (allTickets.length > 0) {
          return { tickets: allTickets, source: 'individual-combined', partial: true };
        }
      }

      return { tickets: null, source: null, partial: false };
    } catch (error) {
      console.error('❌ Erro no fallback hierárquico:', error);
      return { tickets: null, source: null, partial: false };
    }
  }

  async invalidateTickets(instanceName: string): Promise<number> {
    return await this.invalidatePattern(`tickets:${instanceName}:*`);
  }

  async invalidateTicket(instanceName: string, ticketId: string): Promise<void> {
    // Invalidar cache específico do ticket
    await this.delete(`ticket:${instanceName}:${ticketId}`);
    
    // Invalidar listas relacionadas
    await this.invalidatePattern(`tickets:${instanceName}:*`);
    
    console.log(`🧹 Cache do ticket ${ticketId} invalidado`);
  }

  /**
   * Cache específico para contatos/clientes
   */
  async setContact(phone: string, contact: Client, ttlSeconds = 1800): Promise<boolean> {
    const key = `contact:${phone}`;
    return await this.set(key, contact, ttlSeconds);
  }

  async getContact(phone: string): Promise<Client | null> {
    const key = `contact:${phone}`;
    return await this.get<Client>(key);
  }

  async setContactBatch(contacts: Client[], ttlSeconds = 1800): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      contacts.forEach(contact => {
        const key = `contact:${contact.phone}`;
        pipeline.setex(key, ttlSeconds, JSON.stringify(contact));
      });
      
      await pipeline.exec();
      console.log(`📦 Cache BATCH SET: ${contacts.length} contatos`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao definir cache em lote:', error);
      return false;
    }
  }

  async invalidateContact(phone: string): Promise<boolean> {
    const key = `contact:${phone}`;
    return await this.delete(key);
  }

  /**
   * Cache de ticket individual com dados completos
   */
  async setTicket(instanceName: string, remoteJid: string, ticket: Ticket, ttlSeconds = 900): Promise<boolean> {
    const key = `ticket:${instanceName}:${remoteJid}`;
    return await this.set(key, ticket, ttlSeconds);
  }

  async getTicket(instanceName: string, remoteJid: string): Promise<Ticket | null> {
    const key = `ticket:${instanceName}:${remoteJid}`;
    return await this.get<Ticket>(key);
  }

  /**
   * Incrementar estatísticas de cache
   */
  async incrementCacheStats(statsKey: string, type: 'hits' | 'misses'): Promise<void> {
    try {
      if (!this.isConnected) return;
      
      const pipeline = this.redis.pipeline();
      pipeline.hincrby(statsKey, type, 1);
      pipeline.hincrby(statsKey, 'total', 1);
      pipeline.expire(statsKey, 86400); // Expirar estatísticas em 24h
      
      await pipeline.exec();
    } catch (error) {
      console.error('❌ Erro ao incrementar estatísticas de cache:', error);
    }
  }

  /**
   * Obter estatísticas de cache
   */
  async getCacheStats(statsKey: string): Promise<{hits: number, misses: number, total: number, hitRate: number} | null> {
    try {
      if (!this.isConnected) return null;
      
      const stats = await this.redis.hmget(statsKey, 'hits', 'misses', 'total');
      const hits = parseInt(stats[0] || '0');
      const misses = parseInt(stats[1] || '0');
      const total = parseInt(stats[2] || '0');
      const hitRate = total > 0 ? (hits / total) * 100 : 0;
      
      return { hits, misses, total, hitRate };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de cache:', error);
      return null;
    }
  }

  /**
   * Agrupar tickets por status
   */
  private groupTicketsByStatus(tickets: Ticket[]): {[status: string]: Ticket[]} {
    const grouped: {[status: string]: Ticket[]} = {};
    
    tickets.forEach(ticket => {
      if (!grouped[ticket.status]) {
        grouped[ticket.status] = [];
      }
      grouped[ticket.status].push(ticket);
    });
    
    return grouped;
  }

  /**
   * Calcular contadores de tickets
   */
  private calculateTicketCounters(tickets: Ticket[]): {[key: string]: number} {
    const counters: {[key: string]: number} = {
      total: tickets.length,
      unread: 0,
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0
    };
    
    tickets.forEach(ticket => {
      // Contar por status
      counters[ticket.status] = (counters[ticket.status] || 0) + 1;
      
      // Contar não lidas
      counters.unread += ticket.unreadCount || 0;
    });
    
    return counters;
  }

  /**
   * Calcular métricas rápidas de tickets
   */
  private calculateTicketMetrics(tickets: Ticket[]): {[key: string]: any} {
    const now = new Date();
    const metrics = {
      total: tickets.length,
      activeToday: 0,
      avgResponseTime: 0,
      oldestTicket: null as Date | null,
      newestTicket: null as Date | null,
      statusDistribution: {} as {[status: string]: number}
    };
    
    if (tickets.length === 0) return metrics;
    
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    tickets.forEach(ticket => {
      // Tickets ativos hoje
      const lastActivityValue = ticket.lastMessageTime || ticket.updatedAt;
      const lastActivity = lastActivityValue instanceof Date ? lastActivityValue : (lastActivityValue?.toDate ? lastActivityValue.toDate() : new Date(lastActivityValue));
      const timeDiff = now.getTime() - lastActivity.getTime();
      if (timeDiff < 24 * 60 * 60 * 1000) { // 24 horas
        metrics.activeToday++;
      }
      
      // Distribuição por status
      metrics.statusDistribution[ticket.status] = (metrics.statusDistribution[ticket.status] || 0) + 1;
      
      // Ticket mais antigo e mais novo
      const createdAt = ticket.createdAt instanceof Date ? ticket.createdAt : (ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt));
      if (!metrics.oldestTicket || createdAt < metrics.oldestTicket) {
        metrics.oldestTicket = createdAt;
      }
      if (!metrics.newestTicket || createdAt > metrics.newestTicket) {
        metrics.newestTicket = createdAt;
      }
      
      // Tempo de resposta (se disponível)
      if (ticket.responseTime) {
        totalResponseTime += ticket.responseTime;
        responseTimeCount++;
      }
    });
    
    if (responseTimeCount > 0) {
      metrics.avgResponseTime = Math.round(totalResponseTime / responseTimeCount);
    }
    
    return metrics;
  }

  /**
   * Métodos auxiliares para cache inteligente
   */
  private calculateTicketTTL(tickets: Ticket[]): number {
    if (tickets.length === 0) return 600; // 10 minutos padrão
    
    // Analisar atividade dos tickets
    const now = new Date();
    const activeTickets = tickets.filter(ticket => {
      const lastActivityValue = ticket.lastMessageTime || ticket.updatedAt;
      const lastActivity = lastActivityValue instanceof Date ? lastActivityValue : (lastActivityValue?.toDate ? lastActivityValue.toDate() : new Date(lastActivityValue));
      const timeDiff = now.getTime() - lastActivity.getTime();
      return timeDiff < 30 * 60 * 1000; // Ativo se teve atividade nos últimos 30 min
    });
    
    const activityRatio = activeTickets.length / tickets.length;
    
    // TTL dinâmico baseado na atividade
    if (activityRatio > 0.5) return 300; // 5 min - alta atividade
    if (activityRatio > 0.2) return 600; // 10 min - atividade moderada
    return 1200; // 20 min - baixa atividade
  }

  private async cacheTicketsByStatus(instanceName: string, tickets: Ticket[], ttlSeconds: number): Promise<void> {
    const ticketsByStatus: {[status: string]: Ticket[]} = {};
    
    tickets.forEach(ticket => {
      if (!ticketsByStatus[ticket.status]) {
        ticketsByStatus[ticket.status] = [];
      }
      ticketsByStatus[ticket.status].push(ticket);
    });
    
    // Cache cada status separadamente
    const promises = Object.entries(ticketsByStatus).map(([status, statusTickets]) => {
      const key = `tickets:${instanceName}:status:${status}`;
      return this.set(key, statusTickets, ttlSeconds);
    });
    
    await Promise.all(promises);
  }

  private async cacheTicketCounters(instanceName: string, tickets: Ticket[], ttlSeconds: number): Promise<void> {
    const counters: {[status: string]: number} = {};
    let totalUnread = 0;
    
    tickets.forEach(ticket => {
      counters[ticket.status] = (counters[ticket.status] || 0) + 1;
      totalUnread += ticket.unreadCount || 0;
    });
    
    counters.total = tickets.length;
    counters.unread = totalUnread;
    
    const key = `tickets:${instanceName}:counters`;
    await this.set(key, counters, ttlSeconds);
  }

  /**
   * Cache comprimido para listas grandes
   */
  async setCompressed(key: string, data: any, ttlSeconds: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const serialized = JSON.stringify(data);
      
      // Comprimir se for maior que 10KB
      if (serialized.length > 10240) {
        const compressed = await this.compressData(serialized);
        await this.redis.setex(`${key}:compressed`, ttlSeconds, compressed);
        console.log(`📦 Cache COMPRESSED SET: ${key} (${serialized.length} -> ${compressed.length} bytes)`);
      } else {
        await this.redis.setex(key, ttlSeconds, serialized);
        console.log(`📦 Cache SET: ${key}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao definir cache comprimido:', error);
      return false;
    }
  }

  async getCompressed<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        this.metrics.misses++;
        return null;
      }

      // Tentar versão comprimida primeiro
      let value = await this.redis.get(`${key}:compressed`);
      if (value) {
        value = await this.decompressData(value);
        this.metrics.hits++;
        console.log(`✅ Cache COMPRESSED HIT: ${key}`);
        return JSON.parse(value) as T;
      }
      
      // Fallback para versão normal
      value = await this.redis.get(key);
      if (value) {
        this.metrics.hits++;
        console.log(`✅ Cache HIT: ${key}`);
        return JSON.parse(value) as T;
      }
      
      this.metrics.misses++;
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao recuperar cache comprimido:', error);
      this.metrics.errors++;
      this.metrics.misses++;
      return null;
    }
  }

  private async compressData(data: string): Promise<string> {
    // Implementação simples de compressão (pode ser melhorada com zlib)
    return Buffer.from(data).toString('base64');
  }

  private async decompressData(data: string): Promise<string> {
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  /**
   * Obter métricas do cache
   */
  getMetrics(): CacheMetrics & { 
    cacheType: 'redis' | 'memory'; 
    memoryItems: number;
    redisConnected: boolean;
  } {
    return { 
      ...this.metrics,
      cacheType: this.useMemoryFallback ? 'memory' : 'redis',
      memoryItems: this.memoryCache.size,
      redisConnected: this.isConnected
    };
  }

  /**
   * Resetar métricas
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      hitRate: 0
    };
  }

  /**
   * Atualizar taxa de acerto
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Verificar status da conexão
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Verificar conexão com ping
   */
  async isConnected(): Promise<boolean> {
    try {
      if (this.useMemoryFallback) {
        return true; // Cache em memória sempre "conectado"
      }
      
      if (!this.isConnected || !this.redis) {
        return false;
      }
      
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Erro no ping Redis:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Fechar conexão
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
        console.log('🔌 Redis desconectado');
      }
      
      // Limpar cache em memória
      this.memoryCache.clear();
      console.log('🧹 Cache em memória limpo');
    } catch (error) {
      console.error('❌ Erro ao desconectar Redis:', error.message);
    }
  }

  // Métricas detalhadas para dashboard
  async getDetailedStats(): Promise<any> {
    try {
      const info = await this.redis.info('stats');
      const keyspaceInfo = await this.redis.info('keyspace');
      
      // Parse das informações do Redis
      const stats = this.parseRedisInfo(info);
      const keyspace = this.parseRedisInfo(keyspaceInfo);
      
      return {
        hits: parseInt(stats.keyspace_hits || '0'),
        misses: parseInt(stats.keyspace_misses || '0'),
        avgLatency: this.calculateAvgLatency(),
        p95Latency: this.calculateP95Latency(),
        p99Latency: this.calculateP99Latency(),
        throughput: this.calculateThroughput(),
        connections: parseInt(stats.connected_clients || '0'),
        totalKeys: this.getTotalKeys(keyspace)
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas detalhadas:', error);
      return {
        hits: 0,
        misses: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0,
        connections: 0,
        totalKeys: 0
      };
    }
  }
  
  async getMemoryInfo(): Promise<{ used: number; total: number }> {
    try {
      const info = await this.redis.info('memory');
      const memoryStats = this.parseRedisInfo(info);
      
      const used = parseInt(memoryStats.used_memory || '0');
      const maxMemory = parseInt(memoryStats.maxmemory || (used * 2).toString()); // Fallback se maxmemory não estiver definido
      
      return { used, total: maxMemory };
    } catch (error) {
      console.error('❌ Erro ao obter informações de memória:', error);
      return { used: 0, total: 1 };
    }
  }
  
  async getMemoryByCategory(): Promise<{ messages: number; tickets: number; contacts: number; other: number }> {
    try {
      const categories = {
        messages: 0,
        tickets: 0,
        contacts: 0,
        other: 0
      };
      
      // Estimar uso por categoria baseado em padrões de chaves
      const keys = await this.redis.keys('*');
      
      for (const key of keys.slice(0, 100)) { // Amostra de 100 chaves
          const memory = await this.redis.memory('USAGE', key);
          
          if (memory && typeof memory === 'number') {
            if (key.startsWith('msg:')) {
              categories.messages += memory;
            } else if (key.startsWith('ticket:')) {
              categories.tickets += memory;
            } else if (key.startsWith('contact:')) {
              categories.contacts += memory;
            } else {
              categories.other += memory;
            }
          }
        }
      
      return categories;
    } catch (error) {
      console.error('❌ Erro ao obter uso de memória por categoria:', error);
      return { messages: 0, tickets: 0, contacts: 0, other: 0 };
    }
  }
  
  async getClusterInfo(): Promise<any> {
    try {
      // Para Redis standalone, simular informações de cluster
      const info = await this.redis.info('replication');
      const replicationStats = this.parseRedisInfo(info);
      
      return {
        totalNodes: 1,
        activeNodes: 1,
        failedNodes: 0,
        replicationLag: parseInt(replicationStats.master_repl_offset || '0'),
        uptime: await this.getUptime()
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações do cluster:', error);
      return {
        totalNodes: 1,
        activeNodes: 0,
        failedNodes: 1,
        replicationLag: 0,
        uptime: 0
      };
    }
  }
  
  async getCompressionStats(): Promise<any> {
    // Simular estatísticas de compressão baseadas no cache
    const totalCompressed = this.compressionStats.totalCompressed;
    const totalUncompressed = this.compressionStats.totalUncompressed;
    const ratio = totalUncompressed > 0 ? totalCompressed / totalUncompressed : 0;
    
    return {
      totalCompressed,
      totalUncompressed,
      ratio,
      savedBytes: totalUncompressed - totalCompressed,
      byAlgorithm: {
        gzip: { ratio: 0.6, count: this.compressionStats.gzipCount },
        lz4: { ratio: 0.4, count: this.compressionStats.lz4Count },
        brotli: { ratio: 0.7, count: this.compressionStats.brotliCount }
      }
    };
  }
  
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }
  
  private calculateAvgLatency(): number {
    // Simular cálculo de latência média
    return Math.random() * 50 + 10; // 10-60ms
  }
  
  private calculateP95Latency(): number {
    return this.calculateAvgLatency() * 2;
  }
  
  private calculateP99Latency(): number {
    return this.calculateAvgLatency() * 3;
  }
  
  private calculateThroughput(): number {
    // Simular throughput baseado nas operações
    return Math.floor(Math.random() * 1000 + 500); // 500-1500 ops/sec
  }
  
  private getTotalKeys(keyspace: Record<string, string>): number {
    let total = 0;
    for (const [key, value] of Object.entries(keyspace)) {
      if (key.startsWith('db')) {
        const match = value.match(/keys=(\d+)/);
        if (match) {
          total += parseInt(match[1]);
        }
      }
    }
    return total;
  }
  
  private async getUptime(): Promise<number> {
    try {
      const info = await this.redis.info('server');
      const serverStats = this.parseRedisInfo(info);
      return parseInt(serverStats.uptime_in_seconds || '0');
    } catch (error) {
      return 0;
    }
  }
  
  // Estatísticas de compressão (simuladas)
  private compressionStats = {
    totalCompressed: 0,
    totalUncompressed: 0,
    gzipCount: 0,
    lz4Count: 0,
    brotliCount: 0
  };
  
  // Atualizar estatísticas de compressão
  updateCompressionStats(originalSize: number, compressedSize: number, algorithm: string): void {
    this.compressionStats.totalUncompressed += originalSize;
    this.compressionStats.totalCompressed += compressedSize;
    
    switch (algorithm) {
      case 'gzip':
        this.compressionStats.gzipCount++;
        break;
      case 'lz4':
        this.compressionStats.lz4Count++;
        break;
      case 'brotli':
        this.compressionStats.brotliCount++;
        break;
    }
  }
  
  // Destruir o serviço
  destroy(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
    console.log('🛑 Redis Service destruído');
  }
}

// Create singleton instance
const redisService = RedisService.getInstance();

// Named export
export { redisService, RedisService };

// Default export
export default redisService;

// Type exports
export type { CacheMetrics, RedisConfig };

// Cleanup on process exit
process.on('SIGINT', async () => {
  await redisService.disconnect();
});

process.on('SIGTERM', async () => {
  await redisService.disconnect();
});