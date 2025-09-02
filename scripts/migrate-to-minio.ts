import { MinIOService } from '../src/services/minio-service';
import { MediaIntegrationService } from '../src/services/media-integration-service';
import { firebaseService } from '../src/services/firebase-service';
import { AdvancedFileValidator } from '../src/services/advanced-file-validator';

interface MigrationStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ messageId: string; error: string }>;
}

interface MessageWithMedia {
  id: string;
  ticketId: string;
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  storage?: string;
  [key: string]: any;
}

export class MigrationScript {
  private minioService: MinIOService;
  private integrationService: MediaIntegrationService;
  private batchSize: number;
  private stats: MigrationStats;

  constructor(batchSize: number = 50) {
    this.minioService = new MinIOService();
    this.integrationService = new MediaIntegrationService();
    this.batchSize = batchSize;
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  async migrateAllFiles(): Promise<MigrationStats> {
    console.log('🚀 Iniciando migração de arquivos do Firebase Storage para MinIO...');
    console.log(`📦 Tamanho do lote: ${this.batchSize}`);
    
    try {
      // Buscar todas as mensagens com arquivos
      const messages = await this.getAllMessagesWithMedia();
      this.stats.total = messages.length;
      
      console.log(`📊 Encontradas ${messages.length} mensagens com mídia`);
      
      if (messages.length === 0) {
        console.log('✅ Nenhum arquivo para migrar');
        return this.stats;
      }

      // Processar em lotes
      const totalBatches = Math.ceil(messages.length / this.batchSize);
      
      for (let i = 0; i < messages.length; i += this.batchSize) {
        const batch = messages.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        
        console.log(`\n📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} arquivos)...`);
        await this.processBatch(batch, batchNumber);
        
        // Pequena pausa entre lotes para não sobrecarregar
        await this.sleep(1000);
      }

      console.log('\n🎉 Migração concluída!');
      this.printStats();
      
      return this.stats;
    } catch (error) {
      console.error('❌ Erro durante a migração:', error);
      throw error;
    }
  }

  private async processBatch(messages: MessageWithMedia[], batchNumber: number): Promise<void> {
    const promises = messages.map(async (message) => {
      try {
        const result = await this.migrateFile(message);
        if (result.success) {
          this.stats.successful++;
          console.log(`  ✅ ${message.id}: ${result.message}`);
        } else {
          this.stats.skipped++;
          console.log(`  ⏭️  ${message.id}: ${result.message}`);
        }
      } catch (error) {
        this.stats.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.stats.errors.push({ messageId: message.id, error: errorMessage });
        console.error(`  ❌ ${message.id}: ${errorMessage}`);
      }
    });

    await Promise.allSettled(promises);
    
    const batchStats = {
      successful: this.stats.successful,
      failed: this.stats.failed,
      skipped: this.stats.skipped
    };
    
    console.log(`📊 Lote ${batchNumber} concluído: ✅ ${batchStats.successful} | ❌ ${batchStats.failed} | ⏭️ ${batchStats.skipped}`);
  }

  private async migrateFile(message: MessageWithMedia): Promise<{ success: boolean; message: string }> {
    // Verificar se já foi migrado
    if (message.storage === 'minio') {
      return { success: false, message: 'Já migrado para MinIO' };
    }

    // Verificar se tem URL de mídia
    if (!message.mediaUrl) {
      return { success: false, message: 'Sem URL de mídia' };
    }

    // Verificar se é URL do Firebase Storage
    if (!message.mediaUrl.includes('firebasestorage.googleapis.com')) {
      return { success: false, message: 'URL não é do Firebase Storage' };
    }

    try {
      // Download do Firebase Storage
      console.log(`    📥 Baixando: ${message.mediaUrl}`);
      const fileBuffer = await this.downloadFromFirebase(message.mediaUrl);
      
      // Determinar nome e tipo do arquivo
      const fileName = message.fileName || this.extractFileNameFromUrl(message.mediaUrl) || `migrated_${message.id}`;
      const mimeType = message.mimeType || this.guessMimeTypeFromUrl(message.mediaUrl) || 'application/octet-stream';
      
      // Validar arquivo
      const validation = await AdvancedFileValidator.validateFile(fileBuffer, fileName, mimeType);
      if (!validation.isValid) {
        throw new Error(`Arquivo inválido: ${validation.error}`);
      }

      // Upload para MinIO
      console.log(`    📤 Enviando para MinIO: ${fileName}`);
      const uploadResult = await this.minioService.uploadFile(
        fileBuffer,
        validation.normalizedName!,
        validation.detectedMimeType!,
        {
          'Original-Firebase-URL': message.mediaUrl,
          'Migration-Date': new Date().toISOString(),
          'Message-Id': message.id,
          'Ticket-Id': message.ticketId
        }
      );

      // Atualizar referência no Firestore
      console.log(`    💾 Atualizando Firestore...`);
      await this.updateMessageReference(message.id, message.ticketId, {
        mediaUrl: uploadResult.url,
        storage: 'minio',
        migratedAt: new Date(),
        originalFirebaseUrl: message.mediaUrl,
        mediaMetadata: {
          fileName: validation.normalizedName,
          originalName: fileName,
          mimeType: validation.detectedMimeType,
          size: fileBuffer.length,
          storage: 'minio',
          uploadedAt: new Date(),
          category: this.getCategoryFromMimeType(validation.detectedMimeType!),
          checksum: validation.checksum,
          uploadedBy: 'migration-script'
        }
      });

      return { 
        success: true, 
        message: `Migrado com sucesso (${this.formatBytes(fileBuffer.length)})` 
      };
    } catch (error) {
      throw new Error(`Erro na migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async downloadFromFirebase(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao baixar arquivo: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async updateMessageReference(messageId: string, ticketId: string, updateData: any): Promise<void> {
    await firebaseService.updateDocument(`tickets/${ticketId}/messages`, messageId, updateData);
    
    // Log de auditoria
    await firebaseService.addDocument('migration_logs', {
      messageId,
      ticketId,
      action: 'migrate_to_minio',
      timestamp: new Date(),
      newUrl: updateData.mediaUrl,
      originalUrl: updateData.originalFirebaseUrl
    });
  }

  private async getAllMessagesWithMedia(): Promise<MessageWithMedia[]> {
    const allMessages: MessageWithMedia[] = [];
    
    try {
      // Buscar todos os tickets
      const tickets = await firebaseService.queryDocuments('tickets', {});
      console.log(`🎫 Encontrados ${tickets.length} tickets`);
      
      for (const ticket of tickets) {
        try {
          // Buscar mensagens com mídia do ticket
          const messages = await firebaseService.queryDocuments(
            `tickets/${ticket.id}/messages`,
            {
              where: [['mediaUrl', '!=', null]]
            }
          );
          
          // Adicionar ticketId às mensagens
          const messagesWithTicket = messages.map(msg => ({
            ...msg,
            ticketId: ticket.id
          }));
          
          allMessages.push(...messagesWithTicket);
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar mensagens do ticket ${ticket.id}:`, error);
        }
      }
      
      return allMessages;
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      throw error;
    }
  }

  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return fileName && fileName !== '' ? decodeURIComponent(fileName) : null;
    } catch {
      return null;
    }
  }

  private guessMimeTypeFromUrl(url: string): string | null {
    const fileName = this.extractFileNameFromUrl(url);
    if (!fileName) return null;
    
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.xml': 'application/xml',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/mov'
    };
    
    return mimeMap[extension] || null;
  }

  private getCategoryFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType === 'application/pdf') return 'documents/pdf';
    if (mimeType === 'application/xml' || mimeType === 'text/xml') return 'documents/xml';
    return 'documents';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printStats(): void {
    console.log('\n📊 ESTATÍSTICAS DA MIGRAÇÃO:');
    console.log(`   📁 Total de arquivos: ${this.stats.total}`);
    console.log(`   ✅ Migrados com sucesso: ${this.stats.successful}`);
    console.log(`   ⏭️  Ignorados: ${this.stats.skipped}`);
    console.log(`   ❌ Falharam: ${this.stats.failed}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERROS DETALHADOS:');
      this.stats.errors.forEach(({ messageId, error }) => {
        console.log(`   ${messageId}: ${error}`);
      });
    }
    
    const successRate = this.stats.total > 0 ? (this.stats.successful / this.stats.total * 100).toFixed(1) : '0';
    console.log(`\n🎯 Taxa de sucesso: ${successRate}%`);
  }
}

// Função para executar a migração
export async function runMigration(batchSize: number = 50): Promise<MigrationStats> {
  const migration = new MigrationScript(batchSize);
  return await migration.migrateAllFiles();
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then((stats) => {
      console.log('\n🎉 Migração finalizada!');
      process.exit(stats.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal na migração:', error);
      process.exit(1);
    });
}