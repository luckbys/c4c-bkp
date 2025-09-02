interface MediaUploadLog {
  messageId: string;
  instanceName: string;
  mediaType: 'image' | 'audio' | 'document' | 'video' | 'sticker';
  originalUrl: string;
  storageUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'started' | 'downloading' | 'uploading' | 'success' | 'error';
  error?: string;
  timestamp: Date;
  duration?: number;
  method: 'direct_url' | 'evolution_api' | 'base64' | 'cache';
}

interface MediaMetrics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalSize: number;
  averageUploadTime: number;
  errorsByType: Record<string, number>;
  uploadsByType: Record<string, number>;
}

class MediaLoggerService {
  private static instance: MediaLoggerService;
  private logs: MediaUploadLog[] = [];
  private metrics: MediaMetrics = {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalSize: 0,
    averageUploadTime: 0,
    errorsByType: {},
    uploadsByType: {}
  };
  
  private readonly MAX_LOGS = 1000; // Manter apenas os últimos 1000 logs
  
  static getInstance(): MediaLoggerService {
    if (!MediaLoggerService.instance) {
      MediaLoggerService.instance = new MediaLoggerService();
    }
    return MediaLoggerService.instance;
  }
  
  /**
   * Inicia o log de um upload de mídia
   */
  startUpload(data: {
    messageId: string;
    instanceName: string;
    mediaType: 'image' | 'audio' | 'document' | 'video' | 'sticker';
    originalUrl: string;
    method: 'direct_url' | 'evolution_api' | 'base64' | 'cache';
    fileName?: string;
  }): void {
    const log: MediaUploadLog = {
      ...data,
      status: 'started',
      timestamp: new Date()
    };
    
    this.addLog(log);
    this.updateMetrics('start', data.mediaType);
    
    console.log(`📊 [MEDIA LOG] Upload iniciado:`, {
      messageId: data.messageId,
      type: data.mediaType,
      method: data.method,
      url: data.originalUrl.substring(0, 100) + '...'
    });
  }
  
  /**
   * Atualiza o status de download
   */
  updateDownloadStatus(messageId: string, status: 'downloading'): void {
    const log = this.findLog(messageId);
    if (log) {
      log.status = status;
      console.log(`📊 [MEDIA LOG] Status atualizado para ${status}:`, messageId);
    }
  }
  
  /**
   * Atualiza o status de upload
   */
  updateUploadStatus(messageId: string, status: 'uploading'): void {
    const log = this.findLog(messageId);
    if (log) {
      log.status = status;
      console.log(`📊 [MEDIA LOG] Status atualizado para ${status}:`, messageId);
    }
  }
  
  /**
   * Registra sucesso no upload
   */
  logSuccess(data: {
    messageId: string;
    storageUrl: string;
    fileName?: string;
    fileSize?: number;
  }): void {
    const log = this.findLog(data.messageId);
    if (log) {
      const duration = Date.now() - log.timestamp.getTime();
      
      log.status = 'success';
      log.storageUrl = data.storageUrl;
      log.fileName = data.fileName;
      log.fileSize = data.fileSize;
      log.duration = duration;
      
      this.updateMetrics('success', log.mediaType, data.fileSize, duration);
      
      console.log(`📊 [MEDIA LOG] ✅ Upload concluído com sucesso:`, {
        messageId: data.messageId,
        duration: `${duration}ms`,
        size: data.fileSize ? `${(data.fileSize / 1024).toFixed(2)}KB` : 'N/A',
        storageUrl: data.storageUrl.substring(0, 100) + '...'
      });
    }
  }
  
  /**
   * Registra erro no upload
   */
  logError(messageId: string, error: string): void {
    const log = this.findLog(messageId);
    if (log) {
      const duration = Date.now() - log.timestamp.getTime();
      
      log.status = 'error';
      log.error = error;
      log.duration = duration;
      
      this.updateMetrics('error', log.mediaType, undefined, duration, error);
      
      console.error(`📊 [MEDIA LOG] ❌ Erro no upload:`, {
        messageId,
        duration: `${duration}ms`,
        error,
        type: log.mediaType
      });
    }
  }
  
  /**
   * Registra uso de cache
   */
  logCacheHit(messageId: string, cachedUrl: string): void {
    console.log(`📊 [MEDIA LOG] 📋 Cache hit:`, {
      messageId,
      cachedUrl: cachedUrl.substring(0, 100) + '...'
    });
  }
  
  /**
   * Encontra um log pelo messageId
   */
  private findLog(messageId: string): MediaUploadLog | undefined {
    return this.logs.find(log => log.messageId === messageId);
  }
  
