import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Subscription {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
  lastHeartbeat: number;
  metadata: {
    instanceName?: string;
    userId?: string;
    userAgent?: string;
  };
}

interface NotificationMessage {
  type: 'update' | 'heartbeat' | 'error' | 'subscription';
  channel?: string;
  data?: any;
  timestamp: number;
  messageId: string;
}

interface ChannelStats {
  subscriberCount: number;
  messagesSent: number;
  lastActivity: number;
}

class PushNotificationService extends EventEmitter {
  private static instance: PushNotificationService;
  private subscriptions = new Map<string, Subscription>();
  private channelStats = new Map<string, ChannelStats>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 segundos
  private readonly CONNECTION_TIMEOUT = 60000; // 1 minuto
  private readonly MAX_CONNECTIONS_PER_INSTANCE = 10;

  private constructor() {
    super();
    this.startHeartbeat();
    this.startCleanup();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Adicionar nova conexão WebSocket
   */
  addSubscription(
    ws: WebSocket, 
    instanceName?: string, 
    userId?: string,
    userAgent?: string
  ): string {
    const subscriptionId = uuidv4();
    
    // Verificar limite de conexões por instância
    if (instanceName) {
      const instanceConnections = Array.from(this.subscriptions.values())
        .filter(sub => sub.metadata.instanceName === instanceName).length;
      
      if (instanceConnections >= this.MAX_CONNECTIONS_PER_INSTANCE) {
        ws.close(1008, 'Too many connections for this instance');
        return '';
      }
    }

    const subscription: Subscription = {
      id: subscriptionId,
      ws,
      channels: new Set(),
      lastHeartbeat: Date.now(),
      metadata: {
        instanceName,
        userId,
        userAgent
      }
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    // Configurar handlers da conexão
    this.setupWebSocketHandlers(subscription);
    
    console.log(`🔗 New WebSocket subscription: ${subscriptionId} (${instanceName || 'unknown'})`);
    this.emit('subscription:added', { subscriptionId, instanceName, userId });
    
    return subscriptionId;
  }

  /**
   * Configurar handlers do WebSocket
   */
  private setupWebSocketHandlers(subscription: Subscription): void {
    const { ws, id } = subscription;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(id, message);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        this.sendError(id, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.removeSubscription(id);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${id}:`, error);
      this.removeSubscription(id);
    });

    // Enviar confirmação de conexão
    this.sendMessage(id, {
      type: 'subscription',
      data: { subscriptionId: id, status: 'connected' },
      timestamp: Date.now(),
      messageId: uuidv4()
    });
  }

  /**
   * Processar mensagens do cliente
   */
  private handleClientMessage(subscriptionId: string, message: any): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    switch (message.type) {
      case 'subscribe':
        this.subscribeToChannel(subscriptionId, message.channel);
        break;
        
      case 'unsubscribe':
        this.unsubscribeFromChannel(subscriptionId, message.channel);
        break;
        
      case 'heartbeat':
        this.updateHeartbeat(subscriptionId);
        break;
        
      default:
        this.sendError(subscriptionId, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Inscrever em canal específico
   */
  subscribeToChannel(subscriptionId: string, channel: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.channels.add(channel);
    
    // Atualizar estatísticas do canal
    const stats = this.channelStats.get(channel) || {
      subscriberCount: 0,
      messagesSent: 0,
      lastActivity: Date.now()
    };
    
    stats.subscriberCount++;
    stats.lastActivity = Date.now();
    this.channelStats.set(channel, stats);
    
    console.log(`📺 Subscription ${subscriptionId} joined channel: ${channel}`);
    this.emit('channel:subscribe', { subscriptionId, channel });
    
    // Confirmar inscrição
    this.sendMessage(subscriptionId, {
      type: 'subscription',
      channel,
      data: { status: 'subscribed' },
      timestamp: Date.now(),
      messageId: uuidv4()
    });
  }

  /**
   * Desinscrever de canal
   */
  unsubscribeFromChannel(subscriptionId: string, channel: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.channels.delete(channel);
    
    // Atualizar estatísticas do canal
    const stats = this.channelStats.get(channel);
    if (stats) {
      stats.subscriberCount = Math.max(0, stats.subscriberCount - 1);
      stats.lastActivity = Date.now();
      
      if (stats.subscriberCount === 0) {
        this.channelStats.delete(channel);
      }
    }
    
    console.log(`📺 Subscription ${subscriptionId} left channel: ${channel}`);
    this.emit('channel:unsubscribe', { subscriptionId, channel });
  }

  /**
   * Notificar atualização em canal específico
   */
  async notifyUpdate(channel: string, data: any, options?: {
    excludeSubscription?: string;
    instanceName?: string;
    priority?: 'high' | 'normal' | 'low';
  }): Promise<number> {
    const message: NotificationMessage = {
      type: 'update',
      channel,
      data,
      timestamp: Date.now(),
      messageId: uuidv4()
    };

    let sentCount = 0;
    const subscribers = this.getChannelSubscribers(channel);
    
    for (const subscription of subscribers) {
      // Pular se for exclusão específica
      if (options?.excludeSubscription === subscription.id) continue;
      
      // Filtrar por instância se especificado
      if (options?.instanceName && 
          subscription.metadata.instanceName !== options.instanceName) continue;
      
      if (this.sendMessage(subscription.id, message)) {
        sentCount++;
      }
    }

    // Atualizar estatísticas do canal
    const stats = this.channelStats.get(channel);
    if (stats) {
      stats.messagesSent += sentCount;
      stats.lastActivity = Date.now();
    }

    console.log(`📢 Notified ${sentCount} subscribers in channel: ${channel}`);
    this.emit('notification:sent', { channel, sentCount, data });
    
    return sentCount;
  }

  /**
   * Notificar múltiplos canais
   */
  async notifyMultipleChannels(
    channels: string[], 
    data: any,
    options?: { instanceName?: string; priority?: 'high' | 'normal' | 'low' }
  ): Promise<{ [channel: string]: number }> {
    const results: { [channel: string]: number } = {};
    
    await Promise.all(
      channels.map(async (channel) => {
        results[channel] = await this.notifyUpdate(channel, data, options);
      })
    );
    
    return results;
  }

  /**
   * Obter assinantes de um canal
   */
  private getChannelSubscribers(channel: string): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.channels.has(channel) && 
                     sub.ws.readyState === WebSocket.OPEN);
  }

  /**
   * Enviar mensagem para assinante específico
   */
  private sendMessage(subscriptionId: string, message: NotificationMessage): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      subscription.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Error sending message to ${subscriptionId}:`, error);
      this.removeSubscription(subscriptionId);
      return false;
    }
  }

  /**
   * Enviar erro para assinante
   */
  private sendError(subscriptionId: string, errorMessage: string): void {
    this.sendMessage(subscriptionId, {
      type: 'error',
      data: { error: errorMessage },
      timestamp: Date.now(),
      messageId: uuidv4()
    });
  }

  /**
   * Atualizar heartbeat
   */
  private updateHeartbeat(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.lastHeartbeat = Date.now();
      
      // Responder ao heartbeat
      this.sendMessage(subscriptionId, {
        type: 'heartbeat',
        data: { status: 'alive' },
        timestamp: Date.now(),
        messageId: uuidv4()
      });
    }
  }

