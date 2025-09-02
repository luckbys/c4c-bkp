'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatMessagesListSkeleton } from './ChatMessageSkeleton';
import { cn } from '@/lib/utils';

interface ChatPanelSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showMessages?: boolean;
  showInput?: boolean;
  messagesCount?: number;
}

export function ChatPanelSkeleton({ 
  className,
  showHeader = true,
  showMessages = true,
  showInput = true,
  messagesCount = 4
}: ChatPanelSkeletonProps) {
  return (
    <Card className={cn("h-full flex flex-col overflow-hidden bg-background", className)}>
      {/* Header Skeleton */}
      {showHeader && (
        <div className="border-b flex items-center px-4 py-3">
          <Avatar className="w-10 h-10 border">
            <AvatarFallback>
              <Skeleton className="w-full h-full rounded-full" />
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-3 flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        </div>
      )}
      
      {/* Context Info Skeleton */}
      <div className="border-b p-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      
      {/* Messages Area Skeleton */}
      {showMessages && (
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-2">
            <ChatMessagesListSkeleton count={messagesCount} />
          </div>
        </div>
      )}
      
      {/* Input Area Skeleton */}
      {showInput && (
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-18 rounded-full" />
          </div>
        </div>
      )}
    </Card>
  );
}

// Skeleton para painel de chat compacto
export function CompactChatPanelSkeleton({ className }: { className?: string }) {
  return (
    <ChatPanelSkeleton 
      className={className}
      showHeader={true}
      showMessages={true}
      showInput={false}
      messagesCount={2}
    />
  );
}

export default ChatPanelSkeleton;