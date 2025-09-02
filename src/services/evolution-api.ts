import { Message, Ticket, Client } from '../components/crm/types';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

interface EvolutionMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      caption?: string;
      url?: string;
    };
    audioMessage?: {
      url?: string;
    };
    documentMessage?: {
      fileName?: string;
      url?: string;
    };
  };
  messageTimestamp: number;
  status?: 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED';
  pushName?: string;
}

interface EvolutionChat {
  id: string;
  name?: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage?: EvolutionMessage;
  messages?: EvolutionMessage[];
}

class EvolutionApiService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${EVOLUTION_API_URL}${endpoint}`;
    const startTime = Date.now();
    const REQUEST_TIMEOUT = 15000; // 15 segundos
    
    try {
      console.log(`🔄 [EVOLUTION] Making request to: ${url}`, {
        method: options.method || 'GET',
        timeout: `${REQUEST_TIMEOUT}ms`
      });
      
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('❌ [EVOLUTION] Request cancelado por timeout:', {
          url,
          duration: `${Date.now() - startTime}ms`,
          timeout: `${REQUEST_TIMEOUT}ms`
        });
      }, REQUEST_TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
          ...options.headers
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      
      console.log(`🔄 [EVOLUTION] Response received:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        contentType: response.headers.get('content-type')
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [EVOLUTION] Request failed:`, {
          url,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          duration: `${duration}ms`
        });
        
        // Throw specific errors based on status code
        if (response.status === 401) {
          throw new Error('EVOLUTION_UNAUTHORIZED: Invalid API key');
        } else if (response.status === 404) {
          throw new Error('EVOLUTION_NOT_FOUND: Endpoint or resource not found');
        } else if (response.status === 429) {
          throw new Error('EVOLUTION_RATE_LIMIT: Too many requests');
        } else if (response.status >= 500) {
          throw new Error(`EVOLUTION_SERVER_ERROR: ${response.status} ${response.statusText}`);
        } else {
          throw new Error(`EVOLUTION_CLIENT_ERROR: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log(`✅ [EVOLUTION] Request successful:`, {
        url,
        status: response.status,
        dataKeys: Object.keys(data || {}),
        duration: `${duration}ms`
      });
      
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ [EVOLUTION] Request cancelado por timeout:', {
          url,
          duration: `${duration}ms`,
          timeout: `${REQUEST_TIMEOUT}ms`
        });
        throw new Error(`EVOLUTION_TIMEOUT: Request timeout após ${duration}ms`);
      }
      
      if (error instanceof Error) {
        // Re-throw Evolution-specific errors
        if (error.message.startsWith('EVOLUTION_')) {
          throw error;
        }
        
        // Handle network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          console.error(`❌ [EVOLUTION] Network error:`, {
            url,
            error: error.message,
            duration: `${duration}ms`
          });
          throw new Error(`EVOLUTION_NETWORK_ERROR: ${error.message}`);
        }
      }
      
      console.error(`❌ [EVOLUTION] Unexpected error:`, {
        url,
        error: error instanceof Error ? error.message : error,
        duration: `${duration}ms`
      });
      
      if (error instanceof Error) {
         if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
           throw new Error('EVOLUTION_NETWORK_ERROR: Não foi possível conectar com a Evolution API - Verifique se o serviço está funcionando');
         }
         
         if (error.message.includes('ECONNRESET') || error.message.includes('socket hang up')) {
           throw new Error('EVOLUTION_NETWORK_ERROR: Conexão com a Evolution API foi interrompida');
         }
       }
       
       throw new Error(`EVOLUTION_UNKNOWN_ERROR: ${error}`);
      }
    }

  async getChats(instanceName: string): Promise<EvolutionChat[]> {
    try {
      const response = await this.makeRequest(`/chat/findChats/${instanceName}`);
      return response || [];
    } catch (error) {
      console.error('Error fetching chats:', error);
      return [];
    }
  }

  async getChatMessages(instanceName: string, remoteJid: string, limit = 50): Promise<EvolutionMessage[]> {
    try {
      const response = await this.makeRequest(
        `/chat/findMessages/${instanceName}?remoteJid=${encodeURIComponent(remoteJid)}&limit=${limit}`
      );
      return response?.messages || [];
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }

  async sendMessage(
    instanceName: string, 
    remoteJid: string, 
    text: string,
    quoted?: { id: string },
    retries = 3
  ) {
    // Normalizar número do WhatsApp
    let normalizedJid = remoteJid;
    if (!remoteJid.includes('@')) {
      normalizedJid = `${remoteJid}@s.whatsapp.net`;
    }

    // Validar parâmetros
    if (!instanceName || !normalizedJid || !text) {
      throw new Error('EVOLUTION_INVALID_PARAMS: instanceName, remoteJid e text são obrigatórios');
    }

    if (text.trim().length === 0) {
      throw new Error('EVOLUTION_EMPTY_TEXT: Texto da mensagem não pode estar vazio');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 [EVOLUTION] Tentativa ${attempt}/${retries} - Enviando mensagem:`, {
          instanceName,
          remoteJid: normalizedJid,
          textLength: text.length,
          hasQuoted: !!quoted
        });

        const requestBody: any = {
          number: normalizedJid,
          text: text.trim(),
        };

        if (quoted?.id) {
          requestBody.options = {
            quoted: {
              key: {
                remoteJid: normalizedJid,
                id: quoted.id,
                fromMe: false
              }
            }
          };
        }

        console.log(`📋 [EVOLUTION] Payload da requisição:`, {
          endpoint: `/message/sendText/${instanceName}`,
          body: requestBody
        });

        const response = await this.makeRequest(`/message/sendText/${instanceName}`, {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        console.log(`✅ [EVOLUTION] Mensagem enviada com sucesso na tentativa ${attempt}:`, {
          messageId: response?.key?.id,
          status: response?.status
        });

        return response;

      } catch (error: any) {
        console.error(`❌ [EVOLUTION] Tentativa ${attempt}/${retries} falhou:`, {
          error: error.message,
          instanceName,
          remoteJid: normalizedJid
        });

        // Verificar se é erro de número não existente
        if (error.message.includes('exists":false')) {
          console.warn(`⚠️ [EVOLUTION] Número ${normalizedJid} não existe no WhatsApp - não tentando novamente`);
          throw new Error(`EVOLUTION_NUMBER_NOT_EXISTS: O número ${normalizedJid} não existe no WhatsApp`);
        }

        // Se é a última tentativa ou erro não é temporário, lançar erro
        if (attempt === retries || !this.isRetryableError(error)) {
          console.error(`❌ [EVOLUTION] Todas as tentativas falharam ou erro não é temporário`);
          throw error;
        }

        // Aguardar antes da próxima tentativa
        const delay = Math.pow(2, attempt - 1) * 1000; // Backoff exponencial
        console.log(`⏳ [EVOLUTION] Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('EVOLUTION_MAX_RETRIES: Máximo de tentativas excedido');
  }

  private isRetryableError(error: any): boolean {
    if (!error || !error.message) return false;
    
    const message = error.message.toLowerCase();
    
    // Erros temporários que podem ser retentados
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }

  async sendMedia(
    instanceName: string,
    mediaData: {
      number: string;
      mediatype: 'image' | 'video' | 'audio' | 'document';
      mimetype: string;
      media: string; // URL ou base64
      fileName: string;
      caption?: string;
      quoted?: {
        key: {
          id: string;
        };
        message: {
          conversation: string;
        };
      };
    }
  ) {
    try {
      console.log(`🔄 [EVOLUTION] Enviando mídia:`, {
        instanceName,
        mediatype: mediaData.mediatype,
        mimetype: mediaData.mimetype,
        fileName: mediaData.fileName,
        hasCaption: !!mediaData.caption,
        hasQuoted: !!mediaData.quoted,
        mediaLength: mediaData.media?.length || 0
      });

      const response = await this.makeRequest(`/message/sendMedia/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify(mediaData),
      });

      console.log(`✅ [EVOLUTION] Mídia enviada com sucesso:`, {
        instanceName,
        messageId: response?.key?.id,
        status: response?.status
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('❌ [EVOLUTION] Erro ao enviar mídia:', {
        instanceName,
        error: error instanceof Error ? error.message : error,
        mediatype: mediaData.mediatype,
        fileName: mediaData.fileName
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async markAsRead(instanceName: string, remoteJid: string, messageId: string) {
    try {
      const response = await this.makeRequest(`/message/markMessageAsRead/${instanceName}`, {
        method: 'PUT',
        body: JSON.stringify({
          readMessages: [{
            remoteJid,
            id: messageId
          }]
        })
      });
      return response;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async configureWebhook(instanceName: string, webhookUrl: string) {
    try {
      // Importar o serviço de conectividade dinamicamente para evitar dependência circular
      const { webhookConnectivity } = await import('./webhook-connectivity');
      
      console.log(`🔗 [WEBHOOK] Validando conectividade antes de configurar webhook para ${instanceName}`);
      
      // Validar conectividade do webhook
      const validation = await webhookConnectivity.validateWebhookBeforeConfiguration(webhookUrl);
      
      if (!validation.shouldConfigure) {
        console.warn(`⚠️ [WEBHOOK] Webhook não será configurado para ${instanceName}: ${validation.reason}`);
        
        // Retornar sucesso falso mas não falhar completamente
        return {
          success: false,
          reason: validation.reason,
          fallbackConfigured: true
        };
      }
      
      console.log(`✅ [WEBHOOK] Conectividade validada, configurando webhook para ${instanceName}`);
      
      const response = await this.makeRequest(`/webhook/set/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhook_by_events: true, // Otimizado para eventos específicos
            webhook_base64: true,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CHATS_UPSERT',     // Adicionado para sincronização de chats
              'CHATS_UPDATE',     // Adicionado para atualizações de chat
              'CONNECTION_UPDATE',
              'PRESENCE_UPDATE'
            ],
            // Configurações otimizadas para reduzir loops e latência
            webhook_timeout: 3000,        // Reduzido de 5000 para 3000ms
            webhook_retry_count: 1,       // Reduzido de 3 para 1 retry
            webhook_retry_interval: 2000, // Aumentado de 1000 para 2000ms
            webhook_delay: 500            // Delay entre webhooks para evitar spam
          }
        })
      });
      
      console.log(`✅ [WEBHOOK] Webhook configurado com sucesso para instância ${instanceName}`);
      return {
        success: true,
        data: response
      };
      
    } catch (error: any) {
      console.error(`❌ [WEBHOOK] Erro ao configurar webhook para ${instanceName}:`, {
        error: error.message,
        webhookUrl,
        instanceName
      });
      
      // Se falhar, tentar configurar webhook desabilitado como fallback
      try {
        console.log(`🔄 [WEBHOOK] Tentando configurar webhook desabilitado como fallback para ${instanceName}`);
        
        await this.makeRequest(`/webhook/set/${instanceName}`, {
          method: 'POST',
          body: JSON.stringify({
            webhook: {
              enabled: false,
              url: webhookUrl
            }
          })
        });
        
        console.log(`⚠️ [WEBHOOK] Webhook desabilitado configurado como fallback para ${instanceName}`);
        
        return {
          success: false,
          error: error.message,
          fallbackConfigured: true
        };
        
      } catch (fallbackError: any) {
        console.error(`❌ [WEBHOOK] Falha no fallback para ${instanceName}:`, fallbackError.message);
        throw error; // Lançar erro original
      }
    }
  }

  async fetchProfilePictureUrl(instanceName: string, number: string): Promise<string | null> {
    try {
      const response = await this.makeRequest(`/chat/fetchProfilePictureUrl/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number: number
        })
      });
      return response?.profilePictureUrl || null;
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      return null;
    }
  }

  async fetchMediaUrl(instanceName: string, messageId: string, remoteJid: string, mediaType?: string): Promise<string | null> {
    const MAX_ATTEMPTS = 2; // Limitar a 2 tentativas para evitar loops
    const OPERATION_TIMEOUT = 30000; // 30 segundos timeout total
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [EVOLUTION] Iniciando busca de mídia (max ${MAX_ATTEMPTS} tentativas):`, {
        instanceName,
        messageId: messageId?.substring(0, 20) + '...',
        remoteJid: remoteJid?.substring(0, 20) + '...',
        mediaType,
        timestamp: new Date().toISOString()
      });

      // Verificar timeout global
      if (Date.now() - startTime > OPERATION_TIMEOUT) {
        throw new Error('EVOLUTION_TIMEOUT: Operação excedeu timeout global');
      }

      // Método 1: Tentar baixar mídia diretamente (com timeout)
      console.log('🔄 [EVOLUTION] Método 1: Download direto');
      try {
        const downloadResponse = await Promise.race([
          this.makeRequest(`/message/downloadMedia/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messageId,
              remoteJid
            })
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DOWNLOAD_TIMEOUT')), 15000)
          )
        ]);

        console.log('📊 [EVOLUTION] Resposta do download:', {
          hasMedia: !!downloadResponse?.media,
          mediaLength: downloadResponse?.media?.length,
          responseKeys: Object.keys(downloadResponse || {})
        });

        if (downloadResponse?.media) {
          console.log('✅ [EVOLUTION] Mídia obtida via download direto');
          const dataUrl = this.convertBase64ToDataUrl(downloadResponse.media, mediaType);
          console.log('🔄 [EVOLUTION] Data URL gerada:', dataUrl.substring(0, 100) + '...');
          return dataUrl;
        }
      } catch (downloadError: any) {
        console.log('❌ [EVOLUTION] Falha no download direto:', {
          error: downloadError?.message || downloadError,
          status: downloadError?.status,
          statusText: downloadError?.statusText,
          duration: Date.now() - startTime
        });
      }

      // Verificar timeout antes do próximo método
      if (Date.now() - startTime > OPERATION_TIMEOUT) {
        throw new Error('EVOLUTION_TIMEOUT: Operação excedeu timeout global');
      }

      // Método 2: Tentar obter base64 via endpoint alternativo (com timeout)
      console.log('🔄 [EVOLUTION] Método 2: Endpoint base64 alternativo');
      try {
        const base64Response = await Promise.race([
          this.makeRequest(`/message/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messageId,
              remoteJid
            })
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('BASE64_TIMEOUT')), 15000)
          )
        ]);

        console.log('📊 [EVOLUTION] Resposta do base64:', {
          hasBase64: !!base64Response?.base64,
          base64Length: base64Response?.base64?.length,
          responseKeys: Object.keys(base64Response || {})
        });

        if (base64Response?.base64) {
          console.log('✅ [EVOLUTION] Base64 obtido via endpoint alternativo');
          const dataUrl = this.convertBase64ToDataUrl(base64Response.base64, mediaType);
          console.log('🔄 [EVOLUTION] Data URL gerada:', dataUrl.substring(0, 100) + '...');
          return dataUrl;
        }
      } catch (base64Error: any) {
        console.log('❌ [EVOLUTION] Falha no endpoint base64:', {
          error: base64Error?.message || base64Error,
          status: base64Error?.status,
          statusText: base64Error?.statusText,
          duration: Date.now() - startTime
        });
      }

      // Não tentar método 3 para evitar loops - retornar null
      console.log('❌ [EVOLUTION] Todos os métodos falharam, retornando null para evitar loops');
      return null;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [EVOLUTION] Erro geral na busca de mídia:', {
        error: error?.message || error,
        duration,
        messageId: messageId?.substring(0, 20) + '...',
        instanceName
      });
      return null;
    }
  }
  
  private convertBase64ToDataUrl(base64: string, mediaType?: string): string {
    // Se já é uma data URL, retornar como está
    if (base64.startsWith('data:')) {
      return base64;
    }
    
    // Remover prefixos desnecessários
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
    
    // Determinar MIME type baseado no tipo de mídia
    let mimeType = 'image/jpeg'; // padrão
    
    switch (mediaType) {
      case 'video':
        mimeType = 'video/mp4';
        break;
      case 'audio':
        mimeType = 'audio/ogg'; // Evolution API usa OGG/Opus por padrão
        break;
      case 'sticker':
        mimeType = 'image/webp';
        break;
      case 'document':
        mimeType = 'application/pdf';
        break;
      case 'image':
      default:
        mimeType = 'image/jpeg';
        break;
    }
    
    return `data:${mimeType};base64,${cleanBase64}`;
  }

  async getInstances(): Promise<Array<{name: string, status: string, instance?: any}>> {
    try {
      console.log('🔄 [EVOLUTION] Fetching instances from Evolution API...');
      const response = await this.makeRequest('/instance/fetchInstances');
      console.log('🔄 [EVOLUTION] Instances response:', response);
      return response || [];
    } catch (error) {
      console.error('Error fetching instances from Evolution API:', error);
      return [];
    }
  }

  // Convert Evolution API data to our internal format
  convertChatToTicket(chat: EvolutionChat, instanceName: string): Ticket {
    const client: Client = {
      id: chat.id,
      name: chat.name || this.extractNameFromJid(chat.id),
      phone: this.extractPhoneFromJid(chat.id),
      email: '',
      avatar: '',
      lastSeen: chat.lastMessage ? new Date(chat.lastMessage.messageTimestamp * 1000) : new Date(),
      isOnline: false,
    };

    const lastMessage = chat.lastMessage ? this.convertMessage(chat.lastMessage) : null;

    return {
      id: chat.id,
      client,
      subject: chat.name || `Conversa com ${client.name}`,
      status: chat.unreadCount > 0 ? 'open' : 'pending',
      priority: 'medium',
      channel: chat.isGroup ? 'whatsapp-group' : 'whatsapp',
      createdAt: lastMessage?.timestamp || new Date(),
      updatedAt: lastMessage?.timestamp || new Date(),
      messages: chat.messages ? chat.messages.map(msg => this.convertMessage(msg)) : [],
      unreadCount: chat.unreadCount,
      tags: [],
      assignedTo: undefined,
      instanceName,
    };
  }

  convertMessage(evolutionMessage: EvolutionMessage): Message {
    const content = this.extractMessageContent(evolutionMessage.message);
    
    return {
      isFromMe: evolutionMessage.key.fromMe,
      id: evolutionMessage.key.id,
      content,
      timestamp: new Date(evolutionMessage.messageTimestamp * 1000),
      sender: evolutionMessage.key.fromMe ? 'agent' : 'client',
      type: this.getMessageType(evolutionMessage.message),
      status: evolutionMessage.status?.toLowerCase() as any || 'sent',
      senderName: evolutionMessage.pushName || 'Usuário',
    };
  }

  private extractMessageContent(message: any): string {
    if (message.conversation) {
      return message.conversation;
    }
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }
    if (message.imageMessage) {
      console.log('🖼️ [EVOLUTION] Processando imageMessage:', {
        hasUrl: !!message.imageMessage.url,
        url: message.imageMessage.url,
        hasCaption: !!message.imageMessage.caption,
        caption: message.imageMessage.caption,
        hasBase64: !!message.imageMessage.jpegThumbnail,
        mimetype: message.imageMessage.mimetype,
        fileLength: message.imageMessage.fileLength
      });
      
      // Para imagens, verificar se há URL válida
      if (message.imageMessage.url && this.isValidUrl(message.imageMessage.url)) {
        console.log('✅ [EVOLUTION] URL válida encontrada:', message.imageMessage.url);
        return message.imageMessage.url;
      }
      
      // Tentar processar dados base64 se disponíveis
      if (message.imageMessage.jpegThumbnail) {
        console.log('🔄 [EVOLUTION] Processando base64 thumbnail');
        const dataUrl = this.convertBase64ToDataUrl(message.imageMessage.jpegThumbnail, 'image');
        return dataUrl;
      }
      
      // Se há caption, retornar caption com indicador de imagem
      if (message.imageMessage.caption) {
        console.log('📝 [EVOLUTION] Usando caption como fallback:', message.imageMessage.caption);
        return `📷 ${message.imageMessage.caption}`;
      }
      
      // Caso contrário, retornar placeholder que será processado pelo frontend
      console.log('⚠️ [EVOLUTION] Nenhuma URL ou dados válidos encontrados, usando placeholder');
      return '📷 Imagem';
    }
    if (message.videoMessage) {
      // Para vídeos, verificar se há URL válida
      if (message.videoMessage.url && this.isValidUrl(message.videoMessage.url)) {
        return message.videoMessage.url;
      }
      // Se há caption, retornar caption
      if (message.videoMessage.caption) {
        return message.videoMessage.caption;
      }
      // Caso contrário, retornar placeholder
      return '🎬 Vídeo';
    }
    if (message.audioMessage) {
      // Para áudios, retornar a URL se disponível
      if (message.audioMessage.url && this.isValidUrl(message.audioMessage.url)) {
        return message.audioMessage.url;
      }
      return '🎵 Áudio';
    }
    if (message.documentMessage) {
      // Para documentos, retornar a URL se disponível
      if (message.documentMessage.url && this.isValidUrl(message.documentMessage.url)) {
        return message.documentMessage.url;
      }
      // Senão retornar nome do arquivo com placeholder
      return `📄 ${message.documentMessage.fileName || 'Documento'}`;
    }
    if (message.stickerMessage) {
      // Para stickers, verificar se há URL válida
      if (message.stickerMessage.url && this.isValidUrl(message.stickerMessage.url)) {
        return message.stickerMessage.url;
      }
      return '🎭 Sticker';
    }
    return 'Mensagem não suportada';
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
    } catch {
      return false;
    }
  }

  private getMessageType(message: any): 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' {
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';
    return 'text';
  }

  private extractNameFromJid(jid: string): string {
    // Extract name from WhatsApp JID
    const phone = this.extractPhoneFromJid(jid);
    return phone || jid.split('@')[0];
  }

  private extractPhoneFromJid(jid: string): string {
    // Extract phone number from WhatsApp JID
    return jid.split('@')[0].replace(/\D/g, '');
  }
}

export const evolutionApi = new EvolutionApiService();
export default evolutionApi;
export type { EvolutionMessage, EvolutionChat };