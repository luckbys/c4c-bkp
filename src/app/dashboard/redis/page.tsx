'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  Clock, 
  HardDrive, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Settings,
  Play,
  Pause,
  TrendingDown
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import type { RedisMetrics } from '@/app/api/redis/metrics/route';

// Importar componentes criados
import RedisMetricsCard from '@/components/dashboard/RedisMetricsCard';
import PerformanceCharts from '@/components/dashboard/PerformanceCharts';
import MemoryCharts from '@/components/dashboard/MemoryCharts';
import AlertsPanel, { AlertItem } from '@/components/dashboard/AlertsPanel';

interface DashboardState {
  metrics: RedisMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  autoRefresh: boolean;
}

interface MemoryCategory {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface CompressionStats {
  algorithm: string;
  ratio: number;
  savings: number;
  operations: number;
  avgTime: number;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#6366f1'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function RedisDashboard() {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    loading: true,
    error: null,
    lastUpdate: null,
    autoRefresh: true
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState('1h');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Buscar métricas
  const fetchMetrics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`/api/redis/metrics?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const metrics: RedisMetrics = await response.json();
      
      setState(prev => ({
        ...prev,
        metrics,
        loading: false,
        lastUpdate: new Date()
      }));
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      }));
    }
  }, [selectedPeriod]);

  // Configurar auto-refresh
  useEffect(() => {
    fetchMetrics();
    
    if (state.autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000); // 5 segundos
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [fetchMetrics, state.autoRefresh]);

  useEffect(() => {
    fetchMetrics();
  }, [selectedPeriod, fetchMetrics]);

  // Limpar interval ao desmontar
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  const toggleAutoRefresh = () => {
    setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  const handleManualRefresh = () => {
    fetchMetrics();
  };

  const formatLastUpdate = () => {
    if (!state.lastUpdate) return 'Nunca';
    return state.lastUpdate.toLocaleTimeString('pt-BR');
  };

  // Preparar dados para os componentes
  const prepareMetricsData = () => {
    if (!state.metrics) return null;

    return {
      cacheHitRate: state.metrics.cacheHitRate,
      totalOperations: state.metrics.totalOperations,
      avgLatency: state.metrics.avgLatency,
      memoryUsed: state.metrics.memoryUsage.used,
      memoryTotal: state.metrics.memoryUsage.total,
      compressionRatio: state.metrics.compression.compressionRatio,
      activeConnections: state.metrics.cluster.activeNodes,
      throughput: state.metrics.throughput,
      uptime: 86400, // Mock uptime
      errorRate: 0.1 // Mock error rate
    };
  };

  const prepareMemoryCategories = (): MemoryCategory[] => {
    if (!state.metrics) return [];

    const categories = state.metrics.memoryUsage.byCategory;
    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

    return [
      { name: 'Mensagens', value: categories.messages, color: '#3b82f6', percentage: (categories.messages / total) * 100 },
      { name: 'Tickets', value: categories.tickets, color: '#ef4444', percentage: (categories.tickets / total) * 100 },
      { name: 'Contatos', value: categories.contacts, color: '#10b981', percentage: (categories.contacts / total) * 100 },
      { name: 'Outros', value: categories.other, color: '#f59e0b', percentage: (categories.other / total) * 100 }
    ];
  };

  const prepareCompressionStats = (): CompressionStats[] => {
    if (!state.metrics) return [];

    const algorithms = state.metrics.compression.byAlgorithm;
    return [
      { algorithm: 'GZIP', ratio: algorithms.gzip.ratio, savings: ((1 - 1/algorithms.gzip.ratio) * 100), operations: algorithms.gzip.operations || 0, avgTime: 2.5 },
      { algorithm: 'LZ4', ratio: algorithms.lz4.ratio, savings: ((1 - 1/algorithms.lz4.ratio) * 100), operations: algorithms.lz4.operations || 0, avgTime: 1.2 },
      { algorithm: 'Brotli', ratio: algorithms.brotli.ratio, savings: ((1 - 1/algorithms.brotli.ratio) * 100), operations: algorithms.brotli.operations || 0, avgTime: 4.1 }
    ];
  };

  const prepareMemoryData = () => {
    if (!state.metrics) return [];

    return state.metrics.historical.timestamps.map((timestamp, index) => ({
      timestamp,
      totalMemory: state.metrics!.memoryUsage.total,
      usedMemory: state.metrics!.memoryUsage.used,
      freeMemory: state.metrics!.memoryUsage.total - state.metrics!.memoryUsage.used,
      cacheMemory: state.metrics!.memoryUsage.used * 0.7, // Mock cache memory
      compressionRatio: state.metrics!.compression.compressionRatio,
      compressionSavings: ((1 - 1/state.metrics!.compression.compressionRatio) * 100)
    }));
  };

  const prepareAlerts = (): AlertItem[] => {
    if (!state.metrics) return [];

    return state.metrics.alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      title: `Alerta de ${alert.metric || 'sistema'}`,
      message: alert.message,
      timestamp: alert.timestamp || new Date().toISOString(),
      metric: alert.metric || 'unknown',
      value: alert.value || 0,
      threshold: alert.threshold || 0,
      acknowledged: false,
      resolved: false,
      category: alert.metric?.includes('memory') ? 'memory' : 
                alert.metric?.includes('latency') ? 'performance' : 
                alert.metric?.includes('connection') ? 'connection' : 
                alert.metric?.includes('error') ? 'error' : 'system'
    }));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return COLORS.success;
    if (value >= thresholds.warning) return COLORS.warning;
    return COLORS.error;
  };

  if (state.loading && !state.metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Carregando métricas Redis...</p>
        </div>
      </div>
    );
  }

  if (state.error && !state.metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dashboard</AlertTitle>
          <AlertDescription>
            {state.error}
            <Button 
              onClick={handleManualRefresh} 
              className="mt-2 w-full"
              variant="outline"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { metrics } = state;
  if (!metrics) return null;

  const metricsData = prepareMetricsData();
  const memoryCategories = prepareMemoryCategories();
  const compressionStats = prepareCompressionStats();
  const memoryData = prepareMemoryData();
  const alerts = prepareAlerts();

  // Dados para gráficos
  const hitRateData = metrics.historical.timestamps.map((timestamp, index) => ({
    time: new Date(timestamp).toLocaleTimeString(),
    hitRate: metrics.historical.hitRates[index] || 0,
    missRate: 100 - (metrics.historical.hitRates[index] || 0)
  }));

  const performanceData = metrics.historical.timestamps.map((timestamp, index) => ({
    time: new Date(timestamp).toLocaleTimeString(),
    latency: metrics.historical.latencies[index] || 0,
    throughput: metrics.historical.throughput[index] || 0
  }));



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Redis Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Monitoramento em tempo real do cache Redis
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Período */}
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hora</SelectItem>
                  <SelectItem value="6h">6 horas</SelectItem>
                  <SelectItem value="24h">24 horas</SelectItem>
                  <SelectItem value="7d">7 dias</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Auto-refresh */}
              <Button
                onClick={toggleAutoRefresh}
                variant={state.autoRefresh ? "default" : "outline"}
                size="sm"
              >
                {state.autoRefresh ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar
                  </>
                )}
              </Button>
              
              {/* Refresh manual */}
              <Button
                onClick={handleManualRefresh}
                variant="outline"
                size="sm"
                disabled={state.loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              
              {/* Última atualização */}
              {state.lastUpdate && (
                <span className="text-xs text-gray-500">
                  Atualizado: {state.lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alertas */}
        {metrics.alerts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Alertas Ativos</h2>
            <div className="space-y-2">
              {metrics.alerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} className={`border-l-4 ${
                  alert.type === 'error' ? 'border-red-500' :
                  alert.type === 'warning' ? 'border-yellow-500' : 'border-blue-500'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="capitalize">{alert.type}</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Cards de métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Cache Hit Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ 
                color: getStatusColor(metrics.cacheHitRate, { good: 80, warning: 60 }) 
              }}>
                {metrics.cacheHitRate.toFixed(1)}%
              </div>
              <Progress 
                value={metrics.cacheHitRate} 
                className="mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(metrics.totalOperations)} operações totais
              </p>
            </CardContent>
          </Card>

