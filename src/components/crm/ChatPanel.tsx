
'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ChatMessage from '@/components/crm/ChatMessage';
import ModernMessageInput from '@/components/crm/ModernMessageInput';
import QuickActions from '@/components/crm/QuickActions';
import AnalysisDrawer from '@/components/crm/AnalysisDrawer';
import ResponseSuggestions from '@/components/crm/ResponseSuggestions';
import { ScheduleModal } from '@/components/crm/ScheduleModal';
import { ChatMessagesListSkeleton } from '@/components/crm/ChatMessageSkeleton';
import { ChatPanelSkeleton } from '@/components/crm/ChatPanelSkeleton';
// TODO: Implement TicketAgentPanel component
import TicketAgentPanel from '@/components/crm/TicketAgentPanel';
import type { Ticket, Message, AnalysisResult, SmartRecommendation, RecommendationAction } from '@/components/crm/types';
import { firebaseService } from '@/services/firebase-service';
import { clientFirebaseService } from '@/services/client-firebase-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { generateMessageId, generateSentMessageId } from '@/utils/id-generator';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  ArrowRight, 
  Calendar, 
  FileText, 
  Clock,
  AlertTriangle,
  User,
  MessageSquare,
  ChevronUp,
  Minimize2,
  Maximize2,
  CalendarPlus,
  Plus,
  Bot,
  ChevronDown,
  Loader2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AttachedFile {
  url: string;
  fileName: string;
  size: number;
  type: string;
  mimeType?: string;
}

interface ChatPanelProps {
  ticket: Ticket;
  onNewMessage: (ticketId: string, messageText: string, quoted?: { id: string; content: string; sender: 'client' | 'agent' } | null, attachments?: AttachedFile[]) => void;
  onResolveTicket?: (ticketId: string) => void;
  onTransferTicket?: (ticketId: string) => void;
  onScheduleFollowup?: (ticketId: string) => void;
  onUseTemplate?: (ticketId: string) => void;
  onRecommendationAction?: (action: RecommendationAction, recommendation: SmartRecommendation) => void;
  onTicketUpdate?: (ticket: Ticket) => void;
  isLoading?: boolean;
  isLoadingMessages?: boolean;
}

