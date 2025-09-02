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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Trash2,
  Plus,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAgenda } from '@/hooks/use-agenda';
import { AgendaEvent } from '@/services/agenda-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any; // Can be FullCalendar event or our AgendaEvent
}

interface EventFormData {
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  category: 'meeting' | 'call' | 'task' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  contactId: string;
  projectId: string;
  participants: string[];
  reminders: {
    type: 'email' | 'notification' | 'sms';
    minutes: number;
  }[];
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    count?: number;
  };
  isPrivate: boolean;
  color: string;
}

const CATEGORIES = [
  { 
    value: 'meeting', 
    label: 'Reunião', 
    color: 'bg-gradient-to-r from-blue-500 to-blue-600',
    icon: '👥',
    description: 'Reuniões e encontros'
  },
  { 
    value: 'call', 
    label: 'Ligação', 
    color: 'bg-gradient-to-r from-green-500 to-green-600',
    icon: '📞',
    description: 'Chamadas e conferências'
  },
  { 
    value: 'task', 
    label: 'Tarefa', 
    color: 'bg-gradient-to-r from-orange-500 to-orange-600',
    icon: '✅',
    description: 'Tarefas e atividades'
  },
  { 
    value: 'other', 
    label: 'Outro', 
    color: 'bg-gradient-to-r from-slate-500 to-slate-600',
    icon: '📋',
    description: 'Outros eventos'
  }
];

const PRIORITIES = [
  { 
    value: 'low', 
    label: 'Baixa', 
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: '🟢',
    description: 'Prioridade baixa'
  },
  { 
    value: 'medium', 
    label: 'Média', 
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: '🟡',
    description: 'Prioridade média'
  },
  { 
    value: 'high', 
    label: 'Alta', 
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: '🔴',
    description: 'Prioridade alta'
  }
];

const STATUS_OPTIONS = [
  { 
    value: 'scheduled', 
    label: 'Agendado', 
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: '📅',
    description: 'Evento agendado'
  },
  { 
    value: 'in-progress', 
    label: 'Em Andamento', 
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: '⏳',
    description: 'Evento em progresso'
  },
  { 
    value: 'completed', 
    label: 'Concluído', 
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: '✅',
    description: 'Evento concluído'
  },
  { 
    value: 'cancelled', 
    label: 'Cancelado', 
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: '❌',
    description: 'Evento cancelado'
  }
];

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 dia antes' },
  { value: 10080, label: '1 semana antes' }
];

