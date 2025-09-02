'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { detectContentType } from '@/components/crm/MediaComponents'

interface QuotedPreviewProps {
  content: string
  sender: string
  type?: string
  className?: string
}

export function QuotedPreview({ content, sender, type, className }: QuotedPreviewProps) {
  const messageType = type || detectContentType(content)
  
  // Truncate content for preview
  const truncateContent = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Get content preview based on type
  const getContentPreview = () => {
    switch (messageType) {
      case 'image':
        return '📷 Imagem'
      case 'video':
        return '🎥 Vídeo'
      case 'audio':
        return '🎵 Áudio'
      case 'document':
        return '📄 Documento'
      case 'sticker':
        return '😊 Sticker'
      default:
        return truncateContent(content)
    }
  }

  return (
    <div className={cn(
      'mb-2 p-2 bg-muted/50 border-l-4 border-primary/50 rounded-r-md max-w-full',
      className
    )}>
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {sender === 'agent' ? 'Você' : sender}
      </div>
      <div className="text-sm text-muted-foreground truncate">
        {getContentPreview()}
      </div>
    </div>
  )
}

export default QuotedPreview