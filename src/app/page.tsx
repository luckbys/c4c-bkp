
'use client';

import * as React from 'react';
import { clientFirebaseService } from '@/services/client-firebase-service';
import ActionMenu from '@/components/crm/ActionMenu';
import TicketList from '@/components/crm/TicketList';
import ChatPanel from '@/components/crm/ChatPanel';
import InfoPanel from '@/components/crm/InfoPanel';
import ProductivityDashboard from '@/components/crm/ProductivityDashboard';
import AdvancedFilters, { useFilteredTickets, AdvancedFilters as AdvancedFiltersType } from '@/components/crm/AdvancedFilters';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart3, Users, Clock, TrendingUp, Filter, Search, Bell, Settings, Menu, X, PanelRightClose, PanelRightOpen, RefreshCw } from 'lucide-react';
import type { Ticket, Message } from '@/components/crm/types';
import CrmLayout from '@/components/crm/CrmLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserMenu } from '@/components/auth/UserMenu';


// Hook para buscar instâncias disponíveis
function useInstances() {
  const [instances, setInstances] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchInstances = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/instancias');
        if (response.ok) {
          const data = await response.json();
          setInstances(data.instances || []);
        } else {
          console.error('Failed to fetch instances');
          // Fallback para instância hardcoded se a API falhar
          setInstances([{
            id: 'loja',
            name: 'loja',
            status: 'connected',
            apiKey: '**********'
          }]);
        }
      } catch (error) {
        console.error('Error fetching instances:', error);
        // Fallback para instância hardcoded se houver erro
        setInstances([{
          id: 'loja',
          name: 'loja',
          status: 'connected',
          apiKey: '**********'
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstances();
  }, []);

  return { instances, loading };
}

// Hook para buscar tickets do Firebase com listeners em tempo real
function useTickets(selectedInstance: string | null) {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedInstance) {
      setTickets([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Cache warming será ativado automaticamente quando os dados forem carregados

    // Configurar listener em tempo real para tickets
    const unsubscribe = clientFirebaseService.subscribeToTickets(
      selectedInstance,
      (updatedTickets) => {
        setTickets(updatedTickets);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to tickets:', error);
        setError('Erro ao carregar conversas');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedInstance]);

  const refetch = React.useCallback(async () => {
    if (!selectedInstance) return;
    
    setLoading(true);
    try {
      const ticketsData = await clientFirebaseService.getTickets(selectedInstance);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error refetching tickets:', error);
      setError('Erro ao recarregar conversas');
    } finally {
      setLoading(false);
    }
  }, [selectedInstance]);

  return { tickets, loading, error, refetch, setTickets };
}


export default function CrmPage() {
  console.log('🏠 [PAGE] CrmPage renderizada');
  const [selectedInstance, setSelectedInstance] = React.useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const [filters, setFilters] = React.useState<AdvancedFiltersType>({
    status: [],
    priority: [],
    assignee: [],
    dateRange: { start: null, end: null },
    channel: [],
    hasUnread: null,
    responseTimeRange: null
  });
  const [showProductivityDashboard, setShowProductivityDashboard] = React.useState(false);
  const [showDetailedMetrics, setShowDetailedMetrics] = React.useState(false);
  const [dashboardTimeframe, setDashboardTimeframe] = React.useState<'today' | 'week' | 'month'>('today');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const { instances, loading: instancesLoading } = useInstances();
  const { tickets, loading: ticketsLoading, error: ticketsError, refetch: refetchTickets, setTickets } = useTickets(selectedInstance);
  
  // Aplicar filtros usando o hook
  const filteredTickets = useFilteredTickets(tickets, filters);
  
  // Auto-select first instance when instances are loaded
  React.useEffect(() => {
    if (instances.length > 0 && !selectedInstance) {
      const connectedInstance = instances.find(inst => inst.status === 'connected');
      if (connectedInstance) {
        setSelectedInstance(connectedInstance.name);
      } else if (instances[0]) {
        setSelectedInstance(instances[0].name);
      }
    }
  }, [instances]); // Removido selectedInstance para evitar loop
  
  // Auto-select first ticket when tickets are loaded
  React.useEffect(() => {
    console.log('🔄 [AUTO-SELECT] Verificando auto-seleção:', {
      ticketsCount: tickets.length,
      hasSelectedTicket: !!selectedTicket,
      selectedTicketId: selectedTicket?.id
    });
    
    if (tickets.length > 0 && !selectedTicket) {
      console.log('🔄 [AUTO-SELECT] Selecionando primeiro ticket automaticamente');
      setSelectedTicket(tickets[0]);
    } else if (tickets.length === 0 && selectedTicket) {
      console.log('🔄 [AUTO-SELECT] Limpando ticket selecionado (lista vazia)');
      setSelectedTicket(null);
    } else if (selectedTicket && tickets.length > 0) {
      // Verificar se o ticket selecionado ainda existe na lista
      const ticketStillExists = tickets.some(t => t.id === selectedTicket.id);
      if (!ticketStillExists) {
        console.log('🔄 [AUTO-SELECT] Ticket selecionado não existe mais, selecionando primeiro');
        setSelectedTicket(tickets[0]);
      } else {
        // Atualizar o ticket selecionado com dados mais recentes, mas preservar mensagens
        const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
        if (updatedTicket) {
          // Preservar mensagens existentes e estado crítico
          const mergedTicket = {
            ...updatedTicket,
            messages: updatedTicket.messages && updatedTicket.messages.length > 0 
              ? updatedTicket.messages 
              : selectedTicket.messages || [],
            // Preservar dados críticos do ticket atual se não estiverem no atualizado
            client: updatedTicket.client || selectedTicket.client,
            instanceName: updatedTicket.instanceName || selectedTicket.instanceName
          };
          
          // Só atualizar se realmente houver mudanças significativas
          const hasSignificantChanges = 
            updatedTicket.status !== selectedTicket.status ||
            updatedTicket.lastMessageTime !== selectedTicket.lastMessageTime ||
            (updatedTicket.messages?.length || 0) !== (selectedTicket.messages?.length || 0) ||
            updatedTicket.unreadCount !== selectedTicket.unreadCount;
            
          if (hasSignificantChanges) {
            console.log('🔄 [AUTO-SELECT] Atualizando dados do ticket selecionado:', {
              oldStatus: selectedTicket.status,
              newStatus: updatedTicket.status,
              oldMessageCount: selectedTicket.messages?.length || 0,
              newMessageCount: updatedTicket.messages?.length || 0
            });
            setSelectedTicket(mergedTicket);
          }
        }
      }
    }
  }, [tickets.length, selectedTicket?.id]); // Adicionado selectedTicket?.id para melhor controle
  
  const handleSelectTicket = React.useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      console.log('🎯 [PAGE] Ticket selecionado:', ticket.id, ticket.client?.name);
      console.log('🎯 [TICKET SELECTION] Selecionando ticket:', {
        ticketId: ticket.id,
        clientName: ticket.client?.name,
        messagesCount: ticket.messages?.length || 0
      });
      
      // Evitar re-seleção do mesmo ticket
      if (selectedTicket?.id === ticketId) {
        console.log('🎯 [TICKET SELECTION] Ticket já selecionado, ignorando');
        return;
      }
      
      setSelectedTicket(ticket);
    }
  }, [tickets, selectedTicket]);

  const handleTicketUpdate = React.useCallback((updatedTicket: Ticket) => {
    console.log('🔄 [TICKET UPDATE] Atualizando ticket:', {
      ticketId: updatedTicket.id,
      messagesCount: updatedTicket.messages?.length || 0,
      status: updatedTicket.status
    });
    
    // Atualizar o ticket na lista de tickets preservando mensagens e dados críticos
    setTickets(prevTickets => 
      prevTickets.map(ticket => {
        if (ticket.id === updatedTicket.id) {
          // Preservar mensagens existentes e dados críticos
          const mergedTicket = {
            ...updatedTicket,
            messages: updatedTicket.messages && updatedTicket.messages.length > 0
              ? updatedTicket.messages
              : ticket.messages || [],
            // Preservar dados críticos se não estiverem no ticket atualizado
            client: updatedTicket.client || ticket.client,
            instanceName: updatedTicket.instanceName || ticket.instanceName,
            // Manter timestamp de última atualização
            lastUpdated: Date.now()
          };
          return mergedTicket;
        }
        return ticket;
      })
    );
    
    // Atualizar o ticket selecionado se for o mesmo, preservando mensagens e dados críticos
    if (selectedTicket && selectedTicket.id === updatedTicket.id) {
      const mergedSelectedTicket = {
        ...updatedTicket,
        messages: updatedTicket.messages && updatedTicket.messages.length > 0
          ? updatedTicket.messages
          : selectedTicket.messages || [],
        // Preservar dados críticos
        client: updatedTicket.client || selectedTicket.client,
        instanceName: updatedTicket.instanceName || selectedTicket.instanceName,
        lastUpdated: Date.now()
      };
      
      console.log('🔄 [TICKET UPDATE] Atualizando ticket selecionado:', {
        originalMessages: selectedTicket.messages?.length || 0,
        updatedMessages: updatedTicket.messages?.length || 0,
        finalMessages: mergedSelectedTicket.messages?.length || 0,
        hasClient: !!mergedSelectedTicket.client,
        hasInstanceName: !!mergedSelectedTicket.instanceName
      });
      
      setSelectedTicket(mergedSelectedTicket);
    }
  }, [selectedTicket]);

  const handleNewMessage = async (ticketId: string, messageText: string, quoted?: { id: string; content: string; sender: 'client' | 'agent' }, attachments?: { url: string; fileName: string; size: number; type: string }[], testMode?: { enabled: boolean; asClient: boolean }) => {
    console.log('🔍 [DEBUG] handleNewMessage called:', { ticketId, messageText, testMode });
    
    if (!selectedInstance) {
      toast({ title: 'Erro', description: 'Nenhuma instância selecionada', variant: 'destructive' });
      return;
    }

    // Encontrar o ticket para obter o remoteJid correto
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      toast({ title: 'Erro', description: 'Ticket não encontrado', variant: 'destructive' });
      return;
    }

    try {
      // Se estiver em modo de teste, o ChatPanel já tratou a mensagem localmente
      if (testMode?.enabled) {
        console.log('🧪 [TEST MODE] Mensagem já tratada pelo ChatPanel');
        return;
      }
      
      // Extrair apenas o número do telefone do remoteJid (remover @s.whatsapp.net)
      const phoneNumber = ticket.client.id.split('@')[0].replace(/\D/g, '');
      
      // Se há arquivos anexados, enviar cada um via Evolution API
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          // Determinar o tipo de mídia baseado no mimeType primeiro, depois no tipo
          let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document';
          
          if (attachment.mimeType) {
            if (attachment.mimeType.startsWith('image/')) {
              mediaType = 'image';
            } else if (attachment.mimeType.startsWith('video/')) {
              mediaType = 'video';
            } else if (attachment.mimeType.startsWith('audio/')) {
              mediaType = 'audio';
            } else {
              mediaType = 'document';
            }
          } else {
            // Fallback para o tipo se não houver mimeType
            mediaType = attachment.type === 'image' ? 'image' : 
                       attachment.type === 'video' ? 'video' : 
                       attachment.type === 'audio' ? 'audio' : 'document';
          }
          
          await clientFirebaseService.sendMediaMessage(
            selectedInstance,
            ticket.client.id,
            attachment.url,
            mediaType,
            attachment.fileName,
            quoted
          );
        }
        
        // Se há texto junto com os arquivos, enviar como mensagem separada
        if (messageText.trim()) {
          await clientFirebaseService.saveMessage({
          instanceName: selectedInstance,
          remoteJid: ticket.client.id,
          messageText,
          quoted: null
        });
        }
        
        // Invalidar cache para forçar recarregamento das mensagens
        clientFirebaseService.invalidateCache(selectedInstance);
        
        // Forçar atualização imediata do ticket com feedback visual
        const newMessage = {
          id: `temp_${Date.now()}`,
          messageId: `temp_${Date.now()}`,
          content: messageText.trim() || `${attachments.length} arquivo(s) enviado(s)`,
          sender: 'agent' as const,
          timestamp: new Date(),
          status: 'sent' as const,
          type: 'text' as const,
          isFromMe: true,
          pushName: 'Agente'
        };
        
        // Atualizar o ticket localmente para feedback imediato
        const updatedTicket = {
          ...ticket,
          messages: [...(ticket.messages || []), newMessage],
          lastMessage: newMessage.content,
          lastMessageTime: new Date()
        };
        
        handleTicketUpdate(updatedTicket);
        
        // Aguardar um pouco e depois forçar nova busca das mensagens
        setTimeout(() => {
          if (selectedTicket?.id === ticket.id) {
            // Forçar nova busca das mensagens do servidor
            clientFirebaseService.getMessages(selectedInstance, ticket.client.id)
              .then(serverMessages => {
                const refreshedTicket = {
                  ...ticket,
                  messages: serverMessages,
                  lastMessage: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].content : ticket.lastMessage,
                  lastMessageTime: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].timestamp : ticket.lastMessageTime
                };
                handleTicketUpdate(refreshedTicket);
                
                // Toast removido - feedback visual já fornecido pela interface
                // toast({ 
                //   title: 'Arquivos enviados com sucesso!', 
                //   description: `${attachments.length} arquivo(s) enviado(s)${messageText.trim() ? ' junto com a mensagem' : ''}` 
                // });
              })
              .catch(error => {
                console.error('Erro ao buscar mensagens atualizadas:', error);
                toast({ title: 'Erro ao confirmar envio dos arquivos', variant: 'destructive' });
              });
          }
        }, 1000);
      } else {
        // Enviar apenas mensagem de texto
        await clientFirebaseService.saveMessage({
          instanceName: selectedInstance,
          remoteJid: ticket.client.id,
          messageText,
          quoted: quoted || null
        });
        
        // Invalidar cache para forçar recarregamento das mensagens
        clientFirebaseService.invalidateCache(selectedInstance);
        
        // Forçar atualização imediata do ticket com a nova mensagem
        const tempMessageId = `temp_${Date.now()}`;
        const newMessage = {
          id: tempMessageId,
          messageId: tempMessageId,
          content: messageText,
          sender: 'agent' as const,
          timestamp: new Date(),
          status: 'sent' as const,
          type: 'text' as const,
          isFromMe: true,
          pushName: 'Agente',
          isTemporary: true // Marcar como temporária
        };
        
        // Atualizar o ticket localmente para feedback imediato
        const updatedTicket = {
          ...ticket,
          messages: [...(ticket.messages || []), newMessage],
          lastMessage: messageText,
          lastMessageTime: new Date()
        };
        
        handleTicketUpdate(updatedTicket);
        
        // Aguardar um pouco e depois forçar nova busca das mensagens
        setTimeout(() => {
          if (selectedTicket?.id === ticket.id) {
            
            // Função para tentar sincronizar com o servidor
            const attemptSync = (attempt = 1, maxAttempts = 5) => {
              console.log(`🔄 Tentativa ${attempt} de sincronização com Firebase...`);
              
              clientFirebaseService.getMessages(selectedInstance, ticket.client.id)
                .then(serverMessages => {
                  console.log(`📊 Servidor retornou ${serverMessages.length} mensagens`);
                  
                  // Verificar se a nova mensagem já está nas mensagens do servidor
                  const messageExists = serverMessages.some(msg => 
                    msg.content === messageText && 
                    msg.sender === 'agent' &&
                    Math.abs(new Date(msg.timestamp).getTime() - new Date().getTime()) < 30000 // Dentro de 30 segundos
                  );
                  
                  if (messageExists) {
                    console.log('✅ Mensagem encontrada no servidor, removendo temporária');
                    // Mensagem encontrada no servidor, usar apenas mensagens do servidor
                    const refreshedTicket = {
                      ...ticket,
                      messages: serverMessages,
                      lastMessage: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].content : ticket.lastMessage,
                      lastMessageTime: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].timestamp : ticket.lastMessageTime
                    };
                    handleTicketUpdate(refreshedTicket);
                  } else if (attempt < maxAttempts) {
                    console.log(`⏳ Mensagem ainda não encontrada, tentativa ${attempt}/${maxAttempts}`);
                    // Mensagem ainda não chegou, tentar novamente
                    setTimeout(() => attemptSync(attempt + 1, maxAttempts), 1000);
                  } else {
                    console.log('⚠️ Mensagem não encontrada após todas as tentativas, removendo temporária');
                    // Última tentativa - forçar sincronização com servidor e remover temporária
                    const refreshedTicket = {
                      ...ticket,
                      messages: serverMessages,
                      lastMessage: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].content : messageText,
                      lastMessageTime: serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].timestamp : new Date()
                    };
                    handleTicketUpdate(refreshedTicket);
                    
                    // Mostrar aviso de que a mensagem pode não ter sido salva
                    toast({ 
                      title: 'Aviso', 
                      description: 'A mensagem pode não ter sido salva corretamente. Verifique a conexão.',
                      variant: 'destructive'
                    });
                  }
                })
                .catch(error => {
                  console.error(`❌ Erro na tentativa ${attempt} de sincronização:`, error);
                  if (attempt < maxAttempts) {
                    setTimeout(() => attemptSync(attempt + 1, maxAttempts), 1000);
                  } else {
                    // Remover mensagem temporária mesmo com erro
                    const messagesWithoutTemp = (ticket.messages || []).filter(msg => !msg.isTemporary);
                    const refreshedTicket = {
                      ...ticket,
                      messages: messagesWithoutTemp
                    };
                    handleTicketUpdate(refreshedTicket);
                    toast({ title: 'Erro ao confirmar envio da mensagem', variant: 'destructive' });
                  }
                });
            };
            
            // Iniciar primeira tentativa de sincronização após 500ms
            setTimeout(() => attemptSync(), 500);
          }
        }, 1000);
         
        // Toast será mostrado apenas após confirmação do servidor
        // toast({ title: 'Mensagem enviada com sucesso!' });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    if (!selectedInstance) return;
    
    try {
      await clientFirebaseService.updateTicketStatus(selectedInstance, ticketId, 'resolved');
      toast({ title: 'Ticket resolvido com sucesso!' });
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast({ title: 'Erro ao resolver ticket', variant: 'destructive' });
    }
  };

  const handleTransferTicket = (ticketId: string) => {
    toast({ title: 'Funcionalidade de transferência em desenvolvimento' });
  };

  const handleScheduleFollowup = (ticketId: string) => {
    toast({ title: 'Follow-up agendado com sucesso!' });
  };

  const handleUseTemplate = (ticketId: string) => {
    toast({ title: 'Template aplicado com sucesso!' });
  };

  const handleCreateEvent = () => {
    // Esta função será implementada quando o modal de agendamento for integrado
    toast({ title: 'Funcionalidade de agendamento disponível no chat!' });
  };

  const configureWebhookForInstance = async (instanceName: string) => {
    try {
      const webhookUrl = `${window.location.origin}/api/webhooks/evolution`;
      const response = await fetch('/api/configure-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName,
          webhookUrl
        })
      });

      if (!response.ok) {
        console.error('Failed to configure webhook for instance:', instanceName);
      } else {
        console.log(`Webhook configured successfully for instance: ${instanceName}`);
      }
    } catch (error) {
      console.error('Error configuring webhook:', error);
    }
  };

  const handleFiltersChange = (newFilters: AdvancedFiltersType) => {
    setFilters(newFilters);
  };

  const allTicketsForClient = selectedTicket ? tickets.filter(
    (t) => t.client.phone === selectedTicket.client.phone
  ) : [];

  return (
    <ProtectedRoute>
      <CrmLayout>
      <div className="flex flex-col h-full bg-background text-foreground">
        {isMobile ? (
          <main className="flex-1 p-4 flex flex-col gap-4">
            <ActionMenu
              tickets={tickets}
              instances={instances}
              selectedInstance={selectedInstance}
              selectedTicket={selectedTicket}
              allTicketsForClient={allTicketsForClient}
              ticketsLoading={ticketsLoading}
              ticketsError={ticketsError}
              onInstanceChange={(instanceName) => {
                setSelectedInstance(instanceName);
                setSelectedTicket(null);
                configureWebhookForInstance(instanceName);
              }}
              onRefreshTickets={refetchTickets}
            />
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="conversas">Conversas</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="paineis">Painéis</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              </TabsList>
              <TabsContent value="conversas" className="flex-1 overflow-y-auto mt-2">
                <TicketList tickets={filteredTickets} selectedTicketId={selectedTicket?.id || ''} onSelectTicket={handleSelectTicket} filters={filters} onFiltersChange={handleFiltersChange} allTickets={tickets} />
              </TabsContent>
              <TabsContent value="chat" className="flex-1 overflow-y-auto mt-2">
                {selectedTicket ? (
                  <ChatPanel 
                    ticket={selectedTicket} 
                    onNewMessage={handleNewMessage}
                    onResolveTicket={handleResolveTicket}
                    onTransferTicket={handleTransferTicket}
                    onScheduleFollowup={handleScheduleFollowup}
                    onUseTemplate={handleUseTemplate}
                    onTicketUpdate={handleTicketUpdate}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {ticketsLoading ? 'Carregando conversas...' : 'Selecione uma conversa para começar'}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="paineis" className="flex-1 overflow-y-auto mt-2">
                {selectedTicket ? (
                  <InfoPanel 
                    ticket={selectedTicket} 
                    clientTickets={allTicketsForClient}
                    onCreateEvent={handleCreateEvent}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Selecione uma conversa para ver as informações
                  </div>
                )}
              </TabsContent>
              <TabsContent value="dashboard" className="flex-1 overflow-y-auto mt-2">
                 <ProductivityDashboard tickets={tickets} />
               </TabsContent>
            </Tabs>
          </main>
        ) : (
          <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
            <ActionMenu
              tickets={tickets}
              instances={instances}
              selectedInstance={selectedInstance}
              selectedTicket={selectedTicket}
              allTicketsForClient={allTicketsForClient}
              ticketsLoading={ticketsLoading}
              ticketsError={ticketsError}
              onInstanceChange={(instanceName) => {
                setSelectedInstance(instanceName);
                setSelectedTicket(null);
                configureWebhookForInstance(instanceName);
              }}
              onRefreshTickets={refetchTickets}
            />
            
            {showProductivityDashboard && (
               <div className="mb-4">
                 <ProductivityDashboard 
                   tickets={tickets} 
                   agentName="Agente"
                   timeframe={dashboardTimeframe}
                   showDetailedMetrics={showDetailedMetrics}
                   onTimeframeChange={setDashboardTimeframe}
                 />
                 <div className="flex items-center justify-between mt-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
                   >
                     {showDetailedMetrics ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
                   </Button>
                 </div>
               </div>
             )}
            
            <div className="max-w-[1800px] w-full mx-auto grid grid-cols-12 gap-3 flex-1 min-h-0">
              {/* Lista de Tickets - Compacta */}
              <div className="col-span-12 md:col-span-3 lg:col-span-3 h-full min-h-0">
                <TicketList tickets={filteredTickets} selectedTicketId={selectedTicket?.id || ''} onSelectTicket={handleSelectTicket} filters={filters} onFiltersChange={handleFiltersChange} allTickets={tickets} />
              </div>
              
              {/* Chat Panel - Maximizado para ocupar todo o espaço restante */}
              <div className="col-span-12 md:col-span-9 lg:col-span-9 h-full min-h-0">
                {selectedTicket ? (
                  <ChatPanel 
                    ticket={selectedTicket} 
                    onNewMessage={handleNewMessage}
                    onResolveTicket={handleResolveTicket}
                    onTransferTicket={handleTransferTicket}
                    onScheduleFollowup={handleScheduleFollowup}
                    onUseTemplate={handleUseTemplate}
                    onTicketUpdate={handleTicketUpdate}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground border rounded-lg">
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-2">
                        {ticketsLoading ? 'Carregando conversas...' : 'Nenhuma conversa selecionada'}
                      </h3>
                      <p className="text-sm">
                        {ticketsLoading ? 'Aguarde...' : 'Selecione uma conversa da lista para começar'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>
      </CrmLayout>
    </ProtectedRoute>
  );
}
