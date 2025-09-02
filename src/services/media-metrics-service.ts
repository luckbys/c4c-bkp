import { firebaseService } from '@/services/firebase-service';
import { getMinIOService } from '@/services/minio-service';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

// Interfaces para métricas
interface MediaMetrics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  sizeByType: Record<string, number>;
  uploadsToday: number;
  downloadsToday: number;
  errorRate: number;
  averageUploadTime: number;
  averageDownloadTime: number;
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

interface MediaEvent {
  id?: string;
  type: 'upload' | 'download' | 'delete' | 'error' | 'validation';
  action: string;
  messageId?: string;
  ticketId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: Timestamp;
  userAgent?: string;
  ipAddress?: string;
}

interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface SystemHealth {
  minioConnection: boolean;
  firebaseConnection: boolean;
  diskSpace: {
    used: number;
    available: number;
    percentage: number;
  };
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  activeConnections: number;
  lastCheck: Date;
}

/**
 * Serviço de métricas e monitoramento para o sistema de mídia MinIO
 * Coleta, armazena e analisa métricas de performance e uso
 */
export class MediaMetricsService {
  private static instance: MediaMetricsService;
  private performanceBuffer: PerformanceMetrics[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 segundos
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startPerformanceBufferFlush();
  }

  static getInstance(): MediaMetricsService {
    if (!MediaMetricsService.instance) {
      MediaMetricsService.instance = new MediaMetricsService();
    }
    return MediaMetricsService.instance;
  }

  /**
   * Registra um evento de mídia
   */
  async logMediaEvent(event: Omit<MediaEvent, 'timestamp'>): Promise<void> {
    try {
      const eventData: MediaEvent = {
        ...event,
        timestamp: Timestamp.now()
      };

      // Salvar no Firebase
      await addDoc(collection(db, 'media_events'), eventData);

      console.log(`📊 [METRICS] Evento registrado: ${event.type} - ${event.action}`);
    } catch (error) {
      console.error('❌ [METRICS] Erro ao registrar evento:', error);
    }
  }

  /**
   * Registra métricas de performance
   */
  recordPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const performanceData: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.performanceBuffer.push(performanceData);

