'use client';

import { useState, useCallback, useEffect } from 'react';
import { agendaService, AgendaEvent } from '@/services/agenda-service';
import { useToast } from '@/hooks/use-toast';

export interface UseAgendaReturn {
  events: AgendaEvent[];
  loading: boolean;
  error: string | null;
  loadEvents: () => Promise<void>;
  createEvent: (event: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (event: AgendaEvent) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEventById: (eventId: string) => AgendaEvent | undefined;
  getEventsByDate: (date: Date) => AgendaEvent[];
  getEventsByDateRange: (startDate: Date, endDate: Date) => AgendaEvent[];
  searchEvents: (query: string) => AgendaEvent[];
  getUpcomingEvents: (limit?: number) => AgendaEvent[];
}

export function useAgenda(): UseAgendaReturn {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedEvents = await agendaService.getEvents();
      setEvents(loadedEvents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar eventos';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createEvent = useCallback(async (eventData: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      console.log('🔄 [useAgenda] Creating event:', eventData.title);
      console.log('🔄 [useAgenda] Event data received:', {
        title: eventData.title,
        start: eventData.start,
        end: eventData.end,
        category: eventData.category,
        priority: eventData.priority,
        status: eventData.status,
        createdBy: eventData.createdBy,
        contactId: eventData.contactId,
        participantsCount: eventData.participants?.length || 0
      });
      
      // Validar dados antes de enviar
      if (!eventData.title?.trim()) {
        throw new Error('Título é obrigatório');
      }
      
      if (!eventData.start || !eventData.end) {
        throw new Error('Data de início e fim são obrigatórias');
      }
      
      if (!(eventData.start instanceof Date) || !(eventData.end instanceof Date)) {
        throw new Error('Datas devem ser objetos Date válidos');
      }
      
      if (isNaN(eventData.start.getTime()) || isNaN(eventData.end.getTime())) {
        throw new Error('Datas inválidas');
      }
      
      if (eventData.start >= eventData.end) {
        throw new Error('Data de início deve ser anterior à data de fim');
      }
      
      console.log('✅ [useAgenda] Event data validation passed');
      
      const newEvent = await agendaService.createEvent(eventData);
      console.log('✅ [useAgenda] Event created successfully:', { id: newEvent.id, title: newEvent.title });
      
      setEvents(prev => {
        const updated = [...prev, newEvent];
        console.log('📝 [useAgenda] Events state updated:', {
          previousCount: prev.length,
          newCount: updated.length,
          newEventId: newEvent.id
        });
        return updated;
      });
      
      toast({
        title: 'Sucesso',
        description: 'Evento criado com sucesso!'
      });
      
      return newEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar evento';
      console.error('❌ [useAgenda] Error creating event:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        eventData: {
          title: eventData.title,
          start: eventData.start,
          end: eventData.end,
          category: eventData.category
        }
      });
      
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateEvent = useCallback(async (eventData: AgendaEvent) => {
    try {
      setLoading(true);
      const updatedEvent = await agendaService.updateEvent(eventData);
      setEvents(prev => prev.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      ));
      toast({
        title: 'Sucesso',
        description: 'Evento atualizado com sucesso!'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar evento';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      await agendaService.deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast({
        title: 'Sucesso',
        description: 'Evento excluído com sucesso!'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir evento';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getEventById = useCallback((eventId: string) => {
    return events.find(event => event.id === eventId);
  }, [events]);

  const getEventsByDate = useCallback((date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === targetDate.getTime();
    });
  }, [events]);

  const getEventsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= startDate && eventStart <= endDate;
    });
  }, [events]);

  const searchEvents = useCallback((query: string) => {
    if (!query.trim()) return events;
    
    const lowercaseQuery = query.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(lowercaseQuery) ||
      event.description?.toLowerCase().includes(lowercaseQuery) ||
      event.location?.toLowerCase().includes(lowercaseQuery)
    );
  }, [events]);

  const getUpcomingEvents = useCallback((limit = 5) => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, limit);
  }, [events]);

  // Auto-load events on mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    getEventsByDate,
    getEventsByDateRange,
    searchEvents,
    getUpcomingEvents
  };
}