  /**
   * Adiciona um log à lista
   */
  private addLog(log: MediaUploadLog): void {
    this.logs.push(log);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }
  }
  
  /**
   * Atualiza as métricas
   */
  private updateMetrics(
    action: 'start' | 'success' | 'error',
    mediaType: string,
    fileSize?: number,
    duration?: number,
    error?: string
  ): void {
    switch (action) {
      case 'start':
        this.metrics.totalUploads++;
        this.metrics.uploadsByType[mediaType] = (this.metrics.uploadsByType[mediaType] || 0) + 1;
        break;
        
      case 'success':
        this.metrics.successfulUploads++;
        if (fileSize) {
          this.metrics.totalSize += fileSize;
        }
        if (duration) {
          // Calcular média móvel do tempo de upload
          const currentAvg = this.metrics.averageUploadTime;
          const count = this.metrics.successfulUploads;
          this.metrics.averageUploadTime = ((currentAvg * (count - 1)) + duration) / count;
        }
        break;
        
      case 'error':
        this.metrics.failedUploads++;
        if (error) {
          const errorType = this.categorizeError(error);
          this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
        }
        break;
    }
  }
  
  /**
   * Categoriza erros para métricas
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('network') || errorLower.includes('fetch')) {
      return 'network_error';
    }
    if (errorLower.includes('timeout')) {
      return 'timeout_error';
    }
    if (errorLower.includes('storage') || errorLower.includes('firebase')) {
      return 'storage_error';
    }
    if (errorLower.includes('permission') || errorLower.includes('unauthorized')) {
      return 'permission_error';
    }
    
    return 'unknown_error';
  }
  
  /**
   * Obtém métricas atuais
   */
  getMetrics(): MediaMetrics & {
    successRate: number;
    averageFileSize: number;
    recentErrors: string[];
  } {
    const successRate = this.metrics.totalUploads > 0 
      ? (this.metrics.successfulUploads / this.metrics.totalUploads) * 100 
      : 0;
      
    const averageFileSize = this.metrics.successfulUploads > 0
      ? this.metrics.totalSize / this.metrics.successfulUploads
      : 0;
      
    // Últimos 10 erros
    const recentErrors = this.logs
      .filter(log => log.status === 'error' && log.error)
      .slice(-10)
      .map(log => log.error!)
      .reverse();
    
    return {
      ...this.metrics,
      successRate: Math.round(successRate * 100) / 100,
      averageFileSize: Math.round(averageFileSize),
      recentErrors
    };
  }
  
  /**
   * Obtém logs recentes
   */
  getRecentLogs(limit: number = 50): MediaUploadLog[] {
    return this.logs.slice(-limit).reverse();
  }
  
  /**
   * Obtém logs por status
   */
  getLogsByStatus(status: MediaUploadLog['status']): MediaUploadLog[] {
    return this.logs.filter(log => log.status === status);
  }
  
  /**
   * Limpa logs antigos (manter apenas os últimos N dias)
   */
  cleanOldLogs(daysToKeep: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    
    const removedCount = initialCount - this.logs.length;
    if (removedCount > 0) {
      console.log(`📊 [MEDIA LOG] Limpeza concluída: ${removedCount} logs antigos removidos`);
    }
  }
  
  /**
   * Gera relatório de status
   */
  generateStatusReport(): string {
    const metrics = this.getMetrics();
    const recentLogs = this.getRecentLogs(10);
    
    return `
📊 RELATÓRIO DE UPLOAD DE MÍDIA
================================

📈 MÉTRICAS GERAIS:
- Total de uploads: ${metrics.totalUploads}
- Sucessos: ${metrics.successfulUploads} (${metrics.successRate}%)
- Falhas: ${metrics.failedUploads}
- Tamanho total: ${(metrics.totalSize / 1024 / 1024).toFixed(2)}MB
- Tamanho médio: ${(metrics.averageFileSize / 1024).toFixed(2)}KB
- Tempo médio: ${metrics.averageUploadTime.toFixed(0)}ms

📊 UPLOADS POR TIPO:
${Object.entries(metrics.uploadsByType)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

❌ ERROS POR CATEGORIA:
${Object.entries(metrics.errorsByType)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

🕒 ATIVIDADE RECENTE:
${recentLogs.slice(0, 5)
  .map(log => `- ${log.timestamp.toLocaleTimeString()}: ${log.mediaType} ${log.status} (${log.messageId.substring(0, 8)}...)`)
  .join('\n')}
`;
  }
}

export const mediaLogger = MediaLoggerService.getInstance();
export default mediaLogger;
export type { MediaUploadLog, MediaMetrics };