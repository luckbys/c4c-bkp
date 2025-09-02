'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  RefreshCw, 
  Trash2,
  Clock,
  BarChart3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CacheMetrics {
  instance: string;
  timestamp: string;
  cache: {
    tickets: {
      stats: {
        hits: number;
        misses: number;
        total: number;
        hitRate: number;
      } | null;
      counters: {
        total: number;
        unread: number;
        open: number;
        pending: number;
        resolved: number;
        closed: number;
      } | null;
      metrics: {
        total: number;
        activeToday: number;
        avgResponseTime: number;
        oldestTicket: string | null;
        newestTicket: string | null;
        statusDistribution: Record<string, number>;
      } | null;
    };
    redis: {
      connected: boolean;
      memory: string | null;
    };
  };
  performance: {
    estimatedFirestoreReadsAvoided: number;
    cacheHitRate: number;
    avgResponseTime: string | null;
  };
}

interface CacheMetricsProps {
  instanceName: string;
}

export default function CacheMetrics({ instanceName }: CacheMetricsProps) {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/cache-metrics?instance=${encodeURIComponent(instanceName)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cache metrics');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching cache metrics:', error);
      toast({
        title: "Erro ao buscar métricas",
        description: "Não foi possível carregar as métricas de cache.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearCache = async (type: 'tickets' | 'all') => {
    try {
      const response = await fetch(`/api/cache-metrics?instance=${encodeURIComponent(instanceName)}&type=${type}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }
      const data = await response.json();
      toast({
        title: "Cache limpo",
        description: `${data.deletedEntries} entradas removidas do cache.`,
      });
      fetchMetrics(); // Refresh metrics after clearing
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Erro ao limpar cache",
        description: "Não foi possível limpar o cache.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [instanceName]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, instanceName]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas de Cache
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas de Cache
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Não foi possível carregar as métricas.</p>
        </CardContent>
      </Card>
    );
  }

  const { cache, performance } = metrics;
  const hitRate = cache.tickets.stats?.hitRate || 0;
  const readsAvoided = performance.estimatedFirestoreReadsAvoided;
  const totalRequests = cache.tickets.stats?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Métricas de Cache</h2>
          <p className="text-muted-foreground">
            Instância: {instanceName} • Última atualização: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearCache('tickets')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Cache
          </Button>
        </div>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hitRate.toFixed(1)}%</div>
            <Progress value={hitRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {cache.tickets.stats?.hits || 0} hits de {totalRequests} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leituras Evitadas</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readsAvoided.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Economia estimada no Firestore
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets em Cache</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cache.tickets.counters?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {cache.tickets.counters?.unread || 0} não lidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Redis</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={cache.redis.connected ? 'default' : 'destructive'}>
                {cache.redis.connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cache Redis operacional
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por status */}
      {cache.tickets.counters && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Tickets</CardTitle>
            <CardDescription>
              Contadores de tickets por status no cache
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Abertos</span>
                  <Badge variant="default">{cache.tickets.counters.open}</Badge>
                </div>
                <Progress value={(cache.tickets.counters.open / cache.tickets.counters.total) * 100} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pendentes</span>
                  <Badge variant="secondary">{cache.tickets.counters.pending}</Badge>
                </div>
                <Progress value={(cache.tickets.counters.pending / cache.tickets.counters.total) * 100} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resolvidos</span>
                  <Badge variant="outline">{cache.tickets.counters.resolved}</Badge>
                </div>
                <Progress value={(cache.tickets.counters.resolved / cache.tickets.counters.total) * 100} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fechados</span>
                  <Badge variant="destructive">{cache.tickets.counters.closed}</Badge>
                </div>
                <Progress value={(cache.tickets.counters.closed / cache.tickets.counters.total) * 100} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas de atividade */}
      {cache.tickets.metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Atividade dos Tickets</CardTitle>
            <CardDescription>
              Métricas de atividade e performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <span className="text-sm font-medium">Ativos Hoje</span>
                <div className="text-2xl font-bold">{cache.tickets.metrics.activeToday}</div>
                <p className="text-xs text-muted-foreground">
                  de {cache.tickets.metrics.total} total
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Tempo Médio de Resposta</span>
                <div className="text-2xl font-bold">
                  {cache.tickets.metrics.avgResponseTime > 0 
                    ? `${Math.round(cache.tickets.metrics.avgResponseTime / 1000)}s`
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Tempo médio de resposta
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Último Ticket</span>
                <div className="text-sm">
                  {cache.tickets.metrics.newestTicket 
                    ? new Date(cache.tickets.metrics.newestTicket).toLocaleString()
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Ticket mais recente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}