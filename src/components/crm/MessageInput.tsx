'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { MediaUpload } from '@/components/media/MediaUpload'
import { Paperclip, Send, X, Brain, Upload, File, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import QuickResponseButtons from './QuickResponseButtons'
import type { AnalysisResult } from './types'
// Removido: import { realtimeMessagesService } from '@/services/realtime-messages-service'
import { useDebounce } from '@/hooks/use-debounce'

interface AttachedFile {
  url: string
  fileName: string
  size: number
  type: string
  mimeType?: string
}

interface MessageInputProps {
  onSendMessage: (text: string, type: 'message' | 'note', attachments?: AttachedFile[]) => void
  replyTo?: { content: string; sender: 'client' | 'agent'; onCancel: () => void }
  onAnalyzeConversation?: () => void
  isAnalyzing?: boolean
  ticketId?: string
  messageId?: string
  analysis?: AnalysisResult | null
  typingIndicators?: Array<{ userId: string; userName: string; userType: 'user' | 'agent' | 'ai'; isTyping: boolean }>
}

export default function MessageInput({ onSendMessage, replyTo, onAnalyzeConversation, isAnalyzing, ticketId, messageId, analysis, typingIndicators = [] }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'message' | 'note'>('message')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const [isTyping, setIsTyping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // Debounce para indicador de digitação
  const debouncedMessage = useDebounce(message, 500)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [message])
  
  // Gerenciar indicador de digitação
  useEffect(() => {
    if (!ticketId) return;
    
    const isCurrentlyTyping = message.length > 0;
    
    if (isCurrentlyTyping !== isTyping) {
      setIsTyping(isCurrentlyTyping);
      
      // Indicador de digitação removido (era via Realtime Database)
    }
  }, [message, ticketId, isTyping]);
  
  // Parar indicador de digitação quando parar de digitar
  useEffect(() => {
    if (!ticketId) return;
    
    if (debouncedMessage === message && isTyping && message.length === 0) {
      setIsTyping(false);
      
      // Indicador de digitação removido (era via Realtime Database)
    }
  }, [debouncedMessage, message, ticketId, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && replyTo) {
      e.preventDefault()
      replyTo.onCancel()
    }
  }

  const handleSend = () => {
    const text = message.trim()
    console.log('🔍 [MESSAGE INPUT] handleSend iniciado:', { text, attachedFiles: attachedFiles.length });
    
    if (!text && attachedFiles.length === 0) {
      console.warn('❌ [MESSAGE INPUT] Mensagem vazia, cancelando');
      return;
    }
    
    console.log('🔍 [MESSAGE INPUT] handleSend called:', { 
      text, 
      mode, 
      attachedFiles: attachedFiles.length 
    });
    
    console.log('🚀 [MESSAGE INPUT] Chamando onSendMessage...');
    onSendMessage(text, mode, attachedFiles.length > 0 ? attachedFiles : undefined)
    
    console.log('🧹 [MESSAGE INPUT] Limpando campos...');
    setMessage('')
    setAttachedFiles([])
    setShowUpload(false)
    // Message send completed
  }

  const handleUploadComplete = useCallback((result: { url: string; fileName: string; size: number; mimeType?: string }) => {
    // Determinar o tipo baseado no mimeType primeiro, depois na extensão
    let fileType = 'unknown';
    
    if (result.mimeType) {
      if (result.mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (result.mimeType.startsWith('video/')) {
        fileType = 'video';
      } else if (result.mimeType.startsWith('audio/')) {
        fileType = 'audio';
      } else if (result.mimeType === 'application/pdf') {
        fileType = 'pdf';
      } else if (result.mimeType.includes('xml')) {
        fileType = 'xml';
      } else {
        fileType = 'document';
      }
    } else {
      // Fallback para extensão se não houver mimeType
      const extension = result.fileName.split('.').pop()?.toLowerCase();
      if (extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
        fileType = 'image';
      } else if (extension && ['mp4', 'webm', 'avi', 'mov'].includes(extension)) {
        fileType = 'video';
      } else if (extension && ['ogg', 'mp3', 'wav'].includes(extension)) {
        fileType = 'audio';
      } else if (extension === 'pdf') {
        fileType = 'pdf';
      } else if (extension === 'xml') {
        fileType = 'xml';
      } else {
        fileType = extension || 'unknown';
      }
    }
    
    const newFile: AttachedFile = {
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      type: fileType,
      mimeType: result.mimeType
    }
    setAttachedFiles(prev => [...prev, newFile])
    // Toast será exibido apenas após confirmação do servidor
    // toast({
    //   title: 'Arquivo enviado',
    //   description: `${result.fileName} foi enviado com sucesso.`
    // })
  }, [toast])

  const handleUploadError = useCallback((error: string) => {
    toast({
      title: 'Erro no upload',
      description: error,
      variant: 'destructive'
    })
  }, [toast])

  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setShowUpload(true)
  }, [])

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newMessage = message.slice(0, start) + emoji + message.slice(end)
      setMessage(newMessage)
      
      // Restaurar posição do cursor após o emoji
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setMessage(prev => prev + emoji)
    }
  }

  return (
    <div 
      className={cn(
        "border-t bg-card p-2 space-y-2 transition-all duration-200",
        isDragOver && "bg-blue-50 border-blue-300"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {replyTo && (
        <div className="flex items-center justify-between bg-muted/40 border rounded p-2 text-xs">
          <div>
            <div className="font-medium">Respondendo {replyTo.sender === 'client' ? 'cliente' : 'agente'}</div>
            <div className="text-muted-foreground line-clamp-1 max-w-[80vw]">{replyTo.content}</div>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={replyTo.onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Preview de arquivos anexados */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Arquivos anexados:</div>
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1 text-xs">
                {(file.type === 'image' || file.mimeType?.startsWith('image/')) ? (
                  <Image className="h-3 w-3" />
                ) : (
                  <File className="h-3 w-3" />
                )}
                <span className="truncate max-w-[100px]">{file.fileName}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0"
                  onClick={() => removeAttachedFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Área de upload */}
      {showUpload && ticketId && messageId && (
        <div className="border rounded-lg p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Upload de Arquivos</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowUpload(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <MediaUpload
            messageId={messageId}
            ticketId={ticketId}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            maxFiles={3}
            className="max-h-48 overflow-y-auto"
          />
        </div>
      )}
      
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100/80 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-blue-600 font-medium">Solte os arquivos aqui</p>
          </div>
        </div>
      )}
      
      {/* Indicadores de digitação */}
      {typingIndicators.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-sm text-muted-foreground">
            {typingIndicators.length === 1 
              ? `${typingIndicators[0].userName} está digitando...`
              : `${typingIndicators.length} pessoas estão digitando...`
            }
          </span>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowUpload(!showUpload)}
          className={cn(
            "transition-colors",
            showUpload && "bg-blue-100 text-blue-600"
          )}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <input ref={fileInputRef} type="file" className="hidden" />
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'message' ? 'Digite sua mensagem...' : 'Escreva uma nota interna...'}
            className="resize-none"
            rows={1}
          />
        </div>
        <Button 
          onClick={handleSend} 
          disabled={!message.trim() && attachedFiles.length === 0}
          className={cn(
            "transition-all",
            attachedFiles.length > 0 && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          <Send className="h-4 w-4 mr-1" />
          {attachedFiles.length > 0 ? `Enviar (${attachedFiles.length})` : 'Enviar'}
        </Button>
      </div>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={mode === 'message' ? 'default' : 'secondary'} onClick={() => setMode('message')}>
            Mensagem
          </Button>
          <Button size="sm" variant={mode === 'note' ? 'default' : 'secondary'} onClick={() => setMode('note')}>
            Nota Interna
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {onAnalyzeConversation && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onAnalyzeConversation}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
            >
              <Brain className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing ? 'Analisando...' : 'Analisar Conversa'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Respostas Rápidas Sugeridas */}
      <QuickResponseButtons 
        analysis={analysis ?? null}
        onSelectResponse={(response) => {
          setMessage(response);
          // Focar no textarea após selecionar resposta
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(response.length, response.length);
            }
          }, 100);
        }}
      />
    </div>
  )
}
