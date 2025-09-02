'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { MediaUpload } from '@/components/media/MediaUpload'
import { Paperclip, Send, X, Brain, Upload, File, Image, Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import QuickResponseButtons from './QuickResponseButtons'
import type { AnalysisResult } from './types'
import { useDebounce } from '@/hooks/use-debounce'

interface AttachedFile {
  url: string
  fileName: string
  size: number
  type: string
  mimeType?: string
}

interface ModernMessageInputProps {
  onSendMessage: (text: string, type: 'message' | 'note', attachments?: AttachedFile[]) => Promise<void> | void
  replyTo?: { content: string; sender: 'client' | 'agent'; onCancel: () => void }
  onAnalyzeConversation?: () => void
  isAnalyzing?: boolean
  ticketId?: string
  messageId?: string
  analysis?: AnalysisResult | null
  typingIndicators?: Array<{ userId: string; userName: string; userType: 'user' | 'agent' | 'ai'; isTyping: boolean }>
}

export default function ModernMessageInput({ 
  onSendMessage, 
  replyTo, 
  onAnalyzeConversation, 
  isAnalyzing, 
  ticketId, 
  messageId, 
  analysis, 
  typingIndicators = [] 
}: ModernMessageInputProps) {
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'message' | 'note'>('message')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // Debounce para indicador de digitação
  const debouncedMessage = useDebounce(message, 500)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])
  
  // Gerenciar indicador de digitação
  useEffect(() => {
    if (!ticketId) return;
    
    const isCurrentlyTyping = message.length > 0;
    
    if (isCurrentlyTyping !== isTyping) {
      setIsTyping(isCurrentlyTyping);
    }
  }, [message, ticketId, isTyping]);
  
  // Parar indicador de digitação quando parar de digitar
  useEffect(() => {
    if (!ticketId) return;
    
    if (debouncedMessage === message && isTyping && message.length === 0) {
      setIsTyping(false);
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

  const handleSend = async () => {
    const text = message.trim()
    
    if (!text && attachedFiles.length === 0) {
      return;
    }
    
    // Iniciar animação de envio
    setIsSending(true)
    
    try {
      // Chamar função de envio
      await onSendMessage(text, mode, attachedFiles.length > 0 ? attachedFiles : undefined)
      
      // Mostrar ícone de sucesso
      setIsSending(false)
      setShowSuccess(true)
      
      // Limpar campos
      setMessage('')
      setAttachedFiles([])
      setShowUpload(false)
      
      // Voltar ao ícone normal após 1 segundo
      setTimeout(() => {
        setShowSuccess(false)
      }, 1000)
      
    } catch (error) {
      // Em caso de erro, voltar ao estado normal
      setIsSending(false)
      setShowSuccess(false)
    }
  }

  const handleUploadComplete = useCallback((result: { url: string; fileName: string; size: number; mimeType?: string }) => {
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
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setMessage(prev => prev + emoji)
    }
  }

  return (
    <div className="bg-background border-t border-border">
      {/* Container principal com padding e espaçamento */}
      <div className="p-4 space-y-4">
        
        {/* Reply indicator */}
        {replyTo && (
          <div className="flex items-center justify-between bg-muted/30 border border-border rounded-xl p-4 text-sm">
            <div>
              <div className="font-medium text-foreground">Respondendo {replyTo.sender === 'client' ? 'cliente' : 'agente'}</div>
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
                <div key={index} className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2 text-sm">
                  {(file.type === 'image' || file.mimeType?.startsWith('image/')) ? (
                    <Image className="h-4 w-4 text-gray-500" />
                  ) : (
                    <File className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="truncate max-w-[120px] text-foreground">{file.fileName}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 p-0 hover:bg-gray-200"
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
          <div className="border border-border rounded-xl p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Upload de Arquivos</span>
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
        
        {/* Indicadores de digitação */}
        {typingIndicators.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/100">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-primary-foreground">
              {typingIndicators.length === 1 
                ? `${typingIndicators[0].userName} está digitando...`
                : `${typingIndicators.length} pessoas estão digitando...`
              }
            </span>
          </div>
        )}
        
        {/* Input principal */}
        <div className="bg-background/50 rounded-2xl border border-border p-4 shadow-sm transition-shadow focus-within:shadow-md">
          <div className="flex items-center gap-2">
            {/* Botão de anexo */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowUpload(!showUpload)}
              className={cn(
                "h-8 w-8 rounded-full transition-colors flex-shrink-0",
                showUpload ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            {/* Emoji picker */}
            <div className="flex-shrink-0">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </div>
            
            {/* Textarea */}
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[24px] transition-all"
                rows={1}
              />
            </div>
            
            {/* Botão de enviar */}
            <Button 
              onClick={handleSend} 
              disabled={(!message.trim() && attachedFiles.length === 0) || isSending}
              className={cn(
                "h-8 w-8 rounded-full p-0 transition-all flex-shrink-0 duration-300",
                (!message.trim() && attachedFiles.length === 0) || isSending
                   ? "bg-muted text-muted-foreground cursor-not-allowed" 
                   : showSuccess
                   ? "bg-green-500 hover:bg-green-500 text-white"
                   : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {isSending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : showSuccess ? (
                <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Abas e botão de análise */}
        <div className="flex items-center justify-between">
          {/* Abas de modo */}
          <div className="flex items-center bg-muted/50 rounded-full p-1">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setMode('message')}
              className={cn(
                 "rounded-full px-4 py-2 text-sm font-medium transition-all h-9",
                 mode === 'message' 
                   ? "bg-primary text-primary-foreground shadow-sm" 
                   : "text-muted-foreground hover:text-foreground hover:bg-background"
               )}
            >
              Mensagem
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setMode('note')}
              className={cn(
                 "rounded-full px-4 py-2 text-sm font-medium transition-all h-9",
                 mode === 'note' 
                   ? "bg-primary text-primary-foreground shadow-sm" 
                   : "text-muted-foreground hover:text-foreground hover:bg-background"
               )}
            >
              Nota Interna
            </Button>
          </div>
          
          {/* Botão de análise */}
          {onAnalyzeConversation && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onAnalyzeConversation}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border border-border text-foreground hover:bg-muted hover:border-border/80 h-9 transition-colors"
            >
              <Globe className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing ? 'Analisando...' : 'Analisar Conversa'}
            </Button>
          )}
        </div>
        
        {/* Respostas Rápidas Sugeridas */}
        <QuickResponseButtons 
          analysis={analysis ?? null}
          onSelectResponse={(response) => {
            setMessage(response);
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(response.length, response.length);
              }
            }, 100);
          }}
        />
      </div>
      
      {/* Overlay de drag and drop */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-primary font-medium">Solte os arquivos aqui</p>
          </div>
        </div>
      )}
    </div>
  )
}