export default function ChatPanel({ 
  ticket, 
  onNewMessage,
  onResolveTicket,
  onTransferTicket,
  onScheduleFollowup,
  onUseTemplate,
  onRecommendationAction,
  onTicketUpdate,
  isLoading = false,
  isLoadingMessages = false
}: ChatPanelProps) {
  console.log('🎯 [CHATPANEL] Componente renderizado para ticket:', ticket.id);
  
  const { toast } = useToast();

  const chatBodyRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [isCompactMode, setIsCompactMode] = React.useState(true);
  const [showContextInfo, setShowContextInfo] = React.useState(true);
  const [currentTicket, setCurrentTicket] = React.useState<Ticket>(ticket);
  // Removido estado local de mensagens para evitar conflito com props
  const [replyTo, setReplyTo] = React.useState<Message | null>(null);
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [scheduleData, setScheduleData] = React.useState<any>(null);


  const [showAgentSelector, setShowAgentSelector] = React.useState(false);
  const [agents, setAgents] = React.useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = React.useState<string>('');
  const [loadingAgents, setLoadingAgents] = React.useState(false);
  
  // Estados para o botão de scroll to bottom
  const [showScrollButton, setShowScrollButton] = React.useState(true);
  const [isScrolling, setIsScrolling] = React.useState(false);

  // Ref para controlar se o componente está montado
  const isMountedRef = React.useRef(true);
  const lastTicketIdRef = React.useRef<string>('');
  const messagesUpdateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sincronizar ticket quando props mudam
  React.useEffect(() => {
    const isTicketChanged = ticket.id !== lastTicketIdRef.current;
    
    if (isTicketChanged) {
      // Limpar timeout pendente
      if (messagesUpdateTimeoutRef.current) {
        clearTimeout(messagesUpdateTimeoutRef.current);
        messagesUpdateTimeoutRef.current = null;
      }
      
      // Atualizar refs
      lastTicketIdRef.current = ticket.id;
    }
    
    setCurrentTicket(ticket);
  }, [ticket.id, ticket]);

  // Função para lidar com atualizações do ticket com debounce
  const handleTicketUpdate = React.useCallback((updatedTicket: Ticket) => {
    if (!isMountedRef.current) return;
    
    setCurrentTicket(updatedTicket);
    // Propagar a atualização para o componente pai
    onTicketUpdate?.(updatedTicket);
  }, [onTicketUpdate]);

  // Usar mensagens diretamente do ticket prop
  const memoizedMessages = React.useMemo(() => {
    return currentTicket.messages || [];
  }, [currentTicket.id, currentTicket.messages?.length]);

  // Sincronização em tempo real de mensagens usando clientFirebaseService
  React.useEffect(() => {
    console.log('🔄 [REAL-TIME] useEffect executado com:', {
      ticketId: currentTicket.id,
      clientId: currentTicket.client?.id,
      isMounted: isMountedRef.current,
      instanceName: currentTicket.instanceName
    });
    
    if (!currentTicket.id || !currentTicket.client?.id || !isMountedRef.current) {
      console.log('🚫 [REAL-TIME] Condições não atendidas:', {
        ticketId: currentTicket.id,
        clientId: currentTicket.client?.id,
        isMounted: isMountedRef.current
      });
      return;
    }

    console.log('🔄 [REAL-TIME] Iniciando sincronização de mensagens para:', {
      ticketId: currentTicket.id,
      remoteJid: currentTicket.client.id,
      instanceName: currentTicket.instanceName || 'loja'
    });

    let unsubscribe: (() => void) | null = null;
    let isCurrentTicket = true;
    let debounceTimeout: NodeJS.Timeout | null = null;
    let lastMessageCount = currentTicket.messages?.length || 0;

    console.log('🎯 [REAL-TIME] Chamando subscribeToMessages...');
    
    try {
      unsubscribe = clientFirebaseService.subscribeToMessages(
        currentTicket.instanceName || 'loja',
        currentTicket.client.id,
        (updatedMessages) => {
          // Verificar se ainda é o ticket atual e se o componente está montado
          if (!isCurrentTicket || !isMountedRef.current) {
            console.log('🚫 [REAL-TIME] Ignorando atualização - ticket mudou ou componente desmontado');
            return;
          }
          
          console.log('📨 [REAL-TIME] Mensagens atualizadas recebidas:', {
            count: updatedMessages.length,
            previousCount: lastMessageCount,
            ticketId: currentTicket.id
          });
          
          // Verificar se realmente há mudanças significativas
          const hasSignificantChanges = 
            updatedMessages.length !== lastMessageCount ||
            (updatedMessages.length > 0 && lastMessageCount > 0 && 
             updatedMessages[updatedMessages.length - 1]?.messageId !== 
             currentTicket.messages?.[currentTicket.messages.length - 1]?.messageId);
          
          if (!hasSignificantChanges) {
            console.log('📨 [REAL-TIME] Nenhuma mudança significativa detectada, ignorando atualização');
            return;
          }
          
          // Debounce para evitar atualizações excessivas
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
          
          debounceTimeout = setTimeout(() => {
            if (!isCurrentTicket || !isMountedRef.current) return;
            
            console.log('📨 [REAL-TIME] Aplicando atualização de mensagens');
            
            // Atualizar ticket com novas mensagens e propagar para o pai
            const updatedTicket = {
              ...currentTicket,
              messages: updatedMessages,
              lastMessageTime: updatedMessages.length > 0 
                ? updatedMessages[updatedMessages.length - 1].timestamp 
                : currentTicket.lastMessageTime,
              unreadCount: updatedMessages.filter(m => !m.isFromMe && m.status !== 'read').length
            };
            
            lastMessageCount = updatedMessages.length;
            handleTicketUpdate(updatedTicket);
          }, 150); // Debounce de 150ms para maior estabilidade
        },
        (error) => {
          if (isCurrentTicket && isMountedRef.current) {
            console.error('❌ [REAL-TIME] Erro na sincronização de mensagens:', error);
          }
        }
      );
      
      console.log('✅ [REAL-TIME] subscribeToMessages configurado com sucesso');
    } catch (error) {
      console.error('❌ [REAL-TIME] Erro ao configurar subscribeToMessages:', error);
    }

    return () => {
      // Cleanup melhorado
      console.log('🧹 [REAL-TIME] Cleanup do listener para:', currentTicket.id);
      isCurrentTicket = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentTicket.id, currentTicket.client?.id, currentTicket.instanceName]); // Adicionado instanceName para maior precisão



  // Usar mensagens diretamente do ticket prop com deduplicação melhorada
  const allMessages = React.useMemo(() => {
    if (!memoizedMessages || memoizedMessages.length === 0) {
      return [];
    }
    
    // Deduplicação mais robusta usando Map para melhor performance
    const messageMap = new Map();
    
    memoizedMessages.forEach(message => {
      const key = message.messageId || message.id;
      if (key && (!messageMap.has(key) || messageMap.get(key).timestamp < message.timestamp)) {
        messageMap.set(key, message);
      }
    });
    
    // Converter Map para array e ordenar por timestamp
    const uniqueMessages = Array.from(messageMap.values());
    const sorted = uniqueMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
    
    console.log('📋 [MESSAGES] Processadas:', {
      original: memoizedMessages.length,
      unique: sorted.length,
      duplicatesRemoved: memoizedMessages.length - sorted.length
    });
    
    return sorted;
  }, [memoizedMessages]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'resolve':
        onResolveTicket?.(currentTicket.id);
        toast({ title: 'Ticket resolvido com sucesso!' });
        break;
      case 'transfer':
        onTransferTicket?.(currentTicket.id);
        break;
      case 'schedule':
        onScheduleFollowup?.(currentTicket.id);
        break;
      case 'template':
        onUseTemplate?.(currentTicket.id);
        break;
    }
  };

  // Estado para controlar a animação de scroll (simplificado)
  // Removidos estados desnecessários que causavam conflito

  // Cleanup no unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (messagesUpdateTimeoutRef.current) {
        clearTimeout(messagesUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Função para scroll suave para o final
  const scrollToBottom = React.useCallback(async () => {
    if (!messagesEndRef.current || !chatBodyRef.current) return;
    
    setIsScrolling(true);
    
    try {
      // Primeiro tentar scroll no container do chat
      const chatContainer = chatBodyRef.current;
      if (chatContainer) {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
      
      // Fallback: scroll para o elemento final
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        }
      }, 100);
      
      // Aguardar a animação de scroll terminar
      setTimeout(() => {
        setIsScrolling(false);
        // Não esconder o botão imediatamente, deixar a lógica de scroll decidir
      }, 800);
    } catch (error) {
      console.error('Erro ao fazer scroll:', error);
      setIsScrolling(false);
    }
  }, []);

  // Detectar posição do scroll para mostrar/esconder botão
  React.useEffect(() => {
    const chatContainer = chatBodyRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      
      // Mostrar botão se não estiver próximo do final e houver mensagens suficientes
      const shouldShowButton = !isNearBottom && allMessages.length > 0 && !isScrolling;
      
      // Debounce para evitar mudanças muito rápidas
      setTimeout(() => {
        setShowScrollButton(shouldShowButton);
      }, 100);
      
      console.log('🔄 [SCROLL] Estado do botão:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        isNearBottom,
        messagesCount: allMessages.length,
        shouldShowButton,
        isScrolling
      });
    };

    chatContainer.addEventListener('scroll', handleScroll);
    
    // Verificar posição inicial
    handleScroll();

    return () => {
      chatContainer.removeEventListener('scroll', handleScroll);
    };
  }, [allMessages.length, isScrolling]);

  // Auto scroll para novas mensagens otimizado
  const previousMessageCount = React.useRef(0);
  
  React.useEffect(() => {
    if (!isMountedRef.current || allMessages.length === 0) {
      return;
    }
    
    const hasNewMessages = allMessages.length > previousMessageCount.current;
    
    if (hasNewMessages && messagesEndRef.current) {
      const chatContainer = chatBodyRef.current;
      if (chatContainer) {
        const isNearBottom = chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 100;
        
        // Só fazer auto-scroll se o usuário estiver próximo do final ou for a primeira carga
        if (isNearBottom || previousMessageCount.current === 0) {
          // Usar requestAnimationFrame duplo para garantir que o DOM foi completamente atualizado
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (messagesEndRef.current && isMountedRef.current) {
                messagesEndRef.current.scrollIntoView({ 
                  behavior: 'smooth',
                  block: 'end'
                });
                console.log('📜 [SCROLL] Auto-scroll executado para nova mensagem');
              }
            });
          });
        }
      }
    }
    previousMessageCount.current = allMessages.length;
  }, [allMessages.length, allMessages]); // Usar allMessages.length para consistência
  
  const handleSendMessage = async (text: string, type: 'message' | 'note', attachments?: AttachedFile[]) => {
    // Validação simples
    if (!text.trim() && (!attachments || attachments.length === 0)) {
      return;
    }

    if (!currentTicket?.id || !currentTicket?.client?.id) {
      return;
    }
    
    // Verificar se é um comando de agendamento antes de enviar
    if (type === 'message' && text.trim()) {
      await checkForScheduleCommand(text);
    }
    

    
    try {
      // Preparar dados para envio direto
      const quoted = replyTo ? {
        id: replyTo.id,
        content: replyTo.content,
        sender: replyTo.sender
      } : null;
      
      // Envio direto sem RabbitMQ
      await onNewMessage(currentTicket.id, text, quoted || undefined, attachments);
      
      // Limpar reply
      setReplyTo(null);
      
    } catch (error: any) {
      console.error('❌ [SEND-ERROR]:', error.message);
    }
  };

  const checkForScheduleCommand = async (text: string) => {
    try {
      const response = await fetch('/api/schedule/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          clientName: currentTicket.client.name
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.isScheduleCommand && result.isValid && result.confidence >= 70) {
          console.log('📅 Schedule command detected:', result);
          
          // Mostrar toast informativo
          toast({
            title: '📅 Comando de agendamento detectado!',
            description: `Detectei: "${result.title}". Clique para confirmar o agendamento.`,
            action: (
              <Button 
                size="sm" 
                onClick={() => {
                  setScheduleData(result);
                  setScheduleModalOpen(true);
                }}
              >
                <CalendarPlus className="h-4 w-4 mr-1" />
                Agendar
              </Button>
            )
          });
        }
      }
    } catch (error) {
      console.error('Error checking schedule command:', error);
    }
  };

  const handleScheduleEvent = () => {
    setScheduleData(null);
    setScheduleModalOpen(true);
  };

  const handleEventCreated = (event: any) => {
    toast({
      title: '✅ Evento criado com sucesso!',
      description: `${event.title} foi adicionado à sua agenda.`
    });
  };

  const handleAnalyzeConversation = async () => {
    if (!allMessages.length) {
      toast({ title: 'Nenhuma mensagem para analisar', variant: 'destructive' });
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisDrawerOpen(true);
    
    const conversationContext = {
      duration: Math.floor((Date.now() - (currentTicket.createdAt instanceof Date ? currentTicket.createdAt.getTime() : (currentTicket.createdAt as any)?.toDate?.()?.getTime() || Date.now())) / (1000 * 60)),
      messageCount: allMessages.length,
      lastClientMessage: currentTicket.lastMessageTime || currentTicket.createdAt,
      hasUnreadMessages: currentTicket.unreadCount > 0,
      previousInteractions: 0
    };
    
    try {

      const response = await fetch('/api/chat/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allMessages,
          clientInfo: currentTicket.client,
          conversationContext
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro na API de análise:', response.status, errorData);
        throw new Error(`Erro na API (${response.status}): ${errorData}`);
      }

      const result = await response.json();
      setAnalysis(result);
      toast({ title: 'Análise concluída com sucesso!' });
    } catch (err) {
      console.error('Erro detalhado na análise:', err);
      console.error('Dados enviados:', {
        messages: allMessages.length,
        clientInfo: currentTicket.client,
        conversationContext
      });
      
      let errorMessage = 'Erro ao analisar conversa. Tente novamente.';
      if (err instanceof Error) {
        if (err.message.includes('400')) {
          errorMessage = 'Dados inválidos para análise. Verifique se o ticket tem mensagens válidas.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Timeout na análise. A conversa pode ser muito longa.';
        }
      }
      
      setAnalysisError(errorMessage);
      toast({ title: errorMessage, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecommendationAction = (action: RecommendationAction, recommendation: SmartRecommendation) => {
    console.log('Ação recomendada:', action, recommendation);
    
    switch (action) {
      case 'call':
        window.open(`tel:${currentTicket.client.phone}`);
        break;
      case 'proposal':
        onUseTemplate?.(currentTicket.id);
        break;
      case 'demo':
        onScheduleFollowup?.(currentTicket.id);
        break;
    }
    
    onRecommendationAction?.(action, recommendation);
    setAnalysisDrawerOpen(false);
    toast({ title: `Ação executada: ${recommendation.title}` });
  };

  const loadAvailableAgents = async () => {
    try {
      setLoadingAgents(true);
      const response = await fetch('/api/agents/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: currentTicket.id })
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar agentes');
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar agentes disponíveis',
        variant: 'destructive'
      });
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAgentAssignment = async (agent: any) => {
    try {
      setLoadingAgents(true);
      
      const response = await fetch(`/api/tickets/${currentTicket.id}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId: agent.id,
          activationMode: 'immediate',
          autoResponse: true
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao atribuir agente');
      }

      const updatedTicket = {
        ...currentTicket,
        assignedAgent: {
          id: agent.id,
          name: agent.name,
          type: 'ai' as const
        },
        aiConfig: {
          activationMode: 'immediate' as const,
          autoResponse: true,
          activationTrigger: {
            keywords: [],
            delay: 0,
            conditions: []
          },
          escalationRules: {
            maxInteractions: 10,
            escalateToHuman: true,
            escalationConditions: []
          }
        }
      };

      handleTicketUpdate(updatedTicket);
      setShowAgentSelector(false);
      setSelectedAgent('');
      
      toast({
        title: 'Sucesso',
        description: `Agente ${agent.name} atribuído com sucesso`
      });
    } catch (error) {
      console.error('Erro ao atribuir agente:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atribuir agente',
        variant: 'destructive'
      });
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleSelectAgent = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (agent) {
      handleAgentAssignment(agent);
    }
  };

  React.useEffect(() => {
    if (showAgentSelector) {
      loadAvailableAgents();
    }
  }, [showAgentSelector]);

  // Se estiver carregando completamente, mostrar skeleton completo
  if (isLoading) {
    return <ChatPanelSkeleton />;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header Otimizado */}
      <div className={cn(
        "border-b flex items-center bg-card transition-all duration-200",
        isCompactMode ? "px-2 py-1" : "px-4 py-3"
      )}>
        <Avatar className={cn(
          "border",
          isCompactMode ? "w-6 h-6" : "w-10 h-10"
        )}>
            <AvatarImage src={currentTicket.client.avatar} alt={currentTicket.client.name} />
            <AvatarFallback className={isCompactMode ? "text-xs" : ""}>
              {currentTicket.client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 ml-2 min-w-0">
          {isCompactMode ? (
            <p className="font-medium text-sm truncate">
              {currentTicket.client.name}
              <span className="text-xs text-muted-foreground ml-1">#{currentTicket.id}</span>
            </p>
          ) : (
            <>
              <p className="font-semibold truncate">
                {currentTicket.client.name}
                {currentTicket.client.isOnline && (
                  <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full" title="Online" />
                )}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {currentTicket.subject || 'Conversa'} • Tel: {currentTicket.client.phone}
                {currentTicket.client.email && ` • ${currentTicket.client.email}`}
              </p>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {!isCompactMode && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs">
              {currentTicket.status === 'open' ? 'Aberto' : 
               currentTicket.status === 'pending' ? 'Pendente' :
               currentTicket.status === 'in_progress' ? 'Em Atendimento' :
               currentTicket.status === 'resolved' ? 'Resolvido' :
               currentTicket.status === 'closed' ? 'Fechado' : currentTicket.status}
            </Badge>
          )}
          
          {/* Botão para atribuir agente IA */}
          {!currentTicket.assignedAgent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-110"
                    onClick={() => setShowAgentSelector(true)}
                    disabled={loadingAgents}
                  >
                    <Bot className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atribuir Agente IA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          

          

          
          {/* Botão para modo compacto */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCompactMode(!isCompactMode)}
            className="h-6 w-6 p-0"
            title={isCompactMode ? "Expandir header" : "Compactar header"}
          >
            {isCompactMode ? (
              <Maximize2 className="w-3 h-3" />
            ) : (
              <Minimize2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Informações Contextuais do Ticket - Condicionalmente renderizada */}
      {!isCompactMode && showContextInfo && (
        <div className="border-b bg-muted/30">
          <div className="px-4 py-2 space-y-3">
            <TicketAgentPanel 
              ticket={currentTicket} 
              onTicketUpdate={handleTicketUpdate}
            />
          </div>
        </div>
      )}

      {/* Quick Actions - Sempre minimizada em modo compacto */}
      {!isCompactMode && (
        <div className="px-2 py-1 border-b">
          <QuickActions onAction={handleQuickAction} defaultMinimized={true} />
        </div>
      )}
      
      {/* Quick Actions compactas para modo compacto */}
      {isCompactMode && (
        <div className="px-2 py-1 border-b bg-muted/20">
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleQuickAction('resolve')}
              className="h-6 px-2 text-xs"
              title="Resolver (Ctrl+R)"
              disabled={currentTicket.status === 'resolved'}
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleQuickAction('transfer')}
              className="h-6 px-2 text-xs"
              title="Transferir (Ctrl+T)"
            >
              <ArrowRight className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleScheduleEvent}
              className="h-6 px-2 text-xs"
              title="Agendar Evento (Ctrl+S)"
            >
              <Calendar className="w-4 h-4" />
              {!isCompactMode && <span className="ml-1">Agendar</span>}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleQuickAction('template')}
              className="h-6 px-2 text-xs"
              title="Template (Ctrl+M)"
            >
              <FileText className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <div 
        ref={chatBodyRef} 
        data-messages-container
        className={cn(
          "flex-1 overflow-y-auto bg-background transition-all duration-200",
          isCompactMode ? "p-2 space-y-2" : "p-4 space-y-4"
        )}
      >
        <div className="relative">
          {/* Skeleton com fade out */}
          <div className={cn(
            "transition-opacity duration-300",
            isLoadingMessages ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
          )}>
            <ChatMessagesListSkeleton count={4} />
          </div>
          
          {/* Mensagens com fade in */}
          <div className={cn(
            "transition-opacity duration-300 relative",
            isLoadingMessages ? "opacity-0" : "opacity-100"
          )}>

            
            {allMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma mensagem encontrada</p>
                <p className="text-xs mt-1">As mensagens aparecerão aqui quando forem carregadas</p>
              </div>
            ) : (
              allMessages.map((msg, index) => {
                // Garantir key única e estável
                const messageKey = msg.messageId || msg.id || `${msg.timestamp}-${index}`;
                return (
                  <ChatMessage 
                    key={messageKey} 
                    message={msg} 
                    client={currentTicket.client} 
                    onReply={(m) => setReplyTo(m)} 
                  />
                );
              })
            )}
            {/* Elemento para scroll automático */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Botão de Scroll to Bottom - Posicionado estrategicamente no canto inferior direito */}
          {showScrollButton && (
            <div className="fixed bottom-20 right-6 z-50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={scrollToBottom}
                      disabled={isScrolling}
                      size="sm"
                      variant="secondary"
                      className={cn(
                        "h-12 w-12 rounded-full shadow-xl border-2 border-primary/20",
                        "bg-background/95 backdrop-blur-sm hover:bg-primary/10",
                        "transition-all duration-300 ease-out",
                        "hover:scale-110 hover:shadow-2xl hover:border-primary/40",
                        "animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
                        isScrolling && "animate-pulse scale-105"
                      )}
                    >
                      {isScrolling ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Ir para o final da conversa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {/* Removido skeleton de transição que causava conflito com scroll */}
        </div>
      </div>

      <ModernMessageInput 
        onSendMessage={handleSendMessage} 
        replyTo={replyTo ? { content: replyTo.content, sender: replyTo.sender, onCancel: () => setReplyTo(null) } : undefined}
        onAnalyzeConversation={handleAnalyzeConversation}
        isAnalyzing={isAnalyzing}
        ticketId={currentTicket.id}
        messageId={generateMessageId()}
        analysis={analysis}
        typingIndicators={[]}
      />
      
      {/* Sugestões de Resposta */}
      {analysis && analysis.suggestedResponse && (
        <div className="px-4 pb-4">
          <ResponseSuggestions 
            analysis={analysis}
            onSendResponse={(response) => {
              handleSendMessage(response, 'message');
            }}
          />
        </div>
      )}
      
      <AnalysisDrawer
        open={analysisDrawerOpen}
        onOpenChange={setAnalysisDrawerOpen}
        analysis={analysis}
        isLoading={isAnalyzing}
        error={analysisError}
        onActionSelected={handleRecommendationAction}
        onRetryAnalysis={handleAnalyzeConversation}
      />
      
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setScheduleData(null);
        }}
        ticket={currentTicket}
        initialData={scheduleData}
        onEventCreated={handleEventCreated}
      />
      
      {/* Modal de Seleção de Agente IA */}
      <Dialog open={showAgentSelector} onOpenChange={setShowAgentSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-xl">Selecionar Agente IA</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Escolha um agente IA especializado para atender este ticket. Cada agente possui características únicas e níveis de especialização diferentes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {loadingAgents ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Carregando agentes...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <div className="animate-pulse">
                  <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                </div>
                <h3 className="font-medium text-lg mb-2">Nenhum agente disponível</h3>
                <p className="text-sm">Não há agentes IA configurados no momento. Entre em contato com o administrador.</p>
              </div>
            ) : (
              agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className={`group relative border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in fade-in-0 slide-in-from-bottom-4 ${
                    selectedAgent === agent.id
                      ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  {selectedAgent === agent.id && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
                      <CheckCircle className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{agent.name}</h3>
                          <Badge 
                            variant={agent.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {agent.status === 'active' ? '🟢 Ativo' : '🔴 Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {agent.description}
                    </p>
                    
                    <div className={`h-1 rounded-full transition-all duration-300 ${
                      selectedAgent === agent.id 
                        ? 'bg-gradient-to-r from-primary to-primary/50' 
                        : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-primary/30 group-hover:to-transparent'
                    }`} />
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAgentSelector(false)}
              className="flex-1 transition-all duration-200 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSelectAgent}
              disabled={!selectedAgent || loadingAgents}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loadingAgents ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Atribuindo...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Atribuir Agente</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
