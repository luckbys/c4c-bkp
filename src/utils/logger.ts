// Sistema de logging centralizado para debug e monitoramento

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 
  | 'FIRESTORE' 
  | 'WEBHOOK' 
  | 'EVOLUTION_API' 
  | 'AUDIO' 
  | 'IMAGE' 
  | 'NETWORK' 
  | 'UI' 
  | 'AUTH'
  | 'RABBITMQ'
  | 'FIREBASE'
  | 'CHAT'
  | 'API'
  | 'GENERAL';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  error?: Error;
  userId?: string;
  sessionId?: string;
  ticketId?: string;
  messageId?: string;
  instanceName?: string;
  remoteJid?: string;
  correlationId?: string;
  duration?: number;
  operation?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Manter apenas os últimos 1000 logs
  private sessionId: string;
  private isProduction: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Capturar erros não tratados
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('UI', 'Unhandled error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('GENERAL', 'Unhandled promise rejection', {
          reason: event.reason
        });
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private getLogEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  }

  private getCategoryEmoji(category: LogCategory): string {
    switch (category) {
      case 'FIRESTORE': return '🔥';
      case 'WEBHOOK': return '🔗';
      case 'EVOLUTION_API': return '📡';
      case 'AUDIO': return '🎵';
      case 'IMAGE': return '🖼️';
      case 'NETWORK': return '🌐';
      case 'UI': return '🖥️';
      case 'AUTH': return '🔐';
      case 'RABBITMQ': return '🐰';
      case 'FIREBASE': return '🔥';
      case 'CHAT': return '💬';
      case 'API': return '🔌';
      default: return '📋';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      // Em produção, apenas warn e error
      return level === 'warn' || level === 'error';
    }
    // Em desenvolvimento, todos os níveis
    return true;
  }

  private formatLogMessage(level: LogLevel, category: LogCategory, message: string, data?: any): string {
    const emoji = this.getLogEmoji(level);
    const categoryEmoji = this.getCategoryEmoji(category);
    const timestamp = new Date().toLocaleTimeString();
    
    let formattedMessage = `${emoji} ${categoryEmoji} [${category}] ${message}`;
    
    if (data) {
      formattedMessage += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    return formattedMessage;
  }

  debug(category: LogCategory, message: string, data?: any): void {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'debug',
      category,
      message,
      data,
      sessionId: this.sessionId
    };

    this.addLog(entry);
    console.debug(this.formatLogMessage('debug', category, message, data));
  }

  info(category: LogCategory, message: string, data?: any): void {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'info',
      category,
      message,
      data,
      sessionId: this.sessionId
    };

    this.addLog(entry);
    console.info(this.formatLogMessage('info', category, message, data));
  }

  warn(category: LogCategory, message: string, data?: any): void {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'warn',
      category,
      message,
      data,
      sessionId: this.sessionId
    };

    this.addLog(entry);
    console.warn(this.formatLogMessage('warn', category, message, data));
  }

  error(category: LogCategory, message: string, errorOrData?: Error | any): void {
    const isError = errorOrData instanceof Error;
    const error = isError ? errorOrData : undefined;
    const data = isError ? undefined : errorOrData;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'error',
      category,
      message,
      data,
      error,
      sessionId: this.sessionId
    };

    this.addLog(entry);
    
    const formattedMessage = this.formatLogMessage('error', category, message, data);
    
    if (error) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }

  // Métodos específicos para categorias comuns
  firestore = {
    debug: (message: string, data?: any) => this.debug('FIRESTORE', message, data),
    info: (message: string, data?: any) => this.info('FIRESTORE', message, data),
    warn: (message: string, data?: any) => this.warn('FIRESTORE', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('FIRESTORE', message, errorOrData)
  };

  webhook = {
    debug: (message: string, data?: any) => this.debug('WEBHOOK', message, data),
    info: (message: string, data?: any) => this.info('WEBHOOK', message, data),
    warn: (message: string, data?: any) => this.warn('WEBHOOK', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('WEBHOOK', message, errorOrData)
  };

  evolutionApi = {
    debug: (message: string, data?: any) => this.debug('EVOLUTION_API', message, data),
    info: (message: string, data?: any) => this.info('EVOLUTION_API', message, data),
    warn: (message: string, data?: any) => this.warn('EVOLUTION_API', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('EVOLUTION_API', message, errorOrData)
  };

  audio = {
    debug: (message: string, data?: any) => this.debug('AUDIO', message, data),
    info: (message: string, data?: any) => this.info('AUDIO', message, data),
    warn: (message: string, data?: any) => this.warn('AUDIO', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('AUDIO', message, errorOrData)
  };

  image = {
    debug: (message: string, data?: any) => this.debug('IMAGE', message, data),
    info: (message: string, data?: any) => this.info('IMAGE', message, data),
    warn: (message: string, data?: any) => this.warn('IMAGE', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('IMAGE', message, errorOrData)
  };

  network = {
    debug: (message: string, data?: any) => this.debug('NETWORK', message, data),
    info: (message: string, data?: any) => this.info('NETWORK', message, data),
    warn: (message: string, data?: any) => this.warn('NETWORK', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('NETWORK', message, errorOrData)
  };

  ui = {
    debug: (message: string, data?: any) => this.debug('UI', message, data),
    info: (message: string, data?: any) => this.info('UI', message, data),
    warn: (message: string, data?: any) => this.warn('UI', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('UI', message, errorOrData)
  };

  rabbitmq = {
    debug: (message: string, data?: any) => this.debug('RABBITMQ', message, data),
    info: (message: string, data?: any) => this.info('RABBITMQ', message, data),
    warn: (message: string, data?: any) => this.warn('RABBITMQ', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('RABBITMQ', message, errorOrData)
  };

  firebase = {
    debug: (message: string, data?: any) => this.debug('FIREBASE', message, data),
    info: (message: string, data?: any) => this.info('FIREBASE', message, data),
    warn: (message: string, data?: any) => this.warn('FIREBASE', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('FIREBASE', message, errorOrData)
  };

  chat = {
    debug: (message: string, data?: any) => this.debug('CHAT', message, data),
    info: (message: string, data?: any) => this.info('CHAT', message, data),
    warn: (message: string, data?: any) => this.warn('CHAT', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('CHAT', message, errorOrData)
  };

  api = {
    debug: (message: string, data?: any) => this.debug('API', message, data),
    info: (message: string, data?: any) => this.info('API', message, data),
    warn: (message: string, data?: any) => this.warn('API', message, data),
    error: (message: string, errorOrData?: Error | any) => this.error('API', message, errorOrData)
  };

  // Métodos utilitários
  getLogs(level?: LogLevel, category?: LogCategory, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  getErrorLogs(limit: number = 50): LogEntry[] {
    return this.getLogs('error', undefined, limit);
  }

  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: this.formatTimestamp(),
      logs: this.logs
    }, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.info('GENERAL', 'Logs cleared');
  }

  // Método para performance timing
  time(label: string): void {
    console.time(`⏱️ ${label}`);
  }

  timeEnd(label: string, category: LogCategory = 'GENERAL'): void {
    console.timeEnd(`⏱️ ${label}`);
    this.debug(category, `Performance timing: ${label}`);
  }

  // Método para agrupar logs relacionados
  group(label: string, category: LogCategory = 'GENERAL'): void {
    console.group(`📁 [${category}] ${label}`);
    this.debug(category, `Group started: ${label}`);
  }

  groupEnd(label: string, category: LogCategory = 'GENERAL'): void {
    console.groupEnd();
    this.debug(category, `Group ended: ${label}`);
  }

  // Método para logs condicionais
  assert(condition: boolean, category: LogCategory, message: string, data?: any): void {
    if (!condition) {
      this.error(category, `Assertion failed: ${message}`, data);
    }
  }

  // Método para contar ocorrências
  count(label: string, category: LogCategory = 'GENERAL'): void {
    console.count(`🔢 [${category}] ${label}`);
  }

  // Método para logs de tabela (útil para arrays de objetos)
  table(data: any[], category: LogCategory = 'GENERAL', message?: string): void {
    if (message) {
      this.info(category, message);
    }
    console.table(data);
  }
}

// Instância singleton
export const logger = new Logger();

// Tipos exportados
export type { LogLevel, LogCategory, LogEntry };