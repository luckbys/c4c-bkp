import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '../services/performance-monitor';
import type { PerformanceMetrics, HealthStatus, Alert } from '../services/performance-monitor';

interface UsePerformanceMonitorOptions {
  autoStart?: boolean;
  metricsHistoryLimit?: number;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

interface PerformanceMonitorState {
  isMonitoring: boolean;
  metrics: PerformanceMetrics[];
  latestMetrics: PerformanceMetrics | null;
  health: HealthStatus | null;
  alerts: Alert[];
  activeAlerts: Alert[];
  isLoading: boolean;
  error: string | null;
}

interface PerformanceMonitorActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refreshMetrics: () => Promise<void>;
  resolveAlert: (alertId: string) => boolean;
  generateReport: (timeRange?: { start: number; end: number }) => any;
  clearError: () => void;
}

export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): PerformanceMonitorState & PerformanceMonitorActions {
  const {
    autoStart = false,
    metricsHistoryLimit = 100,
    refreshInterval = 5000,
    enableRealTimeUpdates = true
  } = options;

  const [state, setState] = useState<PerformanceMonitorState>({
    isMonitoring: false,
    metrics: [],
    latestMetrics: null,
    health: null,
    alerts: [],
    activeAlerts: [],
    isLoading: false,
    error: null
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersSetup = useRef(false);

  /**
   * Atualizar estado com dados do monitor
   */
  const updateState = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const metrics = performanceMonitor.getMetrics(metricsHistoryLimit);
      const latestMetrics = performanceMonitor.getLatestMetrics();
      const health = performanceMonitor.getCurrentHealth();
      const allAlerts = performanceMonitor.getAllAlerts();
      const activeAlerts = performanceMonitor.getActiveAlerts();

      setState(prev => ({
        ...prev,
        metrics,
        latestMetrics,
        health,
        alerts: allAlerts,
        activeAlerts,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [metricsHistoryLimit]);

  /**
   * Configurar listeners de eventos em tempo real
   */
  const setupEventListeners = useCallback(() => {
    if (eventListenersSetup.current || !enableRealTimeUpdates) {
      return;
    }

    // Listener para métricas coletadas
    const onMetricsCollected = (metrics: PerformanceMetrics) => {
      setState(prev => {
        const newMetrics = [...prev.metrics, metrics].slice(-metricsHistoryLimit);
        return {
          ...prev,
          metrics: newMetrics,
          latestMetrics: metrics
        };
      });
    };

    // Listener para análise de saúde
    const onHealthAnalyzed = (health: HealthStatus) => {
      setState(prev => ({ ...prev, health }));
    };

    // Listener para alertas criados
    const onAlertCreated = (alert: Alert) => {
      setState(prev => ({
        ...prev,
        alerts: [...prev.alerts, alert],
        activeAlerts: [...prev.activeAlerts, alert]
      }));
    };

    // Listener para alertas resolvidos
    const onAlertResolved = (alert: Alert) => {
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(a => a.id === alert.id ? alert : a),
        activeAlerts: prev.activeAlerts.filter(a => a.id !== alert.id)
      }));
    };

    // Listener para início do monitoramento
    const onMonitorStarted = () => {
      setState(prev => ({ ...prev, isMonitoring: true }));
    };

    // Listener para parada do monitoramento
    const onMonitorStopped = () => {
      setState(prev => ({ ...prev, isMonitoring: false }));
    };

    // Registrar listeners
    performanceMonitor.on('monitor:metrics_collected', onMetricsCollected);
    performanceMonitor.on('monitor:health_analyzed', onHealthAnalyzed);
    performanceMonitor.on('monitor:alert_created', onAlertCreated);
    performanceMonitor.on('monitor:alert_resolved', onAlertResolved);
    performanceMonitor.on('monitor:started', onMonitorStarted);
    performanceMonitor.on('monitor:stopped', onMonitorStopped);

    eventListenersSetup.current = true;

    // Retornar função de cleanup
    return () => {
      performanceMonitor.off('monitor:metrics_collected', onMetricsCollected);
      performanceMonitor.off('monitor:health_analyzed', onHealthAnalyzed);
      performanceMonitor.off('monitor:alert_created', onAlertCreated);
      performanceMonitor.off('monitor:alert_resolved', onAlertResolved);
      performanceMonitor.off('monitor:started', onMonitorStarted);
      performanceMonitor.off('monitor:stopped', onMonitorStopped);
      eventListenersSetup.current = false;
    };
  }, [enableRealTimeUpdates, metricsHistoryLimit]);

  /**
   * Iniciar monitoramento
   */
  const startMonitoring = useCallback(() => {
    try {
      performanceMonitor.startMonitoring();
      
      // Configurar refresh automático se não estiver usando updates em tempo real
      if (!enableRealTimeUpdates && refreshInterval > 0) {
        refreshIntervalRef.current = setInterval(updateState, refreshInterval);
      }
      
      // Atualizar estado inicial
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start monitoring'
      }));
    }
  }, [enableRealTimeUpdates, refreshInterval, updateState]);

  /**
   * Parar monitoramento
   */
  const stopMonitoring = useCallback(() => {
    try {
      performanceMonitor.stopMonitoring();
      
      // Limpar interval de refresh
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop monitoring'
      }));
    }
  }, []);

  /**
   * Atualizar métricas manualmente
   */
  const refreshMetrics = useCallback(async () => {
    await updateState();
  }, [updateState]);

  /**
   * Resolver alerta
   */
  const resolveAlert = useCallback((alertId: string): boolean => {
    try {
      const resolved = performanceMonitor.resolveAlert(alertId);
      if (resolved && !enableRealTimeUpdates) {
        // Se não estiver usando updates em tempo real, atualizar manualmente
        updateState();
      }
      return resolved;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve alert'
      }));
      return false;
    }
  }, [enableRealTimeUpdates, updateState]);

  /**
   * Gerar relatório
   */
  const generateReport = useCallback((timeRange?: { start: number; end: number }) => {
    try {
      return performanceMonitor.generateReport(timeRange);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate report'
      }));
      return null;
    }
  }, []);

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Efeito para configuração inicial
   */
  useEffect(() => {
    // Configurar listeners de eventos
    const cleanup = setupEventListeners();
    
    // Auto-start se habilitado
    if (autoStart) {
      startMonitoring();
    } else {
      // Carregar dados iniciais mesmo sem auto-start
      updateState();
    }

    // Cleanup na desmontagem
    return () => {
      if (cleanup) {
        cleanup();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoStart, setupEventListeners, startMonitoring, updateState]);

  /**
   * Efeito para atualizar quando as opções mudam
   */
  useEffect(() => {
    // Reconfigurar interval se necessário
    if (state.isMonitoring && !enableRealTimeUpdates) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (refreshInterval > 0) {
        refreshIntervalRef.current = setInterval(updateState, refreshInterval);
      }
    }
  }, [refreshInterval, enableRealTimeUpdates, state.isMonitoring, updateState]);

  return {
    // Estado
    ...state,
    
    // Ações
    startMonitoring,
    stopMonitoring,
    refreshMetrics,
    resolveAlert,
    generateReport,
    clearError
  };
}

