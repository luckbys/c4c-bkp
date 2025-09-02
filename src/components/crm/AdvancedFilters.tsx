'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Filter,
  X,
  Search,
  Calendar as CalendarIcon,
  Clock,
  User,
  Tag,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AdvancedFilters {
  status: Ticket['status'][];
  priority: ('baixa' | 'media' | 'alta' | 'critica')[];
  assignee: string[];
  dateRange: { start: Date | null; end: Date | null; };
  channel: Ticket['channel'][];
  hasUnread: boolean | null;
  responseTimeRange: { min: number; max: number; } | null;
}

interface AdvancedFiltersProps {
  tickets: Ticket[];
  onFiltersChange: (filters: AdvancedFilters) => void;
  className?: string;
}

const defaultFilters: AdvancedFilters = {
  status: [],
  priority: [],
  assignee: [],
  dateRange: { start: null, end: null },
  channel: [],
  hasUnread: null,
  responseTimeRange: null
};

const statusOptions: { value: Ticket['status']; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
  { value: 'in_progress', label: 'Em Atendimento', color: 'bg-blue-100 text-blue-800' },
  { value: 'open', label: 'Aguardando', color: 'bg-slate-100 text-slate-800' },
  { value: 'resolved', label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  { value: 'closed', label: 'Fechado', color: 'bg-gray-100 text-gray-800' }
];

const priorityOptions = [
  { value: 'baixa', label: 'Baixa', color: 'bg-green-100 text-green-800' },
  { value: 'media', label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-800' }
];

const channelOptions: { value: Ticket['channel']; label: string; icon: React.ReactNode }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'email', label: 'Email', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'phone', label: 'Telefone', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'telegram', label: 'Telegram', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'whatsapp-group', label: 'WhatsApp Grupo', icon: <MessageSquare className="h-4 w-4" /> }
];

const assigneeOptions = [
  { value: 'lucas', label: 'Lucas' },
  { value: 'maria', label: 'Maria' },
  { value: 'joao', label: 'João' },
  { value: 'ana', label: 'Ana' },
  { value: 'unassigned', label: 'Não Atribuído' }
];

export default function AdvancedFilters({ tickets, onFiltersChange, className }: AdvancedFiltersProps) {
  const [filters, setFilters] = React.useState<AdvancedFilters>(defaultFilters);
  const [isOpen, setIsOpen] = React.useState(false);

  const updateFilters = (newFilters: Partial<AdvancedFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.channel.length > 0) count++;
    if (filters.hasUnread !== null) count++;
    if (filters.responseTimeRange) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Filtros avançados */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filtros Avançados</h3>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Status
              </Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <Badge
                    key={status.value}
                    variant={filters.status.includes(status.value) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      filters.status.includes(status.value) && status.color
                    )}
                    onClick={() => {
                      const newStatus = filters.status.includes(status.value)
                        ? filters.status.filter(s => s !== status.value)
                        : [...filters.status, status.value];
                      updateFilters({ status: newStatus });
                    }}
                  >
                    {status.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Prioridade
              </Label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((priority) => (
                  <Badge
                    key={priority.value}
                    variant={filters.priority.includes(priority.value as any) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      filters.priority.includes(priority.value as any) && priority.color
                    )}
                    onClick={() => {
                      const newPriority = filters.priority.includes(priority.value as any)
                        ? filters.priority.filter(p => p !== priority.value)
                        : [...filters.priority, priority.value as any];
                      updateFilters({ priority: newPriority });
                    }}
                  >
                    {priority.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Canal */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Canal
              </Label>
              <div className="flex flex-wrap gap-2">
                {channelOptions.map((channel) => (
                  <Badge
                    key={channel.value}
                    variant={filters.channel.includes(channel.value) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => {
                      const newChannel = filters.channel.includes(channel.value)
                        ? filters.channel.filter(c => c !== channel.value)
                        : [...filters.channel, channel.value];
                      updateFilters({ channel: newChannel });
                    }}
                  >
                    {channel.icon}
                    <span className="ml-1">{channel.label}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Responsável */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Responsável
              </Label>
              <Select
                value={filters.assignee[0] || ''}
                onValueChange={(value) => {
                  updateFilters({ assignee: value ? [value] : [] });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  {assigneeOptions.map((assignee) => (
                    <SelectItem key={assignee.value} value={assignee.value}>
                      {assignee.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Período
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.start ? (
                        format(filters.dateRange.start, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Data inicial"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.start || undefined}
                      onSelect={(date) => updateFilters({ 
                        dateRange: { ...filters.dateRange, start: date || null } 
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.end ? (
                        format(filters.dateRange.end, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Data final"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.end || undefined}
                      onSelect={(date) => updateFilters({ 
                        dateRange: { ...filters.dateRange, end: date || null } 
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Opções adicionais */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Opções</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unread"
                  checked={filters.hasUnread === true}
                  onCheckedChange={(checked) => {
                    updateFilters({ hasUnread: checked ? true : null });
                  }}
                />
                <Label htmlFor="unread" className="text-sm">
                  Apenas não lidas
                </Label>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                onClick={() => setIsOpen(false)} 
                className="flex-1"
                size="sm"
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Badges dos filtros ativos */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.status.map((status) => (
            <Badge key={status} variant="secondary" className="text-xs">
              {status}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilters({ 
                  status: filters.status.filter(s => s !== status) 
                })}
              />
            </Badge>
          ))}
          {filters.channel.map((channel) => (
            <Badge key={channel} variant="secondary" className="text-xs">
              {channel}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => updateFilters({ 
                  channel: filters.channel.filter(c => c !== channel) 
                })}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook para aplicar os filtros
export function useFilteredTickets(tickets: Ticket[], filters: AdvancedFilters): Ticket[] {
  return React.useMemo(() => {
    return tickets.filter(ticket => {
      // Filtro por status
      if (filters.status.length > 0 && !filters.status.includes(ticket.status)) {
        return false;
      }

      // Filtro por canal
      if (filters.channel.length > 0 && !filters.channel.includes(ticket.channel)) {
        return false;
      }

      // Filtro por não lidas
      if (filters.hasUnread === true && ticket.unreadCount === 0) {
        return false;
      }

      // Filtro por responsável
      if (filters.assignee.length > 0) {
        // Simular lógica de responsável (seria baseado em dados reais)
        const ticketAssignee = 'lucas'; // Placeholder
        if (!filters.assignee.includes(ticketAssignee)) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, filters]);
}