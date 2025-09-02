'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  Download,
  RefreshCw,
  Settings,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  metrics: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
    avgResponseTime: number;
    memoryUsage: number;
    compressionRatio: number;
    l2CacheHits: number;
    l2CacheMisses: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    connections: number;
    memoryUsagePercent: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: number;
    resolved: boolean;
  }>;
  topKeys: Array<{
    key: string;
    hits: number;
    size: number;
    ttl: number;
  }>;
}

interface OptimizationSuggestion {
  type: 'ttl' | 'compression' | 'memory' | 'warming';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  action: string;
}

export function RedisDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [invalidatePattern, setInvalidatePattern] = useState('');
  const [warmupPattern, setWarmupPattern] = useState('');

  const fetchData = async () => {
    try {
      const [dashboardRes, suggestionsRes] = await Promise.all([
        fetch('/api/redis/dashboard?type=dashboard'),
        fetch('/api/redis/dashboard?type=report')
      ]);

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setData(dashboardData);
      }

      if (suggestionsRes.ok) {
        const reportData = await suggestionsRes.json();
        setSuggestions(reportData.optimizationSuggestions || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do Redis');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateCache = async () => {
    if (!invalidatePattern.trim()) {
      toast.error('Digite um padrão para invalidar');
      return;
    }

    try {
      const response = await fetch('/api/redis/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invalidate_cache',
          data: { pattern: invalidatePattern }
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setInvalidatePattern('');
        fetchData();
      } else {
        toast.error('Erro ao invalidar cache');
      }
    } catch (error) {
      toast.error('Erro ao invalidar cache');
    }
  };

  const handleAddWarmupPattern = async () => {
    if (!warmupPattern.trim()) {
      toast.error('Digite um padrão para warming');
      return;
    }

    try {
      const response = await fetch('/api/redis/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_warmup_pattern',
          data: { warmupPattern }
        })
      });

      if (response.ok) {
        toast.success('Padrão de warming adicionado');
        setWarmupPattern('');
      } else {
        toast.error('Erro ao adicionar padrão');
      }
    } catch (error) {
      toast.error('Erro ao adicionar padrão');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/redis/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          data: { alertId }
        })
      });

      if (response.ok) {
        toast.success('Alerta resolvido');
        fetchData();
      }
    } catch (error) {
      toast.error('Erro ao resolver alerta');
    }
  };

  const exportMetrics = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/redis/dashboard?type=export&format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redis-metrics.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Métricas exportadas');
      }
    } catch (error) {
      toast.error('Erro ao exportar métricas');
    }
  };

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dashboard...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os dados do Redis.
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Redis</h1>
          <p className="text-muted-foreground">Monitoramento e otimização em tempo real</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
            <div className={getStatusColor(data.health.status)}>
              {getStatusIcon(data.health.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{data.health.status}</div>
            <p className="text-xs text-muted-foreground">
              Uptime: {Math.floor(data.health.uptime / 3600)}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.hitRate.toFixed(1)}%</div>
            <Progress value={data.metrics.hitRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Média das últimas 1000 operações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso de Memória</CardTitle>
            <Database className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.health.memoryUsagePercent.toFixed(1)}%</div>
            <Progress value={data.health.memoryUsagePercent} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {data.alerts.filter(alert => !alert.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.filter(alert => !alert.resolved).map((alert) => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    {alert.type.toUpperCase()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolver
                    </Button>
                  </AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="keys">Top Keys</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total de Requests:</span>
                  <span className="font-bold">{data.metrics.totalRequests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hits:</span>
                  <span className="font-bold text-green-600">
                    {Math.round(data.metrics.totalRequests * data.metrics.hitRate / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Misses:</span>
                  <span className="font-bold text-red-600">
                    {Math.round(data.metrics.totalRequests * data.metrics.missRate / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>L2 Cache Hits:</span>
                  <span className="font-bold text-blue-600">{data.metrics.l2CacheHits.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compressão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Taxa de Compressão:</span>
                  <span className="font-bold">{data.metrics.compressionRatio.toFixed(1)}%</span>
                </div>
                <Progress value={data.metrics.compressionRatio} className="mt-2" />
                <p className="text-xs text-muted-foreground">
                  Economia de {(100 - data.metrics.compressionRatio).toFixed(1)}% no uso de memória
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chaves Mais Acessadas</CardTitle>
              <CardDescription>
                Top 10 chaves por número de hits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topKeys.map((key, index) => (
                  <div key={key.key} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-mono text-sm">{key.key}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span>Hits: <strong>{key.hits}</strong></span>
                      <span>Size: <strong>{(key.size / 1024).toFixed(1)}KB</strong></span>
                      <span>TTL: <strong>{key.ttl > 0 ? `${Math.floor(key.ttl / 60)}m` : '∞'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sugestões de Otimização</CardTitle>
              <CardDescription>
                Recomendações baseadas nos padrões de uso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <Alert key={index}>
                    <BarChart3 className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      {suggestion.description}
                      <Badge variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'default' : 'secondary'}>
                        {suggestion.priority}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription>
                      <p><strong>Impacto:</strong> {suggestion.impact}</p>
                      <p><strong>Ação:</strong> {suggestion.action}</p>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Invalidar Cache</CardTitle>
                <CardDescription>
                  Remove chaves do cache por padrão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invalidate-pattern">Padrão (ex: messages:*, tickets:123:*)</Label>
                  <Input
                    id="invalidate-pattern"
                    value={invalidatePattern}
                    onChange={(e) => setInvalidatePattern(e.target.value)}
                    placeholder="Digite o padrão..."
                  />
                </div>
                <Button onClick={handleInvalidateCache} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Invalidar Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Warming</CardTitle>
                <CardDescription>
                  Adiciona padrão para pré-carregamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="warmup-pattern">Padrão de Warming</Label>
                  <Input
                    id="warmup-pattern"
                    value={warmupPattern}
                    onChange={(e) => setWarmupPattern(e.target.value)}
                    placeholder="Digite o padrão..."
                  />
                </div>
                <Button onClick={handleAddWarmupPattern} className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Adicionar Warming
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Exportar Métricas</CardTitle>
              <CardDescription>
                Download dos dados de monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button onClick={() => exportMetrics('json')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar JSON
                </Button>
                <Button onClick={() => exportMetrics('csv')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}