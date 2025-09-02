'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  MessageSquare, 
  Zap, 
  AlertTriangle,
  Activity,
  Users,
  Target,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardMetrics {
  overview: {
    totalAgents: number;
    activeAgents: number;
    totalInteractions: number;
    averageResponseTime: number;
    successRate: number;
    totalTokensUsed: number;
  };
  agentPerformance: {
    agentId: string;
    agentName: string;
    interactions: number;
    successRate: number;
    averageResponseTime: number;
    tokensUsed: number;
    status: string;
  }[];
  timeSeriesData: {
    date: string;
    interactions: number;
    successRate: number;
    responseTime: number;
  }[];
  topTopics: {
    topic: string;
    count: number;
    percentage: number;
  }[];
  recentActivity: {
    id: string;
    agentName: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'error' | 'warning';
    details: string;
  }[];
  alerts: {
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    agentName?: string;
    timestamp: Date;
  }[];
}

export default function AgentDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simular dados do dashboard (implementar API real)
      const mockData: DashboardMetrics = {
        overview: {
          totalAgents: 5,
          activeAgents: 3,
          totalInteractions: 1247,
          averageResponseTime: 1850,
          successRate: 94.2,
          totalTokensUsed: 45230
        },
        agentPerformance: [
          {
            agentId: '1',
            agentName: 'Agente de Vendas',
            interactions: 456,
            successRate: 96.5,
            averageResponseTime: 1650,
            tokensUsed: 18500,
            status: 'active'
          },
          {
            agentId: '2',
            agentName: 'Agente de Suporte',
            interactions: 342,
            successRate: 91.8,
            averageResponseTime: 2100,
            tokensUsed: 15200,
            status: 'active'
          },
          {
            agentId: '3',
            agentName: 'Agente FAQ',
            interactions: 449,
            successRate: 94.7,
            averageResponseTime: 1750,
            tokensUsed: 11530,
            status: 'active'
          }
        ],
        timeSeriesData: [
          { date: '2024-01-15', interactions: 145, successRate: 94.2, responseTime: 1850 },
          { date: '2024-01-16', interactions: 167, successRate: 95.1, responseTime: 1720 },
          { date: '2024-01-17', interactions: 189, successRate: 93.8, responseTime: 1920 },
          { date: '2024-01-18', interactions: 203, successRate: 96.2, responseTime: 1680 },
          { date: '2024-01-19', interactions: 178, successRate: 94.5, responseTime: 1790 },
          { date: '2024-01-20', interactions: 195, successRate: 95.3, responseTime: 1650 },
          { date: '2024-01-21', interactions: 170, successRate: 93.9, responseTime: 1880 }
        ],
        topTopics: [
          { topic: 'preço', count: 234, percentage: 18.8 },
          { topic: 'produto', count: 198, percentage: 15.9 },
          { topic: 'entrega', count: 156, percentage: 12.5 },
          { topic: 'suporte', count: 134, percentage: 10.7 },
          { topic: 'pagamento', count: 112, percentage: 9.0 }
        ],
        recentActivity: [
          {
            id: '1',
            agentName: 'Agente de Vendas',
            action: 'Respondeu consulta sobre preços',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            status: 'success',
            details: 'Cliente interessado em produto premium'
          },
          {
            id: '2',
            agentName: 'Agente de Suporte',
            action: 'Resolveu problema técnico',
            timestamp: new Date(Date.now() - 12 * 60 * 1000),
            status: 'success',
            details: 'Problema de login resolvido'
          },
          {
            id: '3',
            agentName: 'Agente FAQ',
            action: 'Erro ao processar mensagem',
            timestamp: new Date(Date.now() - 18 * 60 * 1000),
            status: 'error',
            details: 'Timeout na API do modelo'
          }
        ],
        alerts: [
          {
            id: '1',
            type: 'warning',
            message: 'Taxa de sucesso do Agente de Suporte abaixo de 95%',
            agentName: 'Agente de Suporte',
            timestamp: new Date(Date.now() - 30 * 60 * 1000)
          },
          {
            id: '2',
            type: 'info',
            message: 'Novo recorde de interações diárias atingido',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        ]
      };
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMetrics(mockData);
      
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do dashboard',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: 'Sucesso',
      description: 'Dados atualizados com sucesso'
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Erro ao carregar dados do dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Agentes</h1>
          <p className="text-gray-600 mt-1">Monitore a performance e atividade dos seus agentes LLM</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={refreshData} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.overview.activeAgents} ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interações</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.totalInteractions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {period === '24h' ? '24h' : period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.overview.successRate >= 95 ? '🟢' : metrics.overview.successRate >= 90 ? '🟡' : '🔴'} 
              {metrics.overview.successRate >= 95 ? 'Excelente' : metrics.overview.successRate >= 90 ? 'Bom' : 'Precisa melhorar'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(metrics.overview.averageResponseTime)}</div>
            <p className="text-xs text-muted-foreground">
              Tempo de resposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="topics">Tópicos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agent Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance por Agente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.agentPerformance.map((agent) => (
                    <div key={agent.agentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{agent.agentName}</div>
                        <div className="text-sm text-gray-600">
                          {agent.interactions} interações • {agent.successRate.toFixed(1)}% sucesso
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatDuration(agent.averageResponseTime)}</div>
                        <div className="text-xs text-gray-500">{agent.tokensUsed.toLocaleString()} tokens</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Series Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Interações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.timeSeriesData.slice(-7).map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <span className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{day.interactions} interações</span>
                        <span>{day.successRate.toFixed(1)}%</span>
                        <span>{formatDuration(day.responseTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status === 'success' ? '✓' : activity.status === 'error' ? '✗' : '⚠'}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.agentName}</div>
                      <div className="text-sm text-gray-600">{activity.action}</div>
                      <div className="text-xs text-gray-500 mt-1">{activity.details}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tópicos Mais Frequentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topTopics.map((topic, index) => (
                  <div key={topic.topic} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{topic.topic}</span>
                        <span className="text-sm text-gray-600">{topic.count} menções</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {topic.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas e Notificações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{alert.message}</div>
                      {alert.agentName && (
                        <div className="text-sm text-gray-600">Agente: {alert.agentName}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(alert.timestamp)}
                    </div>
                  </div>
                ))}
                {metrics.alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum alerta no momento</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}