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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserCheck, AlertCircle } from 'lucide-react';
import { transferTicket, type TransferData } from '@/services/ticket-actions';
import { useToast } from '@/hooks/use-toast';

interface TransferTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  currentUser: string;
  onTransferComplete?: () => void;
}

// Mock data - em produção, isso viria de uma API
const DEPARTMENTS = [
  { id: 'suporte', name: 'Suporte Técnico' },
  { id: 'vendas', name: 'Vendas' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'comercial', name: 'Comercial' },
  { id: 'atendimento', name: 'Atendimento ao Cliente' }
];

const USERS = [
  { id: 'joao.silva', name: 'João Silva', department: 'suporte' },
  { id: 'maria.santos', name: 'Maria Santos', department: 'vendas' },
  { id: 'pedro.oliveira', name: 'Pedro Oliveira', department: 'suporte' },
  { id: 'ana.costa', name: 'Ana Costa', department: 'financeiro' },
  { id: 'carlos.ferreira', name: 'Carlos Ferreira', department: 'comercial' },
  { id: 'lucia.almeida', name: 'Lúcia Almeida', department: 'atendimento' }
];

export default function TransferTicketModal({
  isOpen,
  onClose,
  ticketId,
  currentUser,
  onTransferComplete
}: TransferTicketModalProps) {
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>('');
  const [selectedUser, setSelectedUser] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  // Filtrar usuários por departamento selecionado
  const filteredUsers = selectedDepartment
    ? USERS.filter(user => user.department === selectedDepartment)
    : USERS;

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedDepartment('');
      setSelectedUser('');
      setReason('');
    }
  }, [isOpen]);

  const handleTransfer = async () => {
    if (!selectedUser || !reason.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, selecione um destinatário e informe o motivo da transferência.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const transferData: TransferData = {
        destinatario: selectedUser,
        departamento: selectedDepartment || undefined,
        motivo: reason.trim()
      };

      await transferTicket(ticketId, transferData, currentUser);

      toast({
        title: 'Ticket transferido',
        description: `Ticket transferido com sucesso para ${USERS.find(u => u.id === selectedUser)?.name}.`,
        variant: 'default'
      });

      onTransferComplete?.();
      onClose();
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
      toast({
        title: 'Erro na transferência',
        description: error instanceof Error ? error.message : 'Erro inesperado ao transferir ticket.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Transferir Ticket
          </DialogTitle>
          <DialogDescription>
            Selecione o destinatário e informe o motivo da transferência do ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Seleção de Departamento */}
          <div className="grid gap-2">
            <Label htmlFor="department">Departamento (opcional)</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os departamentos</SelectItem>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Usuário */}
          <div className="grid gap-2">
            <Label htmlFor="user">Destinatário *</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar destinatário" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {DEPARTMENTS.find(d => d.id === user.department)?.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo da Transferência */}
          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo da Transferência *</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da transferência..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Importante:</p>
              <p>O ticket será transferido e seu status mudará para "Pendente". O destinatário será notificado sobre a transferência.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={isLoading || !selectedUser || !reason.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Transferindo...' : 'Transferir Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}