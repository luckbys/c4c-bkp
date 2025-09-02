import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  HardDrive, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Archive,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';

interface MemoryData {
  timestamp: string;
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  cacheMemory: number;
  compressionRatio: number;
  compressionSavings: number;
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

interface MemoryChartsProps {
  memoryData: MemoryData[];
  memoryCategories: MemoryCategory[];
  compressionStats: CompressionStats[];
  timeRange: '1h' | '6h' | '24h' | '7d';
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ 
  title, 
  children, 
  icon, 
  trend, 
  trendValue, 
  description,
  className = ''
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
    <Card className={`h-full ${className}`}>
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

const MemoryUsageChart: React.FC<{ data: MemoryData[] }> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const latestData = data[data.length - 1];
  const usagePercent = (latestData?.usedMemory / latestData?.totalMemory) * 100 || 0;
  const trend = usagePercent <= 70 ? 'up' : usagePercent <= 85 ? 'stable' : 'down';
  const trendValue = `${usagePercent.toFixed(1)}% usado`;

  return (
    <ChartCard
      title="Uso de Memória ao Longo do Tempo"
      icon={<Database className="h-4 w-4" />}
      trend={trend}
      trendValue={trendValue}
      description="Evolução do consumo de memória Redis"
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
            stroke="#666"
            fontSize={12}
            tickFormatter={formatBytes}
          />
          <Tooltip 
            labelFormatter={(value) => `Horário: ${formatTime(value as string)}`}
            formatter={(value: number, name: string) => [
              formatBytes(value), 
              name === 'usedMemory' ? 'Memória Usada' : 
              name === 'cacheMemory' ? 'Cache' : 'Memória Livre'
            ]}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="usedMemory"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
            name="Memória Usada"
          />
          <Area
            type="monotone"
            dataKey="cacheMemory"
            stackId="1"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            name="Cache"
          />
          <Area
            type="monotone"
            dataKey="freeMemory"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
            name="Memória Livre"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const MemoryCategoryChart: React.FC<{ categories: MemoryCategory[] }> = ({ categories }) => {
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const totalMemory = categories.reduce((sum, cat) => sum + cat.value, 0);
  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Não mostrar labels para fatias muito pequenas
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartCard
      title="Distribuição de Memória por Categoria"
      icon={<PieChartIcon className="h-4 w-4" />}
      description="Breakdown do uso de memória por tipo de dados"
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatBytes(value), 
                  name
                ]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 pl-4">
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatBytes(category.value)}</div>
                  <div className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total:</span>
              <span className="text-sm font-bold">{formatBytes(totalMemory)}</span>
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};

const CompressionChart: React.FC<{ data: MemoryData[] }> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const avgRatio = data.reduce((sum, item) => sum + item.compressionRatio, 0) / data.length;
  const avgSavings = data.reduce((sum, item) => sum + item.compressionSavings, 0) / data.length;
  const trend = avgRatio >= 3 ? 'up' : avgRatio >= 2 ? 'stable' : 'down';
  const trendValue = `${avgSavings.toFixed(1)}% economia`;

  return (
    <ChartCard
      title="Eficiência de Compressão"
      icon={<Archive className="h-4 w-4" />}
      trend={trend}
      trendValue={trendValue}
      description="Taxa de compressão e economia de espaço"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
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
            tickFormatter={(value) => `${value}:1`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            labelFormatter={(value) => `Horário: ${formatTime(value as string)}`}
            formatter={(value: number, name: string) => [
              name === 'compressionRatio' ? `${value.toFixed(1)}:1` : `${value.toFixed(1)}%`,
              name === 'compressionRatio' ? 'Taxa de Compressão' : 'Economia de Espaço'
            ]}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="compressionRatio"
            fill="#3b82f6"
            name="Taxa de Compressão"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="compressionSavings"
            stroke="#10b981"
            strokeWidth={3}
            name="Economia de Espaço (%)"
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const CompressionStatsChart: React.FC<{ stats: CompressionStats[] }> = ({ stats }) => {
  return (
    <ChartCard
      title="Estatísticas por Algoritmo de Compressão"
      icon={<BarChart3 className="h-4 w-4" />}
      description="Performance comparativa dos algoritmos de compressão"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stats} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" stroke="#666" fontSize={12} />
          <YAxis 
            type="category" 
            dataKey="algorithm" 
            stroke="#666" 
            fontSize={12}
            width={80}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              switch (name) {
                case 'ratio':
                  return [`${value.toFixed(1)}:1`, 'Taxa de Compressão'];
                case 'savings':
                  return [`${value.toFixed(1)}%`, 'Economia'];
                case 'operations':
                  return [value.toLocaleString(), 'Operações'];
                case 'avgTime':
                  return [`${value.toFixed(2)}ms`, 'Tempo Médio'];
                default:
                  return [value, name];
              }
            }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Bar dataKey="ratio" fill="#3b82f6" name="Taxa de Compressão" />
          <Bar dataKey="savings" fill="#10b981" name="Economia (%)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const MemoryCharts: React.FC<MemoryChartsProps> = ({ 
  memoryData, 
  memoryCategories, 
  compressionStats, 
  timeRange 
}) => {
  return (
    <div className="space-y-6">
      {/* Gráficos de memória */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MemoryUsageChart data={memoryData} />
        <MemoryCategoryChart categories={memoryCategories} />
      </div>
      
      {/* Gráficos de compressão */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompressionChart data={memoryData} />
        <CompressionStatsChart stats={compressionStats} />
      </div>
    </div>
  );
};

export default MemoryCharts;
export { 
  MemoryUsageChart, 
  MemoryCategoryChart, 
  CompressionChart, 
  CompressionStatsChart 
};