          {/* Latência Média */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latência Média</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ 
                color: getStatusColor(100 - metrics.avgLatency, { good: 50, warning: 20 }) 
              }}>
                {metrics.avgLatency.toFixed(1)}ms
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                P95: {metrics.p95Latency.toFixed(1)}ms | P99: {metrics.p99Latency.toFixed(1)}ms
              </div>
            </CardContent>
          </Card>

          {/* Uso de Memória */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uso de Memória</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ 
                color: getStatusColor(100 - metrics.memoryUsage.percentage, { good: 50, warning: 20 }) 
              }}>
                {metrics.memoryUsage.percentage}%
              </div>
              <Progress 
                value={metrics.memoryUsage.percentage} 
                className="mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(metrics.memoryUsage.used)} / {formatBytes(metrics.memoryUsage.total)}
              </p>
            </CardContent>
          </Card>

          {/* Throughput */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Throughput</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(metrics.throughput)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                operações por segundo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com gráficos */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="memory">Memória</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>

          {/* Tab Performance */}
          <TabsContent value="performance" className="space-y-6">
            <PerformanceCharts data={metrics.historical.timestamps.map((timestamp, index) => ({
              timestamp,
              cacheHitRate: metrics.cacheHitRate,
              latency: metrics.avgLatency,
              throughput: metrics.throughput,
              memoryUsage: metrics.memoryUsage.used,
              compressionRatio: metrics.compression.compressionRatio,
              errorRate: 0.1 // Mock error rate
            }))} timeRange={selectedPeriod} />
          </TabsContent>

          {/* Tab Memória */}
          <TabsContent value="memory" className="space-y-6">
            <MemoryCharts 
              memoryData={memoryData}
              memoryCategories={memoryCategories}
              compressionStats={compressionStats}
              timeRange={selectedPeriod}
            />
          </TabsContent>

          {/* Tab Alertas */}
          <TabsContent value="alerts" className="space-y-6">
            <AlertsPanel 
              alerts={alerts}
              onAcknowledge={(alertId) => console.log('Acknowledged:', alertId)}
              onResolve={(alertId) => console.log('Resolved:', alertId)}
              onDismiss={(alertId) => console.log('Dismissed:', alertId)}
              enableNotifications={true}
              onToggleNotifications={() => console.log('Toggle notifications')}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}