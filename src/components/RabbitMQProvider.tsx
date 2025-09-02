'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import rabbitmqManager from '@/services/rabbitmq-manager';

interface RabbitMQContextType {
  isConnected: boolean;
  isInitialized: boolean;
  status: {
    initialized: boolean;
    started: boolean;
    rabbitmqConnected: boolean;
    processorsRunning: {
      outbound: boolean;
      webhook: boolean;
      retryManager: boolean;
    };
  } | null;
  restart: () => Promise<void>;
  getQueueStats: () => Promise<any>;
  getRetryStats: () => Promise<any>;
}

const RabbitMQContext = createContext<RabbitMQContextType | undefined>(undefined);

export const useRabbitMQ = () => {
  const context = useContext(RabbitMQContext);
  if (context === undefined) {
    throw new Error('useRabbitMQ must be used within a RabbitMQProvider');
  }
  return context;
};

interface RabbitMQProviderProps {
  children: React.ReactNode;
}

export default function RabbitMQProvider({ children }: RabbitMQProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<RabbitMQContextType['status']>(null);
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  const updateStatus = () => {
    try {
      // No lado do cliente, não fazer nada aqui - o status é atualizado via API
      if (typeof window !== 'undefined') {
        console.log('🌐 Cliente: Status será atualizado via API');
        return;
      }
      
      // Código do servidor
      const currentStatus = rabbitmqManager.getStatus();
      setStatus(currentStatus);
      setIsConnected(currentStatus.rabbitmqConnected);
      setIsInitialized(currentStatus.initialized);
    } catch (error) {
      console.error('❌ Erro ao obter status do RabbitMQ:', error);
      setStatus({
        initialized: false,
        started: false,
        rabbitmqConnected: false,
        processorsRunning: {
          outbound: false,
          webhook: false,
          retryManager: false
        }
      });
      setIsConnected(false);
      setIsInitialized(false);
    }
  };

  const initializeRabbitMQ = async () => {
    if (initializationAttempted) {
      return;
    }

    setInitializationAttempted(true);

    try {
      console.log('🚀 Inicializando RabbitMQ Manager (Cliente)...');
      
      // No lado do cliente, verificar status real via API
      if (typeof window !== 'undefined') {
        console.log('🌐 Executando no cliente - verificando status real do RabbitMQ');
        
        try {
          // Verificar status real do RabbitMQ via API
          const response = await fetch('/api/rabbitmq/init', {
            method: 'GET'
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('📊 Status real do RabbitMQ:', data.status);
            
            setStatus(data.status);
            setIsConnected(data.status.rabbitmqConnected);
            setIsInitialized(data.status.initialized);
            
            console.log('✅ Status do RabbitMQ atualizado do servidor!');
          } else {
            console.error('❌ Erro ao verificar status do RabbitMQ');
            // Fallback para status desconectado
            setStatus({
              initialized: false,
              started: false,
              rabbitmqConnected: false,
              processorsRunning: {
                outbound: false,
                webhook: false,
                retryManager: false
              }
            });
          }
        } catch (fetchError) {
          console.error('❌ Erro na requisição de status:', fetchError);
          // Fallback para status desconectado
          setStatus({
            initialized: false,
            started: false,
            rabbitmqConnected: false,
            processorsRunning: {
              outbound: false,
              webhook: false,
              retryManager: false
            }
          });
        }
        
        return;
      }

      // Código do servidor (não deve ser executado no cliente)
      await rabbitmqManager.start();
      console.log('✅ RabbitMQ Manager inicializado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar RabbitMQ Manager:', error);
      
      // Tentar novamente após 10 segundos
      setTimeout(() => {
        setInitializationAttempted(false);
        initializeRabbitMQ();
      }, 10000);
    } finally {
      updateStatus();
    }
  };

  const restart = async () => {
    try {
      console.log('🔄 Reiniciando RabbitMQ Manager...');
      
      // No lado do cliente, apenas simular o restart
      if (typeof window !== 'undefined') {
        console.log('🌐 Simulando restart do RabbitMQ no cliente');
        setInitializationAttempted(false);
        await initializeRabbitMQ();
        return;
      }
      
      // Código do servidor
      await rabbitmqManager.restart();
      console.log('✅ RabbitMQ Manager reiniciado!');
    } catch (error) {
      console.error('❌ Erro ao reiniciar RabbitMQ Manager:', error);
      throw error;
    } finally {
      updateStatus();
    }
  };

  const getQueueStats = async () => {
    try {
      // No lado do cliente, retornar stats simuladas
      if (typeof window !== 'undefined') {
        return {
          outbound: { messageCount: 0, consumerCount: 1 },
          inbound: { messageCount: 0, consumerCount: 1 },
          webhooks: { messageCount: 0, consumerCount: 1 }
        };
      }
      
      return await rabbitmqManager.getQueueStats();
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas das filas:', error);
      throw error;
    }
  };

  const getRetryStats = async () => {
    try {
      // No lado do cliente, retornar stats simuladas
      if (typeof window !== 'undefined') {
        return {
          totalRetries: 0,
          successfulRetries: 0,
          failedRetries: 0,
          dlqMessages: 0
        };
      }
      
      return await rabbitmqManager.getRetryStats();
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de retry:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Inicializar RabbitMQ apenas no lado do cliente
    if (typeof window !== 'undefined') {
      initializeRabbitMQ();
    }

    // Atualizar status a cada 10 segundos para melhor responsividade
    const statusInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        // No cliente, verificar status via API
        fetch('/api/rabbitmq/init', { 
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache'
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            if (data.success && data.status) {
              console.log('📊 Atualizando status do RabbitMQ:', data.status);
              setStatus(data.status);
              setIsConnected(data.status.rabbitmqConnected);
              setIsInitialized(data.status.initialized);
              console.log('✅ Status atualizado - Conectado:', data.status.rabbitmqConnected, 'Inicializado:', data.status.initialized);
            } else {
              console.warn('⚠️ Resposta da API sem dados válidos:', data);
              setIsConnected(false);
              setIsInitialized(false);
            }
          })
          .catch(error => {
            console.error('❌ Erro ao atualizar status do RabbitMQ:', error);
            setIsConnected(false);
            setIsInitialized(false);
          });
      } else {
        updateStatus();
      }
    }, 10000); // A cada 10 segundos

    // Cleanup
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        rabbitmqManager.stop().catch(error => {
          console.error('❌ Erro ao parar RabbitMQ Manager:', error);
        });
      }
    };
  }, []);

  const contextValue: RabbitMQContextType = {
    isConnected,
    isInitialized,
    status,
    restart,
    getQueueStats,
    getRetryStats
  };

  return (
    <RabbitMQContext.Provider value={contextValue}>
      {children}
    </RabbitMQContext.Provider>
  );
}

// Hook para componentes que precisam verificar se o RabbitMQ está disponível
export const useRabbitMQStatus = () => {
  const { isConnected, isInitialized, status } = useRabbitMQ();
  
  return {
    isAvailable: isConnected && isInitialized,
    isConnected,
    isInitialized,
    status,
    processorsRunning: status?.processorsRunning || {
      outbound: false,
      webhook: false,
      retryManager: false
    }
  };
};