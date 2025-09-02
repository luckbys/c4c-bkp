import { firebaseService } from './firebase-service';
import { evolutionApi } from './evolution-api';
import { retryService } from './retry-service';
import { cacheService } from './cache-service';
// import { processMediaWithCache } from '@/services/media-upload'; // Removido - usando MinIO agora
import { MediaIntegrationService } from './media-integration-service';
import { AdvancedFileValidator } from './advanced-file-validator';
import { Timestamp } from 'firebase/firestore';
import { generateId } from '@/utils/id-generator';

// Webhook event handlers for Evolution API
export class WebhookHandlers {
  // Método auxiliar para extrair URL direta de qualquer tipo de mídia
  private static extractDirectMediaUrl(messageData: any, mediaType: string): string | null {
    if (!messageData) return null;
    
    let mediaMsg = null;
    
    // Selecionar o tipo correto de mensagem de mídia
    switch (mediaType) {
      case 'image':
        mediaMsg = messageData.imageMessage;
        break;
      case 'video':
        mediaMsg = messageData.videoMessage;
        break;
      case 'audio':
        mediaMsg = messageData.audioMessage;
        break;
      case 'document':
        mediaMsg = messageData.documentMessage;
        break;
      case 'sticker':
        mediaMsg = messageData.stickerMessage;
        break;
      default:
        return null;
    }
    
    if (!mediaMsg) return null;
    
    // Verificar URL direta
    if (mediaMsg.url && this.isValidMediaUrl(mediaMsg.url)) {
      return mediaMsg.url;
    }
    
    // Verificar dados base64 inline (jpegThumbnail)
    if (mediaMsg.jpegThumbnail) {
      // jpegThumbnail é sempre uma imagem JPEG, independente do tipo de mídia
      const mimeType = 'image/jpeg';
      const base64Data = mediaMsg.jpegThumbnail;
      
      // Verificar se já é uma data URL
      if (base64Data.startsWith('data:')) {
        return base64Data;
      } else {
        // Limpar qualquer prefixo e criar data URL
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        return `data:${mimeType};base64,${cleanBase64}`;
      }
    }
    
    // Para stickers, verificar thumbnail
    if (mediaMsg.thumbnail) {
      const mimeType = mediaMsg.mimetype || this.getMimeTypeForMediaType(mediaType);
      const base64Data = mediaMsg.thumbnail;
      
      if (base64Data.startsWith('data:')) {
        return base64Data;
      } else {
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        return `data:${mimeType};base64,${cleanBase64}`;
      }
    }
    
    return null;
  }
  
  // Método auxiliar para obter MIME type baseado no tipo de mídia
  private static getMimeTypeForMediaType(mediaType: string): string {
    switch (mediaType) {
      case 'image':
        return 'image/jpeg';
      case 'video':
        return 'video/mp4';
      case 'audio':
        return 'audio/ogg'; // Evolution API usa OGG/Opus por padrão
      case 'sticker':
        return 'image/webp';
      case 'document':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
  
  // Método auxiliar para validar e limpar dados base64
  private static processBase64Data(base64Data: string, mimeType: string): string {
    if (!base64Data) return '';
    
    // Se já é uma data URL válida, retornar como está
    if (base64Data.startsWith('data:') && base64Data.includes('base64,')) {
      return base64Data;
    }
    
    // Limpar qualquer prefixo inválido
    const cleanBase64 = base64Data.replace(/^data:[^;]*;base64,/, '').trim();
    
    // Validar se é base64 válido (básico)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      console.warn('⚠️ [BASE64] Dados base64 podem estar corrompidos');
    }
    
    return `data:${mimeType};base64,${cleanBase64}`;
  }
  
  // Método auxiliar para validar URLs de mídia
  private static isValidMediaUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    try {
      // Verificar se é data URL
      if (url.startsWith('data:')) return true;
      
      // Rejeitar URLs criptografadas do WhatsApp (.enc)
      if (url.includes('.enc')) return false;
      
      // Verificar se é URL HTTP válida
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private static isEncryptedWhatsAppUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    return url.includes('.enc?') && url.includes('whatsapp.net');
  }

  private static async getDecryptedMediaUrl(instance: string, messageId: string, remoteJid: string): Promise<string | null> {
    const DECRYPT_TIMEOUT = 20000; // 20 segundos timeout
    const startTime = Date.now();
    
    try {
      console.log(`🔓 [DECRYPT] Tentando obter URL descriptografada para mensagem: ${messageId} (timeout: ${DECRYPT_TIMEOUT}ms)`);
      console.log(`🔓 [DECRYPT] Parâmetros: instance=${instance}, remoteJid=${remoteJid}`);
      
      // Usar Evolution API para buscar a mídia descriptografada com timeout
      const mediaUrl = await Promise.race([
        evolutionApi.fetchMediaUrl(instance, messageId, remoteJid),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('DECRYPT_TIMEOUT')), DECRYPT_TIMEOUT)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      if (mediaUrl && !this.isEncryptedWhatsAppUrl(mediaUrl)) {
        console.log(`🔓 [DECRYPT] ✅ URL descriptografada obtida em ${duration}ms: ${mediaUrl}`);
        return mediaUrl;
      }
      
      console.log(`🔓 [DECRYPT] ❌ Não foi possível obter URL descriptografada em ${duration}ms`);
      console.log(`🔓 [DECRYPT] Resultado da Evolution API: ${mediaUrl || 'null'}`);
      return null;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`🔓 [DECRYPT] ❌ Erro ao obter URL descriptografada em ${duration}ms:`, {
        error: error?.message || error,
        messageId: messageId?.substring(0, 20) + '...',
        instance
      });
      return null;
    }
  }

