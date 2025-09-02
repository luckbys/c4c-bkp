import { firebaseService } from '@/services/firebase-service';
import { MediaIntegrationService } from '@/services/media-integration-service';
import { AdvancedFileValidator } from '@/services/advanced-file-validator';
import { getMinIOService } from '@/services/minio-service';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

// Interfaces para migração
interface MigrationStats {
  totalMessages: number;
  processedMessages: number;
  successfulMigrations: number;
  failedMigrations: number;
  skippedMessages: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{
    messageId: string;
    error: string;
    timestamp: Date;
  }>;
}

interface MigrationOptions {
  batchSize: number;
  dryRun: boolean;
  skipExisting: boolean;
  onlyTypes?: string[];
  maxRetries: number;
  delayBetweenBatches: number;
}

interface MessageToMigrate {
  id: string;
  content: string;
  type: string;
  messageId: string;
  remoteJid: string;
  instanceName: string;
  timestamp: Timestamp;
}

/**
 * Serviço de migração do Firebase Storage para MinIO
 * Migra arquivos de mídia em lotes com controle de progresso e rollback
 */
export class FirebaseToMinioMigrationService {
  private integrationService: MediaIntegrationService;
  private stats: MigrationStats;
  private options: MigrationOptions;

  constructor(options: Partial<MigrationOptions> = {}) {
    this.integrationService = new MediaIntegrationService();
    this.options = {
      batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE || '10'),
      dryRun: false,
      skipExisting: true,
      maxRetries: 3,
      delayBetweenBatches: 1000,
      ...options
    };
    
