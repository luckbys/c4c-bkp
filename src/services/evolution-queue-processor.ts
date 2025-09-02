import rabbitmqService, { MessagePayload } from './rabbitmq-service';
import { evolutionApi } from './evolution-api';
import { firebaseService } from './firebase-service';
import retryManager from './retry-manager';

interface EvolutionMessageData {
  number: string;
  text?: string;
  mediaMessage?: {
    mediatype: 'image' | 'video' | 'audio' | 'document';
    media: string;
    caption?: string;
  };
}

class EvolutionQueueProcessor {
  private isProcessing = false;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private retryDelay = 5000;

  async start(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Processador de fila Evolution já está em execução');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Iniciando processador de fila Evolution API...');

    try {
      // Conectar ao RabbitMQ se necessário
      if (!rabbitmqService.isConnected()) {
        await rabbitmqService.connect();
      }

      // Iniciar consumo de mensagens outbound
      await rabbitmqService.consumeOutboundMessages(this.processOutboundMessage.bind(this));
      
      console.log('✅ Processador de fila Evolution API iniciado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar processador de fila Evolution API:', error);
      this.isProcessing = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isProcessing = false;
    console.log('🛑 Parando processador de fila Evolution API...');
  }

  private async processOutboundMessage(message: MessagePayload): Promise<void> {
    const messageId = message.id;
    console.log(`📤 Processando mensagem outbound: ${messageId}`);

    try {
      // Verificar se a mensagem já foi processada com sucesso
      const existingMessage = await this.checkMessageStatus(messageId);
      if (existingMessage?.status === 'sent') {
        console.log(`✅ Mensagem ${messageId} já foi enviada, ignorando`);
        return;
      }

      // Buscar dados do contato e ticket
      const contact = await this.getContactData(message.contactId);
      if (!contact) {
        throw new Error(`Contato não encontrado: ${message.contactId}`);
      }

      // Preparar dados para Evolution API
      const evolutionData = await this.prepareEvolutionMessage(message, contact);
      
      // Enviar mensagem via Evolution API
      const response = await this.sendToEvolutionAPI(evolutionData);
      
      if (response.success) {
        // Salvar mensagem no Firebase se não existir
        await this.saveMessageToFirebase(message, {
          evolutionMessageId: response.messageId,
          sentAt: new Date().toISOString(),
          response: response.data
        });

        // Remover tentativas de retry
        this.retryAttempts.delete(messageId);
        
        console.log(`✅ Mensagem ${messageId} enviada com sucesso via Evolution API`);
      } else {
        throw new Error(`Falha no envio via Evolution API: ${response.error}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar mensagem ${messageId}:`, error);
      
      // Usar retry manager para gerenciar tentativas
      const currentAttempts = this.retryAttempts.get(messageId) || 0;
      
      if (currentAttempts >= this.maxRetries) {
        console.log(`💀 Mensagem ${messageId} será movida para DLQ após ${currentAttempts + 1} tentativas`);
        
        // Atualizar status para failed
        await this.updateMessageStatus(messageId, 'failed', {
          attempts: currentAttempts + 1,
          finalError: (error as Error).message,
          failedAt: new Date().toISOString()
        });
        
        // Mover para Dead Letter Queue via retry manager
        await retryManager.scheduleRetry(messageId, message, error as Error, currentAttempts + 1);
        
        // Remover das tentativas
        this.retryAttempts.delete(messageId);
      } else {
        console.log(`🔄 Agendando retry para mensagem ${messageId} via Retry Manager`);
        
        // Usar retry manager para agendar próxima tentativa
        await retryManager.scheduleRetry(messageId, message, error as Error, currentAttempts);
        
        // Incrementar tentativas
        this.retryAttempts.set(messageId, currentAttempts + 1);
      }
    }
  }

  private async handleMessageError(message: MessagePayload, error: Error): Promise<void> {
    const messageId = message.id;
    const currentAttempts = this.retryAttempts.get(messageId) || 0;
    
    if (currentAttempts < this.maxRetries) {
      // Incrementar tentativas e reagendar
      this.retryAttempts.set(messageId, currentAttempts + 1);
      
      console.log(`🔄 Reagendando mensagem ${messageId} (tentativa ${currentAttempts + 1}/${this.maxRetries})`);
      
      // Aguardar antes de reenviar para a fila
      setTimeout(async () => {
        try {
          await rabbitmqService.publishOutboundMessage(message);
        } catch (retryError) {
          console.error(`❌ Erro ao reagendar mensagem ${messageId}:`, retryError);
        }
      }, this.retryDelay * (currentAttempts + 1));
      
      // Atualizar status como retry
      await this.updateMessageStatus(messageId, 'retrying', {
        attempts: currentAttempts + 1,
        lastError: error.message,
        nextRetryAt: new Date(Date.now() + this.retryDelay * (currentAttempts + 1)).toISOString()
      });
    } else {
      // Máximo de tentativas atingido, marcar como falha
      console.error(`❌ Máximo de tentativas atingido para mensagem ${messageId}`);
      
      await this.updateMessageStatus(messageId, 'failed', {
        attempts: currentAttempts + 1,
        finalError: error.message,
        failedAt: new Date().toISOString()
      });
      
      // Remover das tentativas
      this.retryAttempts.delete(messageId);
      
      // Notificar sobre a falha (opcional)
      await this.notifyMessageFailure(message, error);
    }
  }

  private async prepareEvolutionMessage(message: MessagePayload, contact: any): Promise<EvolutionMessageData> {
    const evolutionData: EvolutionMessageData = {
      number: contact.phone || contact.number
    };

    switch (message.type) {
      case 'text':
        evolutionData.text = message.content;
        break;
        
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        evolutionData.mediaMessage = {
          mediatype: message.type,
          media: message.content, // URL ou base64
          caption: message.metadata?.caption || ''
        };
        break;
        
      default:
        throw new Error(`Tipo de mensagem não suportado: ${message.type}`);
    }

    return evolutionData;
  }

  private async sendToEvolutionAPI(data: EvolutionMessageData): Promise<{ success: boolean; messageId?: string; data?: any; error?: string }> {
    try {
      let response;
      
      if (data.text) {
        // Enviar mensagem de texto
        response = await evolutionApi.sendMessage(
          'default', // instanceName - você pode ajustar conforme necessário
          data.number,
          data.text
        );
      } else if (data.mediaMessage) {
        // Enviar mensagem de mídia
        response = await evolutionApi.sendMedia(
          'default', // instanceName - você pode ajustar conforme necessário
          {
            number: data.number,
            mediatype: data.mediaMessage.mediatype,
            media: data.mediaMessage.media,
            mimetype: 'application/octet-stream', // você pode ajustar conforme necessário
            fileName: 'media',
            caption: data.mediaMessage.caption
          }
        );
      } else {
        throw new Error('Dados de mensagem inválidos');
      }

      if (response && response.key) {
        return {
          success: true,
          messageId: response.key.id,
          data: response
        };
      } else {
        return {
          success: false,
          error: 'Resposta inválida da Evolution API'
        };
      }
    } catch (error) {
      console.error('❌ Erro na Evolution API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private async getContactData(contactId: string): Promise<any> {
    try {
      // Buscar dados do contato no Firebase
      const contactDoc = await firebaseService.getDocument('contacts', contactId);
      return contactDoc;
    } catch (error) {
      console.error(`❌ Erro ao buscar contato ${contactId}:`, error);
      return null;
    }
  }

  private async checkMessageStatus(messageId: string): Promise<any> {
    try {
      // Verificar status da mensagem no Firebase
      const messageDoc = await firebaseService.getDocument('messages', messageId);
      return messageDoc;
    } catch (error) {
      console.error(`❌ Erro ao verificar status da mensagem ${messageId}:`, error);
      return null;
    }
  }

  private async saveMessageToFirebase(message: MessagePayload, metadata: any = {}): Promise<void> {
    try {
      // Verificar se a mensagem já existe
      const existingMessage = await this.checkMessageStatus(message.id);
      
      if (existingMessage) {
        // Se existe, apenas atualizar o status
        await firebaseService.updateDocument('messages', message.id, {
          status: 'sent',
          updatedAt: new Date().toISOString(),
          ...metadata
        });
        console.log(`📝 Status da mensagem ${message.id} atualizado no Firebase`);
      } else {
         // Se não existe, criar a mensagem completa
         const remoteJid = message.metadata?.remoteJid || '';
         
         await firebaseService.saveMessage({
           remoteJid: remoteJid,
           messageId: message.id,
           content: message.content,
           sender: 'agent',
           status: 'sent',
           type: message.type,
           instanceName: message.metadata?.instanceName || 'default',
           isFromMe: true,
           pushName: 'Agente',
           timestamp: new Date(message.timestamp),
           ...metadata
         });
         console.log(`💾 Mensagem ${message.id} salva no Firebase`);
       }
    } catch (error) {
      console.error(`❌ Erro ao salvar mensagem ${message.id} no Firebase:`, error);
    }
  }

  private async updateMessageStatus(messageId: string, status: string, metadata: any = {}): Promise<void> {
    try {
      await firebaseService.updateDocument('messages', messageId, {
        status,
        updatedAt: new Date().toISOString(),
        ...metadata
      });
    } catch (error) {
      console.error(`❌ Erro ao atualizar status da mensagem ${messageId}:`, error);
    }
  }

  private async notifyMessageFailure(message: MessagePayload, error: Error): Promise<void> {
    try {
      // Criar notificação de falha no sistema
      await firebaseService.addDocument('notifications', {
        type: 'message_failure',
        messageId: message.id,
        ticketId: message.ticketId,
        contactId: message.contactId,
        error: error.message,
        timestamp: new Date().toISOString(),
        severity: 'high'
      });
      
      console.log(`📢 Notificação de falha criada para mensagem ${message.id}`);
    } catch (notificationError) {
      console.error('❌ Erro ao criar notificação de falha:', notificationError);
    }
  }

  async getQueueStats(): Promise<{ outbound: any; dlq: any }> {
    try {
      const outboundStats = await rabbitmqService.getQueueInfo('crm.messages.outbound');
      const dlqStats = await rabbitmqService.getQueueInfo('crm.messages.outbound.dlq');
      
      return {
        outbound: outboundStats,
        dlq: dlqStats
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas da fila:', error);
      return { outbound: null, dlq: null };
    }
  }

  isRunning(): boolean {
    return this.isProcessing;
  }
}

// Singleton instance
const evolutionQueueProcessor = new EvolutionQueueProcessor();

export default evolutionQueueProcessor;