import rabbitmqService, { WebhookPayload } from './rabbitmq-service';
import { firebaseService } from './firebase-service';
// Removido: import { realtimeMessagesService } from './realtime-messages-service';
import retryManager from './retry-manager';

interface ProcessedWebhook {
  id: string;
  event: string;
  instanceId: string;
  processedAt: string;
  data: any;
}

class WebhookQueueProcessor {
  private isProcessing = false;
  private processedWebhooks = new Set<string>();
  private maxProcessedCache = 1000;

  async start(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Processador de webhooks já está em execução');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Iniciando processador de webhooks...');

    try {
      // Conectar ao RabbitMQ se necessário
      if (!rabbitmqService.isConnected()) {
        await rabbitmqService.connect();
      }

      // Iniciar consumo de webhooks
      await rabbitmqService.consumeWebhooks(this.processWebhook.bind(this));
      
      console.log('✅ Processador de webhooks iniciado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar processador de webhooks:', error);
      this.isProcessing = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isProcessing = false;
    console.log('🛑 Parando processador de webhooks...');
  }

  private async processWebhook(webhook: WebhookPayload): Promise<void> {
    const webhookId = this.generateWebhookId(webhook);
    
    // Verificar se já foi processado (deduplicação)
    if (this.processedWebhooks.has(webhookId)) {
      console.log(`⚠️ Webhook ${webhookId} já foi processado, ignorando`);
      return;
    }

    console.log(`🔗 Processando webhook: ${webhook.event} - ${webhookId}`);

    try {
      // Processar baseado no tipo de evento
      await this.handleWebhookEvent(webhook);
      
      // Marcar como processado
      this.addToProcessedCache(webhookId);
      
      // Salvar registro do webhook processado
      await this.saveProcessedWebhook({
        id: webhookId,
        event: webhook.event,
        instanceId: webhook.instanceId,
        processedAt: new Date().toISOString(),
        data: webhook.data
      });
      
      console.log(`✅ Webhook ${webhookId} processado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao processar webhook ${webhookId}:`, error);
      
      // Usar retry manager para webhooks críticos
      if (this.isCriticalWebhook(webhook)) {
        await retryManager.scheduleRetry(webhookId, webhook, error as Error, 0);
      }
      
      // Salvar erro para análise
      await this.saveWebhookError(webhookId, webhook, error as Error);
      
      throw error; // Re-throw para que o RabbitMQ possa lidar com retry/DLQ
    }
  }

  private async handleWebhookEvent(webhook: WebhookPayload): Promise<void> {
    switch (webhook.event) {
      case 'messages.upsert':
        await this.handleMessageReceived(webhook);
        break;
        
      case 'messages.update':
        await this.handleMessageUpdate(webhook);
        break;
        
      case 'messages.delete':
        await this.handleMessageDelete(webhook);
        break;
        
      case 'presence.update':
        await this.handlePresenceUpdate(webhook);
        break;
        
      case 'chats.upsert':
        await this.handleChatUpdate(webhook);
        break;
        
      case 'chats.delete':
        await this.handleChatDelete(webhook);
        break;
        
      case 'contacts.upsert':
        await this.handleContactUpdate(webhook);
        break;
        
      case 'connection.update':
        await this.handleConnectionUpdate(webhook);
        break;
        
      default:
        console.log(`⚠️ Evento de webhook não tratado: ${webhook.event}`);
        await this.handleUnknownEvent(webhook);
    }
  }