/**
 * Hook simplificado para apenas métricas básicas
 */
export function useBasicMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const latestMetrics = performanceMonitor.getLatestMetrics();
      const currentHealth = performanceMonitor.getCurrentHealth();
      
      setMetrics(latestMetrics);
      setHealth(currentHealth);
    } catch (error) {
      console.error('Error updating basic metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    updateMetrics();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(updateMetrics, 10000);
    
    return () => clearInterval(interval);
  }, [updateMetrics]);

  return {
    metrics,
    health,
    isLoading,
    refresh: updateMetrics
  };
}

/**
 * Hook para alertas apenas
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);

  const updateAlerts = useCallback(() => {
    const allAlerts = performanceMonitor.getAllAlerts();
    const active = performanceMonitor.getActiveAlerts();
    
    setAlerts(allAlerts);
    setActiveAlerts(active);
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    const resolved = performanceMonitor.resolveAlert(alertId);
    if (resolved) {
      updateAlerts();
    }
    return resolved;
  }, [updateAlerts]);

  useEffect(() => {
    updateAlerts();
    
    // Listeners para updates em tempo real
    const onAlertCreated = () => updateAlerts();
    const onAlertResolved = () => updateAlerts();
    
    performanceMonitor.on('monitor:alert_created', onAlertCreated);
    performanceMonitor.on('monitor:alert_resolved', onAlertResolved);
    
    return () => {
      performanceMonitor.off('monitor:alert_created', onAlertCreated);
      performanceMonitor.off('monitor:alert_resolved', onAlertResolved);
    };
  }, [updateAlerts]);

  return {
    alerts,
    activeAlerts,
    resolveAlert,
    refresh: updateAlerts
  };
}

/**
 * Hook para métricas históricas com filtros
 */
export function useMetricsHistory(options: {
  limit?: number;
  timeRange?: { start: number; end: number };
  refreshInterval?: number;
} = {}) {
  const { limit = 100, timeRange, refreshInterval = 30000 } = options;
  
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const updateMetrics = useCallback(() => {
    setIsLoading(true);
    try {
      let allMetrics = performanceMonitor.getMetrics(limit);
      
      if (timeRange) {
        allMetrics = allMetrics.filter(
          m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
      }
      
      setMetrics(allMetrics);
    } catch (error) {
      console.error('Error updating metrics history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [limit, timeRange]);

  useEffect(() => {
    updateMetrics();
    
    const interval = setInterval(updateMetrics, refreshInterval);
    
    return () => clearInterval(interval);
  }, [updateMetrics, refreshInterval]);

  return {
    metrics,
    isLoading,
    refresh: updateMetrics
  };
}

export type {
  UsePerformanceMonitorOptions,
  PerformanceMonitorState,
  PerformanceMonitorActions
};