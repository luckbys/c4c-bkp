import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { usePerformanceMonitor, useAlerts } from '../hooks/usePerformanceMonitor';
import type { PerformanceMetrics, HealthStatus, Alert as AlertType } from '../services/performance-monitor';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  MessageSquare,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Zap,
  BarChart3,
  Settings,
  Download
} from 'lucide-react';

interface PerformanceDashboardProps {
  className?: string;
  autoStart?: boolean;
  showAdvanced?: boolean;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  autoStart = true,
  showAdvanced = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    isMonitoring,
    latestMetrics,
    health,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    refreshMetrics,
    generateReport,
    clearError
  } = usePerformanceMonitor({
    autoStart,
    enableRealTimeUpdates: true,
    metricsHistoryLimit: 50
  });
  
  const { activeAlerts, resolveAlert } = useAlerts();

  /**
   * Formatadores de dados
   */
  const formatters = useMemo(() => ({
    percentage: (value: number) => `${(value * 100).toFixed(1)}%`,
    milliseconds: (value: number) => `${value.toFixed(0)}ms`,
    bytes: (value: number) => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = value;
      let unitIndex = 0;
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      
      return `${size.toFixed(1)} ${units[unitIndex]}`;
    },
    duration: (value: number) => {
      const seconds = Math.floor(value / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    }
  }), []);

  /**
   * Obter cor baseada no status de saúde
   */
  const getHealthColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  /**
   * Obter ícone baseado no status de saúde
   */
  const getHealthIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  /**
   * Obter cor do alerta
   */
  const getAlertColor = (severity: AlertType['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  /**
   * Gerar e baixar relatório
   */
  const handleDownloadReport = () => {
    try {
      const report = generateReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro no monitoramento: {error}
          <Button
            variant="outline"
            size="sm"
            onClick={clearError}
            className="ml-2"
          >
            Limpar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? (
              <>
                <Activity className="w-3 h-3 mr-1" />
                Ativo
              </>
            ) : (
              'Inativo'
            )}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
          >
            <Download className="w-4 h-4 mr-1" />
            Relatório
          </Button>
          
          <Button
            variant={isMonitoring ? 'destructive' : 'default'}
            size="sm"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Parar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Iniciar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alertas ativos */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            Alertas Ativos ({activeAlerts.length})
          </h3>
          {activeAlerts.slice(0, 3).map((alert) => (
            <Alert key={alert.id} variant={getAlertColor(alert.severity)}>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  <strong>{alert.component}:</strong> {alert.message}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resolveAlert(alert.id)}
                >
                  Resolver
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Status de saúde geral */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className={`flex items-center ${getHealthColor(health.overall)}`}>
                {getHealthIcon(health.overall)}
                <span className="ml-2">Status Geral: {health.overall}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(health.components).map(([component, status]) => (
                <div key={component} className="flex items-center space-x-2">
                  <div className={getHealthColor(status)}>
                    {getHealthIcon(status)}
                  </div>
                  <span className="capitalize">{component}</span>
                  <Badge variant={status === 'healthy' ? 'default' : 'destructive'}>
                    {status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs com métricas detalhadas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="coordination">Coordenação</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          {latestMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cache Hit Rate */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatters.percentage(latestMetrics.cache.hitRate)}
                  </div>
                  <Progress 
                    value={latestMetrics.cache.hitRate * 100} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {/* Conexões Ativas */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestMetrics.notifications.activeConnections}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    WebSocket connections
                  </p>
                </CardContent>
              </Card>

              {/* Tempo de Processamento */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tempo Processamento</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatters.milliseconds(latestMetrics.coordination.averageProcessingTime)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Média de coordenação
                  </p>
                </CardContent>
              </Card>

              {/* Uso de Memória */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Uso de Memória</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatters.bytes(latestMetrics.system.memoryUsage)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sistema atual
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Cache */}
        <TabsContent value="cache" className="space-y-4">
          {latestMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Métricas de Cache
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Hit Rate:</span>
                    <span className="font-bold">
                      {formatters.percentage(latestMetrics.cache.hitRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Miss Rate:</span>
                    <span className="font-bold">
                      {formatters.percentage(latestMetrics.cache.missRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Requests:</span>
                    <span className="font-bold">
                      {latestMetrics.cache.totalRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tempo Resposta:</span>
                    <span className="font-bold">
                      {formatters.milliseconds(latestMetrics.cache.averageResponseTime)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {latestMetrics.cache.redisConnected ? (
                      <Wifi className="w-5 h-5 mr-2 text-green-500" />
                    ) : (
                      <WifiOff className="w-5 h-5 mr-2 text-red-500" />
                    )}
                    Status Redis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant={latestMetrics.cache.redisConnected ? 'default' : 'destructive'}>
                        {latestMetrics.cache.redisConnected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Uso de Memória:</span>
                      <span className="font-bold">
                        {formatters.bytes(latestMetrics.cache.memoryUsage)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications" className="space-y-4">
          {latestMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    WebSocket Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Conexões Ativas:</span>
                    <span className="font-bold">
                      {latestMetrics.notifications.activeConnections}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Mensagens Enviadas:</span>
                    <span className="font-bold">
                      {latestMetrics.notifications.messagesSent.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Latência Média:</span>
                    <span className="font-bold">
                      {formatters.milliseconds(latestMetrics.notifications.averageLatency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taxa de Falha:</span>
                    <span className="font-bold">
                      {formatters.percentage(latestMetrics.notifications.failureRate)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Latência</span>
                        <span>{formatters.milliseconds(latestMetrics.notifications.averageLatency)}</span>
                      </div>
                      <Progress 
                        value={Math.min((latestMetrics.notifications.averageLatency / 100) * 100, 100)} 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Taxa de Sucesso</span>
                        <span>{formatters.percentage(1 - latestMetrics.notifications.failureRate)}</span>
                      </div>
                      <Progress 
                        value={(1 - latestMetrics.notifications.failureRate) * 100} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Coordenação */}
        <TabsContent value="coordination" className="space-y-4">
          {latestMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Processamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Eventos Processados:</span>
                    <span className="font-bold">
                      {latestMetrics.coordination.eventsProcessed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tempo Médio:</span>
                    <span className="font-bold">
                      {formatters.milliseconds(latestMetrics.coordination.averageProcessingTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Fila:</span>
                    <span className="font-bold">
                      {latestMetrics.coordination.queueLength}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taxa de Erro:</span>
                    <span className="font-bold">
                      {formatters.percentage(latestMetrics.coordination.errorRate)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>CPU:</span>
                    <span className="font-bold">
                      {formatters.percentage(latestMetrics.system.cpuUsage / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Memória:</span>
                    <span className="font-bold">
                      {formatters.bytes(latestMetrics.system.memoryUsage)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Uptime:</span>
                    <span className="font-bold">
                      {formatters.duration(latestMetrics.system.uptime)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
export { PerformanceDashboard };