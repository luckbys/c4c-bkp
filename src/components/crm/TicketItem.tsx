'use client';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MessageSquare, User, Clock, Building2, Phone, Hash, Bot } from 'lucide-react';
import type { Ticket } from '@/components/crm/types';

interface TicketItemProps {
  ticket: Ticket;
  isSelected: boolean;
  onSelect: (ticketId: string) => void;
}

const statusStyles = {
  open: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    indicator: 'bg-blue-500',
    label: 'Aberto'
  },
  pending: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    indicator: 'bg-amber-500',
    label: 'Pendente'
  },
  in_progress: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    indicator: 'bg-blue-500',
    label: 'Em Atendimento'
  },
  resolved: {
    badge: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    indicator: 'bg-green-500',
    label: 'Resolvido'
  },
  closed: {
    badge: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
    indicator: 'bg-gray-500',
    label: 'Fechado'
  }
};

const channelIcons = {
  whatsapp: MessageSquare,
  'whatsapp-group': MessageSquare,
  email: MessageSquare,
  phone: Phone,
  telegram: MessageSquare
};

const channelLabels = {
  whatsapp: 'WhatsApp',
  'whatsapp-group': 'Grupo WhatsApp',
  email: 'Email',
  phone: 'Telefone',
  telegram: 'Telegram'
};

export default function TicketItem({ ticket, isSelected, onSelect }: TicketItemProps) {
  const statusConfig = statusStyles[ticket.status as keyof typeof statusStyles] || statusStyles.pending;
  const ChannelIcon = channelIcons[ticket.channel as keyof typeof channelIcons] || MessageSquare;
  const channelLabel = channelLabels[ticket.channel as keyof typeof channelLabels] || ticket.channel;
  const clientInitials = ticket.client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const lastMessage = ticket.messages && ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1] : null;
  
  // Gerar ID mais legível baseado no hash do ID original
  const generateReadableId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const ticketNumber = Math.abs(hash) % 9999 + 1;
    return `#${ticketNumber.toString().padStart(4, '0')}`;
  };
  
  const readableId = generateReadableId(ticket.id);
  // Obter a data da última interação (última mensagem ou updatedAt)
  const getLastInteractionDate = () => {
    if (lastMessage && lastMessage.timestamp) {
      return new Date(lastMessage.timestamp);
    }
    return ticket.updatedAt ? new Date(ticket.updatedAt) : null;
  };
  
  const formatTime = (date: Date | undefined | null) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Sem data';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days} dias`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };
  
  const lastInteractionDate = getLastInteractionDate();
  const messageCount = ticket.messages ? ticket.messages.length : 0;
  
  // Verificar se agente IA está ativo
  const isAIAgentActive = ticket.assignedAgent?.type === 'ai' && ticket.aiConfig?.autoResponse === true;

  return (
    <article
      className={cn(
        'group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 ease-in-out',
        'hover:shadow-md hover:border-primary/20',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'min-h-[200px] flex flex-col justify-between',
        isSelected 
          ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30 shadow-md' 
          : 'bg-card/50 backdrop-blur-sm hover:bg-card/80'
      )}
      onClick={() => onSelect(ticket.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(ticket.id)}
      tabIndex={0}
      aria-selected={isSelected}
    >
      {/* Status Indicator */}
      <div className={cn(
        'absolute top-0 left-0 w-1 h-full rounded-l-xl transition-all duration-200',
        statusConfig.indicator,
        isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'
      )} />
      
      {/* Header */}
      <header className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
            <AvatarImage src={ticket.client.avatar} alt={ticket.client.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary font-semibold text-xs">
              {clientInitials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-mono font-medium text-muted-foreground">{readableId}</span>
            </div>
            
            <Badge variant="outline" className={cn(
              'text-xs font-medium transition-colors duration-200 w-fit px-1.5 py-0.5',
              'bg-emerald-50/80 text-emerald-700 border-emerald-200/60',
              'dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40'
            )}>
              <ChannelIcon className="h-2.5 w-2.5 mr-1" /> 
              {channelLabel}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs font-medium transition-all duration-200 px-1.5 py-0.5',
                statusConfig.badge,
                'shadow-sm'
              )}
            >
              <div className={cn('w-1.5 h-1.5 rounded-full mr-1', statusConfig.indicator)} />
              {statusConfig.label}
            </Badge>
            
            {/* Ícone de Agente IA Ativo */}
            {isAIAgentActive && (
              <div 
                className="relative group"
                title="Agente IA ativo - Resposta automática habilitada"
              >
                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-pulse" />
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs font-medium transition-all duration-200 px-1.5 py-0.5',
                    'bg-purple-50/90 text-purple-700 border-purple-200/80',
                    'dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50',
                    'shadow-sm hover:shadow-md',
                    'relative z-10'
                  )}
                >
                  <Bot className="h-2.5 w-2.5 mr-1 animate-pulse" />
                  IA
                </Badge>
              </div>
            )}
          </div>
          
          {ticket.unreadCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                {ticket.unreadCount} nova{ticket.unreadCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 space-y-1.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors duration-200">
              {ticket.client.name}
            </h3>
            {ticket.client.isOnline && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Online" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ticket.subject || 'Conversa'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{ticket.client.phone}</span>
          </div>
          {ticket.client.email && (
            <span className="truncate">Email: {ticket.client.email}</span>
          )}
        </div>
        
        {lastMessage && (
          <div className="bg-muted/30 rounded-md p-1.5">
            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
              {lastMessage.content}
            </p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <time className="font-medium">{formatTime(lastInteractionDate)}</time>
        </div>
        
        <div className="flex items-center gap-1">
          {messageCount > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
              {messageCount} msg{messageCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}
