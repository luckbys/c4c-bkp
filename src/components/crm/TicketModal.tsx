'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MediaMessage, detectContentType } from '@/components/crm/MediaComponents';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { 
  Send, 
  Phone, 
  Mail, 
  MessageSquare, 
  Clock, 
  User,
  CheckCircle,
  AlertCircle,
  Circle,
  ArrowRight,
  Building2,
  Loader2,
  Smile,
  Paperclip,
  Mic,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import type { Ticket, Message } from '@/components/crm/types';
import { firebaseService } from '@/services/firebase-service';
import ChatMessage from '@/components/crm/ChatMessage';
import { DateSeparator } from './DateSeparator';
import ChatMessageGroup from './ChatMessageGroup';

interface TicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onSendMessage?: (message: string) => void;
}

const statusStyles = {
  open: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    indicator: 'bg-blue-500',
    label: 'Aberto',
    icon: Circle
  },
  pending: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    indicator: 'bg-amber-500',
    label: 'Aguardando',
    icon: Clock
  },
  in_progress: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    indicator: 'bg-purple-500',
    label: 'Em Atendimento',
    icon: ArrowRight
  },
  resolved: {
    badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    indicator: 'bg-green-500',
    label: 'Resolvido',
    icon: CheckCircle
  },
  closed: {
    badge: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
    indicator: 'bg-gray-500',
    label: 'Fechado',
    icon: CheckCircle
  }
};

const channelIcons = {
  whatsapp: MessageSquare,
  'whatsapp-group': MessageSquare,
  email: Mail,
  phone: Phone,
  telegram: MessageSquare
};