  /**
   * Remover assinatura
   */
  removeSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remover de todos os canais
    for (const channel of subscription.channels) {
      this.unsubscribeFromChannel(subscriptionId, channel);
    }

    this.subscriptions.delete(subscriptionId);
    
    console.log(`🔌 WebSocket subscription removed: ${subscriptionId}`);
    this.emit('subscription:removed', { subscriptionId });
  }

  /**
   * Iniciar heartbeat automático
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [id, subscription] of this.subscriptions.entries()) {
        if (now - subscription.lastHeartbeat > this.CONNECTION_TIMEOUT) {
          console.log(`💔 Heartbeat timeout for subscription: ${id}`);
          this.removeSubscription(id);
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Iniciar limpeza automática
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveChannels();
      this.logStatistics();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  /**
   * Limpar canais inativos
   */
  private cleanupInactiveChannels(): void {
    const now = Date.now();
    const maxInactivity = 30 * 60 * 1000; // 30 minutos
    let cleaned = 0;
    
    for (const [channel, stats] of this.channelStats.entries()) {
      if (now - stats.lastActivity > maxInactivity && stats.subscriberCount === 0) {
        this.channelStats.delete(channel);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} inactive channels`);
    }
  }

  /**
   * Log de estatísticas
   */
  private logStatistics(): void {
    const totalSubscriptions = this.subscriptions.size;
    const totalChannels = this.channelStats.size;
    const totalMessages = Array.from(this.channelStats.values())
      .reduce((sum, stats) => sum + stats.messagesSent, 0);
    
    console.log(`📊 Push Service Stats: ${totalSubscriptions} connections, ${totalChannels} channels, ${totalMessages} messages sent`);
  }

  /**
   * Obter estatísticas detalhadas
   */
  getStatistics(): {
    subscriptions: number;
    channels: number;
    totalMessagesSent: number;
    channelDetails: { [channel: string]: ChannelStats };
    connectionsByInstance: { [instance: string]: number };
  } {
    const channelDetails: { [channel: string]: ChannelStats } = {};
    for (const [channel, stats] of this.channelStats.entries()) {
      channelDetails[channel] = { ...stats };
    }
    
    const connectionsByInstance: { [instance: string]: number } = {};
    for (const subscription of this.subscriptions.values()) {
      const instance = subscription.metadata.instanceName || 'unknown';
      connectionsByInstance[instance] = (connectionsByInstance[instance] || 0) + 1;
    }
    
    return {
      subscriptions: this.subscriptions.size,
      channels: this.channelStats.size,
      totalMessagesSent: Array.from(this.channelStats.values())
        .reduce((sum, stats) => sum + stats.messagesSent, 0),
      channelDetails,
      connectionsByInstance
    };
  }

  /**
   * Desconectar todas as conexões
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Push Notification Service...');
    
    // Parar intervalos
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Fechar todas as conexões
    for (const subscription of this.subscriptions.values()) {
      subscription.ws.close(1001, 'Server shutdown');
    }
    
    this.subscriptions.clear();
    this.channelStats.clear();
    this.removeAllListeners();
    
    console.log('✅ Push Notification Service shutdown complete');
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export { PushNotificationService };
export type { Subscription, NotificationMessage, ChannelStats };