export function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { createEvent, updateEvent, deleteEvent } = useAgenda();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newParticipant, setNewParticipant] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
    location: '',
    category: 'meeting',
    priority: 'medium',
    status: 'scheduled',
    contactId: '',
    projectId: '',
    participants: [],
    reminders: [{ type: 'notification', minutes: 15 }],
    recurrence: undefined,
    isPrivate: false,
    color: '#3b82f6'
  });

  const isEditing = event && event.id;

  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Handle both FullCalendar events and our AgendaEvent format
        const startDate = event.start || event.startStr || new Date();
        const endDate = event.end || event.endStr || new Date(Date.now() + 60 * 60 * 1000);
        
        setFormData({
          title: event.title || '',
          description: event.description || event.extendedProps?.description || '',
          start: format(new Date(startDate), "yyyy-MM-dd'T'HH:mm"),
          end: format(new Date(endDate), "yyyy-MM-dd'T'HH:mm"),
          allDay: event.allDay || false,
          location: event.location || event.extendedProps?.location || '',
          category: event.category || event.extendedProps?.category || 'meeting',
          priority: event.priority || event.extendedProps?.priority || 'medium',
          status: event.status || event.extendedProps?.status || 'scheduled',
          contactId: event.contactId || event.extendedProps?.contactId || '',
          projectId: event.projectId || event.extendedProps?.projectId || '',
          participants: event.participants || event.extendedProps?.participants || [],
          reminders: event.reminders || event.extendedProps?.reminders || [{ type: 'notification', minutes: 15 }],
          recurrence: event.recurrence || event.extendedProps?.recurrence || undefined,
          isPrivate: event.isPrivate || event.extendedProps?.isPrivate || false,
          color: event.color || event.extendedProps?.color || '#3b82f6'
        });
      } else {
        // Reset form for new event
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        setFormData({
          title: '',
          description: '',
          start: format(now, "yyyy-MM-dd'T'HH:mm"),
          end: format(oneHourLater, "yyyy-MM-dd'T'HH:mm"),
          allDay: false,
          location: '',
          category: 'meeting',
          priority: 'medium',
          status: 'scheduled',
          contactId: '',
          projectId: '',
          participants: [],
          reminders: [{ type: 'notification', minutes: 15 }],
          recurrence: undefined,
          isPrivate: false,
          color: '#3b82f6'
        });
      }
      setErrors({});
    }
  }, [isOpen, event]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.start) {
      newErrors.start = 'Data de início é obrigatória';
    }

    if (!formData.end) {
      newErrors.end = 'Data de fim é obrigatória';
    }

    if (formData.start && formData.end && new Date(formData.start) >= new Date(formData.end)) {
      newErrors.end = 'Data de fim deve ser posterior à data de início';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Enhanced data cleaning function
      const cleanData = (obj: any): any => {
        const cleaned: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          // Skip undefined values
          if (value === undefined) continue;
          
          // Skip empty strings for optional fields
          if (typeof value === 'string' && value.trim() === '' && 
              ['contactId', 'projectId', 'location', 'description'].includes(key)) {
            continue;
          }
          
          // Skip empty arrays
          if (Array.isArray(value) && value.length === 0) continue;
          
          // Skip empty objects (but keep valid objects)
          if (typeof value === 'object' && value !== null && !Array.isArray(value) && 
              Object.keys(value).length === 0) {
            continue;
          }
          
          cleaned[key] = value;
        }
        
        return cleaned;
      };
      
      const cleanFormData = cleanData(formData);
      
      const eventData = {
        ...cleanFormData,
        start: new Date(formData.start),
        end: new Date(formData.end),
        createdBy: 'current-user' // TODO: Get from auth context
      };

      // Debug logs
      console.log('🔍 [EventModal] Original formData:', formData);
      console.log('🔍 [EventModal] Cleaned formData:', cleanFormData);
      console.log('🔍 [EventModal] Final eventData:', eventData);
      console.log('🔍 [EventModal] Start date type:', typeof eventData.start, eventData.start);
      console.log('🔍 [EventModal] End date type:', typeof eventData.end, eventData.end);

      if (isEditing) {
        await updateEvent({ ...eventData, id: event.id } as AgendaEvent);
      } else {
        await createEvent(eventData);
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      console.error('🔍 [EventModal] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        formData: formData
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;
    
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      setLoading(true);
      try {
        await deleteEvent(event.id);
        onClose();
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
      } finally {
        setLoading(false);
      }
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

  const addReminder = () => {
    setFormData(prev => ({
      ...prev,
      reminders: [...prev.reminders, { type: 'notification', minutes: 15 }]
    }));
  };

  const updateReminder = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.map((reminder, i) => 
        i === index ? { ...reminder, [field]: value } : reminder
      )
    }));
  };

  const removeReminder = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{isEditing ? 'Editar Evento' : 'Novo Evento'}</span>
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifique as informações do evento' : 'Preencha os dados para criar um novo evento'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título do evento"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o evento (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Data/Hora Início *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={formData.start}
                  onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                  className={errors.start ? 'border-red-500' : ''}
                />
                {errors.start && (
                  <p className="text-sm text-red-500 mt-1">{errors.start}</p>
                )}
              </div>

              <div>
                <Label htmlFor="end">Data/Hora Fim *</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={formData.end}
                  onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
                  className={errors.end ? 'border-red-500' : ''}
                />
                {errors.end && (
                  <p className="text-sm text-red-500 mt-1">{errors.end}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="allDay"
                checked={formData.allDay}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allDay: checked }))}
              />
              <Label htmlFor="allDay">Evento de dia inteiro</Label>
            </div>
          </div>

          <Separator />

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="h-12">
                  <SelectValue>
                    {formData.category && (
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{CATEGORIES.find(c => c.value === formData.category)?.icon}</span>
                        <div className={`w-3 h-3 rounded-full ${CATEGORIES.find(c => c.value === formData.category)?.color}`} />
                        <span className="font-medium">{CATEGORIES.find(c => c.value === formData.category)?.label}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="py-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{cat.icon}</span>
                        <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                        <div>
                          <div className="font-medium">{cat.label}</div>
                          <div className="text-xs text-slate-500">{cat.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="h-12">
                  <SelectValue>
                    {formData.priority && (
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{PRIORITIES.find(p => p.value === formData.priority)?.icon}</span>
                        <Badge className={`${PRIORITIES.find(p => p.value === formData.priority)?.color} border font-medium`}>
                          {PRIORITIES.find(p => p.value === formData.priority)?.label}
                        </Badge>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value} className="py-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{priority.icon}</span>
                        <div>
                          <Badge className={`${priority.color} border font-medium`}>
                            {priority.label}
                          </Badge>
                          <div className="text-xs text-slate-500 mt-1">{priority.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="h-12">
                  <SelectValue>
                    {formData.status && (
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{STATUS_OPTIONS.find(s => s.value === formData.status)?.icon}</span>
                        <Badge className={`${STATUS_OPTIONS.find(s => s.value === formData.status)?.color} border font-medium`}>
                          {STATUS_OPTIONS.find(s => s.value === formData.status)?.label}
                        </Badge>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value} className="py-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{status.icon}</span>
                        <div>
                          <Badge className={`${status.color} border font-medium`}>
                            {status.label}
                          </Badge>
                          <div className="text-xs text-slate-500 mt-1">{status.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Local</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Local do evento"
                className="pl-10"
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'} Opções Avançadas
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4">
              {/* Participants */}
              <div>
                <Label>Participantes</Label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      value={newParticipant}
                      onChange={(e) => setNewParticipant(e.target.value)}
                      placeholder="Email do participante"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                    />
                    <Button type="button" onClick={addParticipant} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.participants.map((participant, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                          <span>{participant}</span>
                          <button
                            type="button"
                            onClick={() => removeParticipant(participant)}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reminders */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Lembretes</Label>
                  <Button type="button" onClick={addReminder} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.reminders.map((reminder, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Select
                        value={reminder.type}
                        onValueChange={(value: any) => updateReminder(index, 'type', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">Notificação</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={reminder.minutes.toString()}
                        onValueChange={(value) => updateReminder(index, 'minutes', parseInt(value))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REMINDER_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={() => removeReminder(index)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
                />
                <Label htmlFor="isPrivate">Evento privado</Label>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>{isEditing ? 'Atualizar' : 'Criar'}</span>
                  </div>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}