export default function TicketModal({ 
  ticket, 
  isOpen, 
  onClose, 
  onStatusChange,
  onSendMessage 
}: TicketModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (ticket && isOpen) {
      loadMessages();
    }
  }, [ticket?.id, ticket?.client?.phone, ticket?.instanceName, isOpen]);

  // Scroll automático para o fim da conversa quando as mensagens carregarem ou modal abrir
  useEffect(() => {
    if (isOpen && messages.length > 0 && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [isOpen, messages, loadingMessages]);

  const loadMessages = async () => {
    if (!ticket?.client?.phone || !ticket?.instanceName) {
      return;
    }

    try {
      setLoadingMessages(true);
      const fetchedMessages = await firebaseService.getMessages(
        ticket.client.phone,
        ticket.instanceName
      );
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  if (!ticket) return null;

  const statusConfig = statusStyles[ticket.status as keyof typeof statusStyles] || statusStyles.open;
  const ChannelIcon = channelIcons[ticket.channel as keyof typeof channelIcons] || MessageSquare;
  const StatusIcon = statusConfig.icon;
  const clientInitials = ticket.client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const formatTime = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Data inválida';
    }
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleQuote = (message: Message) => {
    setQuotedMessage(message);
  };

  const handleSendMessage = async () => {
     if (!newMessage.trim() || !ticket?.client?.phone || !ticket?.instanceName) return;
     
     setIsLoading(true);
     try {
       const quoted = quotedMessage ? {
         id: quotedMessage.id,
         content: quotedMessage.content,
         sender: quotedMessage.sender
       } : null;

        // Enviar mensagem via Firebase
        await firebaseService.sendMessage(
          ticket.instanceName,
          ticket.client.phone, // remoteJid
          newMessage,
          quoted
        );
        
        // Recarregar mensagens para mostrar a nova mensagem
        await loadMessages();
        
        setNewMessage('');
        setQuotedMessage(null);
     } catch (error) {
       console.error('Erro ao enviar mensagem:', error);
       alert('Erro ao enviar mensagem: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
     } finally {
       setIsLoading(false);
     }
   };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(ticket.id, newStatus);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "p-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 border-2 border-primary/10 shadow-2xl flex flex-col modal-content",
        isMaximized 
          ? "w-[98vw] h-[98vh] max-w-[98vw] max-h-[98vh]" 
          : "w-full max-w-4xl h-[90vh] max-h-[90vh]"
      )}>
        {/* Header com design de bolha - Responsivo */}
        <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 sm:p-6 border-b border-primary/10 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary/20 shadow-lg flex-shrink-0">
                  <AvatarImage src={ticket.client.avatar} alt={ticket.client.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary font-bold text-sm">
                    {clientInitials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1 min-w-0 flex-1">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 truncate">
                    <span className="truncate">{ticket.client.name}</span>
                    {ticket.client.isOnline && (
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="Online" />
                    )}
                  </DialogTitle>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ChannelIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="capitalize">{ticket.channel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{ticket.client.phone}</span>
                    </div>
                    {ticket.client.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="truncate">{ticket.client.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs font-medium', statusConfig.badge)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                  </div>
                </div>
              </div>
              
              {/* Botão de maximizar */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                  title={isMaximized ? "Minimizar" : "Maximizar"}
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Ações Rápidas - Responsivo */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-muted/30 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground mr-2 hidden sm:inline">Ações Rápidas:</span>
            
            {ticket.status !== 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('in_progress')}
                className="h-7 sm:h-8 text-xs hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Iniciar Atendimento</span>
                <span className="sm:hidden">Iniciar</span>
              </Button>
            )}
            
            {ticket.status !== 'resolved' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('resolved')}
                className="h-7 sm:h-8 text-xs hover:bg-green-50 hover:border-green-200 hover:text-green-700"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolver
              </Button>
            )}
            
            {ticket.status !== 'pending' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('pending')}
                className="h-7 sm:h-8 text-xs hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700"
              >
                <Clock className="h-3 w-3 mr-1" />
                Aguardar
              </Button>
            )}
          </div>
        </div>

        {/* Conversa - Melhor scroll e responsividade */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 sm:px-6 py-4 scroll-smooth touch-scroll">
            <div className="space-y-3 sm:space-y-4">
              {loadingMessages ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">Carregando mensagens...</p>
                </div>
              ) : messages && messages.length > 0 ? (
                (() => {
                  const messageGroups: Message[][] = [];
                  if (messages.length > 0) {
                    let currentGroup: Message[] = [messages[0]];
                    for (let i = 1; i < messages.length; i++) {
                      const prevMessage = messages[i - 1];
                      const currentMessage = messages[i];
                      const prevDate = new Date(prevMessage.timestamp).toLocaleDateString();
                      const currentDate = new Date(currentMessage.timestamp).toLocaleDateString();

                      if (currentMessage.sender === prevMessage.sender && currentDate === prevDate) {
                        currentGroup.push(currentMessage);
                      } else {
                        messageGroups.push(currentGroup);
                        currentGroup = [currentMessage];
                      }
                    }
                    messageGroups.push(currentGroup);
                  }

                  let lastDate: string | null = null;
                  return messageGroups.map((group, groupIndex) => {
                    const firstMessage = group[0];
                    const messageDate = new Date(firstMessage.timestamp).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    });
                    const showSeparator = messageDate !== lastDate;
                    lastDate = messageDate;

                    return (
                      <div key={groupIndex}>
                        {showSeparator && <DateSeparator date={messageDate} />}
                        <ChatMessageGroup
                          messages={group}
                          client={ticket.client}
                          onReply={handleQuote}
                        />
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input de chat moderno */}
          <div className="p-4 sm:p-6 border-t border-border/50 bg-gradient-to-r from-background via-muted/10 to-background flex-shrink-0">
            <div className="relative">

              {quotedMessage && (
                <div className="mb-2 p-2 pr-8 relative rounded-md bg-muted/50 border border-border text-sm">
                  <p className="font-semibold text-xs text-primary">Respondendo a:</p>
                  <p className="text-muted-foreground truncate">{quotedMessage.content}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 rounded-full"
                    onClick={() => setQuotedMessage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

               {/* Container do input com design moderno */}
               <div className="flex items-end gap-3 p-3 bg-background border border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-lg">
                 {/* Botão de anexo */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  disabled={isLoading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                {/* Input de texto */}
                <div className="flex-1 relative">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 mobile-focus"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                  
                  {/* Contador de caracteres (opcional) */}
                  {newMessage.length > 0 && (
                    <div className="absolute -bottom-5 right-0 text-xs text-muted-foreground/60">
                      {newMessage.length}/1000
                    </div>
                  )}
                </div>
                
                {/* Botões de ação */}
                <div className="flex items-center gap-1">
                  {/* Botão de emoji */}
                  <EmojiPicker 
                    onEmojiSelect={handleEmojiSelect}
                    className="h-8 w-8 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  />
                  
                  {/* Botão de áudio (quando não há texto) */}
                  {!newMessage.trim() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary hover:text-primary transition-colors flex-shrink-0"
                      disabled={isLoading}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Botão de envio (quando há texto) */}
                  {newMessage.trim() && (
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading}
                      size="icon"
                      className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  

                </div>
              </div>
              
              {/* Indicador de digitação (opcional) */}
              {isLoading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                  <span>Enviando mensagem...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}