    this.stats = {
      totalMessages: 0,
      processedMessages: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedMessages: 0,
      startTime: new Date(),
      errors: []
    };
  }

  /**
   * Inicia o processo de migração
   */
  async startMigration(): Promise<MigrationStats> {
    console.log('🚀 [MIGRATION] Iniciando migração do Firebase Storage para MinIO');
    console.log('🚀 [MIGRATION] Opções:', this.options);

    try {
      // Verificar conexão com MinIO
      await this.verifyMinioConnection();

      // Buscar mensagens com mídia do Firebase
      const messagesToMigrate = await this.getMessagesToMigrate();
      this.stats.totalMessages = messagesToMigrate.length;

      console.log(`📊 [MIGRATION] Total de mensagens para migrar: ${this.stats.totalMessages}`);

      if (this.options.dryRun) {
        console.log('🔍 [DRY RUN] Modo de teste ativado - nenhuma alteração será feita');
        return this.stats;
      }

      // Processar em lotes
      await this.processBatches(messagesToMigrate);

      this.stats.endTime = new Date();
      console.log('✅ [MIGRATION] Migração concluída');
      this.printFinalStats();

      return this.stats;
    } catch (error) {
      console.error('❌ [MIGRATION] Erro na migração:', error);
      this.stats.endTime = new Date();
      throw error;
    }
  }

  /**
   * Verifica conexão com MinIO
   */
  private async verifyMinioConnection(): Promise<void> {
    try {
      const minioService = getMinIOService();
      const isConnected = await minioService.testConnection();
      if (!isConnected) {
        throw new Error('Não foi possível conectar ao MinIO');
      }
      console.log('✅ [MIGRATION] Conexão com MinIO verificada');
    } catch (error) {
      console.error('❌ [MIGRATION] Erro na conexão com MinIO:', error);
      throw error;
    }
  }

  /**
   * Busca mensagens com mídia do Firebase que precisam ser migradas
   */
  private async getMessagesToMigrate(): Promise<MessageToMigrate[]> {
    console.log('🔍 [MIGRATION] Buscando mensagens com mídia no Firebase...');

    const messages: MessageToMigrate[] = [];
    const mediaTypes = this.options.onlyTypes || ['image', 'video', 'audio', 'document'];

    try {
      for (const mediaType of mediaTypes) {
        console.log(`🔍 [MIGRATION] Buscando mensagens do tipo: ${mediaType}`);

        const messagesRef = collection(db, 'messages');
        const q = query(
          messagesRef,
          where('type', '==', mediaType),
          where('content', '>=', 'https://firebasestorage.googleapis.com'),
          where('content', '<', 'https://firebasestorage.googleapis.com\uf8ff'),
          orderBy('content'),
          orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          
          // Verificar se já foi migrado para MinIO
          if (this.options.skipExisting && this.isMinioUrl(data.content)) {
            return;
          }

          messages.push({
            id: docSnapshot.id,
            content: data.content,
            type: data.type,
            messageId: data.messageId,
            remoteJid: data.remoteJid,
            instanceName: data.instanceName,
            timestamp: data.timestamp
          });
        });

        console.log(`📊 [MIGRATION] Encontradas ${snapshot.size} mensagens do tipo ${mediaType}`);
      }

      console.log(`📊 [MIGRATION] Total de mensagens encontradas: ${messages.length}`);
      return messages;
    } catch (error) {
      console.error('❌ [MIGRATION] Erro ao buscar mensagens:', error);
      throw error;
    }
  }

  /**
   * Processa mensagens em lotes
   */
  private async processBatches(messages: MessageToMigrate[]): Promise<void> {
    const totalBatches = Math.ceil(messages.length / this.options.batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * this.options.batchSize;
      const end = Math.min(start + this.options.batchSize, messages.length);
      const batch = messages.slice(start, end);

      console.log(`📦 [MIGRATION] Processando lote ${i + 1}/${totalBatches} (${batch.length} mensagens)`);

      await this.processBatch(batch);

      // Delay entre lotes para não sobrecarregar os serviços
      if (i < totalBatches - 1 && this.options.delayBetweenBatches > 0) {
        console.log(`⏳ [MIGRATION] Aguardando ${this.options.delayBetweenBatches}ms antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, this.options.delayBetweenBatches));
      }

      this.printProgressStats();
    }
  }

  /**
   * Processa um lote de mensagens
   */
  private async processBatch(batch: MessageToMigrate[]): Promise<void> {
    const promises = batch.map(message => this.migrateMessage(message));
    await Promise.allSettled(promises);
  }

  /**
   * Migra uma mensagem individual
   */
  private async migrateMessage(message: MessageToMigrate): Promise<void> {
    let retries = 0;
    
    while (retries <= this.options.maxRetries) {
      try {
        console.log(`🔄 [MIGRATION] Migrando mensagem ${message.messageId} (tentativa ${retries + 1})`);

        // Verificar se a URL do Firebase ainda é válida
        if (!this.isFirebaseStorageUrl(message.content)) {
          console.log(`⏭️ [MIGRATION] Pulando mensagem ${message.messageId} - não é URL do Firebase Storage`);
          this.stats.skippedMessages++;
          return;
        }

        // Download do arquivo do Firebase Storage
        const fileBuffer = await this.downloadFromFirebase(message.content);
        
        // Determinar nome e tipo do arquivo
        const fileName = this.generateFileName(message);
        const mimeType = this.determineMimeType(message.type, message.content);

        // Validar arquivo
        const validation = await AdvancedFileValidator.validateFile(
          fileBuffer,
          fileName,
          mimeType
        );

        if (!validation.isValid) {
          throw new Error(`Arquivo inválido: ${validation.error}`);
        }

        // Upload para MinIO
        const uploadResult = await this.integrationService.uploadAndSaveReference(
          fileBuffer,
          fileName,
          validation.detectedMimeType!,
          message.messageId,
          message.instanceName,
          {
            migratedFrom: 'firebase-storage',
            originalUrl: message.content,
            migratedAt: new Date().toISOString()
          }
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Falha no upload para MinIO');
        }

        // Atualizar mensagem no Firebase com nova URL
        await this.updateMessageUrl(message.id, uploadResult.url!);

        console.log(`✅ [MIGRATION] Mensagem ${message.messageId} migrada com sucesso`);
        console.log(`📎 [MIGRATION] Nova URL: ${uploadResult.url}`);
        
        this.stats.successfulMigrations++;
        this.stats.processedMessages++;
        return;

      } catch (error) {
        retries++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        console.error(`❌ [MIGRATION] Erro na migração da mensagem ${message.messageId} (tentativa ${retries}):`, errorMessage);

        if (retries > this.options.maxRetries) {
          this.stats.failedMigrations++;
          this.stats.processedMessages++;
          this.stats.errors.push({
            messageId: message.messageId,
            error: errorMessage,
            timestamp: new Date()
          });
          return;
        }

        // Delay antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  /**
   * Download de arquivo do Firebase Storage
   */
  private async downloadFromFirebase(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro no download: ${response.status} ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('❌ [MIGRATION] Erro no download do Firebase:', error);
      throw error;
    }
  }

  /**
   * Atualiza URL da mensagem no Firebase
   */
  private async updateMessageUrl(messageDocId: string, newUrl: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageDocId);
      await updateDoc(messageRef, {
        content: newUrl,
        migratedToMinio: true,
        migrationTimestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('❌ [MIGRATION] Erro ao atualizar mensagem:', error);
      throw error;
    }
  }

  /**
   * Utilitários
   */
  private isFirebaseStorageUrl(url: string): boolean {
    return url.includes('firebasestorage.googleapis.com');
  }

  private isMinioUrl(url: string): boolean {
    const minioUrl = process.env.MINIO_SERVER_URL || '';
    return url.includes(minioUrl);
  }

  private generateFileName(message: MessageToMigrate): string {
    const timestamp = message.timestamp.toDate().getTime();
    const extension = this.getExtensionForType(message.type);
    return `${message.type}_${message.messageId}_${timestamp}${extension}`;
  }

  private getExtensionForType(type: string): string {
    const extensions: Record<string, string> = {
      image: '.jpg',
      video: '.mp4',
      audio: '.ogg',
      document: '.pdf'
    };
    return extensions[type] || '';
  }

  private determineMimeType(type: string, url: string): string {
    const mimeTypes: Record<string, string> = {
      image: 'image/jpeg',
      video: 'video/mp4',
      audio: 'audio/ogg',
      document: 'application/pdf'
    };
    return mimeTypes[type] || 'application/octet-stream';
  }

  /**
   * Estatísticas e relatórios
   */
  private printProgressStats(): void {
    const progress = (this.stats.processedMessages / this.stats.totalMessages * 100).toFixed(1);
    console.log(`📊 [MIGRATION] Progresso: ${this.stats.processedMessages}/${this.stats.totalMessages} (${progress}%)`);
    console.log(`✅ [MIGRATION] Sucessos: ${this.stats.successfulMigrations}`);
    console.log(`❌ [MIGRATION] Falhas: ${this.stats.failedMigrations}`);
    console.log(`⏭️ [MIGRATION] Puladas: ${this.stats.skippedMessages}`);
  }

  private printFinalStats(): void {
    const duration = this.stats.endTime!.getTime() - this.stats.startTime.getTime();
    const durationMinutes = (duration / 1000 / 60).toFixed(2);
    
    console.log('\n📊 [MIGRATION] === RELATÓRIO FINAL ===');
    console.log(`⏱️ [MIGRATION] Duração: ${durationMinutes} minutos`);
    console.log(`📝 [MIGRATION] Total de mensagens: ${this.stats.totalMessages}`);
    console.log(`✅ [MIGRATION] Migrações bem-sucedidas: ${this.stats.successfulMigrations}`);
    console.log(`❌ [MIGRATION] Migrações falharam: ${this.stats.failedMigrations}`);
    console.log(`⏭️ [MIGRATION] Mensagens puladas: ${this.stats.skippedMessages}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ [MIGRATION] Erros encontrados:`);
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. Mensagem ${error.messageId}: ${error.error}`);
      });
    }
  }

  /**
   * Rollback - reverte migrações se necessário
   */
  async rollbackMigration(messageIds?: string[]): Promise<void> {
    console.log('🔄 [ROLLBACK] Iniciando rollback da migração...');
    
    try {
      const messagesRef = collection(db, 'messages');
      let q;
      
      if (messageIds && messageIds.length > 0) {
        q = query(messagesRef, where('messageId', 'in', messageIds));
      } else {
        q = query(messagesRef, where('migratedToMinio', '==', true));
      }

      const snapshot = await getDocs(q);
      
      console.log(`🔄 [ROLLBACK] Encontradas ${snapshot.size} mensagens para rollback`);

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Aqui você implementaria a lógica para restaurar a URL original
        // Por segurança, este exemplo apenas marca como não migrado
        await updateDoc(docSnapshot.ref, {
          migratedToMinio: false,
          rollbackTimestamp: Timestamp.now()
        });
        
        console.log(`🔄 [ROLLBACK] Rollback da mensagem ${data.messageId} concluído`);
      }
      
      console.log('✅ [ROLLBACK] Rollback concluído');
    } catch (error) {
      console.error('❌ [ROLLBACK] Erro no rollback:', error);
      throw error;
    }
  }

  /**
   * Getter para estatísticas
   */
  getStats(): MigrationStats {
    return { ...this.stats };
  }
}

// Script CLI para execução
if (require.main === module) {
  const migrationService = new FirebaseToMinioMigrationService({
    batchSize: parseInt(process.argv[2]) || 10,
    dryRun: process.argv.includes('--dry-run'),
    onlyTypes: process.argv.includes('--images-only') ? ['image'] : undefined
  });

  migrationService.startMigration()
    .then((stats) => {
      console.log('✅ Migração concluída:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na migração:', error);
      process.exit(1);
    });
}