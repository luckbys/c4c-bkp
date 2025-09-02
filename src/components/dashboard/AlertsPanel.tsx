import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  X, 
  Bell, 
  BellOff,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Activity,
  Settings
} from 'lucide-react';

export interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  metric?: string;
  value?: number;
  threshold?: number;
  acknowledged?: boolean;
  resolved?: boolean;
  category: 'performance' | 'memory' | 'connection' | 'error' | 'system';
}

interface AlertsPanelProps {
  alerts: AlertItem[];
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  enableNotifications?: boolean;
  onToggleNotifications?: () => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  onDismiss,
  enableNotifications = true,
  onToggleNotifications
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getBadgeColor = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: AlertItem['category']) => {
    switch (category) {
      case 'performance':
        return <TrendingUp className="h-3 w-3" />;
      case 'memory':
        return <Database className="h-3 w-3" />;
      case 'connection':
        return <Zap className="h-3 w-3" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3" />;
      case 'system':
        return <Activity className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Agora mesmo';
    } else if (diffMins < 60) {
      return `${diffMins}m atrás`;
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else {
      return `${diffDays}d atrás`;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (!showResolved && alert.resolved) return false;
    if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;
    return true;
  });

  const alertCounts = {
    critical: alerts.filter(a => a.type === 'critical' && !a.resolved).length,
    warning: alerts.filter(a => a.type === 'warning' && !a.resolved).length,
    info: alerts.filter(a => a.type === 'info' && !a.resolved).length,
    total: alerts.filter(a => !a.resolved).length
  };

  const categories = [
    { id: 'all', name: 'Todos', count: filteredAlerts.length },
    { id: 'performance', name: 'Performance', count: alerts.filter(a => a.category === 'performance' && !a.resolved).length },
    { id: 'memory', name: 'Memória', count: alerts.filter(a => a.category === 'memory' && !a.resolved).length },
    { id: 'connection', name: 'Conexão', count: alerts.filter(a => a.category === 'connection' && !a.resolved).length },
    { id: 'error', name: 'Erros', count: alerts.filter(a => a.category === 'error' && !a.resolved).length },
    { id: 'system', name: 'Sistema', count: alerts.filter(a => a.category === 'system' && !a.resolved).length }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg font-semibold">Alertas e Notificações</CardTitle>
            {alertCounts.total > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                {alertCounts.total}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleNotifications}
              className="flex items-center space-x-1"
            >
              {enableNotifications ? (
                <>
                  <Bell className="h-3 w-3" />
                  <span>Ativo</span>
                </>
              ) : (
                <>
                  <BellOff className="h-3 w-3" />
                  <span>Inativo</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? 'Ocultar Resolvidos' : 'Mostrar Resolvidos'}
            </Button>
          </div>
        </div>
        
        {/* Resumo de alertas */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Críticos: {alertCounts.critical}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Avisos: {alertCounts.warning}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Informativos: {alertCounts.info}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-6">
            {categories.map(category => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex items-center space-x-1 text-xs"
              >
                <span>{category.name}</span>
                {category.count > 0 && (
                  <Badge className="ml-1 text-xs px-1 py-0 h-4 min-w-4">
                    {category.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">Nenhum alerta ativo</p>
                <p className="text-sm text-gray-400">Todos os sistemas estão funcionando normalmente</p>
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <Alert key={alert.id} className={`${getAlertColor(alert.type)} transition-all duration-200`}>
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm">{alert.title}</h4>
                          <Badge className={`${getBadgeColor(alert.type)} text-xs`}>
                            {alert.type.toUpperCase()}
                          </Badge>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            {getCategoryIcon(alert.category)}
                            <span>{alert.category}</span>
                          </div>
                        </div>
                        <AlertDescription className="text-sm mb-2">
                          {alert.message}
                        </AlertDescription>
                        {alert.metric && alert.value !== undefined && (
                          <div className="text-xs text-gray-600 mb-2">
                            <strong>{alert.metric}:</strong> {alert.value}
                            {alert.threshold && ` (limite: ${alert.threshold})`}
                          </div>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimestamp(alert.timestamp)}</span>
                          </div>
                          {alert.acknowledged && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Reconhecido
                            </Badge>
                          )}
                          {alert.resolved && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Resolvido
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {!alert.acknowledged && !alert.resolved && onAcknowledge && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAcknowledge(alert.id)}
                          className="text-xs px-2 py-1 h-6"
                        >
                          Reconhecer
                        </Button>
                      )}
                      {alert.acknowledged && !alert.resolved && onResolve && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onResolve(alert.id)}
                          className="text-xs px-2 py-1 h-6"
                        >
                          Resolver
                        </Button>
                      )}
                      {onDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDismiss(alert.id)}
                          className="text-xs px-1 py-1 h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;