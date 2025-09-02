import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Activity, Database, Zap, Clock } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
  icon?: React.ReactNode;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'purple';
  progress?: number;
  maxValue?: number;
}

interface RedisMetricsCardProps {
  metrics: {
    cacheHitRate: number;
    totalOperations: number;
    avgLatency: number;
    memoryUsed: number;
    memoryTotal: number;
    compressionRatio: number;
    activeConnections: number;
    throughput: number;
    uptime: number;
    errorRate: number;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  trend,
  trendValue,
  description,
  icon,
  color = 'blue',
  progress,
  maxValue
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'border-green-200 bg-green-50';
      case 'red':
        return 'border-red-200 bg-red-50';
      case 'blue':
        return 'border-blue-200 bg-blue-50';
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50';
      case 'purple':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card className={`${getColorClasses()} transition-all duration-200 hover:shadow-md`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-gray-500">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
              {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-gray-600 mt-1">
                {description}
              </p>
            )}
          </div>
          {trend && trendValue && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-xs font-medium ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress 
              value={progress} 
              className="h-2" 
              max={maxValue || 100}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{progress.toFixed(1)}%</span>
              {maxValue && <span>Max: {maxValue}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RedisMetricsCard: React.FC<RedisMetricsCardProps> = ({ metrics }) => {
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
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

  const memoryUsagePercent = (metrics.memoryUsed / metrics.memoryTotal) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Cache Hit Rate"
        value={metrics.cacheHitRate}
        unit="%"
        trend={metrics.cacheHitRate >= 90 ? 'up' : metrics.cacheHitRate >= 70 ? 'stable' : 'down'}
        trendValue={metrics.cacheHitRate >= 90 ? 'Excelente' : metrics.cacheHitRate >= 70 ? 'Bom' : 'Baixo'}
        description="Taxa de acerto do cache"
        icon={<Activity className="h-4 w-4" />}
        color={metrics.cacheHitRate >= 90 ? 'green' : metrics.cacheHitRate >= 70 ? 'blue' : 'red'}
        progress={metrics.cacheHitRate}
      />
      
      <MetricCard
        title="Latência Média"
        value={metrics.avgLatency}
        unit="ms"
        trend={metrics.avgLatency <= 10 ? 'up' : metrics.avgLatency <= 50 ? 'stable' : 'down'}
        trendValue={metrics.avgLatency <= 10 ? 'Ótima' : metrics.avgLatency <= 50 ? 'Boa' : 'Alta'}
        description="Tempo médio de resposta"
        icon={<Clock className="h-4 w-4" />}
        color={metrics.avgLatency <= 10 ? 'green' : metrics.avgLatency <= 50 ? 'blue' : 'red'}
      />
      
      <MetricCard
        title="Uso de Memória"
        value={formatBytes(metrics.memoryUsed)}
        trend={memoryUsagePercent <= 70 ? 'up' : memoryUsagePercent <= 85 ? 'stable' : 'down'}
        trendValue={`${memoryUsagePercent.toFixed(1)}% usado`}
        description={`Total: ${formatBytes(metrics.memoryTotal)}`}
        icon={<Database className="h-4 w-4" />}
        color={memoryUsagePercent <= 70 ? 'green' : memoryUsagePercent <= 85 ? 'blue' : 'red'}
        progress={memoryUsagePercent}
      />
      
      <MetricCard
        title="Throughput"
        value={metrics.throughput}
        unit="ops/s"
        trend={metrics.throughput >= 1000 ? 'up' : metrics.throughput >= 500 ? 'stable' : 'down'}
        trendValue={metrics.throughput >= 1000 ? 'Alto' : metrics.throughput >= 500 ? 'Médio' : 'Baixo'}
        description="Operações por segundo"
        icon={<Zap className="h-4 w-4" />}
        color={metrics.throughput >= 1000 ? 'green' : metrics.throughput >= 500 ? 'blue' : 'yellow'}
      />
      
      <MetricCard
        title="Operações Totais"
        value={metrics.totalOperations}
        description="Total de operações executadas"
        icon={<Activity className="h-4 w-4" />}
        color="blue"
      />
      
      <MetricCard
        title="Compressão"
        value={metrics.compressionRatio}
        unit=":1"
        trend={metrics.compressionRatio >= 3 ? 'up' : metrics.compressionRatio >= 2 ? 'stable' : 'down'}
        trendValue={`${((1 - 1/metrics.compressionRatio) * 100).toFixed(1)}% economia`}
        description="Taxa de compressão"
        icon={<Database className="h-4 w-4" />}
        color={metrics.compressionRatio >= 3 ? 'green' : 'blue'}
      />
      
      <MetricCard
        title="Conexões Ativas"
        value={metrics.activeConnections}
        description="Conexões simultâneas"
        icon={<Activity className="h-4 w-4" />}
        color="purple"
      />
      
      <MetricCard
        title="Uptime"
        value={formatUptime(metrics.uptime)}
        trend="up"
        trendValue={`${(metrics.uptime / 86400).toFixed(1)} dias`}
        description="Tempo de atividade"
        icon={<Clock className="h-4 w-4" />}
        color="green"
      />
    </div>
  );
};

export default RedisMetricsCard;
export { MetricCard };