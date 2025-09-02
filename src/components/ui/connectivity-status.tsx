'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  Shield, 
  Wifi,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { firestoreRetry } from '@/services/firestore-retry';

type ConnectivityStatus = 'online' | 'offline' | 'checking' | 'error' | 'blocked' | 'degraded';

interface ConnectivityStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function ConnectivityStatus({ className, showDetails = true }: ConnectivityStatusProps) {
  const [status, setStatus] = useState<ConnectivityStatus>('checking');
  const [isVisible, setIsVisible] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const lastCheckRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkConnectivity = useCallback(async () => {
    const now = Date.now();
    
    // Debounce: evitar verificações muito frequentes (mínimo 3 segundos)
    if (now - lastCheckRef.current < 3000) {
      return;
    }
    
    lastCheckRef.current = now;
    setStatus('checking');
    setLastError(null);
    
    try {
      const isConnected = await firestoreRetry.checkConnectivity();
      
      if (isConnected) {
        setStatus('online');
        setRetryCount(0);
        
        // Esconder notificação após 3 segundos se estiver online
        if (isVisible) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
        }
      } else {
        setStatus('error');
        setIsVisible(true);
      }
    } catch (error: any) {
      console.error('Connectivity check failed:', error);
      setLastError(error.message || 'Erro de conectividade');
      
      // Determinar tipo de erro
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
          error.message?.includes('blocked')) {
        setStatus('blocked');
      } else if (!navigator.onLine) {
        setStatus('offline');
      } else {
        setStatus('error');
      }
      
      setIsVisible(true);
    }
  }, [isVisible]);

  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    await checkConnectivity();
  }, [checkConnectivity]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Monitorar status da rede
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network back online');
      checkConnectivity();
    };

    const handleOffline = () => {
      console.log('🌐 Network offline');
      setStatus('offline');
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check inicial
    checkConnectivity();

    // Verificar periodicamente apenas se não estiver online
    const interval = setInterval(() => {
      // Só verificar se não estiver online ou checking
      if (status !== 'online' && status !== 'checking') {
        checkConnectivity();
      }
      
      // Atualizar tamanho da fila
      setQueueSize(firestoreRetry.queueSize);
    }, 15000); // A cada 15 segundos (reduzido a frequência)

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkConnectivity]); // Removido 'status' das dependências

  // Não mostrar se estiver online e não for visível
  if (status === 'online' && !isVisible) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          title: 'Conectado',
          description: 'Sistema funcionando normalmente'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          title: 'Sem conexão',
          description: 'Verifique sua conexão com a internet'
        };
      case 'blocked':
        return {
          icon: Shield,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          title: 'Bloqueado por extensão',
          description: 'Um bloqueador de anúncios ou extensão está interferindo. Desative-o para este site.'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          title: 'Erro de conexão',
          description: lastError || 'Problema ao conectar com o servidor'
        };
      case 'checking':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          title: 'Verificando...',
          description: 'Testando conectividade'
        };
      case 'degraded':
        return {
          icon: Wifi,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          title: 'Conexão instável',
          description: 'Algumas funcionalidades podem estar lentas'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          title: 'Status desconhecido',
          description: 'Não foi possível determinar o status'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Alert className={cn(
      'relative transition-all duration-300',
      config.bgColor,
      className
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn(
          'h-5 w-5 mt-0.5',
          config.color,
          status === 'checking' && 'animate-spin'
        )} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn('font-medium text-sm', config.color)}>
              {config.title}
            </h4>
            
            {queueSize > 0 && (
              <Badge variant="secondary" className="text-xs">
                {queueSize} na fila
              </Badge>
            )}
            
            {retryCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {retryCount} tentativas
              </Badge>
            )}
          </div>
          
          <AlertDescription className="text-sm">
            {config.description}
          </AlertDescription>
          
          {showDetails && status === 'blocked' && (
            <div className="mt-3 p-3 bg-white/50 rounded border border-orange-200">
              <p className="text-xs text-orange-700 font-medium mb-2">
                Como resolver:
              </p>
              <ul className="text-xs text-orange-600 space-y-1">
                <li>• Desative bloqueadores de anúncios para este site</li>
                <li>• Adicione o site à lista de exceções</li>
                <li>• Tente usar modo incógnito</li>
                <li>• Desative extensões temporariamente</li>
              </ul>
            </div>
          )}
          
          {showDetails && (status === 'error' || status === 'offline') && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={false}
                className="h-8 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 hover:bg-white/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

// Hook para usar o status de conectividade
export function useConnectivityStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasFirestoreAccess, setHasFirestoreAccess] = useState(true);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      setIsOnline(navigator.onLine);
      
      try {
        await firestoreRetry.checkConnectivity();
        setHasFirestoreAccess(true);
      } catch (error) {
        setHasFirestoreAccess(false);
      }
      
      setQueueSize(firestoreRetry.queueSize);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    hasFirestoreAccess,
    queueSize,
    isFullyConnected: isOnline && hasFirestoreAccess
  };
}