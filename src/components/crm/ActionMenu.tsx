'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu, 
  RefreshCw,
  PanelRightOpen,
  CheckCircle,
  UserCheck,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/components/crm/types';
import InstanceStatus from '@/components/crm/InstanceStatus';
import InfoPanel from '@/components/crm/InfoPanel';
import TransferTicketModal from './TransferTicketModal';
import CancelTicketModal from './CancelTicketModal';
import { finalizeTicket } from '@/services/ticket-actions';
import { useToast } from '@/hooks/use-toast';

interface ActionMenuProps {
  tickets: Ticket[];
  instances: any[];
  selectedInstance: string | null;
  selectedTicket: Ticket | null;
  allTicketsForClient: Ticket[];
  ticketsLoading: boolean;
  ticketsError: string | null;
  currentUser?: string;
  onInstanceChange: (instanceName: string) => void;
  onRefreshTickets: () => void;
  onTicketUpdate?: () => void;
  onFinalizeTicket?: (ticketId: string) => void;
  onTransferTicket?: (ticketId: string) => void;
  onCancelTicket?: (ticketId: string) => void;
}

export default function ActionMenu({
  tickets,
  instances,
  selectedInstance,
  selectedTicket,
  allTicketsForClient,
  ticketsLoading,
  ticketsError,
  currentUser = 'current-user',
  onInstanceChange,
  onRefreshTickets,
  onTicketUpdate,
  onFinalizeTicket,
  onTransferTicket,
  onCancelTicket
}: ActionMenuProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const { toast } = useToast();

  // Debounce para mudanças de instância durante animações
  const debouncedInstanceChange = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (instanceName: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onInstanceChange(instanceName);
        }, isAnimating ? 150 : 0);
      };
    }, [onInstanceChange, isAnimating]),
    [onInstanceChange, isAnimating]
  );

  // Controle de animação para evitar bugs de interação
  React.useEffect(() => {
    if (isExpanded) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 800); // Tempo total das animações + margem de segurança
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isExpanded]);

  const actionButtons: any[] = [];

  const handleFinalize = async () => {
    if (!selectedTicket) return;
    
    if (confirm('Tem certeza que deseja finalizar este ticket?')) {
      setIsLoading(true);
      try {
        await finalizeTicket(selectedTicket.id, currentUser);
        toast({
          title: 'Ticket finalizado',
          description: 'O ticket foi finalizado com sucesso.',
          variant: 'default'
        });
        onTicketUpdate?.();
        onFinalizeTicket?.(selectedTicket.id);
      } catch (error) {
        console.error('Erro ao finalizar ticket:', error);
        toast({
          title: 'Erro ao finalizar',
          description: error instanceof Error ? error.message : 'Erro inesperado ao finalizar ticket.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTransfer = () => {
    setIsTransferModalOpen(true);
  };

  const handleCancel = () => {
    setIsCancelModalOpen(true);
  };

  const handleTransferComplete = () => {
    onTicketUpdate?.();
    onTransferTicket?.(selectedTicket?.id || '');
  };

  const handleCancelComplete = () => {
    onTicketUpdate?.();
    onCancelTicket?.(selectedTicket?.id || '');
  };

  const ticketActionButtons = selectedTicket ? [
    {
      icon: <CheckCircle className="h-4 w-4" />,
      label: isLoading ? 'Finalizando...' : 'Finalizar Ticket',
      onClick: handleFinalize,
      disabled: isLoading,
      variant: 'default' as const,
      className: 'bg-green-600 hover:bg-green-700 text-white border-green-600'
    },
    {
      icon: <UserCheck className="h-4 w-4" />,
      label: 'Transferir Ticket',
      onClick: handleTransfer,
      disabled: isLoading,
      variant: 'outline' as const,
      className: 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors duration-200'
    },
    {
      icon: <XCircle className="h-4 w-4" />,
      label: 'Cancelar Ticket',
      onClick: handleCancel,
      disabled: isLoading,
      variant: 'outline' as const,
      className: 'border-red-500 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors duration-200'
    }
  ] : [];

  return (
    <div className="relative">
      {/* Botão Menu Principal com animação de rotação */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 relative z-10",
          "transition-all duration-300 ease-out",
          "hover:scale-105 hover:shadow-lg",
          "active:scale-95",
          isExpanded && "bg-primary/10 border-primary/50 shadow-md"
        )}
      >
        <Menu className={cn(
          "h-4 w-4 transition-transform duration-300 ease-out",
          isExpanded && "rotate-90 scale-110"
        )} />
        <span className="transition-opacity duration-200">
          {isExpanded ? 'Fechar' : 'Menu'}
        </span>
      </Button>

      {/* Menu Expandido em Leque */}
      {isExpanded && (
        <>
          {/* Overlay para fechar o menu com fade suave */}
          <div 
            className="fixed inset-0 z-20 animate-in fade-in-0 duration-200" 
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Botões expandidos para a direita com animação em cascata */}
          <div className="absolute left-32 top-0 z-30 flex items-center gap-3">
            {actionButtons.map((button, index) => (
              <Button
                key={button.label}
                variant={button.variant}
                size="sm"
                onClick={button.onClick}
                disabled={button.disabled}
                className={cn(
                  "flex items-center gap-2 shadow-lg bg-background border-2",
                  "transition-all duration-500 ease-out",
                  "animate-in slide-in-from-left-8 fade-in-0 zoom-in-95",
                  "hover:scale-110 hover:shadow-2xl hover:brightness-110",
                  "transform-gpu will-change-transform",
                  button.className
                )}
                style={{
                  animationDelay: `${index * 120}ms`,
                  animationDuration: '600ms',
                  animationFillMode: 'both'
                }}
                title={button.label}
              >
                {button.icon}
                <span className="hidden sm:inline transition-opacity duration-300">{button.label}</span>
              </Button>
            ))}
            
            {/* Botões de ação do ticket com animação escalonada */}
            {ticketActionButtons.map((button, index) => (
              <Button
                key={button.label}
                variant={button.variant}
                size="sm"
                onClick={button.onClick}
                disabled={button.disabled}
                className={cn(
                  "flex items-center gap-2 shadow-lg border-2",
                  "transition-all duration-500 ease-out",
                  "animate-in slide-in-from-left-8 fade-in-0 zoom-in-95",
                  "hover:scale-110 hover:shadow-2xl hover:brightness-110",
                  "transform-gpu will-change-transform",
                  button.className
                )}
                style={{
                  animationDelay: `${(actionButtons.length + index) * 120}ms`,
                  animationDuration: '600ms',
                  animationFillMode: 'both'
                }}
                title={button.label}
              >
                {button.icon}
                <span className="hidden sm:inline transition-opacity duration-300">{button.label}</span>
              </Button>
            ))}            
            
            {/* Botão do Painel Lateral com animação final */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 shadow-lg bg-background border-2",
                    "transition-all duration-500 ease-out",
                    "animate-in slide-in-from-left-8 fade-in-0 zoom-in-95",
                    "hover:scale-110 hover:shadow-2xl hover:bg-gray-700 hover:text-white hover:border-gray-700",
                    "transform-gpu will-change-transform"
                  )}
                  style={{
                    animationDelay: `${(actionButtons.length + ticketActionButtons.length) * 120}ms`,
                    animationDuration: '600ms',
                    animationFillMode: 'both'
                  }}
                  title="Painel do Ticket"
                >
                  <PanelRightOpen className="h-4 w-4" />
                  <span className="hidden sm:inline transition-opacity duration-300">Painel</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Informações do Cliente</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {selectedTicket && (
                    <InfoPanel ticket={selectedTicket} clientTickets={allTicketsForClient} />
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Seletor de Instância Compacto com animação suave e proteção contra bugs */}
          <div 
            className="absolute right-2 top-2 z-50 animate-in slide-in-from-right-4 fade-in-0 duration-500 ease-out" 
            style={{ 
              animationDelay: '300ms',
              transform: 'translate3d(0, 0, 0)',
              willChange: 'transform, opacity',
              pointerEvents: 'auto'
            }}
          >
            <div className="flex items-center gap-2">
              <Select 
                 value={selectedInstance || ''} 
                 onValueChange={debouncedInstanceChange}
                 disabled={isAnimating && isExpanded}
               >
                <SelectTrigger 
                   className={cn(
                     "w-[200px] h-8 text-xs transition-all duration-300 hover:shadow-md hover:border-primary/50 relative z-50",
                     isAnimating && isExpanded && "opacity-75 cursor-wait"
                   )}
                   style={{
                     transform: 'translate3d(0, 0, 0)',
                     backfaceVisibility: 'hidden',
                     WebkitBackfaceVisibility: 'hidden',
                     pointerEvents: isAnimating && isExpanded ? 'none' : 'auto'
                   }}
                 >
                  <SelectValue placeholder="Selecionar instância" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[60]"
                  style={{
                    transform: 'translate3d(0, 0, 0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                  }}
                >
                  {instances.map((instance) => (
                    <SelectItem key={instance.name} value={instance.name}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          instance.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-xs">{instance.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInstance && (
                <div 
                  className="animate-in fade-in-0 duration-300"
                  style={{
                    transform: 'translate3d(0, 0, 0)',
                    willChange: 'transform, opacity'
                  }}
                >
                  <InstanceStatus instanceName={selectedInstance} />
                </div>
              )}
            </div>
            {/* Erro de Tickets com animação */}
            {ticketsError && (
              <div className="text-xs text-destructive bg-destructive/10 p-1 rounded mt-1 animate-in slide-in-from-top-2 fade-in-0 duration-300">
                {ticketsError}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {selectedTicket && (
        <>
          <TransferTicketModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            ticketId={selectedTicket.id}
            currentUser={currentUser}
            ticketSubject={selectedTicket.subject}
            onTransferComplete={handleTransferComplete}
          />
          
          <CancelTicketModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            ticketId={selectedTicket.id}
            currentUser={currentUser}
            ticketSubject={selectedTicket.subject}
            onCancelComplete={handleCancelComplete}
          />
        </>
      )}
    </div>
  );
}