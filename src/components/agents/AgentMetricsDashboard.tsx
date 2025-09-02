'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Interfaces para métricas
interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalAssignments: number;
  successfulResponses: number;
  averageConfidence: number;
  averageScore: number;
  responseTime: number;
  fallbackUsed: number;
  lastActive: Date;
  status: 'active' | 'inactive' | 'maintenance';
}

interface SystemMetrics {
  totalTickets: number;
  autoAssignedTickets: number;
  manualAssignedTickets: number;
  unassignedTickets: number;
  averageResponseTime: number;
  successRate: number;
  fallbackRate: number;
}

interface PerformanceData {
  date: string;
  assignments: number;
  successRate: number;
  averageConfidence: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AgentMetricsDashboard() {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const { toast } = useToast();

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Carregar métricas dos agentes
      const agentsResponse = await fetch(`/api/agents/metrics?period=${selectedPeriod}`);
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgentMetrics(agentsData.agents || []);
      }

      // Carregar métricas do sistema
      const systemResponse = await fetch(`/api/system/metrics?period=${selectedPeriod}`);
      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        setSystemMetrics(systemData.metrics);
      }

      // Carregar dados de performance
      const performanceResponse = await fetch(`/api/agents/performance?period=${selectedPeriod}`);
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setPerformanceData(performanceData.data || []);
      }

    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar métricas dos agentes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <AlertTriangle className="w-4 h-4" />;
      case 'maintenance': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const calculateSuccessRate = (successful: number, total: number) => {
    return total > 0 ? ((successful / total) * 100).toFixed(1) : '0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando métricas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Agentes IA</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da performance dos agentes
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1d">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
          
          <Button onClick={loadMetrics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Métricas do Sistema */}
      {systemMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemMetrics.totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                {systemMetrics.autoAssignedTickets} auto-atribuídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemMetrics.successRate.toFixed(1)}%</div>
              <Progress value={systemMetrics.successRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatResponseTime(systemMetrics.averageResponseTime)}
              </div>
              <p className="text-xs text-muted-foreground">Média do sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Fallback</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemMetrics.fallbackRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {systemMetrics.fallbackRate < 10 ? 'Excelente' : 
                 systemMetrics.fallbackRate < 25 ? 'Bom' : 'Atenção'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Tab de Agentes */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4">
            {agentMetrics.map((agent) => (
              <Card key={agent.agentId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                      <CardTitle className="text-lg">{agent.agentName}</CardTitle>
                      <Badge variant="outline">{agent.status}</Badge>
                    </div>
                    {getStatusIcon(agent.status)}
                  </div>
                  <CardDescription>
                    Última atividade: {new Date(agent.lastActive).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Atribuições</p>
                      <p className="text-2xl font-bold">{agent.totalAssignments}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold">
                        {calculateSuccessRate(agent.successfulResponses, agent.totalAssignments)}%
                      </p>
                      <Progress 
                        value={parseFloat(calculateSuccessRate(agent.successfulResponses, agent.totalAssignments))} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Confiança Média</p>
                      <p className="text-2xl font-bold">{(agent.averageConfidence * 100).toFixed(1)}%</p>
                      <Progress value={agent.averageConfidence * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Tempo de Resposta</p>
                      <p className="text-2xl font-bold">{formatResponseTime(agent.responseTime)}</p>
                      {agent.fallbackUsed > 0 && (
                        <p className="text-xs text-yellow-600">
                          {agent.fallbackUsed} fallbacks usados
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab de Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Atribuições por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="assignments" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Sucesso</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Agentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={agentMetrics.map(agent => ({
                        name: agent.agentName,
                        value: agent.totalAssignments
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {agentMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confiança Média por Agente</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agentMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agentName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="averageConfidence" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alertas */}
      {agentMetrics.some(agent => agent.status === 'inactive') && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Alguns agentes estão inativos. Verifique a configuração e conectividade.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}