'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Instance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'pending';
  connectionStatus?: 'open' | 'close' | 'connecting';
}

interface InstanceStatusProps {
  instanceName: string;
  onInstanceChange?: (instanceName: string) => void;
}

export function InstanceStatus({ instanceName, onInstanceChange }: InstanceStatusProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchInstances = useCallback(async (force = false) => {
    // Evitar chamadas muito frequentes (mínimo 5 segundos entre chamadas)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 5000) {
      return;
    }
    
    // Cancelar requisição anterior se ainda estiver pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    lastFetchRef.current = now;
    
    try {
      setLoading(true);
      const response = await fetch('/api/instancias', {
        signal: abortControllerRef.current.signal
      });
      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || []);
      }
    } catch (error: any) {
      // Ignorar erros de abort
      if (error.name !== 'AbortError') {
        console.error('Error fetching instances:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as instâncias',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [toast]);

  useEffect(() => {
    fetchInstances(true); // Força a primeira chamada
    
    // Atualizar a cada 60 segundos (reduzido de 30 para 60)
    const interval = setInterval(() => fetchInstances(), 60000);
    
    return () => {
      clearInterval(interval);
      // Cancelar requisição pendente ao desmontar
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchInstances]);

  const selectedInstanceData = instances.find(i => i.name === instanceName);
  const isConnected = selectedInstanceData?.status === 'connected';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'pending':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'pending':
        return 'Conectando';
      default:
        return 'Desconectado';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-500">Carregando...</span>
      </div>
    );
  }

  if (!instanceName) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma instância selecionada. Selecione uma instância para enviar mensagens.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedInstanceData?.status || 'disconnected')}`} />
          <span className="text-sm font-medium">{instanceName}</span>
          <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
            {getStatusIcon(selectedInstanceData?.status || 'disconnected')}
            <span className="ml-1">{getStatusText(selectedInstanceData?.status || 'disconnected')}</span>
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchInstances(true)}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {!isConnected && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            A instância {instanceName} não está conectada. 
            <a 
              href="/instancias" 
              className="underline ml-1 hover:text-red-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Verificar conexão
            </a>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default InstanceStatus;