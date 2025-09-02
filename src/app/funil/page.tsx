
'use client';

import * as React from 'react';
import type { Ticket } from '@/components/crm/types';
import TicketItem from '@/components/crm/TicketItem';
import TicketModal from '@/components/crm/TicketModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { AlertCircle, RefreshCw } from 'lucide-react';
import CrmLayout from '@/components/crm/CrmLayout';
import { firebaseService } from '@/services/firebase-service';
import { useToast } from '@/hooks/use-toast';

// Mapeamento de status entre Firebase e Funil
type FirebaseStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
type FunilStatus = 'Pendente' | 'Aguardando' | 'Em Atendimento' | 'Resolvido' | 'Fechado' | 'Não Atribuído';

const statusMapping: Record<FirebaseStatus, FunilStatus> = {
  'open': 'Pendente',
  'pending': 'Aguardando',
  'in_progress': 'Em Atendimento',
  'resolved': 'Resolvido',
  'closed': 'Fechado'
};

const reverseStatusMapping: Record<FunilStatus, FirebaseStatus> = {
  'Pendente': 'open',
  'Aguardando': 'pending',
  'Em Atendimento': 'in_progress',
  'Resolvido': 'resolved',
  'Fechado': 'closed',
  'Não Atribuído': 'open' // Default para open
};

// Converter ticket do Firebase para formato do Funil
const convertTicketToFunilFormat = (ticket: Ticket): Ticket & { status: FunilStatus } => {
  const funilStatus = statusMapping[ticket.status as FirebaseStatus] || 'Não Atribuído';
  return {
    ...ticket,
    status: funilStatus
  };
};

type TicketStatus = FunilStatus;

