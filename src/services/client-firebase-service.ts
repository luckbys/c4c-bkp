// Serviço cliente para interagir com as APIs do Firebase sem importar diretamente o firebase-service

import type { Ticket, Message } from '@/components/crm/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { firestoreMonitor } from './firestore-monitor';

// Interface para cache local
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ClientFirebaseService {
  private localCache = new Map<string, CacheEntry<any>>();
  private lastFetchTimes = new Map<string, number>();
  private activePolls = new Set<string>();
  private readonly CACHE_TTL = {
    tickets: 60000, // 1 minuto
    messages: 30000, // 30 segundos
    counters: 45000, // 45 segundos
  };
  private readonly MIN_FETCH_INTERVAL = 10000; // 10 segundos mínimo entre fetches

  /**
   * Métodos de cache local
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.localCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getCache<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.localCache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private shouldFetch(key: string): boolean {
    const lastFetch = this.lastFetchTimes.get(key);
    if (!lastFetch) return true;
    
    return Date.now() - lastFetch > this.MIN_FETCH_INTERVAL;
  }

  private markFetched(key: string): void {
    this.lastFetchTimes.set(key, Date.now());
  }

  /**
   * Limpar cache expirado
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.localCache.delete(key);
      }
    }
  }

  async getTickets(instanceName: string, forceRefresh = false): Promise<Ticket[]> {
    try {
      const cacheKey = `tickets:${instanceName}`;
      
      // Verificar cache local primeiro
      if (!forceRefresh) {
        const cachedTickets = this.getCache<Ticket[]>(cacheKey);
        if (cachedTickets) {
          console.log('🚀 Frontend cache HIT para tickets:', instanceName);
          return cachedTickets;
        }
      }
      
      // Verificar se devemos fazer fetch (rate limiting)
      if (!forceRefresh && !this.shouldFetch(cacheKey)) {
        console.log('⏳ Rate limit ativo, usando cache ou retornando vazio');
        return this.getCache<Ticket[]>(cacheKey) || [];
      }
      
      console.log('💾 Frontend cache MISS, buscando do servidor:', instanceName);
      
      const url = forceRefresh 
        ? `/api/tickets?instance=${encodeURIComponent(instanceName)}&refresh=true`
        : `/api/tickets?instance=${encodeURIComponent(instanceName)}`;
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`);
      }
      
      const data = await response.json();
      const tickets = data.tickets || [];
      
      // Armazenar no cache local
      this.setCache(cacheKey, tickets, this.CACHE_TTL.tickets);
      this.markFetched(cacheKey);
      
      // Log de performance
      if (data.meta) {
        console.log('📊 Performance da API:', {
          cached: data.meta.cached,
          responseTime: data.meta.responseTime,
          source: data.meta.source,
          ticketCount: tickets.length
        });
      }
      
      // Limpar cache expirado periodicamente
      if (Math.random() < 0.1) { // 10% de chance
        this.cleanExpiredCache();
      }
      
      return tickets;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      
      // Fallback para cache local em caso de erro
      const cacheKey = `tickets:${instanceName}`;
      const fallbackTickets = this.getCache<Ticket[]>(cacheKey);
      if (fallbackTickets) {
        console.log('🔄 Usando cache local como fallback após erro');
        return fallbackTickets;
      }
      
      throw error;
    }
  }

  async getMessages(instanceName: string, remoteJid: string, limit?: number): Promise<Message[]> {
    try {
      const params = new URLSearchParams({
        instance: instanceName,
        remoteJid
      });
      
      if (limit) {
        params.append('limit', limit.toString());
      }

      const response = await fetch(`/api/messages?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async saveMessage(messageData: {
    instanceName: string;
    remoteJid: string;
    messageText: string;
    quoted?: { id: string; content: string; sender: 'client' | 'agent' };
    attachments?: { url: string; fileName: string; size: number; type: string }[];
  }): Promise<string> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9004';
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messageId;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async sendMediaMessage(
    instanceName: string,
    remoteJid: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    fileName?: string,
    quoted?: { id: string; content: string; sender: 'client' | 'agent' } | null
  ): Promise<void> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9004';
      const response = await fetch(`${baseUrl}/api/send-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName,
          remoteJid,
          mediaUrl,
          mediaType,
          fileName,
          quoted
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send media message: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending media message:', error);
      throw error;
    }
  }

  async updateTicketStatus(instanceName: string, ticketId: string, status: string): Promise<void> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9004';
      const response = await fetch(`${baseUrl}/api/tickets/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instanceName, ticketId, status })
      });

      if (!response.ok) {
        throw new Error(`Failed to update ticket status: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  // Método otimizado para simular subscription usando polling inteligente
  subscribeToTickets(
    instanceName: string,
    onUpdate: (tickets: Ticket[]) => void,
    onError: (error: Error) => void
  ): () => void {
    let isActive = true;
    let pollInterval: NodeJS.Timeout;
    let lastTicketsHash = '';
    let consecutiveErrors = 0;
    let pollIntervalMs = 180000; // Começar com 3 minutos (mais conservador)
    let lastUpdateTime = Date.now();

    const calculateHash = (tickets: Ticket[]): string => {
      return JSON.stringify(tickets.map(t => ({ 
        id: t.id, 
        status: t.status, 
        unreadCount: t.unreadCount, 
        lastMessageTime: t.lastMessageTime,
        messagesLength: t.messages?.length || 0
      })));
    };

    const poll = async () => {
      if (!isActive) return;
      
      try {
        const tickets = await this.getTickets(instanceName);
        const currentHash = calculateHash(tickets);
        const now = Date.now();
        
        // Só chamar onUpdate se os dados mudaram
        if (currentHash !== lastTicketsHash) {
          console.log('📊 Tickets atualizados detectados, notificando UI');
          onUpdate(tickets);
          lastTicketsHash = currentHash;
          lastUpdateTime = now;
          
          // Reduzir intervalo temporariamente se houve mudanças (atividade alta)
          pollIntervalMs = 90000; // 1.5 minutos
        } else {
          // Aumentar intervalo gradualmente se não há mudanças
          const timeSinceLastUpdate = now - lastUpdateTime;
          
          if (timeSinceLastUpdate > 600000) { // 10 minutos sem mudanças
            pollIntervalMs = Math.min(pollIntervalMs + 60000, 600000); // Máximo 10 minutos
          } else {
            pollIntervalMs = Math.min(pollIntervalMs + 30000, 300000); // Máximo 5 minutos
          }
        }
        
        consecutiveErrors = 0;
      } catch (error) {
        consecutiveErrors++;
        console.error(`Erro no polling (tentativa ${consecutiveErrors}):`, error);
        
        // Backoff exponencial em caso de erros
        if (consecutiveErrors < 3) {
          onError(error as Error);
        }
        
        // Aumentar intervalo significativamente em caso de erro
        pollIntervalMs = Math.min(pollIntervalMs * 2, 600000); // Máximo 10 minutos
      }
      
      console.log(`📊 [POLLING] Próximo poll em ${Math.round(pollIntervalMs / 1000)}s`);
      
      // Reagendar próximo poll com intervalo dinâmico
      if (isActive) {
        pollInterval = setTimeout(poll, pollIntervalMs);
      }
    };

    // Poll inicial
    poll();

    // Retorna função de cleanup
    return () => {
      console.log('🔌 [POLLING] Parando polling de tickets');
      isActive = false;
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
    };
  }

  // Método realtime usando Firebase onSnapshot para mensagens
  subscribeToMessages(
    instanceName: string,
    remoteJid: string,
    onUpdate: (messages: Message[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const subscriptionKey = `messages:${instanceName}:${remoteJid}`;
    
    // Evitar múltiplas inscrições para o mesmo chat
    if (this.activePolls.has(subscriptionKey)) {
      console.warn(`⚠️ Subscription já ativa para ${subscriptionKey}`);
      return () => {};
    }
    
    this.activePolls.add(subscriptionKey);
    
    const listenerId = `messages_${instanceName}_${remoteJid}_${Date.now()}`;
    const queryString = `remoteJid=${remoteJid}&instanceName=${instanceName}`;
    
    console.log('🔄 [FIREBASE REALTIME] Iniciando subscription para:', {
      instanceName,
      remoteJid,
      listenerId
    });

    // Registrar listener no monitor
    firestoreMonitor.registerListener(listenerId, 'messages', queryString);

    // Criar query do Firestore
    const messagesQuery = query(
      collection(db, 'messages'),
      where('remoteJid', '==', remoteJid),
      where('instanceName', '==', instanceName)
      // orderBy será adicionado quando o índice estiver disponível
    );

    const startTime = Date.now();
    // Configurar listener onSnapshot
    const unsubscribe = onSnapshot(
      messagesQuery,
      (querySnapshot) => {
        try {
          const responseTime = Date.now() - startTime;
          
          // Registrar read no monitor
          firestoreMonitor.recordRead(listenerId, responseTime);
          
          const messages: Message[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Determinar sender baseado nos dados disponíveis
            let sender: 'client' | 'agent' = 'client';
            if (data.sender) {
              sender = data.sender;
            } else if (data.isFromMe !== undefined) {
              sender = data.isFromMe ? 'agent' : 'client';
            }
            
            const message: Message = {
              id: doc.id,
              messageId: data.messageId || doc.id,
              content: data.content || '',
              sender: sender,
              timestamp: data.timestamp?.toDate?.() || new Date(),
              status: data.status || 'sent',
              type: data.type || 'text',
              isFromMe: data.isFromMe !== undefined ? data.isFromMe : sender === 'agent',
              pushName: data.pushName,
              mediaUrl: data.mediaUrl,
              fileName: data.fileName,
              quotedMessageId: data.quotedMessageId,
              quotedMessageContent: data.quotedMessageContent,
              quotedMessageSender: data.quotedMessageSender
            };
            messages.push(message);
          });
          
          // Ordenar mensagens por timestamp (manual até índice estar disponível)
          messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          console.log('🔄 [FIREBASE REALTIME] Mensagens atualizadas:', {
            instanceName,
            remoteJid,
            count: messages.length,
            source: querySnapshot.metadata.fromCache ? 'cache' : 'server'
          });
          
          onUpdate(messages);
        } catch (error) {
          console.error('❌ [FIREBASE REALTIME] Erro ao processar snapshot:', error);
          
          // Registrar erro no monitor
          firestoreMonitor.recordError(error as Error, listenerId);
          
          onError(error as Error);
        }
      },
      (error) => {
        console.error('❌ [FIREBASE REALTIME] Erro no listener:', error);
        
        // Registrar erro no monitor
        firestoreMonitor.recordError(error, listenerId);
        
        this.activePolls.delete(subscriptionKey);
        onError(error);
      }
    );

    // Retorna função de cleanup que também remove do monitor
    return () => {
      console.log('🔌 [FIREBASE REALTIME] Desconectando subscription:', subscriptionKey);
      firestoreMonitor.unregisterListener(listenerId);
      this.activePolls.delete(subscriptionKey);
      unsubscribe();
    };
  }

  /**
   * Invalidar cache local para uma instância específica
   */
  invalidateCache(instanceName: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.localCache.keys()) {
      if (key.includes(instanceName)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.localCache.delete(key);
      this.lastFetchTimes.delete(key);
    });
    
    console.log(`🧹 Cache local invalidado para instância ${instanceName}: ${keysToDelete.length} entradas removidas`);
  }

  /**
   * Obter estatísticas do cache local
   */
  getCacheStats(): { size: number, entries: string[], hitRate: number } {
    const entries = Array.from(this.localCache.keys());
    return {
      size: this.localCache.size,
      entries,
      hitRate: 0 // Implementar se necessário
    };
  }
}

// Singleton instance
export const clientFirebaseService = new ClientFirebaseService();