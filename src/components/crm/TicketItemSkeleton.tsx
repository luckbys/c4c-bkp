'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TicketItemSkeletonProps {
  className?: string;
  isSelected?: boolean;
}

export function TicketItemSkeleton({ className, isSelected = false }: TicketItemSkeletonProps) {
  return (
    <div className={cn(
      "p-3 border-b cursor-pointer transition-all duration-200 hover:bg-muted/50",
      isSelected && "bg-primary/5 border-l-4 border-l-primary",
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-10 h-10 border">
          <AvatarFallback>
            <Skeleton className="w-full h-full rounded-full" />
          </AvatarFallback>
        </Avatar>
        
        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header com nome e status */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          
          {/* Última mensagem */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          
          {/* Footer com canal e timestamp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        
        {/* Indicadores laterais */}
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}

// Componente para lista de tickets skeleton
export function TicketListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, index) => (
        <TicketItemSkeleton 
          key={index}
          isSelected={index === 0}
        />
      ))}
    </div>
  );
}

export default TicketItemSkeleton;