  // Método para processar mídia com MinIO
  private static async processMediaWithMinIO(
    mediaUrl: string,
    messageId: string,
    ticketId: string,
    messageType: string,
    fileName?: string,
    mimeType?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const MINIO_TIMEOUT = 45000; // 45 segundos timeout total
    const DOWNLOAD_TIMEOUT = 30000; // 30 segundos para download
    const startTime = Date.now();
    
    try {
      console.log(`🗄️ [MINIO] Iniciando upload para MinIO (timeout: ${MINIO_TIMEOUT}ms):`, {
        messageId,
        ticketId,
        messageType,
        fileName,
        mimeType,
        urlType: mediaUrl.startsWith('data:') ? 'base64' : 'http'
      });

      // Verificar timeout global
      if (Date.now() - startTime > MINIO_TIMEOUT) {
        throw new Error('MINIO_TIMEOUT: Operação excedeu timeout global');
      }

      const integrationService = new MediaIntegrationService();
      let buffer: Buffer;

      if (mediaUrl.startsWith('data:')) {
        // Processar data URL (base64)
        const base64Data = mediaUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('Data URL inválida');
        }
        buffer = Buffer.from(base64Data, 'base64');
        console.log(`🗄️ [MINIO] Buffer criado a partir de data URL: ${buffer.length} bytes`);
      } else {
        // Download da URL com timeout
        console.log(`🗄️ [MINIO] Fazendo download da URL: ${mediaUrl} (timeout: ${DOWNLOAD_TIMEOUT}ms)`);
        
        let response: Response;
        
        // Verificar se é uma URL criptografada do WhatsApp
        if (this.isEncryptedWhatsAppUrl(mediaUrl)) {
          console.log(`🗄️ [MINIO] URL criptografada detectada - usando download direto`);
          
          // Headers específicos para URLs do WhatsApp
          const headers = {
            'User-Agent': 'WhatsApp/2.23.24.76 A',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
          };
          
          response = await fetch(mediaUrl, { headers });
        } else {
          response = await fetch(mediaUrl);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Tentar fallback via Evolution API se o download direto falhar
        if (this.isEncryptedWhatsAppUrl(mediaUrl)) {
          console.log(`🗄️ [MINIO] Tentando fallback via Evolution API...`);
          
          try {
            // Extrair informações da URL para tentar via Evolution API
            const urlParts = mediaUrl.split('/');
            const fileId = urlParts[urlParts.length - 1]?.split('?')[0];
            
            if (fileId) {
              console.log(`🗄️ [MINIO] Tentando buscar mídia via Evolution API com fileId: ${fileId}`);
              
              // Tentar buscar via Evolution API
              const evolutionResponse = await evolutionApi.fetchMediaUrl('default', fileId, '', messageType);
              
              if (evolutionResponse && evolutionResponse.startsWith('data:')) {
                console.log(`🗄️ [MINIO] ✅ Mídia obtida via Evolution API (data URL)`);
                const base64Data = evolutionResponse.split(',')[1];
                if (base64Data) {
                  buffer = Buffer.from(base64Data, 'base64');
                } else {
                  throw new Error('Base64 data inválida da Evolution API');
                }
              } else {
                throw new Error('Evolution API não retornou data URL válida');
              }
            } else {
              throw new Error('Não foi possível extrair fileId da URL');
            }
          } catch (evolutionError) {
            console.error(`🗄️ [MINIO] ❌ Fallback via Evolution API falhou:`, evolutionError);
            throw new Error(`Download direto e Evolution API falharam: ${evolutionError}`);
          }
        } else {
          buffer = Buffer.from(await response.arrayBuffer());
        }
      }
      
      // Gerar nome do arquivo se não fornecido
      let finalFileName = fileName || `${messageId}_${generateId('file').split('_')[1]}`;
      
      // Adicionar extensão baseada no tipo se não houver
      if (!finalFileName.includes('.')) {
        let extension = '';
        switch (messageType) {
          case 'audio':
            extension = '.ogg'; // Evolution API usa OGG/Opus por padrão
            break;
          case 'image':
            extension = '.jpg';
            break;
          case 'video':
            extension = '.mp4';
            break;
          case 'document':
            extension = '.pdf';
            break;
          case 'sticker':
            extension = '.webp';
            break;
          default:
            extension = '';
            break;
        }
        finalFileName += extension;
      }
      
      // Validar arquivo se for imagem
       if (messageType === 'image') {
         const validation = await AdvancedFileValidator.validateFile(buffer, finalFileName, mimeType || 'image/jpeg');
         
         if (!validation.isValid) {
           throw new Error(`Arquivo de imagem inválido: ${validation.error}`);
         }
         
         console.log(`✅ [MINIO] Validação de imagem passou:`, validation);
         
         // Usar content-type corrigido se disponível
         if (validation.detectedMimeType) {
           mimeType = validation.detectedMimeType;
         }
       }
      
      // Upload para MinIO
        const result = await integrationService.uploadAndSaveReference(
          buffer,
          finalFileName,
          mimeType || 'application/octet-stream',
          messageId,
          ticketId,
          {
            uploadedBy: 'webhook-handler'
          }
        );
       
       if (result.success) {
         console.log(`✅ [MINIO] Upload concluído:`, {
           url: result.url,
           fileName: result.fileName,
           checksum: result.checksum
         });
        
        return { success: true, url: result.url };
      } else {
        throw new Error(result.error || 'Upload falhou');
      }
    } catch (error) {
      console.error(`❌ [MINIO] Erro no upload:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static async handleNewMessage(instance: string, data: any) {
    try {
      // Process new message from Evolution API
      console.log(`New message for instance ${instance}:`, JSON.stringify(data, null, 2));
      
      // Extract message information
      const message = data;
      const remoteJid = message.key?.remoteJid;
      const isFromMe = message.key?.fromMe || false;
      const pushName = message.pushName || 'Usuário';
      const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '') || '';
      
      // Usar o método convertMessage da Evolution API para extrair conteúdo e tipo
      const convertedMessage = evolutionApi.convertMessage(message);
      let messageType = convertedMessage.type;
      let messageContent = convertedMessage.content;
      
      // Log detalhado para debug de imagens
      if (messageType === 'image') {
        console.log('🖼️ [IMAGE DEBUG] Processing image message:');
        console.log('🖼️ [IMAGE DEBUG] Raw message data:', JSON.stringify(message.message, null, 2));
        console.log('🖼️ [IMAGE DEBUG] Initial content:', messageContent);
        console.log('🖼️ [IMAGE DEBUG] Has imageMessage:', !!message.message?.imageMessage);
        console.log('🖼️ [IMAGE DEBUG] Image URL from message:', message.message?.imageMessage?.url);
        console.log('🖼️ [IMAGE DEBUG] Image caption:', message.message?.imageMessage?.caption);
        console.log('🖼️ [IMAGE DEBUG] Has jpegThumbnail:', !!message.message?.imageMessage?.jpegThumbnail);
        console.log('🖼️ [IMAGE DEBUG] Thumbnail length:', message.message?.imageMessage?.jpegThumbnail?.length);
      }
      
      // Log detalhado para debug de áudios
      if (messageType === 'audio') {
        console.log('🎵 [AUDIO DEBUG] Processing audio message:');
        console.log('🎵 [AUDIO DEBUG] Raw message data:', JSON.stringify(message.message, null, 2));
        console.log('🎵 [AUDIO DEBUG] Initial content:', messageContent);
        console.log('🎵 [AUDIO DEBUG] Has audioMessage:', !!message.message?.audioMessage);
        console.log('🎵 [AUDIO DEBUG] Audio URL from message:', message.message?.audioMessage?.url);
        console.log('🎵 [AUDIO DEBUG] Audio mimetype:', message.message?.audioMessage?.mimetype);
        console.log('🎵 [AUDIO DEBUG] Is PTT:', message.message?.audioMessage?.ptt);
        console.log('🎵 [AUDIO DEBUG] Duration:', message.message?.audioMessage?.seconds);
      }

      // Log detalhado para debug de vídeos
      if (messageType === 'video') {
        console.log('🎬 [VIDEO DEBUG] Processing video message:');
        console.log('🎬 [VIDEO DEBUG] Raw message data:', JSON.stringify(message.message, null, 2));
        console.log('🎬 [VIDEO DEBUG] Initial content:', messageContent);
        console.log('🎬 [VIDEO DEBUG] Has videoMessage:', !!message.message?.videoMessage);
        console.log('🎬 [VIDEO DEBUG] Video URL from message:', message.message?.videoMessage?.url);
        console.log('🎬 [VIDEO DEBUG] Video mimetype:', message.message?.videoMessage?.mimetype);
        console.log('🎬 [VIDEO DEBUG] Video caption:', message.message?.videoMessage?.caption);
        console.log('🎬 [VIDEO DEBUG] Video duration:', message.message?.videoMessage?.seconds);
        console.log('🎬 [VIDEO DEBUG] Has jpegThumbnail:', !!message.message?.videoMessage?.jpegThumbnail);
        console.log('🎬 [VIDEO DEBUG] Thumbnail length:', message.message?.videoMessage?.jpegThumbnail?.length);
      }
      
      // Log para verificar se a condição de mídia está sendo atendida
      console.log('🔍 [MEDIA CHECK] Verificando condições:', {
        messageType,
        isValidType: messageType && ['image', 'video', 'audio', 'document', 'sticker'].includes(messageType),
        typeIncludes: ['image', 'video', 'audio', 'document', 'sticker'].includes(messageType || '')
      });
      
      // Processamento avançado para mídia (imagens, vídeos, áudios, documentos, stickers)
      if (messageType && ['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
        console.log(`📎 [MEDIA PROCESSING] Iniciando processamento de ${messageType}`);
        
        // Verificar cache primeiro
        const cachedUrl = cacheService.getMediaUrl(message.key?.id || '');
        
        if (cachedUrl && cachedUrl.includes('firebasestorage.googleapis.com')) {
          messageContent = cachedUrl;
          console.log(`📎 [MEDIA PROCESSING] ✅ URL do Storage encontrada no cache: ${cachedUrl}`);
        } else {
          // Processamento otimizado para extração de mídia
          let originalMediaUrl = null;
          
          if (messageType === 'image') {
            console.log('🖼️ [IMAGE DEBUG] Processing image message:', {
              messageId: message.key?.id,
              hasImageMessage: !!message.message?.imageMessage,
              hasBase64: !!message.message?.base64
            });
            
            // PRIORIDADE 1: Usar campo base64 se disponível (dados já descriptografados)
            if (message.message?.base64) {
              console.log('✅ [IMAGE EXTRACTION] Usando dados base64 descriptografados');
              const base64Data = message.message.base64;
              const mimeType = message.message?.imageMessage?.mimetype || 'image/jpeg';
              
              // Verificar se já é uma data URL
              if (base64Data.startsWith('data:')) {
                originalMediaUrl = base64Data;
              } else {
                // Criar data URL com os dados base64
                originalMediaUrl = `data:${mimeType};base64,${base64Data}`;
              }
              
              console.log('✅ [IMAGE EXTRACTION] Base64 processado:', {
                size: base64Data.length,
                mimeType,
                isValidJpeg: base64Data.startsWith('/9j/') || base64Data.startsWith('data:image')
              });
            }
            // PRIORIDADE 2: Tentar URL direta (apenas se não for .enc)
            else {
              const imageMsg = message.message?.imageMessage;
              if (imageMsg) {
                console.log('🖼️ [IMAGE EXTRACTION] Estrutura da mensagem de imagem:', {
                  hasUrl: !!imageMsg.url,
                  url: imageMsg.url,
                  isEncrypted: imageMsg.url?.includes('.enc'),
                  hasCaption: !!imageMsg.caption,
                  caption: imageMsg.caption,
                  hasMimetype: !!imageMsg.mimetype,
                  mimetype: imageMsg.mimetype,
                  hasJpegThumbnail: !!imageMsg.jpegThumbnail,
                  thumbnailLength: imageMsg.jpegThumbnail ? imageMsg.jpegThumbnail.length : 0
                });
                
                // Evitar URLs criptografadas (.enc) que causam corrupção
                if (imageMsg.url && this.isValidMediaUrl(imageMsg.url) && !imageMsg.url.includes('.enc')) {
                  originalMediaUrl = imageMsg.url;
                  console.log('✅ [IMAGE EXTRACTION] Usando URL direta não-criptografada:', originalMediaUrl);
                }
                // Fallback para thumbnail se URL é criptografada
                else if (imageMsg.jpegThumbnail) {
                  console.log('🔄 [IMAGE EXTRACTION] URL criptografada detectada, usando thumbnail');
                  try {
                    const base64Data = imageMsg.jpegThumbnail;
                    const mimeType = imageMsg.mimetype || 'image/jpeg';
                    
                    if (base64Data.startsWith('data:')) {
                      originalMediaUrl = base64Data;
                    } else {
                      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
                      originalMediaUrl = `data:${mimeType};base64,${cleanBase64}`;
                    }
                    
                    console.log('✅ [IMAGE EXTRACTION] Thumbnail processado como fallback:', originalMediaUrl.substring(0, 100) + '...');
                  } catch (error) {
                    console.log('❌ [IMAGE EXTRACTION] Erro ao processar thumbnail:', error);
                  }
                }
                // Último recurso: tentar URL criptografada (com aviso)
                else if (imageMsg.url && imageMsg.url.includes('.enc')) {
                  console.log('⚠️ [IMAGE EXTRACTION] Usando URL criptografada como último recurso (pode causar corrupção)');
                  originalMediaUrl = imageMsg.url;
                }
              }
            }
          } else if (messageType === 'audio') {
            console.log('🎵 [AUDIO DEBUG] Processing audio message:', {
              messageId: message.key?.id,
              hasAudioMessage: !!message.message?.audioMessage,
              hasBase64: !!message.message?.base64
            });
            
            // PRIORIDADE 1: Usar campo base64 se disponível (dados já descriptografados)
            if (message.message?.base64) {
              console.log('✅ [AUDIO EXTRACTION] Usando dados base64 descriptografados');
              const base64Data = message.message.base64;
              const mimeType = message.message?.audioMessage?.mimetype || 'audio/ogg';
              
              // Verificar se já é uma data URL
              if (base64Data.startsWith('data:')) {
                originalMediaUrl = base64Data;
              } else {
                // Criar data URL com os dados base64
                originalMediaUrl = `data:${mimeType};base64,${base64Data}`;
              }
              
              console.log('✅ [AUDIO EXTRACTION] Base64 processado:', {
                size: base64Data.length,
                mimeType
              });
            }
            // PRIORIDADE 2: Tentar URL direta (apenas se não for .enc)
            else {
              const audioMsg = message.message?.audioMessage;
              if (audioMsg) {
                console.log('🎵 [AUDIO EXTRACTION] Estrutura da mensagem de áudio:', {
                  hasUrl: !!audioMsg.url,
                  url: audioMsg.url,
                  isEncrypted: audioMsg.url?.includes('.enc'),
                  hasMimetype: !!audioMsg.mimetype,
                  mimetype: audioMsg.mimetype,
                  hasJpegThumbnail: !!audioMsg.jpegThumbnail,
                  thumbnailLength: audioMsg.jpegThumbnail ? audioMsg.jpegThumbnail.length : 0
                });
                
                // Evitar URLs criptografadas (.enc) que causam corrupção
                if (audioMsg.url && this.isValidMediaUrl(audioMsg.url) && !audioMsg.url.includes('.enc')) {
                  originalMediaUrl = audioMsg.url;
                  console.log('✅ [AUDIO EXTRACTION] Usando URL direta não-criptografada:', originalMediaUrl);
                }
                // Para URLs criptografadas (.enc), buscar versão descriptografada via Evolution API
                else if (audioMsg.url && audioMsg.url.includes('.enc')) {
                  console.log('🔓 [AUDIO EXTRACTION] URL criptografada detectada - buscando versão descriptografada');
                  console.log('🔓 [AUDIO EXTRACTION] URL .enc:', audioMsg.url);
                  
                  try {
                    // Tentar obter áudio descriptografado via Evolution API
                    const decryptedAudioUrl = await evolutionApi.fetchMediaUrl(instance, message.key?.id || '', message.key?.remoteJid || '', 'audio');
                    
                    if (decryptedAudioUrl && decryptedAudioUrl.startsWith('data:audio/')) {
                      console.log('✅ [AUDIO EXTRACTION] Áudio descriptografado obtido via Evolution API');
                      console.log('🎵 [AUDIO EXTRACTION] Formato:', decryptedAudioUrl.substring(0, 50) + '...');
                      originalMediaUrl = decryptedAudioUrl;
                    } else {
                      console.log('❌ [AUDIO EXTRACTION] Falha na descriptografia - usando URL .enc como fallback');
                      originalMediaUrl = audioMsg.url; // Fallback para URL .enc
                    }
                  } catch (error) {
                    console.error('❌ [AUDIO EXTRACTION] Erro ao descriptografar áudio:', error);
                    originalMediaUrl = audioMsg.url; // Fallback para URL .enc
                  }
                }
                // Se não há URL, tentar buscar via Evolution API
                else {
                  console.log('⚠️ [AUDIO EXTRACTION] Nenhuma URL de áudio encontrada - será buscada via Evolution API');
                  originalMediaUrl = null; // Forçar busca via Evolution API
                }
                
                // Processar jpegThumbnail separadamente apenas para preview visual (não para reprodução)
                if (audioMsg.jpegThumbnail) {
                  console.log('🖼️ [AUDIO THUMBNAIL] Processando thumbnail visual do áudio (apenas para preview)');
                  try {
                    const thumbnailBase64 = audioMsg.jpegThumbnail;
                    const thumbnailMimeType = 'image/jpeg'; // jpegThumbnail é sempre uma imagem JPEG
                    
                    let thumbnailDataUrl;
                    if (thumbnailBase64.startsWith('data:')) {
                      thumbnailDataUrl = thumbnailBase64;
                    } else {
                      const cleanBase64 = thumbnailBase64.replace(/^data:[^;]+;base64,/, '');
                      thumbnailDataUrl = `data:${thumbnailMimeType};base64,${cleanBase64}`;
                    }
                    
                    // TODO: Salvar thumbnail separadamente no MinIO para preview visual
                    console.log('🖼️ [AUDIO THUMBNAIL] Thumbnail processado (tamanho:', thumbnailBase64.length, 'bytes)');
                  } catch (error) {
                    console.log('❌ [AUDIO THUMBNAIL] Erro ao processar thumbnail:', error);
                  }
                }
              }
            }
          } else if (messageType === 'video') {
            console.log('🎬 [VIDEO DEBUG] Processing video message:', {
              messageId: message.key?.id,
              hasVideoMessage: !!message.message?.videoMessage,
              hasBase64: !!message.message?.base64
            });
            
            // PRIORIDADE 1: Usar campo base64 se disponível (dados já descriptografados)
            if (message.message?.base64) {
              console.log('✅ [VIDEO EXTRACTION] Usando dados base64 descriptografados');
              const base64Data = message.message.base64;
              const mimeType = message.message?.videoMessage?.mimetype || 'video/mp4';
              
              // Verificar se já é uma data URL
              if (base64Data.startsWith('data:')) {
                originalMediaUrl = base64Data;
              } else {
                // Criar data URL com os dados base64
                originalMediaUrl = `data:${mimeType};base64,${base64Data}`;
              }
              
              console.log('✅ [VIDEO EXTRACTION] Base64 processado:', {
                size: base64Data.length,
                mimeType
              });
            }
            // PRIORIDADE 2: Tentar URL direta (apenas se não for .enc)
            else {
              const videoMsg = message.message?.videoMessage;
              if (videoMsg) {
                console.log('🎬 [VIDEO EXTRACTION] Estrutura da mensagem de vídeo:', {
                  hasUrl: !!videoMsg.url,
                  url: videoMsg.url,
                  isEncrypted: videoMsg.url?.includes('.enc'),
                  hasMimetype: !!videoMsg.mimetype,
                  mimetype: videoMsg.mimetype,
                  hasJpegThumbnail: !!videoMsg.jpegThumbnail,
                  thumbnailLength: videoMsg.jpegThumbnail ? videoMsg.jpegThumbnail.length : 0,
                  duration: videoMsg.seconds
                });
                
                // Evitar URLs criptografadas (.enc) que causam corrupção
                if (videoMsg.url && this.isValidMediaUrl(videoMsg.url) && !videoMsg.url.includes('.enc')) {
                  originalMediaUrl = videoMsg.url;
                  console.log('✅ [VIDEO EXTRACTION] Usando URL direta não-criptografada:', originalMediaUrl);
                }
                // Para URLs criptografadas (.enc), buscar versão descriptografada via Evolution API
                else if (videoMsg.url && videoMsg.url.includes('.enc')) {
                  console.log('🔓 [VIDEO EXTRACTION] URL criptografada detectada - buscando versão descriptografada');
                  console.log('🔓 [VIDEO EXTRACTION] URL .enc:', videoMsg.url);
                  
                  try {
                    // Tentar obter vídeo descriptografado via Evolution API
                    const decryptedVideoUrl = await evolutionApi.fetchMediaUrl(instance, message.key?.id || '', message.key?.remoteJid || '', 'video');
                    
                    if (decryptedVideoUrl && (decryptedVideoUrl.startsWith('data:video/') || this.isValidMediaUrl(decryptedVideoUrl))) {
                      console.log('✅ [VIDEO EXTRACTION] Vídeo descriptografado obtido via Evolution API');
                      console.log('🎬 [VIDEO EXTRACTION] Formato:', decryptedVideoUrl.substring(0, 50) + '...');
                      originalMediaUrl = decryptedVideoUrl;
                    } else {
                      console.log('❌ [VIDEO EXTRACTION] Falha na descriptografia - usando URL .enc como fallback');
                      originalMediaUrl = videoMsg.url; // Fallback para URL .enc
                    }
                  } catch (error) {
                    console.error('❌ [VIDEO EXTRACTION] Erro ao descriptografar vídeo:', error);
                    originalMediaUrl = videoMsg.url; // Fallback para URL .enc
                  }
                }
                // Se não há URL, tentar buscar via Evolution API
                else {
                  console.log('⚠️ [VIDEO EXTRACTION] Nenhuma URL de vídeo encontrada - será buscada via Evolution API');
                  originalMediaUrl = null; // Forçar busca via Evolution API
                }
                
                // Processar jpegThumbnail separadamente apenas para preview visual
                if (videoMsg.jpegThumbnail) {
                  console.log('🖼️ [VIDEO THUMBNAIL] Processando thumbnail visual do vídeo (apenas para preview)');
                  try {
                    const thumbnailBase64 = videoMsg.jpegThumbnail;
                    const thumbnailMimeType = 'image/jpeg'; // jpegThumbnail é sempre uma imagem JPEG
                    
                    let thumbnailDataUrl;
                    if (thumbnailBase64.startsWith('data:')) {
                      thumbnailDataUrl = thumbnailBase64;
                    } else {
                      const cleanBase64 = thumbnailBase64.replace(/^data:[^;]+;base64,/, '');
                      thumbnailDataUrl = `data:${thumbnailMimeType};base64,${cleanBase64}`;
                    }
                    
                    // TODO: Salvar thumbnail separadamente no MinIO para preview visual
                    console.log('🖼️ [VIDEO THUMBNAIL] Thumbnail processado (tamanho:', thumbnailBase64.length, 'bytes)');
                  } catch (error) {
                    console.log('❌ [VIDEO THUMBNAIL] Erro ao processar thumbnail:', error);
                  }
                }
              }
            }
          } else {
            // Para outros tipos de mídia, usar método original
            originalMediaUrl = this.extractDirectMediaUrl(message.message, messageType || 'unknown');
          }
          
          // Se não temos URL válida, usar o conteúdo original como fallback
          if (!originalMediaUrl) {
            originalMediaUrl = messageContent;
          }
          
          // Placeholders para diferentes tipos de mídia
          const placeholders = {
            image: '[Imagem]',
            video: '[Vídeo]',
            audio: '[Áudio]',
            document: '[Documento]',
            sticker: '[Sticker]'
          };
          
          const placeholder = placeholders[messageType as keyof typeof placeholders] || '[Mídia]';
          
          // Se não temos URL válida, tentar obter da Evolution API
          // EXCEÇÃO: URLs .enc devem ser processadas diretamente para upload
          if (Object.values(placeholders).includes(originalMediaUrl) || (!this.isValidMediaUrl(originalMediaUrl) && !this.isEncryptedWhatsAppUrl(originalMediaUrl))) {
            console.log(`📎 [MEDIA PROCESSING] URL inválida, buscando via Evolution API...`);
            
            // Verificar se há URL direta na mensagem original (segunda tentativa)
            const directUrl = this.extractDirectMediaUrl(message.message, messageType || 'unknown');
            if (directUrl && directUrl !== originalMediaUrl) {
              originalMediaUrl = directUrl;
              console.log(`📎 [MEDIA PROCESSING] ✅ URL direta encontrada na segunda tentativa: ${directUrl}`);
            } else {
              // Buscar via Evolution API
              console.log(`📎 [EVOLUTION API] Iniciando busca de mídia via Evolution API:`, {
                messageId: message.key?.id || 'unknown',
                remoteJid: remoteJid || '',
                instance,
                messageType
              });
              
              try {
                const mediaUrl = await retryService.executeWithRetry(
                  async () => {
                    const url = await evolutionApi.fetchMediaUrl(instance, message.key?.id || '', remoteJid || '', messageType);
                    
                    if (!url) {
                      throw new Error('MEDIA_UNAVAILABLE: URL da mídia não disponível no momento');
                    }
                    
                    return url;
                  },
                  'evolution_media',
                  `fetch_media_${message.key?.id || 'unknown'}`
                );
                
                console.log(`📎 [EVOLUTION API] Resposta da Evolution API:`, {
                  messageId: message.key?.id || 'unknown',
                  mediaUrl,
                  isValidUrl: mediaUrl ? this.isValidMediaUrl(mediaUrl) : false,
                  urlType: mediaUrl ? (mediaUrl.startsWith('data:') ? 'base64' : 'http') : 'null'
                });
                
                if (mediaUrl) {
                  originalMediaUrl = mediaUrl;
                  console.log(`📎 [MEDIA PROCESSING] ✅ URL obtida via Evolution API: ${mediaUrl.substring(0, 100)}...`);
                } else {
                  console.log(`📎 [MEDIA PROCESSING] ❌ Não foi possível obter URL da mídia:`, {
                    messageId: message.key?.id || 'unknown',
                    reason: 'Evolution API retornou null/undefined'
                  });
                  messageContent = placeholder;
                }
              } catch (error) {
                console.error(`📎 [MEDIA PROCESSING] ❌ Erro ao buscar mídia via Evolution API:`, {
                  messageId: message.key?.id || 'unknown',
                  error: error instanceof Error ? error.message : error,
                  stack: error instanceof Error ? error.stack : undefined
                });
                messageContent = placeholder;
              }
            }
          }
          
          // Verificar se a URL é criptografada (.enc) e tentar descriptografar
          if (originalMediaUrl && this.isEncryptedWhatsAppUrl(originalMediaUrl)) {
            console.log(`🔓 [DECRYPT] URL criptografada detectada: ${originalMediaUrl}`);
            
            try {
              const decryptedUrl = await this.getDecryptedMediaUrl(instance, message.key?.id || '', message.key?.remoteJid || '');
              if (decryptedUrl) {
                originalMediaUrl = decryptedUrl;
                console.log(`🔓 [DECRYPT] ✅ URL descriptografada obtida: ${decryptedUrl}`);
              } else {
                console.log(`🔓 [DECRYPT] ❌ Descriptografia falhou, implementando estratégia de fallback`);
                
                // Estratégia de fallback: tentar usar a URL original mesmo sendo .enc
                // Alguns clientes podem conseguir processar URLs .enc diretamente
                console.log(`🔄 [FALLBACK] Tentando usar URL .enc original como fallback`);
                console.log(`🔄 [FALLBACK] URL: ${originalMediaUrl}`);
                
                // Marcar que esta é uma URL criptografada para tratamento especial no frontend
                console.log(`⚠️ [FALLBACK] URL permanece criptografada - frontend deve tratar adequadamente`);
              }
            } catch (error) {
              console.error(`🔓 [DECRYPT] ❌ Erro na descriptografia:`, error);
              console.log(`🔄 [FALLBACK] Usando URL original devido ao erro na descriptografia`);
            }
          }
          
          // Se temos uma URL válida, fazer upload para o MinIO
          console.log(`🔍 [DEBUG UPLOAD] Verificando condições para upload:`);
          console.log(`🔍 [DEBUG UPLOAD] originalMediaUrl: ${originalMediaUrl}`);
          console.log(`🔍 [DEBUG UPLOAD] isValidMediaUrl: ${this.isValidMediaUrl(originalMediaUrl)}`);
          console.log(`🔍 [DEBUG UPLOAD] isEncrypted: ${this.isEncryptedWhatsAppUrl(originalMediaUrl)}`);
          console.log(`🔍 [DEBUG UPLOAD] placeholders: ${JSON.stringify(Object.values(placeholders))}`);
          console.log(`🔍 [DEBUG UPLOAD] isPlaceholder: ${Object.values(placeholders).includes(originalMediaUrl)}`);
          
          // Gerar um ticketId temporário para processamento de mídia
          // O ticket será criado/atualizado apenas uma vez no final do processamento
          const ticketId = `temp_${remoteJid?.replace('@s.whatsapp.net', '') || 'unknown'}_${Date.now()}`;
          console.log(`🎫 [TICKET] Usando ticketId temporário: ${ticketId}`);
          
          if (originalMediaUrl && (this.isValidMediaUrl(originalMediaUrl) || this.isEncryptedWhatsAppUrl(originalMediaUrl)) && !Object.values(placeholders).includes(originalMediaUrl)) {
            try {
              console.log(`📤 [MINIO UPLOAD] Iniciando upload para MinIO...`);
              
              // Extrair informações da mensagem
              const fileName = message.message?.[`${messageType}Message`]?.fileName || undefined;
              const mimeType = message.message?.[`${messageType}Message`]?.mimetype || undefined;
              
              // Fazer upload para o MinIO com retry usando o ticketId correto
              const uploadResult = await retryService.executeWithRetry(
                () => this.processMediaWithMinIO(
                  originalMediaUrl,
                  message.key?.id || '',
                  ticketId, // usando ticketId correto
                  messageType,
                  fileName,
                  mimeType
                ),
                'minio_upload',
                `upload_media_${message.key?.id || 'unknown'}`
              );
              
              if (uploadResult.success && uploadResult.url) {
                messageContent = uploadResult.url;
                console.log(`📤 [MINIO UPLOAD] ✅ Upload concluído: ${uploadResult.url}`);
                
                // Cache a URL permanente
                cacheService.setMediaUrl(message.key?.id || '', uploadResult.url);
              } else {
                console.error(`📤 [MINIO UPLOAD] ❌ Falha no upload:`, uploadResult.error);
                // Usar URL original como fallback
                messageContent = originalMediaUrl;
                cacheService.setMediaUrl(message.key?.id || '', originalMediaUrl);
              }
            } catch (error) {
              console.error(`📤 [MINIO UPLOAD] ❌ Erro no processo de upload:`, error);
              // Usar URL original como fallback
              messageContent = originalMediaUrl;
              cacheService.setMediaUrl(message.key?.id || '', originalMediaUrl);
            }
          } else {
            // Se não há URL válida, usar a URL original ou placeholder
            messageContent = originalMediaUrl || placeholder;
            if (originalMediaUrl) {
              cacheService.setMediaUrl(message.key?.id || '', originalMediaUrl);
            }
          }
        }
      }
      
      console.log(`📝 Converted message - Type: ${messageType}, Content: ${messageContent}`);
      
      if (messageType === 'image') {
        console.log('🖼️ [IMAGE DEBUG] Final image content to be saved:', messageContent);
        console.log('🖼️ [IMAGE DEBUG] Content is valid URL:', messageContent.startsWith('http') || messageContent.startsWith('data:'));
      }
       
      console.log(`📨 Message from ${remoteJid} (${messageType}): ${messageContent}`);
      
      // Verificar se a mensagem já foi processada para evitar duplicação
      const messageId = message.key?.id || '';
      const cacheKey = `processed_message_${messageId}`;
      
      if (cacheService && await cacheService.get(cacheKey)) {
        console.log(`📝 Mensagem ${messageId} já foi processada, ignorando duplicata`);
        return;
      }
      
      // Salvar mensagem no Firebase com retry inteligente
      await retryService.executeWithRetry(
        () => firebaseService.saveMessage({
          remoteJid: remoteJid || '',
          messageId: messageId,
          content: messageContent,
          sender: isFromMe ? 'agent' : 'client',
          status: 'sent',
          type: messageType as 'text' | 'audio' | 'video' | 'image' | 'document' | 'sticker' | 'note',
          messageType: messageType, // Adicionar campo messageType explicitamente
          instanceName: instance,
          isFromMe,
          pushName: pushName || '',
          timestamp: Timestamp.now()
        }),
        'firebase',
        `save_message_${messageId}`
      );
      
      // Marcar mensagem como processada (TTL: 1 hora)
      if (cacheService) {
        await cacheService.set(cacheKey, true, 3600);
      }
      
      // Criar/atualizar ticket se a mensagem não for nossa
      if (!isFromMe) {
        
        // Buscar avatar do contato com retry
        let avatarUrl = null;
        try {
          avatarUrl = await retryService.executeWithRetry(
            () => evolutionApi.fetchProfilePictureUrl(instance, phoneNumber),
            'evolution_api',
            `fetch_avatar_${phoneNumber}`
          );
          console.log(`Avatar fetched for ${phoneNumber}:`, avatarUrl);
        } catch (error) {
          console.error('Error fetching avatar for', phoneNumber, error);
        }
        
        // Salvar/atualizar ticket com retry e fallback
        const clientData: any = {
          name: pushName,
          phone: phoneNumber,
          subject: 'Conversa WhatsApp'
        };
        
        // Só adicionar avatar se não for undefined
        if (avatarUrl) {
          clientData.avatar = avatarUrl;
        }
        
        // Atualizar o ticket com a mensagem final processada
        await retryService.executeWithFallback(
          // Operação primária
          () => firebaseService.saveOrUpdateTicket({
            remoteJid,
            instanceName: instance,
            client: clientData,
            status: 'open',
            lastMessage: messageContent,
            unreadCount: 1,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          }),
          // Operação de fallback (sem avatar)
          () => firebaseService.saveOrUpdateTicket({
            remoteJid: remoteJid || '',
            instanceName: instance,
            client: {
              name: pushName || '',
              phone: phoneNumber,
              subject: 'Conversa WhatsApp'
            },
            status: 'open',
            lastMessage: messageContent,
            unreadCount: 1,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          }),
          'firebase',
          `update_ticket_final_${remoteJid || 'unknown'}`
        );
      }
      
      console.log(`Message saved to Firebase: ${messageContent}`);
      
    } catch (error) {
      console.error('Error handling new message:', error);
      throw error; // Re-throw for queue retry mechanism
    }
  }

  static async handleMessageUpdate(instance: string, data: any) {
    try {
      console.log(`Message update for instance ${instance}:`, data);
      // Handle message status updates (sent, delivered, read, etc.)
      
      const message = data;
      const messageId = message.key?.id;
      const remoteJid = message.key?.remoteJid;
      
      if (messageId && remoteJid) {
        // Update message status in Firebase if needed
        // This could include delivery receipts, read receipts, etc.
        console.log(`Updating message ${messageId} status`);
      }
      
    } catch (error) {
      console.error('Error handling message update:', error);
      throw error;
    }
  }

  static async handleConnectionUpdate(instance: string, data: any) {
    try {
      console.log(`Connection update for instance ${instance}:`, data);
      
      // Handle connection status changes
      const state = data.state;
      
      if (state) {
        // Update instance connection status in Firebase com retry
        await retryService.executeWithRetry(
          () => firebaseService.updateInstanceConnection({
            instanceName: instance,
            connectionState: state,
            lastUpdate: new Date()
          }),
          'firebase',
          `update_connection_${instance}`
        );
        console.log(`Instance ${instance} connection state updated to: ${state}`);
      }
      
    } catch (error) {
      console.error('Error handling connection update:', error);
      throw error;
    }
  }

  static async handlePresenceUpdate(instance: string, data: any) {
    try {
      console.log(`Presence update for instance ${instance}:`, data);
      
      // Handle user presence updates (online, offline, typing, etc.)
      const remoteJid = data.id;
      const presences = data.presences;
      
      if (remoteJid && presences) {
        // Update user presence status
        // This could be used for showing "online", "typing", etc. indicators
        console.log(`Presence update for ${remoteJid}:`, presences);
      }
      
    } catch (error) {
      console.error('Error handling presence update:', error);
      throw error;
    }
  }

  // Main handler dispatcher
  static async processWebhookEvent(event: string, instance: string, data: any) {
    console.log(`Processing webhook event: ${event} for instance: ${instance}`);
    
    switch (event) {
      case 'messages.upsert':
        await this.handleNewMessage(instance, data);
        break;
      case 'messages.update':
        await this.handleMessageUpdate(instance, data);
        break;
      case 'connection.update':
        await this.handleConnectionUpdate(instance, data);
        break;
      case 'presence.update':
        await this.handlePresenceUpdate(instance, data);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
        // Don't throw error for unknown events, just log them
    }
  }
}