'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  Users,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface AgentAnalyticsProps {
  agentId: string;
  agentName: string;
}

interface AnalyticsData {
  overview: {
    totalInteractions: number;
    avgResponseTime: number;
    satisfactionScore: number;
    successRate: number;
    activeUsers: number;
    totalTokensUsed: number;
  };
  timeSeriesData: {
    date: string;
    interactions: number;
    responseTime: number;
    satisfaction: number;
    tokens: number;
  }[];
  categoryData: {
    category: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  performanceMetrics: {
    metric: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  }[];
  userFeedback: {
    id: string;
    rating: number;
    comment: string;
    date: string;
    category: string;
  }[];
  errorAnalysis: {
    errorType: string;
    count: number;
    percentage: number;
    lastOccurrence: string;
  }[];
  usagePatterns: {
    hour: number;
    interactions: number;
    avgResponseTime: number;
  }[];
}

const TIME_RANGES = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '1y', label: 'Último ano' },
];

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#6366f1',
  muted: '#6b7280',
};

export function AgentAnalytics({ agentId, agentName }: AgentAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      loadAnalyticsData();
    }
  }, [isOpen, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simular carregamento de dados de analytics
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockData: AnalyticsData = {
        overview: {
          totalInteractions: 2847,
          avgResponseTime: 1.2,
          satisfactionScore: 4.6,
          successRate: 94.2,
          activeUsers: 156,
          totalTokensUsed: 45230,
        },
        timeSeriesData: generateTimeSeriesData(timeRange),
        categoryData: [
          { category: 'Consultas Gerais', count: 1245, percentage: 43.7, color: COLORS.primary },
          { category: 'Suporte Técnico', count: 678, percentage: 23.8, color: COLORS.success },
          { category: 'Vendas', count: 456, percentage: 16.0, color: COLORS.warning },
          { category: 'Reclamações', count: 289, percentage: 10.2, color: COLORS.error },
          { category: 'Outros', count: 179, percentage: 6.3, color: COLORS.info },
        ],
        performanceMetrics: [
          { metric: 'Tempo de Resposta', value: 1.2, change: -8.5, trend: 'up', target: 1.5 },
          { metric: 'Taxa de Sucesso', value: 94.2, change: 2.1, trend: 'up', target: 95.0 },
          { metric: 'Satisfação', value: 4.6, change: 0.3, trend: 'up', target: 4.5 },
          { metric: 'Resolução 1º Contato', value: 87.3, change: -1.2, trend: 'down', target: 90.0 },
        ],
        userFeedback: [
          {
            id: '1',
            rating: 5,
            comment: 'Excelente atendimento, resolveu minha dúvida rapidamente!',
            date: '2024-01-22',
            category: 'Suporte',
          },
          {
            id: '2',
            rating: 4,
            comment: 'Bom agente, mas poderia ser mais detalhado nas explicações.',
            date: '2024-01-21',
            category: 'Consulta',
          },
          {
            id: '3',
            rating: 5,
            comment: 'Muito útil para vendas, consegui fechar o negócio!',
            date: '2024-01-20',
            category: 'Vendas',
          },
        ],
        errorAnalysis: [
          { errorType: 'Timeout de Resposta', count: 23, percentage: 45.1, lastOccurrence: '2024-01-22' },
          { errorType: 'Contexto Insuficiente', count: 15, percentage: 29.4, lastOccurrence: '2024-01-21' },
          { errorType: 'Limite de Tokens', count: 8, percentage: 15.7, lastOccurrence: '2024-01-20' },
          { errorType: 'Erro de API', count: 5, percentage: 9.8, lastOccurrence: '2024-01-19' },
        ],
        usagePatterns: generateUsagePatterns(),
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      toast.error('Erro ao carregar dados de analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSeriesData = (range: string) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        interactions: Math.floor(Math.random() * 100) + 50,
        responseTime: Math.random() * 2 + 0.5,
        satisfaction: Math.random() * 1 + 4,
        tokens: Math.floor(Math.random() * 2000) + 500,
      });
    }
    
    return data;
  };

  const generateUsagePatterns = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      data.push({
        hour,
        interactions: Math.floor(Math.random() * 150) + 10,
        avgResponseTime: Math.random() * 2 + 0.5,
      });
    }
    return data;
  };

  const exportAnalytics = async () => {
    try {
      toast.loading('Gerando relatório...');
      
      // Simular geração de relatório
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Em produção, aqui seria feita a chamada para API de exportação
      const reportData = {
        agentId,
        agentName,
        timeRange,
        generatedAt: new Date().toISOString(),
        data: analyticsData,
      };
      
      // Simular download
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${agentName}_${timeRange}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    }
  };

  const renderOverviewCards = () => {
    if (!analyticsData) return null;
    
    const { overview } = analyticsData;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Interações</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalInteractions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% em relação ao período anterior</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avgResponseTime}s</div>
            <p className="text-xs text-green-600">-8% melhoria</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.satisfactionScore}/5</div>
            <p className="text-xs text-green-600">+0.3 pontos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.successRate}%</div>
            <p className="text-xs text-green-600">+2.1% melhoria</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Utilizados</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalTokensUsed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Custo estimado: $12.45</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!analyticsData) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Performance</CardTitle>
          <CardDescription>Indicadores chave de performance do agente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{metric.metric}</span>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Activity className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div className="text-2xl font-bold">
                    {metric.metric.includes('Tempo') ? `${metric.value}s` : 
                     metric.metric.includes('Satisfação') ? `${metric.value}/5` :
                     `${metric.value}%`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Meta: {metric.metric.includes('Tempo') ? `${metric.target}s` : 
                           metric.metric.includes('Satisfação') ? `${metric.target}/5` :
                           `${metric.target}%`}
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={metric.change > 0 ? 'default' : 'destructive'}
                    className={metric.change > 0 ? 'bg-green-100 text-green-800' : ''}
                  >
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics - {agentName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportAnalytics}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="usage">Uso</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="errors">Erros</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1 px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <TabsContent value="overview" className="space-y-6">
                  {renderOverviewCards()}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Interações ao Longo do Tempo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={analyticsData?.timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area 
                              type="monotone" 
                              dataKey="interactions" 
                              stroke={COLORS.primary} 
                              fill={COLORS.primary}
                              fillOpacity={0.3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribuição por Categoria</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={analyticsData?.categoryData}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="count"
                              label={({ category, percentage }) => `${category} (${percentage}%)`}
                            >
                              {analyticsData?.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="performance" className="space-y-6">
                  {renderPerformanceMetrics()}
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Tempo de Resposta</CardTitle>
                      <CardDescription>Evolução do tempo de resposta ao longo do tempo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData?.timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="responseTime" 
                            stroke={COLORS.warning} 
                            name="Tempo de Resposta (s)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="usage" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Padrões de Uso por Hora</CardTitle>
                      <CardDescription>Distribuição de interações ao longo do dia</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData?.usagePatterns}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="interactions" fill={COLORS.info} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Uso de Tokens</CardTitle>
                      <CardDescription>Consumo de tokens ao longo do tempo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={analyticsData?.timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="tokens" 
                            stroke={COLORS.success} 
                            fill={COLORS.success}
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="feedback" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Feedback dos Usuários</CardTitle>
                      <CardDescription>Comentários e avaliações recentes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyticsData?.userFeedback.map((feedback) => (
                          <div key={feedback.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <span
                                      key={i}
                                      className={`text-sm ${
                                        i < feedback.rating ? 'text-yellow-400' : 'text-gray-300'
                                      }`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <Badge variant="outline">{feedback.category}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">{feedback.date}</span>
                            </div>
                            <p className="text-sm">{feedback.comment}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="errors" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Análise de Erros</CardTitle>
                      <CardDescription>Tipos de erros mais comuns e suas frequências</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyticsData?.errorAnalysis.map((error, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                              <div>
                                <div className="font-medium">{error.errorType}</div>
                                <div className="text-sm text-muted-foreground">
                                  Última ocorrência: {error.lastOccurrence}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{error.count}</div>
                              <div className="text-sm text-muted-foreground">{error.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}