'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Target,
  Award,
  Zap,
  Users,
  BarChart3,
  Calendar,
  MessageSquare,
  Timer,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket } from './types';

interface ProductivityMetrics {
  ticketsResolvidos: number;
  tempoMedioResposta: string;
  satisfacaoCliente: number;
  ticketsAbertos: number;
  metaDiaria: number;
  eficiencia: number;
  streak: number; // dias consecutivos atingindo meta
  mensagensEnviadas: number;
  tempoMedioResolucao: string;
  ticketsPorHora: number;
  primeiroContato: number; // % resolvidos no primeiro contato
}

interface HourlyData {
  hour: string;
  tickets: number;
  messages: number;
}

interface ProductivityDashboardProps {
  tickets?: Ticket[];
  timeframe?: 'today' | 'week' | 'month';
  agentName?: string;
  showDetailedMetrics?: boolean;
  onTimeframeChange?: (timeframe: 'today' | 'week' | 'month') => void;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
  progress?: number;
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon, 
  color = 'blue',
  progress 
}: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              colorClasses[color]
            )}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon()}
              <span className={cn(
                "font-medium",
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progress}% da meta</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProductivityDashboard({ 
  tickets = [], 
  timeframe = 'today',
  agentName = 'Lucas',
  showDetailedMetrics = true,
  onTimeframeChange
}: ProductivityDashboardProps) {
  // Calcular métricas baseadas nos tickets
  const calculateMetrics = (): ProductivityMetrics => {
    if (!tickets || tickets.length === 0) {
      // Dados mock para demonstração
      return {
        ticketsResolvidos: 8,
        tempoMedioResposta: '2m 30s',
        satisfacaoCliente: 94,
        ticketsAbertos: 12,
        metaDiaria: 15,
        eficiencia: 87,
        streak: 5,
        mensagensEnviadas: 45,
        tempoMedioResolucao: '15m 20s',
        ticketsPorHora: 3.2,
        primeiroContato: 78
      };
    }
    
    const resolvedTickets = tickets.filter(t => t.status === 'Resolvido');
    const openTickets = tickets.filter(t => t.status !== 'Resolvido');
    
    // Calcular métricas reais baseadas nos dados
    const totalMessages = tickets.reduce((acc, ticket) => {
      return acc + (ticket.unreadCount || 0);
    }, 0);
    
    const avgTicketsPerHour = tickets.length > 0 ? tickets.length / 8 : 0; // assumindo 8h de trabalho
    
    return {
      ticketsResolvidos: resolvedTickets.length,
      tempoMedioResposta: '2m 30s',
      satisfacaoCliente: 94,
      ticketsAbertos: openTickets.length,
      metaDiaria: 15,
      eficiencia: Math.round((resolvedTickets.length / Math.max(tickets.length, 1)) * 100),
      streak: 5,
      mensagensEnviadas: totalMessages + 45,
      tempoMedioResolucao: '15m 20s',
      ticketsPorHora: Math.round(avgTicketsPerHour * 10) / 10,
      primeiroContato: 78
    };
  };
  
  // Gerar dados por hora para gráficos
  const generateHourlyData = (): HourlyData[] => {
    const hours = [];
    const currentHour = new Date().getHours();
    
    for (let i = Math.max(0, currentHour - 7); i <= currentHour; i++) {
      hours.push({
        hour: `${i.toString().padStart(2, '0')}:00`,
        tickets: Math.floor(Math.random() * 5) + 1,
        messages: Math.floor(Math.random() * 15) + 5
      });
    }
    
    return hours;
  };

  const metrics = calculateMetrics();
  const hourlyData = generateHourlyData();
  const progressoMeta = (metrics.ticketsResolvidos / metrics.metaDiaria) * 100;

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'today': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      default: return 'Hoje';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Produtividade</h2>
          <p className="text-muted-foreground">
            Performance de {agentName} - {getTimeframeLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onTimeframeChange && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={timeframe === 'today' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTimeframeChange('today')}
                className="h-7 px-2 text-xs"
              >
                Hoje
              </Button>
              <Button
                variant={timeframe === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTimeframeChange('week')}
                className="h-7 px-2 text-xs"
              >
                Semana
              </Button>
              <Button
                variant={timeframe === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTimeframeChange('month')}
                className="h-7 px-2 text-xs"
              >
                Mês
              </Button>
            </div>
          )}
          {metrics.streak > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50">
              <Award className="h-3 w-3 mr-1" />
              {metrics.streak} dias consecutivos
            </Badge>
          )}
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            {metrics.eficiencia}% eficiência
          </Badge>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tickets Resolvidos"
          value={metrics.ticketsResolvidos}
          subtitle={`Meta: ${metrics.metaDiaria}`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
          trend="up"
          trendValue="+12%"
          progress={progressoMeta}
        />
        
        <StatCard
          title="Tempo Médio de Resposta"
          value={metrics.tempoMedioResposta}
          subtitle="Últimas 24h"
          icon={<Clock className="h-5 w-5" />}
          color="blue"
          trend="down"
          trendValue="-15%"
        />
        
        <StatCard
          title="Satisfação do Cliente"
          value={`${metrics.satisfacaoCliente}%`}
          subtitle="CSAT Score"
          icon={<Users className="h-5 w-5" />}
          color="purple"
          trend="up"
          trendValue="+3%"
        />
        
        <StatCard
          title="Tickets em Aberto"
          value={metrics.ticketsAbertos}
          subtitle="Aguardando ação"
          icon={<Target className="h-5 w-5" />}
          color={metrics.ticketsAbertos > 10 ? 'red' : 'amber'}
          trend={metrics.ticketsAbertos > 10 ? 'up' : 'neutral'}
          trendValue={metrics.ticketsAbertos > 10 ? '+2' : '0'}
        />
      </div>

      {/* Métricas Detalhadas */}
      {showDetailedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Mensagens Enviadas"
            value={metrics.mensagensEnviadas}
            subtitle="Total hoje"
            icon={<MessageSquare className="h-5 w-5" />}
            color="blue"
            trend="up"
            trendValue="+8"
          />
          
          <StatCard
            title="Tempo Médio de Resolução"
            value={metrics.tempoMedioResolucao}
            subtitle="Por ticket"
            icon={<Timer className="h-5 w-5" />}
            color="green"
            trend="down"
            trendValue="-2m"
          />
          
          <StatCard
            title="Tickets por Hora"
            value={metrics.ticketsPorHora}
            subtitle="Produtividade"
            icon={<Activity className="h-5 w-5" />}
            color="purple"
            trend="up"
            trendValue="+0.3"
          />
          
          <StatCard
            title="Primeiro Contato"
            value={`${metrics.primeiroContato}%`}
            subtitle="Resolução imediata"
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
            trend="up"
            trendValue="+5%"
          />
        </div>
      )}

      {/* Gráfico de Atividade por Hora */}
      {showDetailedMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Atividade por Hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-8 gap-2">
                {hourlyData.map((data, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{data.hour}</div>
                    <div className="bg-muted rounded-sm h-20 flex flex-col justify-end p-1">
                      <div 
                        className="bg-blue-500 rounded-sm mb-1 min-h-[2px]"
                        style={{ height: `${(data.tickets / 5) * 60}%` }}
                        title={`${data.tickets} tickets`}
                      />
                      <div 
                        className="bg-green-500 rounded-sm min-h-[2px]"
                        style={{ height: `${(data.messages / 20) * 60}%` }}
                        title={`${data.messages} mensagens`}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      <div className="text-blue-600">{data.tickets}t</div>
                      <div className="text-green-600">{data.messages}m</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 bg-blue-500 rounded-sm" />
                  <span>Tickets</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 bg-green-500 rounded-sm" />
                  <span>Mensagens</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Progresso da Meta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progresso da Meta Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Meta de Resolução</span>
              <span className="text-sm text-muted-foreground">
                {metrics.ticketsResolvidos} de {metrics.metaDiaria} tickets
              </span>
            </div>
            <Progress value={progressoMeta} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span className={cn(
                "font-medium",
                progressoMeta >= 100 ? 'text-green-600' : progressoMeta >= 80 ? 'text-amber-600' : 'text-muted-foreground'
              )}>
                {Math.round(progressoMeta)}% concluído
              </span>
              <span>{metrics.metaDiaria}</span>
            </div>
            {progressoMeta >= 100 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Award className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  🎉 Parabéns! Meta diária atingida!
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Tendências */}
      {showDetailedMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Comparação de Períodos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Tickets Resolvidos</p>
                    <p className="text-xs text-muted-foreground">vs. período anterior</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{metrics.ticketsResolvidos}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +12%
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Tempo de Resposta</p>
                    <p className="text-xs text-muted-foreground">vs. período anterior</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{metrics.tempoMedioResposta}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      -8%
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Satisfação</p>
                    <p className="text-xs text-muted-foreground">vs. período anterior</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{metrics.satisfacaoCliente}%</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +3%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Metas e Objetivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Meta Diária</span>
                    <span>{metrics.ticketsResolvidos}/{metrics.metaDiaria}</span>
                  </div>
                  <Progress value={progressoMeta} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Eficiência Alvo (90%)</span>
                    <span>{metrics.eficiencia}%</span>
                  </div>
                  <Progress value={metrics.eficiencia} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Satisfação Alvo (95%)</span>
                    <span>{metrics.satisfacaoCliente}%</span>
                  </div>
                  <Progress value={metrics.satisfacaoCliente} className="h-2" />
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Próximas metas:</p>
                  <ul className="text-xs space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Reduzir tempo de resposta para 3min
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Manter 95% de satisfação
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Aumentar resolução em primeiro contato
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights e Dicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Insights de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium">Excelente tempo de resposta!</p>
                <p className="text-xs text-muted-foreground">
                  Seu tempo médio está 15% abaixo da média da equipe.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium">Oportunidade de melhoria</p>
                <p className="text-xs text-muted-foreground">
                  Considere usar mais templates para acelerar as respostas.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium">Streak de {metrics.streak} dias!</p>
                <p className="text-xs text-muted-foreground">
                  Continue assim para manter sua sequência de metas atingidas.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}