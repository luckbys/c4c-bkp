import { getMinIOService } from './minio-service';
import { AdvancedFileValidator, ValidationResult } from './advanced-file-validator';
import { firebaseService } from './firebase-service';
import { Timestamp } from 'firebase/firestore';

export interface MediaMetadata {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  storage: 'minio' | 'firebase';
  uploadedAt: Timestamp;
  category: string;
  checksum?: string;
  objectName?: string;
  uploadedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  checksum?: string;
  error?: string;
}

export interface MediaInfo {
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Timestamp;
  category: string;
  checksum?: string;
}

export class MediaIntegrationService {
  private minioService = getMinIOService();

  async uploadAndSaveReference(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    messageId: string,
    ticketId: string,
    additionalMetadata?: Partial<MediaMetadata>
  ): Promise<UploadResult> {
    try {
      // Validar arquivo
      const validation = await AdvancedFileValidator.validateFile(buffer, fileName, mimeType);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Upload para MinIO
      // Converter metadados para strings
      const stringMetadata: Record<string, string> = {};
      if (additionalMetadata) {
        for (const [key, value] of Object.entries(additionalMetadata)) {
          stringMetadata[key] = String(value);
        }
      }

      const uploadResult = await this.minioService.uploadFile(
        buffer,
        validation.normalizedName!,
        validation.detectedMimeType!,
        {
          'Original-Name': fileName,
          'Message-Id': messageId,
          'Ticket-Id': ticketId,
          ...stringMetadata
        }
      );

      // Preparar metadados
      const mediaMetadata: MediaMetadata = {
        fileName: validation.normalizedName!,
        originalName: fileName,
        mimeType: validation.detectedMimeType!,
        size: validation.size!,
        storage: 'minio',
        uploadedAt: Timestamp.now(),
        category: validation.category!,
        checksum: validation.checksum,
        objectName: uploadResult.objectName
      };

      // Salvar referência no Firebase
      await this.saveFileReference(messageId, ticketId, {
        ...mediaMetadata,
        url: uploadResult.url
      });

      return {
        success: true,
        url: uploadResult.url,
        fileName: validation.normalizedName,
        size: validation.size,
        checksum: validation.checksum
      };
    } catch (error) {
      console.error('Erro no upload e integração:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno no upload'
      };
    }
  }

  private async saveFileReference(
    messageId: string,
    ticketId: string,
    fileData: MediaMetadata & { url: string }
  ): Promise<void> {
    try {
      // Verificar se a mensagem existe, se não, criar uma nova
      try {
        await firebaseService.getDocument(`tickets/${ticketId}/messages`, messageId);
        // Se chegou aqui, a mensagem existe, então atualizar
        await firebaseService.updateDocument(`tickets/${ticketId}/messages`, messageId, {
          mediaUrl: fileData.url,
          mediaMetadata: fileData,
          updatedAt: Timestamp.now()
        });
      } catch (error: any) {
        if (error.code === 'not-found') {
          // Mensagem não existe, criar uma nova
          console.log(`Criando nova mensagem ${messageId} para o arquivo ${fileData.fileName}`);
          await firebaseService.addDocument(`tickets/${ticketId}/messages`, {
            id: messageId,
            messageId: messageId,
            content: `📎 ${fileData.fileName}`,
            sender: 'agent',
            timestamp: Timestamp.now(),
            status: 'sent',
            type: 'media',
            isFromMe: true,
            pushName: 'Agente',
            remoteJid: '', // Será preenchido pelo contexto
            instanceName: '', // Será preenchido pelo contexto
            mediaUrl: fileData.url,
            mediaMetadata: fileData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          }, messageId);
        } else {
          throw error;
        }
      }

      // Log para auditoria
      await firebaseService.addDocument('media_uploads', {
        messageId,
        ticketId,
        ...fileData,
        auditTimestamp: Timestamp.now()
      });

      console.log(`Arquivo salvo com sucesso: ${fileData.fileName} para mensagem ${messageId}`);
    } catch (error) {
      console.error('Erro ao salvar referência do arquivo:', error);
      throw error;
    }
  }