  private async handleMessageReceived(webhook: WebhookPayload): Promise<void> {
    const messageData = webhook.data;
    
    if (!messageData || !messageData.key) {
      console.warn('⚠️ Dados de mensagem inválidos no webhook');
      return;
    }

    try {
      // Extrair informações da mensagem
      const messageInfo = {
        id: messageData.key.id,
        remoteJid: messageData.key.remoteJid,
        fromMe: messageData.key.fromMe,
        messageType: messageData.messageType,
        content: this.extractMessageContent(messageData),
        timestamp: messageData.messageTimestamp || Date.now(),
        instanceId: webhook.instanceId
      };

      // Se a mensagem é de entrada (não enviada por nós)
      if (!messageInfo.fromMe) {
        await this.processIncomingMessage(messageInfo);
      } else {
        // Mensagem enviada por nós - atualizar status
        await this.updateOutgoingMessageStatus(messageInfo);
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem recebida:', error);
      throw error;
    }
  }

  private async processIncomingMessage(messageInfo: any): Promise<void> {
    try {
      // Buscar ou criar contato
      const contact = await this.findOrCreateContact(messageInfo.remoteJid);
      
      // Buscar ou criar ticket
      const ticket = await this.findOrCreateTicket(contact.id, messageInfo.instanceId);
      
      // Criar mensagem no sistema
      const message = {
        id: messageInfo.id,
        ticketId: ticket.id,
        contactId: contact.id,
        content: messageInfo.content,
        type: this.mapMessageType(messageInfo.messageType),
        direction: 'inbound' as const,
        status: 'received' as const,
        timestamp: new Date(messageInfo.timestamp).toISOString(),
        metadata: {
          evolutionMessageId: messageInfo.id,
          instanceId: messageInfo.instanceId,
          remoteJid: messageInfo.remoteJid
        }
      };

      // Verificar se a mensagem já foi processada para evitar duplicação
      const existingMessage = await this.findMessageByEvolutionId(messageInfo.id);
      if (existingMessage) {
        console.log(`📝 Mensagem ${messageInfo.id} já existe, ignorando duplicata`);
        return;
      }
      
      // Salvar mensagem no Firebase
      await firebaseService.addDocument('messages', message, message.id);
      
      // Mensagem processada via RabbitMQ (Realtime Database removido)
      console.log('📨 Mensagem processada via RabbitMQ:', message.id);
      
      // Atualizar atividade do ticket
      await this.updateTicketActivity(ticket.id, {
        lastMessageAt: message.timestamp,
        lastMessageContent: message.content.substring(0, 100),
        status: 'open'
      });
      
      console.log(`📥 Mensagem de entrada processada: ${message.id}`);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem de entrada:', error);
      throw error;
    }
  }

  private async updateOutgoingMessageStatus(messageInfo: any): Promise<void> {
    try {
      // Buscar mensagem no sistema pelo ID da Evolution
      const existingMessage = await this.findMessageByEvolutionId(messageInfo.id);
      
      if (existingMessage) {
        // Atualizar status da mensagem
        await firebaseService.updateDocument('messages', existingMessage.id, {
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
          metadata: {
            ...existingMessage.metadata,
            evolutionDeliveryConfirmed: true
          }
        });
        
        console.log(`📤 Status de mensagem de saída atualizado: ${existingMessage.id}`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status de mensagem de saída:', error);
    }
  }

  private async handleMessageUpdate(webhook: WebhookPayload): Promise<void> {
    // Processar atualizações de status de mensagem (lida, entregue, etc.)
    const updateData = webhook.data;
    
    if (updateData && updateData.key) {
      const messageId = updateData.key.id;
      const status = this.mapMessageStatus(updateData.status);
      
      const existingMessage = await this.findMessageByEvolutionId(messageId);
      if (existingMessage) {
        await firebaseService.updateDocument('messages', existingMessage.id, {
          status,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`📝 Status de mensagem atualizado: ${messageId} -> ${status}`);
      }
    }
  }

  private async handlePresenceUpdate(webhook: WebhookPayload): Promise<void> {
    // Processar atualizações de presença (online, digitando, etc.)
    const presenceData = webhook.data;
    
    if (presenceData && presenceData.id) {
      const contact = await this.findContactByRemoteJid(presenceData.id);
      if (contact) {
        await firebaseService.updateDocument('contacts', contact.id, {
          lastSeen: presenceData.lastSeen ? new Date(presenceData.lastSeen * 1000).toISOString() : null,
          isOnline: presenceData.presences?.[presenceData.id]?.lastKnownPresence === 'available',
          updatedAt: new Date().toISOString()
        });
        
        console.log(`👤 Presença atualizada para contato: ${contact.id}`);
      }
    }
  }

  private async handleConnectionUpdate(webhook: WebhookPayload): Promise<void> {
    // Processar atualizações de conexão da instância
    const connectionData = webhook.data;
    
    await firebaseService.addDocument('instance_logs', {
      instanceId: webhook.instanceId,
      event: 'connection_update',
      status: connectionData.state,
      timestamp: new Date().toISOString(),
      data: connectionData
    });
    
    console.log(`🔌 Conexão atualizada para instância: ${webhook.instanceId} -> ${connectionData.state}`);
  }

  private async handleUnknownEvent(webhook: WebhookPayload): Promise<void> {
    // Salvar eventos desconhecidos para análise
    await firebaseService.addDocument('unknown_webhooks', {
      event: webhook.event,
      instanceId: webhook.instanceId,
      data: webhook.data,
      timestamp: new Date().toISOString()
    });
  }

  // Métodos auxiliares
  private generateWebhookId(webhook: WebhookPayload): string {
    const data = JSON.stringify(webhook.data || {});
    const hash = Buffer.from(data).toString('base64').substring(0, 16);
    return `${webhook.event}_${webhook.instanceId}_${webhook.timestamp}_${hash}`;
  }

  private addToProcessedCache(webhookId: string): void {
    this.processedWebhooks.add(webhookId);
    
    // Limitar tamanho do cache
    if (this.processedWebhooks.size > this.maxProcessedCache) {
      const firstItem = this.processedWebhooks.values().next().value;
      this.processedWebhooks.delete(firstItem);
    }
  }

  private extractMessageContent(messageData: any): string {
    if (messageData.message?.conversation) {
      return messageData.message.conversation;
    }
    if (messageData.message?.extendedTextMessage?.text) {
      return messageData.message.extendedTextMessage.text;
    }
    if (messageData.message?.imageMessage?.caption) {
      return messageData.message.imageMessage.caption || '[Imagem]';
    }
    if (messageData.message?.videoMessage?.caption) {
      return messageData.message.videoMessage.caption || '[Vídeo]';
    }
    if (messageData.message?.documentMessage?.title) {
      return messageData.message.documentMessage.title || '[Documento]';
    }
    if (messageData.message?.audioMessage) {
      return '[Áudio]';
    }
    
    return '[Mensagem não suportada]';
  }

  private mapMessageType(evolutionType: string): string {
    const typeMap: Record<string, string> = {
      'conversation': 'text',
      'extendedTextMessage': 'text',
      'imageMessage': 'image',
      'videoMessage': 'video',
      'audioMessage': 'audio',
      'documentMessage': 'document'
    };
    
    return typeMap[evolutionType] || 'text';
  }

  private mapMessageStatus(evolutionStatus: number): string {
    const statusMap: Record<number, string> = {
      0: 'pending',
      1: 'sent',
      2: 'delivered',
      3: 'read'
    };
    
    return statusMap[evolutionStatus] || 'pending';
  }

  private async findOrCreateContact(remoteJid: string): Promise<any> {
    // Implementar lógica para buscar ou criar contato
    // Por enquanto, retorna um contato mock
    return {
      id: `contact_${remoteJid.replace('@s.whatsapp.net', '')}`,
      phone: remoteJid.replace('@s.whatsapp.net', ''),
      name: remoteJid.replace('@s.whatsapp.net', '')
    };
  }

  private async findOrCreateTicket(contactId: string, instanceId: string): Promise<any> {
    // Implementar lógica para buscar ou criar ticket
    // Por enquanto, retorna um ticket mock
    return {
      id: `ticket_${contactId}_${instanceId}`,
      contactId,
      instanceId,
      status: 'open'
    };
  }

  private async findMessageByEvolutionId(evolutionId: string): Promise<any> {
    // Implementar busca de mensagem pelo ID da Evolution
    return null;
  }

  private async findContactByRemoteJid(remoteJid: string): Promise<any> {
    // Implementar busca de contato pelo remoteJid
    return null;
  }

  private async updateTicketActivity(ticketId: string, updates: any): Promise<void> {
    // Funcionalidade removida - era via Realtime Database
    console.log('📊 Atividade do ticket (funcionalidade removida):', ticketId, updates);
  }

  private async saveProcessedWebhook(webhook: ProcessedWebhook): Promise<void> {
    await firebaseService.addDocument('processed_webhooks', webhook, webhook.id);
  }

  private async saveWebhookError(webhookId: string, webhook: WebhookPayload, error: Error): Promise<void> {
    await firebaseService.addDocument('webhook_errors', {
      webhookId,
      event: webhook.event,
      instanceId: webhook.instanceId,
      error: error.message,
      stack: error.stack,
      data: webhook.data,
      timestamp: new Date().toISOString()
    });
  }

  private isCriticalWebhook(webhook: WebhookPayload): boolean {
    const criticalEvents = [
      'messages.upsert',
      'messages.update',
      'connection.update'
    ];
    return criticalEvents.includes(webhook.event);
  }

  isRunning(): boolean {
    return this.isProcessing;
  }
}

// Singleton instance
const webhookQueueProcessor = new WebhookQueueProcessor();

export default webhookQueueProcessor;