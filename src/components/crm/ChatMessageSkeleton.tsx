'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ChatMessageSkeletonProps {
  isAgent?: boolean;
  showAvatar?: boolean;
  className?: string;
  animationDelay?: number;
}

export function ChatMessageSkeleton({ 
  isAgent = false, 
  showAvatar = true, 
  className,
  animationDelay = 0
}: ChatMessageSkeletonProps) {
  return (
    <div 
      className={cn(
        "flex gap-3 p-3 transition-all duration-500 ease-out",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        isAgent ? "justify-start" : "justify-end",
        className
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'both'
      }}
    >
      {/* Avatar para mensagens do agente */}
      {isAgent && showAvatar && (
        <Avatar className="w-8 h-8 border animate-pulse">
          <AvatarFallback>
            <div className="w-full h-full rounded-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 animate-shimmer" />
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Conteúdo da mensagem */}
      <div className={cn(
        "flex flex-col gap-2 max-w-[70%]",
        isAgent ? "items-start" : "items-end"
      )}>
        {/* Bubble da mensagem */}
        <div className={cn(
          "rounded-lg p-3 space-y-2 relative overflow-hidden",
          isAgent 
            ? "bg-gradient-to-br from-muted via-muted/90 to-muted/80 border border-border/50" 
            : "bg-gradient-to-br from-primary/10 via-primary/8 to-primary/6 border border-primary/20"
        )}>
          {/* Efeito shimmer de fundo */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-slow" />
          
          {/* Linhas de texto simuladas com diferentes larguras */}
          <div className="relative space-y-2">
            <div className="h-4 bg-gradient-to-r from-muted-foreground/20 via-muted-foreground/30 to-muted-foreground/20 rounded animate-pulse" style={{ width: '85%' }} />
            <div className="h-4 bg-gradient-to-r from-muted-foreground/20 via-muted-foreground/30 to-muted-foreground/20 rounded animate-pulse" style={{ width: '65%', animationDelay: '150ms' }} />
            <div className="h-4 bg-gradient-to-r from-muted-foreground/20 via-muted-foreground/30 to-muted-foreground/20 rounded animate-pulse" style={{ width: '75%', animationDelay: '300ms' }} />
          </div>
        </div>
        
        {/* Timestamp */}
        <div className="h-3 w-16 bg-gradient-to-r from-muted-foreground/15 via-muted-foreground/25 to-muted-foreground/15 rounded animate-pulse" style={{ animationDelay: '450ms' }} />
      </div>
      
      {/* Avatar para mensagens do cliente */}
      {!isAgent && showAvatar && (
        <Avatar className="w-8 h-8 border animate-pulse">
          <AvatarFallback>
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 animate-shimmer" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// Componente para múltiplas mensagens skeleton com animação escalonada
export function ChatMessagesListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1 relative">
      {/* Efeito de fade in geral */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-transparent pointer-events-none animate-pulse" />
      
      {Array.from({ length: count }).map((_, index) => (
        <ChatMessageSkeleton 
          key={index}
          isAgent={index % 2 === 0}
          showAvatar={true}
          animationDelay={index * 150} // Animação escalonada
        />
      ))}
      
      {/* Indicador de carregamento sutil */}
      <div className="flex justify-center py-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default ChatMessageSkeleton;

// Adicionar estilos CSS customizados para as animações
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes shimmer-slow {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
    
    .animate-shimmer-slow {
      animation: shimmer-slow 3s infinite;
    }
  `;
  
  if (!document.head.querySelector('style[data-skeleton-animations]')) {
    style.setAttribute('data-skeleton-animations', 'true');
    document.head.appendChild(style);
  }
}