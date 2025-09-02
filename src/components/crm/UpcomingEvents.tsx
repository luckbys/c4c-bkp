'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  Video,
  CalendarDays,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAgenda } from '@/hooks/use-agenda';
import { AgendaEvent } from '@/services/agenda-service';
import { format, isToday, isTomorrow, isThisWeek, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/components/crm/types';

interface UpcomingEventsProps {
  ticket?: Ticket;
  onCreateEvent?: () => void;
  maxEvents?: number;
  showCreateButton?: boolean;
}

const EVENT_TYPE_CONFIG = {
  meeting: {
    icon: Users,
    color: 'bg-blue-500',
    label: 'Reunião'
  },
  call: {
    icon: Phone,
    color: 'bg-green-500',
    label: 'Ligação'
  },
  presentation: {
    icon: Video,
    color: 'bg-purple-500',
    label: 'Apresentação'
  },
  task: {
    icon: CalendarDays,
    color: 'bg-orange-500',
    label: 'Tarefa'
  },
  other: {
    icon: Calendar,
    color: 'bg-gray-500',
    label: 'Evento'
  }
};

const PRIORITY_CONFIG = {
  low: { color: 'bg-green-100 text-green-800', label: 'Baixa' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Média' },
  high: { color: 'bg-red-100 text-red-800', label: 'Alta' }
};

export function UpcomingEvents({ 
  ticket, 
  onCreateEvent, 
  maxEvents = 5, 
  showCreateButton = true 
}: UpcomingEventsProps) {
  const { events, loading } = useAgenda();

  // Filtrar eventos futuros
  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    let filteredEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate > now && event.status !== 'cancelled';
    });

    // Se há um ticket específico, priorizar eventos relacionados
    if (ticket?.client.id) {
      const relatedEvents = filteredEvents.filter(event => 
        event.contactId === ticket.client.id
      );
      const otherEvents = filteredEvents.filter(event => 
        event.contactId !== ticket.client.id
      );
      
      filteredEvents = [...relatedEvents, ...otherEvents];
    }

    return filteredEvents
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, maxEvents);
  }, [events, ticket?.client.id, maxEvents]);

  const formatEventDate = (date: Date) => {
    if (isToday(date)) {
      return `Hoje, ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Amanhã, ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE, HH:mm', { locale: ptBR });
    } else {
      return format(date, 'dd/MM, HH:mm', { locale: ptBR });
    }
  };

  const getTimeUntilEvent = (date: Date) => {
    const now = new Date();
    const minutes = differenceInMinutes(date, now);
    
    if (minutes < 60) {
      return `em ${minutes}min`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `em ${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `em ${days}d`;
    }
  };

  const isEventSoon = (date: Date) => {
    const now = new Date();
    const minutes = differenceInMinutes(date, now);
    return minutes <= 60; // Próximo 1 hora
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 bg-gray-100 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Próximos Eventos
            {upcomingEvents.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {upcomingEvents.length}
              </Badge>
            )}
          </CardTitle>
          {showCreateButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCreateEvent}
              className="h-6 w-6 p-0"
              title="Criar novo evento"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">
              Nenhum evento agendado
            </p>
            {showCreateButton && (
              <Button
                size="sm"
                variant="outline"
                onClick={onCreateEvent}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Criar Evento
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => {
              const eventDate = new Date(event.start);
              const config = EVENT_TYPE_CONFIG[event.category] || EVENT_TYPE_CONFIG.other;
              const IconComponent = config.icon;
              const isSoon = isEventSoon(eventDate);
              const isRelated = ticket?.client.id === event.contactId;
              
              return (
                <div key={event.id}>
                  <div className={cn(
                    "flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-gray-50",
                    isSoon && "bg-orange-50 border border-orange-200",
                    isRelated && "bg-blue-50 border border-blue-200"
                  )}>
                    <div className={cn(
                      "p-1.5 rounded-lg text-white flex-shrink-0",
                      config.color
                    )}>
                      <IconComponent className="h-3 w-3" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatEventDate(eventDate)}
                            </div>
                            {isSoon && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs px-1 py-0">
                                {getTimeUntilEvent(eventDate)}
                              </Badge>
                            )}
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              className={cn(
                                "text-xs px-1 py-0",
                                PRIORITY_CONFIG[event.priority].color
                              )}
                            >
                              {PRIORITY_CONFIG[event.priority].label}
                            </Badge>
                            
                            {isRelated && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs px-1 py-0">
                                Cliente
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          title="Ver detalhes"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {index < upcomingEvents.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              );
            })}
            
            {events.length > maxEvents && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs text-gray-500 hover:text-gray-700"
                >
                  Ver todos os eventos
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}