    // Flush automático se buffer estiver cheio
    if (this.performanceBuffer.length >= this.BUFFER_SIZE) {
      this.flushPerformanceBuffer();
    }
  }

  /**
   * Wrapper para medir performance de operações
   */
  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = await fn();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      this.recordPerformance({
        operation,
        duration,
        success,
        metadata
      });

      console.log(`⏱️ [PERFORMANCE] ${operation}: ${duration}ms (${success ? 'sucesso' : 'falha'})`);
    }
  }

  /**
   * Obtém métricas gerais do sistema
   */
  async getMediaMetrics(): Promise<MediaMetrics> {
    try {
      console.log('📊 [METRICS] Coletando métricas do sistema...');

      // Métricas do MinIO
      const minioService = getMinIOService();
      const minioStats = await minioService.getBucketStats();
      
      // Métricas do Firebase (eventos do dia)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      const eventsRef = collection(db, 'media_events');
      
      // Uploads hoje
      const uploadsQuery = query(
        eventsRef,
        where('type', '==', 'upload'),
        where('timestamp', '>=', todayTimestamp),
        where('success', '==', true)
      );
      const uploadsSnapshot = await getDocs(uploadsQuery);
      const uploadsToday = uploadsSnapshot.size;

      // Downloads hoje
      const downloadsQuery = query(
        eventsRef,
        where('type', '==', 'download'),
        where('timestamp', '>=', todayTimestamp),
        where('success', '==', true)
      );
      const downloadsSnapshot = await getDocs(downloadsQuery);
      const downloadsToday = downloadsSnapshot.size;

      // Erros hoje
      const errorsQuery = query(
        eventsRef,
        where('timestamp', '>=', todayTimestamp),
        where('success', '==', false)
      );
      const errorsSnapshot = await getDocs(errorsQuery);
      const errorsToday = errorsSnapshot.size;

      // Calcular taxa de erro
      const totalOperationsToday = uploadsToday + downloadsToday + errorsToday;
      const errorRate = totalOperationsToday > 0 ? (errorsToday / totalOperationsToday) * 100 : 0;

      // Métricas de performance (últimas 24h)
      const performanceQuery = query(
        eventsRef,
        where('timestamp', '>=', todayTimestamp),
        where('success', '==', true)
      );
      const performanceSnapshot = await getDocs(performanceQuery);
      
      let totalUploadTime = 0;
      let totalDownloadTime = 0;
      let uploadCount = 0;
      let downloadCount = 0;

      performanceSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.duration) {
          if (data.type === 'upload') {
            totalUploadTime += data.duration;
            uploadCount++;
          } else if (data.type === 'download') {
            totalDownloadTime += data.duration;
            downloadCount++;
          }
        }
      });

      const averageUploadTime = uploadCount > 0 ? totalUploadTime / uploadCount : 0;
      const averageDownloadTime = downloadCount > 0 ? totalDownloadTime / downloadCount : 0;

      // Agrupar arquivos por tipo
      const filesByType: Record<string, number> = {};
      const sizeByType: Record<string, number> = {};
      
      uploadsSnapshot.forEach((doc) => {
        const data = doc.data();
        const mimeType = data.mimeType || 'unknown';
        const category = this.getCategoryFromMimeType(mimeType);
        
        filesByType[category] = (filesByType[category] || 0) + 1;
        sizeByType[category] = (sizeByType[category] || 0) + (data.fileSize || 0);
      });

      const metrics: MediaMetrics = {
        totalFiles: minioStats.totalObjects,
        totalSize: minioStats.totalSize,
        filesByType,
        sizeByType,
        uploadsToday,
        downloadsToday,
        errorRate,
        averageUploadTime,
        averageDownloadTime,
        storageUsage: {
          used: minioStats.totalSize,
          available: this.getAvailableStorage(),
          percentage: this.calculateStoragePercentage(minioStats.totalSize)
        }
      };

      console.log('📊 [METRICS] Métricas coletadas:', metrics);
      return metrics;
    } catch (error) {
      console.error('❌ [METRICS] Erro ao coletar métricas:', error);
      throw error;
    }
  }

  /**
   * Obtém eventos recentes
   */
  async getRecentEvents(limitCount: number = 50): Promise<MediaEvent[]> {
    try {
      const eventsRef = collection(db, 'media_events');
      const q = query(
        eventsRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const events: MediaEvent[] = [];

      snapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        } as MediaEvent);
      });

      return events;
    } catch (error) {
      console.error('❌ [METRICS] Erro ao buscar eventos recentes:', error);
      return [];
    }
  }

  /**
   * Obtém métricas de performance por período
   */
  async getPerformanceMetrics(hours: number = 24): Promise<{
    averageUploadTime: number;
    averageDownloadTime: number;
    successRate: number;
    totalOperations: number;
    operationsByHour: Record<string, number>;
  }> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);
      const startTimestamp = Timestamp.fromDate(startTime);

      const eventsRef = collection(db, 'media_events');
      const q = query(
        eventsRef,
        where('timestamp', '>=', startTimestamp),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      
      let totalUploadTime = 0;
      let totalDownloadTime = 0;
      let uploadCount = 0;
      let downloadCount = 0;
      let successCount = 0;
      let totalCount = 0;
      const operationsByHour: Record<string, number> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalCount++;
        
        if (data.success) {
          successCount++;
        }

        // Agrupar por hora
        const hour = data.timestamp.toDate().getHours();
        const hourKey = `${hour}:00`;
        operationsByHour[hourKey] = (operationsByHour[hourKey] || 0) + 1;

        // Métricas de tempo
        if (data.duration && data.success) {
          if (data.type === 'upload') {
            totalUploadTime += data.duration;
            uploadCount++;
          } else if (data.type === 'download') {
            totalDownloadTime += data.duration;
            downloadCount++;
          }
        }
      });

      return {
        averageUploadTime: uploadCount > 0 ? totalUploadTime / uploadCount : 0,
        averageDownloadTime: downloadCount > 0 ? totalDownloadTime / downloadCount : 0,
        successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
        totalOperations: totalCount,
        operationsByHour
      };
    } catch (error) {
      console.error('❌ [METRICS] Erro ao obter métricas de performance:', error);
      throw error;
    }
  }

  /**
   * Verifica saúde do sistema
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    try {
      console.log('🏥 [HEALTH] Verificando saúde do sistema...');

      // Verificar conexão MinIO
      const minioService = getMinIOService();
      const minioConnection = await minioService.testConnection();
      
      // Verificar conexão Firebase (tentativa de leitura)
      let firebaseConnection = false;
      try {
        const testRef = collection(db, 'health_check');
        await getDocs(query(testRef, limit(1)));
        firebaseConnection = true;
      } catch {
        firebaseConnection = false;
      }

      // Métricas de sistema (simuladas - em produção usar APIs do sistema)
      const diskSpace = {
        used: 50 * 1024 * 1024 * 1024, // 50GB
        available: 200 * 1024 * 1024 * 1024, // 200GB
        percentage: 20
      };

      const memoryUsage = {
        used: 2 * 1024 * 1024 * 1024, // 2GB
        total: 8 * 1024 * 1024 * 1024, // 8GB
        percentage: 25
      };

      const health: SystemHealth = {
        minioConnection,
        firebaseConnection,
        diskSpace,
        memoryUsage,
        activeConnections: this.getActiveConnections(),
        lastCheck: new Date()
      };

      console.log('🏥 [HEALTH] Saúde do sistema:', health);
      return health;
    } catch (error) {
      console.error('❌ [HEALTH] Erro ao verificar saúde do sistema:', error);
      throw error;
    }
  }

  /**
   * Gera relatório de uso
   */
  async generateUsageReport(days: number = 7): Promise<{
    period: { start: Date; end: Date };
    summary: {
      totalUploads: number;
      totalDownloads: number;
      totalErrors: number;
      dataTransferred: number;
      uniqueUsers: number;
    };
    dailyBreakdown: Array<{
      date: string;
      uploads: number;
      downloads: number;
      errors: number;
      dataTransferred: number;
    }>;
    topFileTypes: Array<{
      type: string;
      count: number;
      size: number;
    }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      const eventsRef = collection(db, 'media_events');
      const q = query(
        eventsRef,
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      
      let totalUploads = 0;
      let totalDownloads = 0;
      let totalErrors = 0;
      let dataTransferred = 0;
      const uniqueUsers = new Set<string>();
      const dailyData: Record<string, any> = {};
      const fileTypes: Record<string, { count: number; size: number }> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp.toDate().toISOString().split('T')[0];
        
        // Inicializar dia se não existir
        if (!dailyData[date]) {
          dailyData[date] = {
            uploads: 0,
            downloads: 0,
            errors: 0,
            dataTransferred: 0
          };
        }

        // Contadores gerais
        if (data.type === 'upload' && data.success) {
          totalUploads++;
          dailyData[date].uploads++;
        } else if (data.type === 'download' && data.success) {
          totalDownloads++;
          dailyData[date].downloads++;
        } else if (!data.success) {
          totalErrors++;
          dailyData[date].errors++;
        }

        // Dados transferidos
        if (data.fileSize) {
          dataTransferred += data.fileSize;
          dailyData[date].dataTransferred += data.fileSize;
        }

        // Usuários únicos (baseado em ticketId)
        if (data.ticketId) {
          uniqueUsers.add(data.ticketId);
        }

        // Tipos de arquivo
        if (data.mimeType) {
          const category = this.getCategoryFromMimeType(data.mimeType);
          if (!fileTypes[category]) {
            fileTypes[category] = { count: 0, size: 0 };
          }
          fileTypes[category].count++;
          fileTypes[category].size += data.fileSize || 0;
        }
      });

      // Converter dados diários para array
      const dailyBreakdown = Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Top tipos de arquivo
      const topFileTypes = Object.entries(fileTypes)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        period: { start: startDate, end: endDate },
        summary: {
          totalUploads,
          totalDownloads,
          totalErrors,
          dataTransferred,
          uniqueUsers: uniqueUsers.size
        },
        dailyBreakdown,
        topFileTypes
      };
    } catch (error) {
      console.error('❌ [METRICS] Erro ao gerar relatório:', error);
      throw error;
    }
  }

  /**
   * Métodos privados
   */
  private startPerformanceBufferFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushPerformanceBuffer();
    }, this.FLUSH_INTERVAL);
  }

  private async flushPerformanceBuffer(): Promise<void> {
    if (this.performanceBuffer.length === 0) return;

    try {
      const events = this.performanceBuffer.splice(0, this.performanceBuffer.length);
      
      // Converter para eventos de mídia e salvar
      const promises = events.map(event => 
        this.logMediaEvent({
          type: 'upload', // ou determinar baseado na operação
          action: event.operation,
          success: event.success,
          duration: event.duration,
          metadata: event.metadata
        })
      );

      await Promise.allSettled(promises);
      console.log(`📊 [METRICS] Buffer de performance enviado: ${events.length} eventos`);
    } catch (error) {
      console.error('❌ [METRICS] Erro ao enviar buffer de performance:', error);
    }
  }

  private getCategoryFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'application/xml' || mimeType === 'text/xml') return 'xml';
    return 'other';
  }

  private getAvailableStorage(): number {
    // Em produção, usar APIs do sistema para obter espaço disponível
    return 500 * 1024 * 1024 * 1024; // 500GB simulado
  }

  private calculateStoragePercentage(used: number): number {
    const total = used + this.getAvailableStorage();
    return total > 0 ? (used / total) * 100 : 0;
  }

  private getActiveConnections(): number {
    // Em produção, usar métricas reais de conexões ativas
    return Math.floor(Math.random() * 50) + 10; // Simulado
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushPerformanceBuffer();
  }
}

// Instância singleton
export const mediaMetricsService = MediaMetricsService.getInstance();