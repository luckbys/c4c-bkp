'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { XCircle, AlertTriangle } from 'lucide-react';
import { cancelTicket, type CancelData } from '@/services/ticket-actions';
import { useToast } from '@/hooks/use-toast';

interface CancelTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  currentUser: string;
  ticketSubject?: string;
  onCancelComplete?: () => void;
}

export default function CancelTicketModal({
  isOpen,
  onClose,
  ticketId,
  currentUser,
  ticketSubject,
  onCancelComplete
}: CancelTicketModalProps) {
  const [reason, setReason] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [confirmationStep, setConfirmationStep] = React.useState(false);
  const { toast } = useToast();

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setReason('');
      setConfirmationStep(false);
    }
  }, [isOpen]);

  const handleFirstStep = () => {
    if (!reason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo do cancelamento.',
        variant: 'destructive'
      });
      return;
    }
    setConfirmationStep(true);
  };

  const handleCancel = async () => {
    setIsLoading(true);

    try {
      const cancelData: CancelData = {
        motivo: reason.trim()
      };

      await cancelTicket(ticketId, cancelData, currentUser);

      toast({
        title: 'Ticket cancelado',
        description: 'O ticket foi cancelado com sucesso.',
        variant: 'default'
      });

      onCancelComplete?.();
      onClose();
    } catch (error) {
      console.error('Erro ao cancelar ticket:', error);
      toast({
        title: 'Erro no cancelamento',
        description: error instanceof Error ? error.message : 'Erro inesperado ao cancelar ticket.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setConfirmationStep(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            {confirmationStep ? 'Confirmar Cancelamento' : 'Cancelar Ticket'}
          </DialogTitle>
          <DialogDescription>
            {confirmationStep
              ? 'Esta ação não pode ser desfeita. Confirme o cancelamento do ticket.'
              : 'Informe o motivo do cancelamento do ticket.'}
          </DialogDescription>
        </DialogHeader>

        {!confirmationStep ? (
          // Primeira etapa: Motivo do cancelamento
          <div className="grid gap-4 py-4">
            {/* Informações do Ticket */}
            {ticketSubject && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-medium text-gray-700">Ticket:</p>
                <p className="text-sm text-gray-600">{ticketSubject}</p>
              </div>
            )}

            {/* Motivo do Cancelamento */}
            <div className="grid gap-2">
              <Label htmlFor="reason">Motivo do Cancelamento *</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo do cancelamento do ticket..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Atenção:</p>
                <p>O cancelamento do ticket é uma ação irreversível. O ticket será marcado como cancelado e não poderá ser reaberto.</p>
              </div>
            </div>
          </div>
        ) : (
          // Segunda etapa: Confirmação
          <div className="grid gap-4 py-4">
            {/* Resumo do cancelamento */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="font-medium text-red-800">Confirmação de Cancelamento</p>
              </div>
              
              {ticketSubject && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-red-700">Ticket:</p>
                  <p className="text-sm text-red-600">{ticketSubject}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-red-700">Motivo:</p>
                <p className="text-sm text-red-600">{reason}</p>
              </div>
            </div>

            {/* Aviso final */}
            <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-300 rounded-md">
              <XCircle className="h-4 w-4 text-red-700 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Esta ação não pode ser desfeita!</p>
                <p>O ticket será permanentemente cancelado e removido da lista de tickets ativos.</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!confirmationStep ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFirstStep}
                disabled={isLoading || !reason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}