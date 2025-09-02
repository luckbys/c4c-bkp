
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, SortDesc, Phone, X, Calendar, Loader2 } from 'lucide-react';
import TicketItem from '@/components/crm/TicketItem';
import type { Ticket } from '@/components/crm/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdvancedFilters, { AdvancedFilters as AdvancedFiltersType } from '@/components/crm/AdvancedFilters';
import TicketListSkeleton, { SimpleTicketListSkeleton } from '@/components/crm/TicketListSkeleton';
import { cn } from '@/lib/utils';

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId: string;
  onSelectTicket: (ticketId: string) => void;
  filters?: AdvancedFiltersType;
  onFiltersChange?: (filters: AdvancedFiltersType) => void;
  allTickets?: Ticket[];
  isLoading?: boolean;
  isLoadingTickets?: boolean;
}

// Custom hook for window size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: 1024,
    height: 768,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Set initial size
    if (typeof window !== 'undefined') {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return windowSize;
}

export default function TicketList({ tickets, selectedTicketId, onSelectTicket, filters, onFiltersChange, allTickets, isLoading = false, isLoadingTickets = false }: TicketListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  const [isSearching, setIsSearching] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const { height: windowHeight } = useWindowSize();
  
  // Debounce para busca
  React.useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm]);
  
  // Loading state para filtros
  React.useEffect(() => {
    if (filters) {
      setIsFiltering(true);
      const timeoutId = setTimeout(() => {
        setIsFiltering(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [filters]);

  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets.filter(ticket => {
      // Busca geral (campo único)
      return searchTerm === '' || (
        ticket.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.client.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Sort tickets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.client.name.localeCompare(b.client.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'recent':
        default:
          // Put unread messages first, then sort by updatedAt
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return filtered;
  }, [tickets, searchTerm, sortBy]);

  const statusCounts = useMemo(() => {
    return tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tickets]);

  const unreadCount = tickets.filter(t => t.unreadCount > 0).length;

  // Se estiver carregando completamente, mostrar skeleton completo
  if (isLoading) {
    return <TicketListSkeleton />;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-card shadow-sm">
      <CardHeader className="flex flex-col space-y-1.5 p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Conversas</CardTitle>
          {onFiltersChange && allTickets && (
            <AdvancedFilters tickets={allTickets} onFiltersChange={onFiltersChange} />
          )}
        </div>
        <div className="space-y-3 mt-2">
          {/* Campo de Busca Único */}
          <div className="relative group">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            )}
            <Input
              id="search"
              className={cn(
                "w-full pl-9 pr-10 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md",
                isSearching && "border-primary/30"
              )}
              placeholder="Buscar: nome, telefone, ID, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Stats, Filtros Ativos e Ordenação */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={cn(
                "text-xs font-medium transition-all duration-200",
                (isSearching || isFiltering) && "animate-pulse"
              )}>
                {isSearching || isFiltering ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Carregando...</>
                ) : (
                  `${filteredAndSortedTickets.length} de ${tickets.length}`
                )}
              </Badge>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  {unreadCount} não lidas
                </Badge>
              )}
              
              {/* Indicador de Filtro Ativo */}
              {searchTerm && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Busca: {searchTerm}
                </Badge>
              )}
              
              {/* Indicador de Filtros Ativos */}
              {isFiltering && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Filtrando...
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <SortDesc className="h-3 w-3 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'status')}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/50 transition-colors"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="name">Nome A-Z</option>
                  <option value="status">Status</option>
                </select>
              </div>
              <SortDesc className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          {/* Status Overview */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-[10px] px-2 py-0.5">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          {/* Skeleton com fade out */}
          <div className={cn(
            "absolute inset-0 transition-opacity duration-300",
            isLoadingTickets ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <SimpleTicketListSkeleton count={6} />
          </div>
          
          {/* Conteúdo com fade in */}
          <div className={cn(
            "transition-opacity duration-300",
            isLoadingTickets ? "opacity-0" : "opacity-100"
          )}>
            {filteredAndSortedTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Nenhuma conversa encontrada
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {searchTerm ? 'Tente ajustar os filtros de busca' : 'Aguardando novas conversas...'}
                </p>
              </div>
            ) : (
              <VirtualizedTicketList
                 tickets={filteredAndSortedTickets}
                 selectedTicketId={selectedTicketId}
                 onSelectTicket={onSelectTicket}
                 height={Math.max(400, windowHeight - 280)}
               />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Virtualized Ticket List Component
interface VirtualizedTicketListProps {
  tickets: Ticket[];
  selectedTicketId: string;
  onSelectTicket: (ticketId: string) => void;
  height: number;
}

function VirtualizedTicketList({ tickets, selectedTicketId, onSelectTicket, height }: VirtualizedTicketListProps) {
  const ITEM_HEIGHT = 220; // Increased height to accommodate full ticket content without cutting
  const listRef = React.useRef<List>(null);
  
  // Scroll suave para o ticket selecionado
  React.useEffect(() => {
    if (selectedTicketId && listRef.current) {
      const selectedIndex = tickets.findIndex(ticket => ticket.id === selectedTicketId);
      if (selectedIndex !== -1) {
        listRef.current.scrollToItem(selectedIndex, 'center');
      }
    }
  }, [selectedTicketId, tickets]);
  
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const ticket = tickets[index];
    
    if (!ticket) {
      return <div style={style} />;
    }
    
    return (
      <div style={style} className="px-3">
        <div className="pb-4 h-full flex flex-col">
          <TicketItem
            ticket={ticket}
            isSelected={ticket.id === selectedTicketId}
            onSelect={onSelectTicket}
          />
        </div>
      </div>
    );
  }, [tickets, selectedTicketId, onSelectTicket]);
  
  if (tickets.length === 0) {
    return <div className="w-full h-full" />;
  }
  
  return (
    <div className="w-full">
      <List
        ref={listRef}
        height={height}
        itemCount={tickets.length}
        itemSize={ITEM_HEIGHT}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        {Row}
      </List>
    </div>
  );
}
