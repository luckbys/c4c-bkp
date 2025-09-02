'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useRabbitMQ } from '@/components/RabbitMQProvider';
import { useToast } from '@/hooks/use-toast';

interface QueueStats {
  outbound: { messageCount: number; consumerCount: number };
  inbound: { messageCount: number; consumerCount: number };
  webhooks: { messageCount: number; consumerCount: number };
  dlqs: {
    outbound: { messageCount: number };
    inbound: { messageCount: number };
    webhooks: { messageCount: number };
  };
}

interface RetryStats {
  pending: number;
  dlq: number;
  success: number;
}

export default function RabbitMQMonitor() {
  const { status, restart, getQueueStats, getRetryStats } = useRabbitMQ();
  const { toast } = useToast();
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [retryStats, setRetryStats] = useState<RetryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStats = async () => {
    if (!status?.initialized) return;
    
    setIsLoading(true);
    try {
      const [queueData, retryData] = await Promise.all([
        getQueueStats(),
        getRetryStats()
      ]);
      
      setQueueStats(queueData);
      setRetryStats(retryData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      toast({
        title: 'Erro ao carregar estatísticas',
        description: 'Não foi possível obter dados do RabbitMQ',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    try {
      setIsLoading(true);
      await restart();
      toast({
        title: 'RabbitMQ reiniciado',
        description: 'Todos os processadores foram reiniciados com sucesso',
        variant: 'default'
      });
      await loadStats();
    } catch (error) {
      console.error('❌ Erro ao reiniciar RabbitMQ:', error);
      toast({
        title: 'Erro ao reiniciar',
        description: 'Falha ao reiniciar o RabbitMQ Manager',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Atualizar estatísticas a cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    
    return () => clearInterval(interval);
  }, [status?.initialized]);

  const getStatusBadge = (isRunning: boolean, label: string) => {
    return (
      <Badge variant={isRunning ? 'default' : 'destructive'} className="flex items-center gap-1">
        {isRunning ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {label}
      </Badge>
    );
  };

  const getQueueHealthBadge = (messageCount: number, consumerCount: number) => {
    if (consumerCount === 0) {
      return <Badge variant="destructive">Sem Consumidores</Badge>;
    }
    if (messageCount > 100) {
      return <Badge variant="destructive">Sobregregado</Badge>;
    }
    if (messageCount > 50) {
      return <Badge variant="secondary">Alto Volume</Badge>;
    }
    return <Badge variant="default">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor RabbitMQ</h2>
          <p className="text-muted-foreground">
            Status e estatísticas do sistema de filas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadStats}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={handleRestart}
            disabled={isLoading || !status?.initialized}
            variant="destructive"
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Reiniciar
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status Geral
          </CardTitle>
          <CardDescription>
            Estado atual dos componentes do RabbitMQ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Conexão</p>
              {getStatusBadge(status?.rabbitmqConnected || false, status?.rabbitmqConnected ? 'Conectado' : 'Desconectado')}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Processador Outbound</p>
              {getStatusBadge(status?.processorsRunning.outbound || false, 'Outbound')}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Processador Webhook</p>
              {getStatusBadge(status?.processorsRunning.webhook || false, 'Webhook')}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Retry Manager</p>
              {getStatusBadge(status?.processorsRunning.retryManager || false, 'Retry')}
            </div>
          </div>
          
          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-4">
              Última atualização: {lastUpdate.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas das Filas */}
      {queueStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Fila Outbound */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fila Outbound</CardTitle>
              <CardDescription>Mensagens para envio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mensagens na fila:</span>
                  <Badge variant="outline">{queueStats.outbound.messageCount}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Consumidores:</span>
                  <Badge variant="outline">{queueStats.outbound.consumerCount}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  {getQueueHealthBadge(queueStats.outbound.messageCount, queueStats.outbound.consumerCount)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fila Inbound */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fila Inbound</CardTitle>
              <CardDescription>Mensagens recebidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mensagens na fila:</span>
                  <Badge variant="outline">{queueStats.inbound.messageCount}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Consumidores:</span>
                  <Badge variant="outline">{queueStats.inbound.consumerCount}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  {getQueueHealthBadge(queueStats.inbound.messageCount, queueStats.inbound.consumerCount)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fila Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fila Webhooks</CardTitle>
              <CardDescription>Webhooks da Evolution API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mensagens na fila:</span>
                  <Badge variant="outline">{queueStats.webhooks.messageCount}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Consumidores:</span>
                  <Badge variant="outline">{queueStats.webhooks.consumerCount}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  {getQueueHealthBadge(queueStats.webhooks.messageCount, queueStats.webhooks.consumerCount)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dead Letter Queues */}
      {queueStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Dead Letter Queues
            </CardTitle>
            <CardDescription>
              Mensagens que falharam no processamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">DLQ Outbound</p>
                <Badge variant={queueStats.dlqs.outbound.messageCount > 0 ? 'destructive' : 'default'}>
                  {queueStats.dlqs.outbound.messageCount} mensagens
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">DLQ Inbound</p>
                <Badge variant={queueStats.dlqs.inbound.messageCount > 0 ? 'destructive' : 'default'}>
                  {queueStats.dlqs.inbound.messageCount} mensagens
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">DLQ Webhooks</p>
                <Badge variant={queueStats.dlqs.webhooks.messageCount > 0 ? 'destructive' : 'default'}>
                  {queueStats.dlqs.webhooks.messageCount} mensagens
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas de Retry */}
      {retryStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Sistema de Retry
            </CardTitle>
            <CardDescription>
              Estatísticas do sistema de tentativas automáticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Retries Pendentes</p>
                <Badge variant="outline">{retryStats.pending}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Mensagens na DLQ</p>
                <Badge variant={retryStats.dlq > 0 ? 'destructive' : 'default'}>
                  {retryStats.dlq}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Sucessos</p>
                <Badge variant="default">{retryStats.success}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {!status?.initialized && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">RabbitMQ não inicializado</p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              O sistema RabbitMQ não foi inicializado. Verifique as configurações e tente reiniciar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}