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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { firebaseService } from '@/services/firebase-service';
import { useToast } from '@/hooks/use-toast';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: (ticketId: string) => void;
  instanceName?: string;
}

interface TicketFormData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  channel: 'whatsapp' | 'email' | 'phone' | 'telegram';
}

export default function NewTicketModal({
  isOpen,
  onClose,
  onTicketCreated,
  instanceName = 'default'
}: NewTicketModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = React.useState<TicketFormData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    subject: '',
    description: '',
    priority: 'medium',
    channel: 'whatsapp'
  });

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        subject: '',
        description: '',
        priority: 'medium',
        channel: 'whatsapp'
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof TicketFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.clientName.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'Nome do cliente é obrigatório.',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.clientPhone.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'Telefone do cliente é obrigatório.',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.subject.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'Assunto é obrigatório.',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Gerar um remoteJid baseado no telefone para WhatsApp
      const remoteJid = formData.channel === 'whatsapp' 
        ? `${formData.clientPhone.replace(/\D/g, '')}@s.whatsapp.net`
        : `manual_${Date.now()}_${formData.clientPhone.replace(/\D/g, '')}`;

      const ticketData = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        remoteJid,
        instanceName,
        client: {
          id: remoteJid,
          name: formData.clientName,
          phone: formData.clientPhone,
          email: formData.clientEmail,
          subject: formData.subject,
          avatar: ''
        },
        status: 'open' as const,
        priority: formData.priority,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessage: formData.description || 'Ticket criado manualmente',
        lastMessageTime: Date.now(),
        unreadCount: 0,
        assignedTo: '',
        tags: ['manual'],
        notes: `Ticket criado manualmente. Descrição: ${formData.description}`
      };

      const ticketId = await firebaseService.saveTicket(ticketData);
      
      toast({
        title: 'Sucesso!',
        description: `Ticket criado com sucesso para ${formData.clientName}.`
      });
      
      onTicketCreated?.(ticketId);
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o ticket. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              <Plus className="h-5 w-5" />
            </div>
            Criar Novo Ticket
          </DialogTitle>
          <DialogDescription>
            Crie um novo ticket manualmente para um cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Digite o nome do cliente"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Telefone *</Label>
                <Input
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email (opcional)</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>

          {/* Informações do Ticket */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Informações do Ticket
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Descreva brevemente o assunto"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva detalhadamente o problema ou solicitação"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value: 'whatsapp' | 'email' | 'phone' | 'telegram') => handleInputChange('channel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Criando...' : 'Criar Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}