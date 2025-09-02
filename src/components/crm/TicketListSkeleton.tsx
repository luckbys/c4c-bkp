'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TicketListSkeleton as TicketItemsList } from './TicketItemSkeleton';
import { cn } from '@/lib/utils';

interface TicketListSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
  ticketsCount?: number;
}

export function TicketListSkeleton({ 
  className,
  showHeader = true,
  showFilters = true,
  showStats = true,
  ticketsCount = 6
}: TicketListSkeletonProps) {
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      {/* Header com título e ações */}
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {/* Filtros e busca */}
        {showFilters && (
          <div className="p-4 border-b space-y-3">
            {/* Barra de busca */}
            <div className="relative">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            
            {/* Filtros rápidos */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-18 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            
            {/* Ordenação */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-32 rounded" />
            </div>
          </div>
        )}
        
        {/* Estatísticas rápidas */}
        {showStats && (
          <div className="p-4 border-b">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="text-center space-y-1">
                  <Skeleton className="h-6 w-8 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Lista de tickets */}
        <div className="flex-1 overflow-hidden">
          <TicketItemsList count={ticketsCount} />
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton simplificado para lista de tickets
export function SimpleTicketListSkeleton({ 
  className,
  count = 4 
}: { 
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn("space-y-0", className)}>
      <TicketItemsList count={count} />
    </div>
  );
}

// Skeleton para lista de tickets com loading state
export function LoadingTicketListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 text-center">
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </div>
      <div className="w-full max-w-md space-y-2">
        <TicketItemsList count={3} />
      </div>
    </div>
  );
}

export default TicketListSkeleton;