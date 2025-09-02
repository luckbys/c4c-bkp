'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar, Search, Filter, Plus, Download, CheckCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarComponent } from '@/components/agenda/Calendar';
import { EventModal } from '@/components/agenda/EventModal';
import { EventFilters } from '@/components/agenda/EventFilters';
import { EventFilter, agendaService } from '@/services/agenda-service';
import { useAgenda } from '@/hooks/use-agenda';
import { toast } from '@/hooks/use-toast';
import './calendar-styles.css';

export default function AgendaPage() {
  const router = useRouter();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [filters, setFilters] = useState<EventFilter>({});

  
  // Use the agenda hook to get real data from Firebase
  const {
    events,
    loading,
    error,
    getEventsByDate,
    getUpcomingEvents
  } = useAgenda();
  
  console.log('📊 Agenda Page - Events loaded:', events.length);
  console.log('📊 Agenda Page - Loading:', loading);
  console.log('📊 Agenda Page - Error:', error);

  const handleEventClick = (eventInfo: any) => {
    setSelectedEvent(eventInfo.event);
    setIsEventModalOpen(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    setSelectedEvent({
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay
    });
    setIsEventModalOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };
  

  
  // Get real statistics from loaded events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayEvents = getEventsByDate(today);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);
  
  const thisWeekEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate >= thisWeekStart && eventDate <= thisWeekEnd;
  });
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  thisMonthEnd.setHours(23, 59, 59, 999);
  
  const thisMonthEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate >= thisMonthStart && eventDate <= thisMonthEnd;
  });
  
  const upcomingEvents = getUpcomingEvents(5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/10 p-4 sm:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/30 rounded-2xl shadow-xl mb-6 lg:mb-8">
          <div className="px-6 lg:px-8 py-6 lg:py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Title Section */}
              <div className="flex items-center space-x-4">
                {/* Back Button */}
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => router.push('/')}
                  className="h-12 w-12 p-0 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 hover:-translate-y-1 active:scale-95 group"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" />
                </Button>
                
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Agenda
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-sm lg:text-base">
                    Gerencie seus eventos e compromissos
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 lg:min-w-[300px] lg:max-w-[400px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="Buscar eventos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm backdrop-blur-sm transition-all duration-200 w-full"
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`h-12 px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:-translate-y-1 active:scale-95 group ${
                      showFilters 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' 
                        : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    <Filter className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                    <span className="font-medium">Filtros</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="default"
                    className="h-12 px-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:-translate-y-1 active:scale-95 group"
                  >
                    <Download className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:translate-y-[-2px]" />
                    <span className="font-medium">Exportar</span>
                  </Button>
                  

                  
                  <Button
                    onClick={handleNewEvent}
                    className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:-translate-y-1 active:scale-95 font-semibold group"
                  >
                    <Plus className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                    Novo Evento
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <Card className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 border-slate-200/50 dark:border-slate-800/30 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-slate-700 to-blue-600 dark:from-slate-300 dark:to-blue-400 bg-clip-text text-transparent">
                    Resumo
                  </h3>
                  <CheckCircle className="h-6 w-6 text-blue-500 transition-transform duration-200 hover:scale-110" />
                </div>
                <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Hoje</span>
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-sm">{todayEvents.length} eventos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Esta semana</span>
                  <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold shadow-sm">{thisWeekEvents.length} eventos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Este mês</span>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold shadow-sm">{thisMonthEvents.length} eventos</Badge>
                </div>
                {loading && (
                  <div className="text-sm text-slate-600 dark:text-slate-400 text-center py-2 font-medium">
                    Carregando eventos...
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-500 text-center py-2 font-medium">
                    Erro ao carregar eventos
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            {showFilters && (
              <EventFilters
                filters={filters}
                onFiltersChange={setFilters}
                isOpen={showFilters}
                onOpenChange={setShowFilters}
              />
            )}

            {/* Upcoming Events */}
            <Card className="bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-900 dark:to-purple-950/30 border-purple-200/50 dark:border-purple-800/30 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Próximos Eventos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event, index) => {
                      const eventDate = new Date(event.start);
                      const isToday = eventDate.toDateString() === today.toDateString();
                      const isTomorrow = eventDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
                      
                      let dateText = eventDate.toLocaleDateString('pt-BR', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      });
                      
                      if (isToday) dateText = 'Hoje';
                      else if (isTomorrow) dateText = 'Amanhã';
                      
                      if (!event.allDay) {
                        dateText += `, ${eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                      }
                      
                      const categoryColors = {
                        meeting: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
                        call: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
                        task: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100',
                        other: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                      };
                      
                      const dotColors = {
                        meeting: 'bg-blue-500',
                        call: 'bg-green-500',
                        task: 'bg-orange-500',
                        other: 'bg-slate-500'
                      };
                      
                      return (
                        <div key={event.id} className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:scale-105 cursor-pointer group ${categoryColors[event.category] || categoryColors.other}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold group-hover:text-opacity-80 transition-all duration-200">
                                {event.title}
                              </p>
                              <p className="text-xs opacity-75 font-medium mt-1">
                                {dateText}
                              </p>
                            </div>
                            <div className={`w-3 h-3 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200 ${dotColors[event.category] || dotColors.other}`}></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 bg-white/40 dark:bg-slate-800/40 rounded-xl backdrop-blur-sm border border-purple-100/50 dark:border-purple-800/30">
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {loading ? 'Carregando eventos...' : 'Nenhum evento próximo'}
                      </p>
                      {!loading && events.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 font-medium">
                          Clique em "Dados Exemplo" para criar eventos de teste
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2 xl:col-span-3">
            <Card className="h-full bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/30 border-slate-200/50 dark:border-slate-800/30 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-6 lg:p-8">
                <CalendarComponent
                  onEventClick={handleEventClick}
                  onDateSelect={handleDateSelect}
                  searchTerm={searchTerm}
                  currentView={currentView}
                  onViewChange={setCurrentView}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isEventModalOpen}
          onClose={handleCloseModal}
          event={selectedEvent}
        />
      </div>
    </div>
  );
}