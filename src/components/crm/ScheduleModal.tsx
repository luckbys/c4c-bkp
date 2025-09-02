'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Save,
  X,
  CalendarDays,
  Phone,
  Video,
  MessageSquare
} from 'lucide-react';
import { useAgenda } from '@/hooks/use-agenda';
import { AgendaEvent } from '@/services/agenda-service';
import { format, addDays, addHours, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Ticket } from '@/components/crm/types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket?: Ticket;
  initialData?: {
    title?: string;
    description?: string;
    date?: Date;
    time?: string;
    type?: 'meeting' | 'call' | 'presentation';
    duration?: number;
  };
  onEventCreated?: (event: AgendaEvent) => void;
}

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  type: 'meeting' | 'call' | 'presentation';
  location: string;
  priority: 'low' | 'medium' | 'high';
  participants: string[];
}

const EVENT_TYPES = [
  {
    value: 'meeting',
    label: 'Reunião',
    icon: Users,
    color: 'bg-blue-500',
    description: 'Reunião presencial ou virtual'
  },
  {
    value: 'call',
    label: 'Ligação',
    icon: Phone,
    color: 'bg-green-500',
    description: 'Chamada telefônica'
  },
  {
    value: 'presentation',
    label: 'Apresentação',
    icon: Video,
    color: 'bg-purple-500',
    description: 'Apresentação ou demonstração'
  }
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'text-green-600 bg-green-50' },
  { value: 'medium', label: 'Média', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'high', label: 'Alta', color: 'text-red-600 bg-red-50' }
];

export function ScheduleModal({ 
  isOpen, 
  onClose, 
  ticket, 
  initialData, 
  onEventCreated 
}: ScheduleModalProps) {
  const { createEvent } = useAgenda();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newParticipant, setNewParticipant] = useState('');

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(addHours(new Date(), 1), 'HH:mm'),
    duration: 60,
    type: 'meeting',
    location: '',
    priority: 'medium',
    participants: []
  });

  // Preencher dados iniciais quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const defaultDate = initialData?.date || addDays(now, 1);
      const defaultTime = initialData?.time || format(addHours(now, 1), 'HH:mm');
      
      setFormData({
        title: initialData?.title || `${getEventTypeLabel(initialData?.type || 'meeting')} com ${ticket?.client.name || 'Cliente'}`,
        description: initialData?.description || `${getEventTypeLabel(initialData?.type || 'meeting')} agendada via chat com ${ticket?.client.name || 'cliente'}.`,
        date: format(defaultDate, 'yyyy-MM-dd'),
        time: defaultTime,
        duration: initialData?.duration || 60,
        type: initialData?.type || 'meeting',
        location: '',
        priority: 'medium',
        participants: ticket?.client.name ? [ticket.client.name] : []
      });
    }
  }, [isOpen, initialData, ticket]);

  const getEventTypeLabel = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    return eventType?.label || 'Evento';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Starting form submission
    console.log('🔍 [ScheduleModal] Form data:', formData);
    console.log('🔍 [ScheduleModal] Ticket data:', ticket);
    
    if (!formData.title.trim()) {
      // Title validation failed
      toast({
        title: 'Erro',
        description: 'O título é obrigatório',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      // Combinar data e hora
      console.log('🔍 [ScheduleModal] Combining date and time:', { date: formData.date, time: formData.time });
      const eventDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(eventDate.getTime() + formData.duration * 60000);
      
      console.log('🔍 [ScheduleModal] Calculated dates:', { 
        eventDate: eventDate.toISOString(), 
        endDate: endDate.toISOString(), 
        duration: formData.duration,
        isValidDate: !isNaN(eventDate.getTime()),
        isValidEndDate: !isNaN(endDate.getTime())
      });
      
      if (isNaN(eventDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Data ou hora inválida');
      }
      
      const eventData: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title,
        description: formData.description,
        start: eventDate,
        end: endDate,
        allDay: false,
        location: formData.location,
        category: formData.type as 'meeting' | 'call' | 'task' | 'other' | 'presentation',
        priority: formData.priority,
        status: 'scheduled',
        contactId: ticket?.client.id,
        participants: formData.participants,
        createdBy: 'agent',
        color: EVENT_TYPES.find(t => t.value === formData.type)?.color || '#3b82f6',
        isPrivate: false
      };

      console.log('🔍 [ScheduleModal] Event data prepared:', eventData);
      console.log('🔍 [ScheduleModal] Event data validation:', {
        hasTitle: !!eventData.title,
        hasValidStart: eventData.start instanceof Date && !isNaN(eventData.start.getTime()),
        hasValidEnd: eventData.end instanceof Date && !isNaN(eventData.end.getTime()),
        hasCategory: !!eventData.category,
        hasPriority: !!eventData.priority,
        hasStatus: !!eventData.status,
        hasCreatedBy: !!eventData.createdBy
      });
      
      // Calling createEvent...
      
      const newEvent = await createEvent(eventData);
      
      console.log('✅ [ScheduleModal] Event created successfully:', newEvent);
      
      toast({
        title: 'Evento criado com sucesso!',
        description: `${formData.title} foi agendado para ${format(eventDate, 'dd/MM/yyyy \\à\\s HH:mm', { locale: ptBR })}`
      });
      
      onEventCreated?.(newEvent);
      onClose();
    } catch (error) {
      console.error('❌ [ScheduleModal] Error creating event:', error);
      console.error('❌ [ScheduleModal] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        formData,
        ticket: ticket ? { id: ticket.id, clientId: ticket.client?.id } : null
      });
      
      let errorMessage = 'Erro desconhecido';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Identificar tipos específicos de erro
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Sem permissão para criar eventos. Verifique as configurações do Firebase.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.message.includes('Data ou hora inválida')) {
          errorMessage = 'Data ou hora inválida. Verifique os campos de data e hora.';
        } else if (error.message.includes('Falha ao criar evento')) {
          errorMessage = 'Falha ao salvar no banco de dados. Tente novamente.';
        }
      }
      
      toast({
        title: 'Erro ao criar evento',
        description: `${errorMessage}. Tente novamente em alguns instantes.`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = () => {
    if (newParticipant.trim() && !formData.participants.includes(newParticipant.trim())) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, newParticipant.trim()]
      }));
      setNewParticipant('');
    }
  };

  const removeParticipant = (participant: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== participant)
    }));
  };

  const selectedEventType = EVENT_TYPES.find(t => t.value === formData.type);
  const IconComponent = selectedEventType?.icon || Calendar;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${selectedEventType?.color} text-white`}>
              <IconComponent className="h-5 w-5" />
            </div>
            Agendar {selectedEventType?.label}
          </DialogTitle>
          <DialogDescription>
            Crie um novo evento na agenda {ticket ? `para ${ticket.client.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Evento */}
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      formData.type === type.value 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                  >
                    <CardContent className="p-3 text-center">
                      <div className={`inline-flex p-2 rounded-lg ${type.color} text-white mb-2`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Reunião de apresentação da proposta"
              required
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Duração e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select 
                value={formData.duration.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={option.color}>{option.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Local */}
          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ex: Sala de reuniões, Link do Zoom, Telefone"
                className="pl-10"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes sobre o evento, agenda, objetivos..."
              rows={3}
            />
          </div>

          {/* Participantes */}
          <div className="space-y-2">
            <Label>Participantes</Label>
            <div className="flex gap-2">
              <Input
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                placeholder="Nome do participante"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
              />
              <Button type="button" onClick={addParticipant} variant="outline">
                Adicionar
              </Button>
            </div>
            {formData.participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.participants.map((participant, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {participant}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeParticipant(participant)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Agendar Evento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}