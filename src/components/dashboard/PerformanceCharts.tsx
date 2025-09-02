import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Clock, Zap, Database } from 'lucide-react';

interface HistoricalData {
  timestamp: string;
  cacheHitRate: number;
  latency: number;
  throughput: number;
  memoryUsage: number;
  compressionRatio: number;
  errorRate: number;
}

interface PerformanceChartsProps {
  data: HistoricalData[];
  timeRange: '1h' | '6h' | '24h' | '7d';
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ 
  title, 
  children, 
  icon, 
  trend, 
  trendValue, 
  description 
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-100';
      case 'down':
        return 'text-red-600 bg-red-100';
      case 'stable':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-gray-500">{icon}</div>}
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        {trend && trendValue && (
          <Badge className={`${getTrendColor()} flex items-center space-x-1 text-xs`}>
            {getTrendIcon()}
            <span>{trendValue}</span>
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {description && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}
        <div className="h-64">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

const CacheHitRateChart: React.FC<{ data: HistoricalData[] }> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const avgHitRate = data.reduce((sum, item) => sum + item.cacheHitRate, 0) / data.length;
  const trend = avgHitRate >= 90 ? 'up' : avgHitRate >= 70 ? 'stable' : 'down';
  const trendValue = `${avgHitRate.toFixed(1)}% média`;

  return (
    <ChartCard
      title="Taxa de Acerto do Cache"
      icon={<Activity className="h-4 w-4" />}
      trend={trend}
      trendValue={trendValue}
      description="Porcentagem de requisições atendidas pelo cache"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTime}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            labelFormatter={(value) => `Horário: ${formatTime(value as string)}`}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Cache Hit Rate']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Area
            type="monotone"
            dataKey="cacheHitRate"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const LatencyChart: React.FC<{ data: HistoricalData[] }> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const avgLatency = data.reduce((sum, item) => sum + item.latency, 0) / data.length;
  const trend = avgLatency <= 10 ? 'up' : avgLatency <= 50 ? 'stable' : 'down';
  const trendValue = `${avgLatency.toFixed(1)}ms média`;

  return (
    <ChartCard
      title="Latência de Resposta"
      icon={<Clock className="h-4 w-4" />}
      trend={trend}
      trendValue={trendValue}
      description="Tempo médio de resposta das operações Redis"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTime}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip 
            labelFormatter={(value) => `Horário: ${formatTime(value as string)}`}
            formatter={(value: number) => [`${value.toFixed(1)}ms`, 'Latência']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const ThroughputChart: React.FC<{ data: HistoricalData[] }> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const avgThroughput = data.reduce((sum, item) => sum + item.throughput, 0) / data.length;
  const trend = avgThroughput >= 1000 ? 'up' : avgThroughput >= 500 ? 'stable' : 'down';
  const trendValue = `${avgThroughput.toFixed(0)} ops/s média`;

  return (
    <ChartCard
      title="Throughput"
      icon={<Zap className="h-4 w-4" />}
      trend={trend}
      trendValue={trendValue}
      description="Operações por segundo processadas pelo Redis"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTime}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            labelFormatter={(value) => `Horário: ${formatTime(value as string)}`}
            formatter={(value: number) => [`${value.toFixed(0)} ops/s`, 'Throughput']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar
            dataKey="throughput"
            fill="#8b5cf6"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const ErrorRateChart: React.FC<{ data: HistoricalData[] }> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const avgErrorRate = data.reduce((sum, item) => sum + item.errorRate, 0) / data.length;
  const trend = avgErrorRate <= 0.1 ? 'up' : avgErrorRate <= 1 ? 'stable' : 'down';
  const trendValue = `${avgErrorRate.toFixed(2)}% média`;

  return (
    <ChartCard
      title="Taxa de Erro"
      icon={<Activity className="h-4 w-4" />}
      trend={trend}
      trendValue={trendValue}
      description="Porcentagem de operações que resultaram em erro"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTime}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            domain={[0, 'dataMax']}
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            labelFormatter={(value) => `Horário: ${formatTime(value as string)}`}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Taxa de Erro']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="errorRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const PerformanceOverviewChart: React.FC<{ data: HistoricalData[] }> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <ChartCard
      title="Visão Geral de Performance"
      icon={<Database className="h-4 w-4" />}
      description="Comparação de métricas principais ao longo do tempo"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTime}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            yAxisId="left"
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#666"
            fontSize={12}
          />
          <Tooltip 
            labelFormatter={(value) => `Horário: ${formatTime(value as string)}`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cacheHitRate"
            stroke="#10b981"
            strokeWidth={2}
            name="Cache Hit Rate (%)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="latency"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Latência (ms)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="throughput"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Throughput (ops/s)"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ data, timeRange }) => {
  return (
    <div className="space-y-6">
      {/* Gráfico de visão geral */}
      <div className="w-full">
        <PerformanceOverviewChart data={data} />
      </div>
      
      {/* Grid de gráficos específicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CacheHitRateChart data={data} />
        <LatencyChart data={data} />
        <ThroughputChart data={data} />
        <ErrorRateChart data={data} />
      </div>
    </div>
  );
};

export default PerformanceCharts;
export { 
  CacheHitRateChart, 
  LatencyChart, 
  ThroughputChart, 
  ErrorRateChart, 
  PerformanceOverviewChart 
};