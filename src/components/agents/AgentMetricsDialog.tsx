'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Clock, MessageSquare, Zap, TrendingUp, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: 'active' | 'inactive' | 'error';
}

interface AgentMetricsDialogProps {
  agent: Agent;
  open: boolean;
  onClose: () => void;
}

interface MetricsData {
  totalInteractions: number;
  averageResponseTime: number;
  successRate: number;
  totalTokensUsed: number;
  errorCount: number;
  topTopics: string[];
  dailyStats: {
    date: string;
    interactions: number;
    successRate: number;
    averageResponseTime: number;
  }[];
  hourlyDistribution: {
    hour: number;
    interactions: number;
  }[];
  recentExecutions: {
    id: string;
    input: string;
    output: string;
    executionTime: number;
    confidence: number;
    status: string;
    executedAt: Date;
  }[];
}

export function AgentMetricsDialog({ agent, open, onClose }: AgentMetricsDialogProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30d');
  const { toast } = useToast();

  useEffect(() => {
    if (open && agent.id) {
      loadMetrics();
    }
  }, [open, agent.id, period]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await fetch(`/api/agents/${agent.id}/metrics?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
      } else {
        throw new Error(data.error || 'Erro ao carregar métricas');
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar métricas do agente',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'low_confidence':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Sucesso';
      case 'error':
        return 'Erro';
      case 'low_confidence':
        return 'Baixa Confiança';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Métricas do Agente: {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Período de Análise</h3>
              <p className="text-sm text-gray-600">Selecione o período para visualizar as métricas</p>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Carregando métricas...</span>
            </div>
          ) : metrics ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="topics">Tópicos</TabsTrigger>
                <TabsTrigger value="executions">Execuções</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Interações</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.totalInteractions}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatDuration(metrics.averageResponseTime)}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tokens Usados</CardTitle>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.totalTokensUsed.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily Stats Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Atividade Diária</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.dailyStats.slice(-7).map((day, index) => (
                        <div key={day.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">
                            {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-4 text-sm">
                            <span>{day.interactions} interações</span>
                            <span>{day.successRate.toFixed(1)}% sucesso</span>
                            <span>{formatDuration(day.averageResponseTime)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição por Hora</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {metrics.hourlyDistribution
                          .filter(hour => hour.interactions > 0)
                          .sort((a, b) => b.interactions - a.interactions)
                          .slice(0, 10)
                          .map((hour) => (
                          <div key={hour.hour} className="flex items-center justify-between">
                            <span className="text-sm">{hour.hour}:00 - {hour.hour + 1}:00</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ 
                                    width: `${(hour.interactions / Math.max(...metrics.hourlyDistribution.map(h => h.interactions))) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8">{hour.interactions}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Estatísticas de Erro</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Total de Erros</span>
                          <span className="font-bold text-red-600">{metrics.errorCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Taxa de Erro</span>
                          <span className="font-bold">
                            {metrics.totalInteractions > 0 
                              ? ((metrics.errorCount / metrics.totalInteractions) * 100).toFixed(2)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Execuções Bem-sucedidas</span>
                          <span className="font-bold text-green-600">
                            {metrics.totalInteractions - metrics.errorCount}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Topics Tab */}
              <TabsContent value="topics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tópicos Mais Frequentes</CardTitle>
                    <p className="text-sm text-gray-600">Palavras-chave mais mencionadas nas conversas</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {metrics.topTopics.map((topic, index) => (
                        <Badge key={topic} variant="secondary" className="justify-center p-2">
                          #{index + 1} {topic}
                        </Badge>
                      ))}
                    </div>
                    {metrics.topTopics.length === 0 && (
                      <p className="text-center text-gray-500 py-4">Nenhum tópico identificado ainda</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Executions Tab */}
              <TabsContent value="executions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Execuções Recentes</CardTitle>
                    <p className="text-sm text-gray-600">Últimas 10 execuções do agente</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.recentExecutions.map((execution) => (
                        <div key={execution.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(execution.status)}>
                              {getStatusText(execution.status)}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              {formatDuration(execution.executionTime)}
                              <span>•</span>
                              <span>{formatDate(execution.executedAt)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Entrada:</span>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                {execution.input}
                              </p>
                            </div>
                            
                            {execution.output && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Saída:</span>
                                <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded mt-1">
                                  {execution.output}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Confiança: {(execution.confidence * 100).toFixed(1)}%</span>
                            <span>ID: {execution.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      ))}
                      
                      {metrics.recentExecutions.length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhuma execução encontrada</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma métrica disponível para este período</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}