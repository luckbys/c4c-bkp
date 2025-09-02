/**
 * Serviço de monitoramento do Firestore
 * Monitora uso de reads, performance dos listeners e otimizações
 */

import { getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

interface FirestoreMetrics {
  totalReads: number;
  readsPerMinute: number;
  activeListeners: number;
  averageResponseTime: number;
  errorRate: number;
  lastReset: number;
}

interface ListenerInfo {
  id: string;
  collection: string;
  query: string;
  startTime: number;
  readCount: number;
  lastActivity: number;
  isActive: boolean;
}

class FirestoreMonitorService {
  private static instance: FirestoreMonitorService;
  private db = getFirestore(app);
  private metrics: FirestoreMetrics = {
    totalReads: 0,
    readsPerMinute: 0,
    activeListeners: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastReset: Date.now()
  };
  
  private listeners: Map<string, ListenerInfo> = new Map();
  private readHistory: number[] = [];
  private responseTimeHistory: number[] = [];
  private errorCount = 0;
  private totalOperations = 0;
  
  private monitoringInterval?: NodeJS.Timeout;
  private readonly MONITORING_INTERVAL = 60000; // 1 minuto
  private readonly MAX_HISTORY_SIZE = 60; // 1 hora de histórico

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): FirestoreMonitorService {
    if (!FirestoreMonitorService.instance) {
      FirestoreMonitorService.instance = new FirestoreMonitorService();
    }
    return FirestoreMonitorService.instance;
  }

  /**
   * Registra um novo listener
   */
  registerListener(id: string, collection: string, query: string): void {
    const listenerInfo: ListenerInfo = {
      id,
      collection,
      query,
      startTime: Date.now(),
      readCount: 0,
      lastActivity: Date.now(),
      isActive: true
    };
    
    this.listeners.set(id, listenerInfo);
    this.metrics.activeListeners = this.listeners.size;
    
    console.log(`📊 [FIRESTORE-MONITOR] Listener registrado: ${id} (${collection})`);
    console.log(`📊 [FIRESTORE-MONITOR] Total de listeners ativos: ${this.listeners.size}`);
    console.log(`📊 [FIRESTORE-MONITOR] Listeners atuais:`, Array.from(this.listeners.keys()));
  }

  /**
   * Remove um listener
   */
  unregisterListener(id: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.isActive = false;
      this.listeners.delete(id);
      this.metrics.activeListeners = this.listeners.size;
      
      const duration = Date.now() - listener.startTime;
      console.log(`📊 [FIRESTORE-MONITOR] Listener removido: ${id} (duração: ${duration}ms, reads: ${listener.readCount})`);
    }
  }

  /**
   * Registra uma operação de read
   */
  recordRead(listenerId?: string, responseTime?: number): void {
    this.metrics.totalReads++;
    this.totalOperations++;
    
    console.log(`📊 [FIRESTORE-MONITOR] Read registrado - Total: ${this.metrics.totalReads}, Listener: ${listenerId}`);
    
    if (listenerId && this.listeners.has(listenerId)) {
      const listener = this.listeners.get(listenerId)!;
      listener.readCount++;
      listener.lastActivity = Date.now();
      console.log(`📊 [FIRESTORE-MONITOR] Listener ${listenerId} - Reads: ${listener.readCount}`);
    } else if (listenerId) {
      console.warn(`⚠️ [FIRESTORE-MONITOR] Listener ${listenerId} não encontrado`);
    }
    
    if (responseTime) {
      this.responseTimeHistory.push(responseTime);
      if (this.responseTimeHistory.length > this.MAX_HISTORY_SIZE) {
        this.responseTimeHistory.shift();
      }
      
      this.metrics.averageResponseTime = 
        this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length;
    }
  }

  /**
   * Registra um erro
   */
  recordError(error: Error, listenerId?: string): void {
    this.errorCount++;
    this.totalOperations++;
    this.metrics.errorRate = this.errorCount / this.totalOperations;
    
    console.error(`❌ [FIRESTORE-MONITOR] Erro registrado:`, {
      listenerId,
      error: error.message,
      errorRate: this.metrics.errorRate
    });
  }

  /**
   * Obtém métricas atuais
   */
  getMetrics(): FirestoreMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtém informações dos listeners ativos
   */
  getActiveListeners(): ListenerInfo[] {
    return Array.from(this.listeners.values()).filter(l => l.isActive);
  }

  /**
   * Obtém recomendações de otimização
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Verificar taxa de reads por minuto
    if (this.metrics.readsPerMinute > 100) {
      recommendations.push('Alto número de reads por minuto. Considere implementar cache local.');
    }
    
    // Verificar listeners inativos
    const inactiveListeners = Array.from(this.listeners.values())
      .filter(l => l.isActive && Date.now() - l.lastActivity > 300000); // 5 minutos
    
    if (inactiveListeners.length > 0) {
      recommendations.push(`${inactiveListeners.length} listeners inativos detectados. Considere fazer cleanup.`);
    }
    
    // Verificar tempo de resposta
    if (this.metrics.averageResponseTime > 1000) {
      recommendations.push('Tempo de resposta alto. Verifique índices Firestore.');
    }
    
    // Verificar taxa de erro
    if (this.metrics.errorRate > 0.05) {
      recommendations.push('Taxa de erro alta. Verifique conectividade e regras de segurança.');
    }
    
    return recommendations;
  }

  /**
   * Inicia o monitoramento periódico
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.logMetrics();
    }, this.MONITORING_INTERVAL);
  }

  /**
   * Atualiza métricas calculadas
   */
  private updateMetrics(): void {
    const now = Date.now();
    const timeSinceReset = now - this.metrics.lastReset;
    const minutesSinceReset = timeSinceReset / 60000;
    
    // Calcular reads por minuto
    this.metrics.readsPerMinute = minutesSinceReset > 0 
      ? this.metrics.totalReads / minutesSinceReset 
      : 0;
    
    // Adicionar ao histórico
    this.readHistory.push(this.metrics.totalReads);
    if (this.readHistory.length > this.MAX_HISTORY_SIZE) {
      this.readHistory.shift();
    }
    
    // Reset diário
    if (timeSinceReset > 24 * 60 * 60 * 1000) {
      this.resetDailyMetrics();
    }
  }

  /**
   * Log das métricas
   */
  private logMetrics(): void {
    const recommendations = this.getOptimizationRecommendations();
    
    console.log('📊 [FIRESTORE-MONITOR] Métricas:', {
      totalReads: this.metrics.totalReads,
      readsPerMinute: Math.round(this.metrics.readsPerMinute * 100) / 100,
      activeListeners: this.metrics.activeListeners,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      errorRate: Math.round(this.metrics.errorRate * 10000) / 100 + '%',
      recommendations: recommendations.length > 0 ? recommendations : ['Nenhuma recomendação']
    });
  }

  /**
   * Reset das métricas diárias
   */
  private resetDailyMetrics(): void {
    this.metrics.totalReads = 0;
    this.metrics.lastReset = Date.now();
    this.errorCount = 0;
    this.totalOperations = 0;
    this.readHistory = [];
    this.responseTimeHistory = [];
    
    console.log('📊 [FIRESTORE-MONITOR] Métricas diárias resetadas');
  }

  /**
   * Para o monitoramento
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    // Cleanup listeners
    this.listeners.clear();
    this.metrics.activeListeners = 0;
    
    console.log('📊 [FIRESTORE-MONITOR] Monitoramento parado');
  }
}

export const firestoreMonitor = FirestoreMonitorService.getInstance();
export { FirestoreMonitorService };
export type { FirestoreMetrics, ListenerInfo };