const TicketSkeleton = () => (
  <div className="p-3 space-y-2">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

const KanbanColumn = ({ 
  title, 
  tickets, 
  selectedTicketId, 
  onSelectTicket, 
  droppableId, 
  isLoading 
}: { 
  title: string; 
  tickets: (Ticket & { status: FunilStatus })[]; 
  selectedTicketId: string; 
  onSelectTicket: (id: string) => void; 
  droppableId: string;
  isLoading: boolean;
}) => (
    <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
            <Card 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 min-w-[300px] transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
            >
                <CardHeader className="p-4 border-b">
                <CardTitle className="text-lg font-semibold">{title} ({tickets.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-2 flex-1 overflow-y-auto">
                {isLoading ? (
                  // Skeleton loading
                  Array.from({ length: 3 }).map((_, index) => (
                    <Card key={`skeleton-${index}`} className="border border-gray-200">
                      <TicketSkeleton />
                    </Card>
                  ))
                ) : (
                  tickets.map((ticket, index) => (
                    <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                             <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform} rotate(5deg)`
                                      : provided.draggableProps.style?.transform,
                                }}
                                className={snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}
                            >
                                <TicketItem 
                                    ticket={ticket} 
                                    isSelected={ticket.id === selectedTicketId} 
                                    onSelect={onSelectTicket} 
                                />
                            </div>
                        )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
                </CardContent>
            </Card>
        )}
  </Droppable>
);

export default function FunilPage() {
  const [tickets, setTickets] = React.useState<(Ticket & { status: FunilStatus })[]>([]);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string>('');
  const [selectedInstance, setSelectedInstance] = React.useState<string>('all');
  const [availableInstances, setAvailableInstances] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const { toast } = useToast();
  
  const columnsOrder: TicketStatus[] = ['Pendente', 'Aguardando', 'Em Atendimento', 'Resolvido', 'Fechado', 'Não Atribuído'];

  // Carregar instâncias disponíveis
  const loadAvailableInstances = React.useCallback(async () => {
    try {
      console.log('🔄 [FUNIL] Starting to load available instances...');
      
      // Buscar instâncias da API Evolution (mesma fonte que a tela de atendimentos)
      const apiResponse = await fetch('/api/instancias');
      console.log('🔄 [FUNIL] API response status:', apiResponse.status);
      
      if (!apiResponse.ok) {
        throw new Error(`Falha ao buscar instâncias da API: ${apiResponse.status}`);
      }
      
      const apiData = await apiResponse.json();
      console.log('🔄 [FUNIL] Raw API data:', JSON.stringify(apiData, null, 2));
      
      const apiInstances = apiData.instances || [];
      console.log('🔄 [FUNIL] API instances array:', apiInstances);
      console.log('🔄 [FUNIL] API instances count:', apiInstances.length);
      
      console.log('🔄 [FUNIL] API instances detailed:', apiInstances.map((i: any) => ({ 
        name: i.name, 
        status: i.status,
        id: i.id,
        connectionStatus: i.connectionStatus 
      })));
      
      // Filtrar apenas instâncias conectadas
      const connectedInstances = apiInstances
        .filter((instance: any) => {
          console.log(`🔄 [FUNIL] Checking instance ${instance.name}: status=${instance.status}`);
          return instance.status === 'connected';
        })
        .map((instance: any) => {
          console.log(`🔄 [FUNIL] Mapping connected instance: ${instance.name}`);
          return instance.name;
        });
      
      console.log('🔄 [FUNIL] Connected instances after filtering:', connectedInstances);
      
      // Sincronizar instâncias conectadas com Firebase para garantir consistência
      for (const instanceName of connectedInstances) {
        try {
          console.log(`🔄 [FUNIL] Syncing instance ${instanceName} to Firebase...`);
          await firebaseService.updateInstanceConnection({
            instanceName,
            connectionState: 'open',
            statusReason: 0,
            lastUpdate: new Date()
          });
          console.log(`✅ [FUNIL] Successfully synced instance ${instanceName} to Firebase`);
        } catch (syncError) {
          console.warn(`⚠️ [FUNIL] Failed to sync instance ${instanceName}:`, syncError);
        }
      }
      
      // Adicionar instância de teste se não existir
      if (!connectedInstances.includes('test-instance')) {
        console.log('🧪 [FUNIL] Adding test instance...');
        connectedInstances.push('test-instance');
        try {
          await firebaseService.createTestInstance();
          console.log('🧪 [FUNIL] Test instance created successfully');
        } catch (testError) {
          console.warn('🧪 [FUNIL] Failed to create test instance:', testError);
        }
      } else {
        console.log('🧪 [FUNIL] Test instance already exists in connected instances');
      }
      
      // Remover duplicatas usando Set
      const uniqueInstances = [...new Set(connectedInstances)];
      console.log('🔄 [FUNIL] Final unique instances before setState:', uniqueInstances);
      
      setAvailableInstances(uniqueInstances);
      console.log('🔄 [FUNIL] setAvailableInstances called with:', uniqueInstances);
      
      if (uniqueInstances.length === 0) {
        console.warn('🔄 [FUNIL] No connected instances found');
        setError('Nenhuma instância conectada encontrada.');
      } else {
        setError(null); // Limpar erro se instâncias foram encontradas
        console.log(`🔄 [FUNIL] Successfully loaded ${uniqueInstances.length} unique instances:`, uniqueInstances);
      }
    } catch (err) {
      console.error('🔄 [FUNIL] Error loading available instances:', err);
      setAvailableInstances([]); // Fallback para array vazio
      setError(`Erro ao carregar instâncias: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }, []);

  // Carregar tickets do Firebase
  const loadTickets = React.useCallback(async (instanceName?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!instanceName || instanceName === 'all') {
        // Buscar tickets de todas as instâncias
        const allTickets = await firebaseService.getAllTickets();
        const convertedTickets = allTickets.map(convertTicketToFunilFormat);
        setTickets(convertedTickets);
        console.log(`Loaded ${allTickets.length} tickets from all instances`);
      } else {
        // Buscar tickets de uma instância específica
        const instanceTickets = await firebaseService.getTickets(instanceName);
        const convertedTickets = instanceTickets.map(convertTicketToFunilFormat);
        setTickets(convertedTickets);
        console.log(`Loaded ${instanceTickets.length} tickets from instance ${instanceName}`);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError('Erro ao carregar tickets. Tente novamente.');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os tickets.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Subscription para atualizações em tempo real
  React.useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupSubscription = () => {
      // Validar se selectedInstance tem um valor válido
      if (!selectedInstance || selectedInstance.trim() === '') {
        console.warn('🔄 [FUNIL] selectedInstance is undefined or empty, skipping subscription setup');
        setIsLoading(false);
        return;
      }
      
      console.log(`🔄 [FUNIL] Setting up subscription for instance: ${selectedInstance}`);
      
      if (selectedInstance === 'all') {
        // Subscription para todas as instâncias
        unsubscribe = firebaseService.subscribeToAllTickets(
          (updatedTickets) => {
            const convertedTickets = updatedTickets.map(convertTicketToFunilFormat);
            setTickets(convertedTickets);
            setIsLoading(false);
            console.log(`Received ${updatedTickets.length} tickets from all instances subscription`);
          },
          (error) => {
            console.error('Error in all tickets subscription:', error);
            setError('Erro na conexão em tempo real.');
            setIsLoading(false);
          }
        );
      } else {
        // Subscription para uma instância específica
        unsubscribe = firebaseService.subscribeToTickets(
          selectedInstance,
          (updatedTickets) => {
            const convertedTickets = updatedTickets.map(convertTicketToFunilFormat);
            setTickets(convertedTickets);
            setIsLoading(false);
            console.log(`Received ${updatedTickets.length} tickets from instance ${selectedInstance}`);
          },
          (error) => {
            console.error('Error in tickets subscription:', error);
            setError('Erro na conexão em tempo real.');
            setIsLoading(false);
          }
        );
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedInstance]);

  // Carregar instâncias disponíveis na inicialização
  React.useEffect(() => {
    loadAvailableInstances();
  }, []); // Removido loadAvailableInstances para evitar loop

  // Recarregar instâncias periodicamente para detectar novas conexões
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadAvailableInstances();
    }, 30000); // Atualizar a cada 30 segundos

    return () => clearInterval(interval);
  }, []); // Removido loadAvailableInstances para evitar loop

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    const newFunilStatus = destination.droppableId as TicketStatus;
    const newFirebaseStatus = reverseStatusMapping[newFunilStatus];
    const ticket = tickets.find(t => t.id === draggableId);
    
    if (!ticket) return;

    // Atualização otimista
    setTickets(prevTickets => {
        return prevTickets.map(t => {
            if (t.id === draggableId) {
                return { ...t, status: newFunilStatus };
            }
            return t;
        });
    });

    try {
      setIsUpdating(true);
      
      // Atualizar no Firebase
      await firebaseService.updateTicketStatus(
        ticket.instanceName || 'default',
        ticket.client.id,
        newFirebaseStatus
      );
      
      toast({
        title: "Sucesso",
        description: `Ticket movido para ${newFunilStatus}`,
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      
      // Rollback em caso de erro
      setTickets(prevTickets => {
        return prevTickets.map(t => {
            if (t.id === draggableId) {
                return { ...t, status: statusMapping[ticket.status as FirebaseStatus] || 'Não Atribuído' };
            }
            return t;
        });
      });
      
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do ticket.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const ticketsByStatus = tickets.reduce((acc, ticket) => {
    const status = ticket.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(ticket);
    return acc;
  }, {} as Record<TicketStatus, (Ticket & { status: FunilStatus })[]>);

  const handleRetry = () => {
    loadTickets(selectedInstance === 'all' ? undefined : selectedInstance);
  };

  // Função para abrir o modal do ticket
  const handleTicketSelect = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      // Converter de volta para o formato original do Firebase
      const originalTicket: Ticket = {
        ...ticket,
        status: reverseStatusMapping[ticket.status] || 'open'
      };
      setSelectedTicket(originalTicket);
      setSelectedTicketId(ticketId);
      setIsModalOpen(true);
    }
  };

  // Função para fechar o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    setSelectedTicketId('');
  };

  // Função para alterar status do ticket via modal
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const newFunilStatus = statusMapping[newStatus as FirebaseStatus] || 'Não Atribuído';

    // Atualização otimista
    setTickets(prevTickets => {
      return prevTickets.map(t => {
        if (t.id === ticketId) {
          return { ...t, status: newFunilStatus };
        }
        return t;
      });
    });

    // Atualizar o ticket selecionado no modal
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({
        ...selectedTicket,
        status: newStatus as FirebaseStatus
      });
    }

    try {
      setIsUpdating(true);
      
      // Atualizar no Firebase
      await firebaseService.updateTicketStatus(
        ticket.instanceName || 'default',
        ticket.client.id,
        newStatus as FirebaseStatus
      );
      
      toast({
        title: "Sucesso",
        description: `Status alterado para ${newFunilStatus}`,
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      
      // Rollback em caso de erro
      setTickets(prevTickets => {
        return prevTickets.map(t => {
          if (t.id === ticketId) {
            return { ...t, status: ticket.status };
          }
          return t;
        });
      });
      
      // Reverter o ticket selecionado no modal
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: reverseStatusMapping[ticket.status] || 'open'
        });
      }
      
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do ticket.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };




  return (
    <CrmLayout>
      <div className="h-full bg-background text-foreground flex flex-col">
        <main className="flex-1 flex flex-col overflow-x-auto">
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Funil de Vendas</h1>
              <div className="flex items-center gap-4">
                <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecionar instância" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas as instâncias {availableInstances.length > 0 && `(${availableInstances.length})`}
                    </SelectItem>
                    {availableInstances.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhuma instância conectada
                      </SelectItem>
                    ) : (
                      availableInstances
                        .filter((instance, index, array) => {
                          // Filtrar duplicatas adicionais e validar
                          const isUnique = array.indexOf(instance) === index;
                          const isValid = instance && typeof instance === 'string' && instance.trim() !== '';
                          
                          if (!isValid) {
                            console.warn(`🔄 [FUNIL] Invalid instance found:`, instance);
                            return false;
                          }
                          
                          if (!isUnique) {
                            console.warn(`🔄 [FUNIL] Duplicate instance filtered out:`, instance);
                            return false;
                          }
                          
                          return true;
                        })
                        .map((instance, index) => {
                          // Garantir key única usando index como fallback
                          const uniqueKey = `instance-${instance}-${index}`;
                          console.log(`🔄 [FUNIL] Rendering instance with key: ${uniqueKey}`);
                          
                          return (
                            <SelectItem key={uniqueKey} value={instance}>
                              {instance} ✓
                            </SelectItem>
                          );
                        })
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  {error}
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {availableInstances.length === 0 && !isLoading && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma instância WhatsApp conectada encontrada. Verifique as conexões na página de instâncias.
                </AlertDescription>
              </Alert>
            )}
            
            {selectedInstance === 'all' && availableInstances.length > 0 && tickets.length === 0 && !isLoading && (
              <Alert className="mb-4">
                <AlertDescription>
                  Nenhum ticket encontrado em todas as instâncias conectadas ({availableInstances.length} instância{availableInstances.length !== 1 ? 's' : ''}: {availableInstances.join(', ')}).
                </AlertDescription>
              </Alert>
            )}
            
            {selectedInstance !== 'all' && tickets.length === 0 && !isLoading && availableInstances.includes(selectedInstance) && (
              <Alert className="mb-4">
                <AlertDescription>
                  Nenhum ticket encontrado na instância "{selectedInstance}".
                </AlertDescription>
              </Alert>
            )}
            
            {isUpdating && (
              <Alert className="mb-4">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Atualizando status do ticket...
                </AlertDescription>
              </Alert>
            )}
            
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 h-[calc(100vh-200px)] overflow-x-auto">
                  {columnsOrder.map(status => (
                      <KanbanColumn 
                          key={status}
                          title={status}
                          tickets={ticketsByStatus[status] || []}
                          selectedTicketId={selectedTicketId}
                          onSelectTicket={handleTicketSelect}
                          droppableId={status}
                          isLoading={isLoading}
                      />
                  ))}
              </div>
            </DragDropContext>
          </div>
        </main>
      </div>
      
      {/* Modal do Ticket */}
      <TicketModal
          ticket={selectedTicket}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onStatusChange={handleStatusChange}
        />
    </CrmLayout>
  );
}
