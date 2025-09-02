
'use client'

import React from 'react'
import { Copy, Reply, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Message, Client } from '@/components/crm/types'
import { MediaMessage, detectContentType } from '@/components/crm/MediaComponents'
import { QuotedPreview } from '@/components/crm/QuotedPreview'

interface ChatMessageProps {
  message: Message;
  client: Client;
  onReply: (message: Message) => void;
  isGrouped?: boolean;
}

export default function ChatMessage({ message, client, onReply, isGrouped }: ChatMessageProps) {
  const isFromMe = message.isFromMe || message.sender === 'agent'
  const [showActions, setShowActions] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch (e) {
      console.error('Falha ao copiar', e)
    }
  }

  return (
    <div 
      className={cn('flex items-start gap-2 group relative', isFromMe ? 'justify-end' : 'justify-start', isGrouped ? 'mt-1' : 'mt-4')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isFromMe && (
        <Avatar className="w-6 h-6">
          <AvatarImage src={client.avatar} />
          <AvatarFallback>{client.name?.[0]?.toUpperCase() ?? 'C'}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn('max-w-[80%] relative flex flex-col', isFromMe ? 'items-end' : 'items-start')}>
        {(message.quotedMessageContent && message.quotedMessageSender) && (
          <QuotedPreview 
            content={message.quotedMessageContent} 
            sender={message.quotedMessageSender}
            type={message.quotedMessageType}
          />
        )}
        <div className={cn(
          'rounded-lg px-3 py-2 relative',
          isFromMe ? 'bg-primary text-primary-foreground' : 'bg-muted',
          isGrouped ? (isFromMe ? 'rounded-tr-md' : 'rounded-tl-md') : '',
          !isFromMe && !isGrouped ? 'rounded-tl-lg' : '',
          isFromMe && !isGrouped ? 'rounded-tr-lg' : '',
          message.isTemporary ? 'opacity-75 border border-dashed border-primary/50' : ''
        )}>
          <MediaMessage 
            content={message.content}
            type={message.type || detectContentType(message.content)}
            messageId={message.messageId}
            isFromAgent={!message.isFromMe}
            mediaUrl={message.mediaUrl}
            fileName={message.fileName}
          />
        </div>
        <div className={cn(
          'absolute -top-2 transition-opacity flex gap-1',
          showActions ? 'opacity-100' : 'opacity-0'
        )} style={{ right: isFromMe ? 0 : undefined, left: isFromMe ? undefined : 0 }}>
          {onReply && (
            <button 
              className="p-1 rounded bg-background/80 shadow border hover:bg-background hover:border-primary/50 transition-colors" 
              title="Responder" 
              onClick={() => onReply(message)}
            >
              <Reply className="w-3 h-3" />
            </button>
          )}
          <button 
            className="p-1 rounded bg-background/80 shadow border hover:bg-background hover:border-primary/50 transition-colors" 
            title="Copiar" 
            onClick={handleCopy}
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {message.timestamp instanceof Date && message.timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}