  async getMediaInfo(messageId: string, ticketId?: string): Promise<MediaInfo | null> {
    try {
      let message;
      
      if (ticketId) {
        message = await firebaseService.getDocument(`tickets/${ticketId}/messages`, messageId);
      } else {
        // Buscar em todas as mensagens (menos eficiente, usar apenas se necessário)
        const messagesQuery = await firebaseService.queryDocuments('messages', {
          where: [['id', '==', messageId]],
          limit: 1
        });
        message = messagesQuery[0];
      }

      if (!message?.mediaUrl || !message?.mediaMetadata) {
        return null;
      }

      return {
        url: message.mediaUrl,
        fileName: message.mediaMetadata.fileName,
        originalName: message.mediaMetadata.originalName,
        mimeType: message.mediaMetadata.mimeType,
        size: message.mediaMetadata.size,
        uploadedAt: message.mediaMetadata.uploadedAt,
        category: message.mediaMetadata.category,
        checksum: message.mediaMetadata.checksum
      };
    } catch (error) {
      console.error('Erro ao buscar informações da mídia:', error);
      return null;
    }
  }

  async deleteMedia(messageId: string, ticketId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const mediaInfo = await this.getMediaInfo(messageId, ticketId);
      if (!mediaInfo) {
        return { success: false, error: 'Arquivo não encontrado' };
      }

      // Extrair objectName da URL
      const url = new URL(mediaInfo.url);
      const objectName = url.pathname.substring(url.pathname.indexOf('/', 1) + 1);

      // Deletar do MinIO
      await this.minioService.deleteFile(objectName);

      // Remover referência do Firebase
      await firebaseService.updateDocument(`tickets/${ticketId}/messages`, messageId, {
        mediaUrl: null,
        mediaMetadata: null,
        updatedAt: Timestamp.now()
      });

      // Log de auditoria
      await firebaseService.addDocument('media_deletions', {
        messageId,
        ticketId,
        deletedAt: Timestamp.now(),
        originalFileName: mediaInfo.fileName,
        objectName
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar mídia:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno'
      };
    }
  }

  async generateDownloadUrl(messageId: string, ticketId: string, expiry: number = 3600): Promise<string | null> {
    try {
      const mediaInfo = await this.getMediaInfo(messageId, ticketId);
      if (!mediaInfo) {
        return null;
      }

      // Extrair objectName da URL
      const url = new URL(mediaInfo.url);
      const objectName = url.pathname.substring(url.pathname.indexOf('/', 1) + 1);

      // Gerar URL presignada
      return await this.minioService.generatePresignedUrl(objectName, expiry);
    } catch (error) {
      console.error('Erro ao gerar URL de download:', error);
      return null;
    }
  }

  async getMediaStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
    byStorage: Record<string, { count: number; size: number }>;
  }> {
    try {
      // Buscar estatísticas do MinIO
      const minioStats = { totalObjects: 0, totalSize: 0, categories: {} };

      // Buscar estatísticas do Firebase (arquivos ainda não migrados)
      const firebaseFiles = await firebaseService.queryDocuments('media_uploads', {
        where: [['storage', '==', 'firebase']]
      });

      const firebaseStats = firebaseFiles.reduce(
        (acc, file) => {
          acc.count++;
          acc.size += file.size || 0;
          return acc;
        },
        { count: 0, size: 0 }
      );

      return {
        totalFiles: minioStats.totalObjects + firebaseStats.count,
        totalSize: minioStats.totalSize + firebaseStats.size,
        byCategory: minioStats.categories,
        byStorage: {
          minio: { count: minioStats.totalObjects, size: minioStats.totalSize },
          firebase: firebaseStats
        }
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de mídia:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byCategory: {},
        byStorage: { minio: { count: 0, size: 0 }, firebase: { count: 0, size: 0 } }
      };
    }
  }

  async validateAndPreprocess(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ValidationResult> {
    return await AdvancedFileValidator.validateFile(buffer, fileName, mimeType);
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const isConnected = await this.minioService.testConnection();
      return { success: isConnected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido na conexão'
      };
    }
  }
}

// Singleton instance
let mediaIntegrationServiceInstance: MediaIntegrationService | null = null;

export function getMediaIntegrationService(): MediaIntegrationService {
  if (!mediaIntegrationServiceInstance) {
    mediaIntegrationServiceInstance = new MediaIntegrationService();
  }
  return mediaIntegrationServiceInstance;
}