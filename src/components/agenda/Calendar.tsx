'use client';

import React, { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAgenda } from '@/hooks/use-agenda';
import { AgendaEvent } from '@/services/agenda-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarComponentProps {
  onEventClick: (eventInfo: any) => void;
  onDateSelect: (selectInfo: any) => void;
  searchTerm: string;
  currentView: string;
  onViewChange: (view: string) => void;
}

export function CalendarComponent({
  onEventClick,
  onDateSelect,
  searchTerm,
  currentView,
  onViewChange
}: CalendarComponentProps) {
  const { events, loading, loadEvents, updateEvent } = useAgenda();
  const [calendarRef, setCalendarRef] = useState<FullCalendar | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lastEventCount, setLastEventCount] = useState(0);

  // Debug: Log mudanças nos eventos (sem dependências que causam loops)
  useEffect(() => {
    console.log('📊 Events updated:', {
      totalEvents: events.length,
      calendarReady: !!calendarRef
    });
  }, [events.length, calendarRef]);





  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Forçar navegação para data atual quando o calendário é montado
  useEffect(() => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      const today = new Date();
      console.log('Forçando navegação para data atual:', today);
      calendarApi.gotoDate(today);
    }
  }, [calendarRef]);

  // Monitorar mudanças no array de eventos e atualizar o FullCalendar
  useEffect(() => {
    if (!calendarRef) return;
    
    const calendarApi = calendarRef.getApi();
    console.log('📅 Events or search changed - triggering calendar refresh');
    console.log('🔄 Refreshing calendar events:', events.length, 'total events');
    
    try {
      // Remove todos os eventos existentes
      calendarApi.removeAllEvents();
      
      // Filter events based on search term
      const eventsToShow = events.filter(event => {
        if (!searchTerm) return true;
        return (
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      
      // Adiciona os eventos filtrados
      eventsToShow.forEach(event => {
        calendarApi.addEvent({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          extendedProps: {
            description: event.description,
            location: event.location,
            category: event.category,
            priority: event.priority,
            status: event.status,
            contactId: event.contactId,
            projectId: event.projectId,
            participants: event.participants,
            reminders: event.reminders,
            isPrivate: event.isPrivate,
            color: event.color
          }
        });
      });
      
      setLastEventCount(events.length);
      console.log('✅ Calendar events refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing calendar events:', error);
    }
  }, [calendarRef, events, searchTerm]);

  const handleEventDrop = useCallback(async (dropInfo: any) => {
    try {
      const updatedEvent = {
        ...dropInfo.event.extendedProps,
        id: dropInfo.event.id,
        title: dropInfo.event.title,
        start: dropInfo.event.start,
        end: dropInfo.event.end,
        allDay: dropInfo.event.allDay
      };
      
      await updateEvent(updatedEvent);
    } catch (error) {
      console.error('Erro ao mover evento:', error);
      dropInfo.revert();
    }
  }, [updateEvent]);

  const handleEventResize = useCallback(async (resizeInfo: any) => {
    try {
      const updatedEvent = {
        ...resizeInfo.event.extendedProps,
        id: resizeInfo.event.id,
        title: resizeInfo.event.title,
        start: resizeInfo.event.start,
        end: resizeInfo.event.end,
        allDay: resizeInfo.event.allDay
      };
      
      await updateEvent(updatedEvent);
    } catch (error) {
      console.error('Erro ao redimensionar evento:', error);
      resizeInfo.revert();
    }
  }, [updateEvent]);

  const handleDatesSet = useCallback((dateInfo: any) => {
    const newDate = dateInfo.view.currentStart || new Date();
    console.log('Data atual:', new Date(), 'Data do calendário:', newDate);
    setCurrentDate(newDate);
  }, []);

  const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      if (direction === 'prev') {
        calendarApi.prev();
      } else if (direction === 'next') {
        calendarApi.next();
      } else {
        calendarApi.today();
      }
    }
  };

  const changeView = (view: string) => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      calendarApi.changeView(view);
      onViewChange(view);
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dayGridMonth':
        return format(currentDate, 'MMMM yyyy', { locale: ptBR });
      case 'timeGridWeek':
        return `Semana de ${format(currentDate, 'dd MMM', { locale: ptBR })}`;
      case 'timeGridDay':
        return format(currentDate, 'dd MMMM yyyy', { locale: ptBR });
      case 'listWeek':
        return 'Lista de Eventos';
      default:
        return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 rounded-xl">
        <div className="flex items-center space-x-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg border border-white/20">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">Carregando eventos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-gradient-to-r from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-900/20 p-6 rounded-2xl shadow-sm border border-blue-100/50 dark:border-blue-800/30">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-white/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateCalendar('prev')}
              className="hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateCalendar('today')}
              className="hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 font-medium"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateCalendar('next')}
              className="hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent capitalize">
            {getViewTitle()}
          </h2>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-slate-800 dark:to-blue-900/50 rounded-xl p-1.5 shadow-sm border border-blue-200/50 dark:border-blue-800/30">
          <Button
            variant={currentView === 'dayGridMonth' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('dayGridMonth')}
            className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
              currentView === 'dayGridMonth' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                : 'hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            Mês
          </Button>
          <Button
            variant={currentView === 'timeGridWeek' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('timeGridWeek')}
            className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
              currentView === 'timeGridWeek' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                : 'hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            Semana
          </Button>
          <Button
            variant={currentView === 'timeGridDay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('timeGridDay')}
            className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
              currentView === 'timeGridDay' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                : 'hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            Dia
          </Button>
          <Button
            variant={currentView === 'listWeek' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('listWeek')}
            className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
              currentView === 'listWeek' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                : 'hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            Lista
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/30 rounded-2xl border border-blue-200/30 dark:border-blue-800/30 overflow-hidden shadow-xl backdrop-blur-sm">
        <FullCalendar
          ref={setCalendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={currentView}
          initialDate={new Date()}
          headerToolbar={false}
          height="auto"
          locale="pt-br"
          firstDay={1}
          weekends={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          editable={true}
          droppable={true}
          events={[]}
          select={onDateSelect}
          eventClick={onEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          eventDisplay="block"
          dayHeaderFormat={{ weekday: 'short' }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={true}
          nowIndicator={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '18:00'
          }}
          eventClassNames={(arg) => {
            const category = arg.event.extendedProps.category;
            switch (category) {
              case 'meeting':
                return ['fc-event-meeting'];
              case 'call':
                return ['fc-event-call'];
              case 'task':
                return ['fc-event-task'];
              default:
                return ['fc-event-default'];
            }
          }}
          eventContent={(eventInfo) => {
            const { event } = eventInfo;
            const category = event.extendedProps.category;
            
            return (
              <div className="p-2 group hover:scale-105 transition-all duration-200 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200 ${
                    category === 'meeting' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                    category === 'call' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                    category === 'task' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-slate-400 to-slate-600'
                  }`} />
                  <span className="text-sm font-semibold truncate text-white group-hover:text-blue-100 transition-colors duration-200">
                    {event.title}
                  </span>
                </div>
                {eventInfo.timeText && (
                  <div className="text-xs text-white/80 group-hover:text-blue-100/80 transition-colors duration-200 mt-1 ml-5">
                    {eventInfo.timeText}
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Legend */}
      <div className="bg-gradient-to-r from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-900/20 p-4 rounded-xl shadow-sm border border-blue-100/50 dark:border-blue-800/30">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center space-x-3 group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200" />
            <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">Reuniões</span>
          </div>
          <div className="flex items-center space-x-3 group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200" />
            <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">Ligações</span>
          </div>
          <div className="flex items-center space-x-3 group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200" />
            <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200">Tarefas</span>
          </div>
          <div className="flex items-center space-x-3 group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="w-4 h-4 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200" />
            <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors duration-200">Outros</span>
          </div>
        </div>
      </div>
    </div>
  );
}