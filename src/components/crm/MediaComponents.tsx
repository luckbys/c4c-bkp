'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { imageMetrics } from '@/services/image-metrics';
import {
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Play,
  Pause
} from 'lucide-react';

interface MediaComponentProps {
  content: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'note';
  messageId?: string;
  isFromAgent?: boolean;
  mediaUrl?: string;
  fileName?: string;
}

// Função para corrigir URLs malformadas do Firebase Storage
const fixMalformedUrl = (originalUrl: string): string => {
  if (!originalUrl || typeof originalUrl !== 'string') {
    return originalUrl;
  }
  
  // Verificar se é uma URL do Firebase Storage
  if (!originalUrl.includes('firebasestorage.googleapis.com')) {
    return originalUrl;
  }
  
  try {
    const url = new URL(originalUrl);
    
    // Verificar se há dupla codificação no path (%252F)
    if (url.pathname.includes('%252F')) {
      // Detectada dupla codificação, corrigindo
      
      // Correção: Decodificar apenas %252F para %2F
      let fixedPath = url.pathname.replace(/%252F/g, '%2F');
      
      // Construir URL corrigida
      const fixedUrl = `${url.protocol}//${url.host}${fixedPath}${url.search}`;
      
      // URL corrigida com sucesso
      
      return fixedUrl;
    }
    
    return originalUrl;
    
  } catch (error) {
    console.warn('🔧 [URL FIX] Erro ao processar URL:', error);
    return originalUrl;
  }
};

// Verificar se o content é uma URL válida (simplificada)
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  // URLs do WhatsApp são sempre válidas
  if (url.includes('mmg.whatsapp.net') || url.includes('pps.whatsapp.net') || url.includes('media.whatsapp.net')) {
    console.log('🔍 [IMAGE VALIDATION] ✅ WhatsApp URL detected as valid:', url.substring(0, 50));
    return true;
  }
  
  // URLs do Firebase Storage são válidas
  if (url.includes('firebasestorage.googleapis.com')) {
    console.log('🔍 [IMAGE VALIDATION] ✅ Firebase Storage URL detected as valid:', url.substring(0, 50));
    return true;
  }
  
  // URLs do MinIO são válidas
  if (url.includes('minio') || url.includes('localhost:9000') || url.includes('/api/minio-proxy')) {
    console.log('🔍 [IMAGE VALIDATION] ✅ MinIO URL detected as valid:', url.substring(0, 50));
    return true;
  }
  
  // Aceitar URLs que começam com protocolos válidos
  const isValid = url.startsWith('http://') || 
                 url.startsWith('https://') || 
                 url.startsWith('data:image/') || 
                 url.startsWith('blob:');
  
  if (isValid) {
    console.log('🔍 [IMAGE VALIDATION] ✅ Valid URL detected:', url.substring(0, 50));
  } else {
    console.log('🔍 [IMAGE VALIDATION] ❌ Invalid URL:', url.substring(0, 50));
  }
  
  return isValid;
};

// Processar URL da imagem (simplificada)
const processImageUrl = (url: string): string | null => {
  if (!url || url === '[Imagem]' || url === '📷 Imagem' || url.includes('📷')) return null;
  
  // Primeiro, corrigir URLs malformadas do Firebase Storage
  let processedUrl = url;
  if (url.includes('firebasestorage.googleapis.com')) {
    processedUrl = fixMalformedUrl(url);
    console.log('🔍 [IMAGE PROCESSING] URL processada para correção:', {
      original: url.substring(0, 100) + '...',
      processed: processedUrl.substring(0, 100) + '...',
      wasFixed: url !== processedUrl
    });
  }
  
  // Processar URLs do MinIO
  if (url.includes('minio') || url.includes('localhost:9000') || url.includes('n8n-minio.05pdov.easypanel.host')) {
    console.log('🔍 [IMAGE PROCESSING] URL do MinIO detectada:', {
      original: url.substring(0, 100) + '...',
      isDirectMinIO: !url.includes('/api/minio-proxy')
    });
    
    // Se for URL direta do MinIO, usar o proxy para CORS
    if (!url.includes('/api/minio-proxy')) {
      // Extrair o objectName da URL do MinIO
      const urlParts = url.split('/');
      const objectName = urlParts.slice(-1)[0]; // Último segmento é o nome do objeto
      processedUrl = `/api/minio-proxy?objectName=${encodeURIComponent(objectName)}`;
      console.log('🔍 [IMAGE PROCESSING] Convertendo para proxy MinIO:', processedUrl);
    }
  }
  
  // Verificar se é uma URL do Firebase Storage truncada
  if (processedUrl.includes('firebasestorage.googleapis.com') && !processedUrl.includes('alt=media')) {
    console.log('🔍 [IMAGE PROCESSING] URL do Firebase Storage parece truncada:', processedUrl);
    // Se a URL está truncada, não podemos processá-la
    return null;
  }
  
  // Se já é uma URL válida, usar diretamente
  if (isValidImageUrl(processedUrl)) {
    return processedUrl;
  }
  
  // Se parece ser base64 (string longa sem protocolo), adicionar prefixo
  if (processedUrl.length > 100 && !processedUrl.includes('://') && !processedUrl.startsWith('data:')) {
    return `data:image/jpeg;base64,${processedUrl}`;
  }
  
  return null;
};

// Componente para exibição de imagens
export function ImageMessage({ content, messageId, isFromAgent }: { content: string; messageId?: string; isFromAgent?: boolean }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [corsError, setCorsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryMethods, setRetryMethods] = useState<string[]>([]);

  // Debug logs
  console.log('🖼️ [ImageMessage] Renderizando com content:', {
    messageId,
    content,
    contentType: typeof content,
    contentLength: content?.length,
    isValidUrl: isValidImageUrl(content),
    processedUrl: processImageUrl(content),
    isFromAgent
  });

  const handleDownload = () => {
    const downloadUrl = proxyUrl || processedImageUrl || content;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.target as HTMLImageElement;
    const imageUrl = target?.src || processedImageUrl || content;
    
    console.log('🖼️ [IMAGE COMPONENT] Erro ao carregar imagem:', {
      messageId,
      imageUrl: imageUrl.length > 100 ? imageUrl.substring(0, 100) + '...' : imageUrl,
      isFirebaseUrl: imageUrl.includes('firebasestorage.googleapis.com'),
      errorType: event.type,
      retryCount,
      retryMethods,
      hasProxyUrl: !!proxyUrl
    });
    
    const isFirebaseUrl = imageUrl.includes('firebasestorage.googleapis.com');
    const currentMethod = proxyUrl ? 'proxy' : 'direct';
    
    // Evitar loops infinitos - só tentar proxy uma vez para URLs do Firebase
    if (isFirebaseUrl && !proxyUrl && retryCount === 0) {
      // First attempt failed, using Firebase Storage proxy
      setCorsError(true);
      setRetryCount(1);
      setRetryMethods([currentMethod]);
      
      // Usar a URL original (processedImageUrl ou content) para o proxy, não a URL que falhou
      const originalUrl = processedImageUrl || content;
      const encodedUrl = encodeURIComponent(originalUrl);
      const proxyImageUrl = `/api/image-proxy?url=${encodedUrl}&_t=${Date.now()}`;
      setProxyUrl(proxyImageUrl);
      console.log('🔄 [IMAGE COMPONENT] Proxy URL criada:', {
        originalUrl: originalUrl.substring(0, 100) + '...',
        proxyUrl: proxyImageUrl
      });
      return;
    }
    
    // Se já tentou proxy e ainda falhou, marcar como erro final
    if (proxyUrl && retryCount >= 1) {
      console.log('❌ [IMAGE COMPONENT] Proxy também falhou, marcando como erro final:', {
        messageId,
        proxyUrl,
        retryMethods: [...retryMethods, currentMethod]
      });
    }
    
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    // Image loaded successfully
    setIsLoading(false);
    setImageError(false);
  };
  
  // Processar URL quando content mudar (simplificado)
  React.useEffect(() => {
    console.log('🖼️ [IMAGE COMPONENT] useEffect iniciado:', { 
      messageId,
      content: content.substring(0, 100),
      hasExistingProxy: !!proxyUrl
    });
    
    if (!content) {
      // Error: empty content
      setImageError(true);
      setIsLoading(false);
      return;
    }
    
    // Reset states apenas se for um novo content (não durante retry)
    if (!proxyUrl) {
      setRetryCount(0);
      setRetryMethods([]);
      setCorsError(false);
    }
    
    console.log('🖼️ [IMAGE COMPONENT] Processing content:', {
      messageId,
      contentPreview: content.substring(0, 100),
      contentLength: content.length,
      isWhatsAppUrl: content.includes('mmg.whatsapp.net') || content.includes('pps.whatsapp.net') || content.includes('media.whatsapp.net'),
      isValidUrl: isValidImageUrl(content),
      isFirebaseUrl: content.includes('firebasestorage.googleapis.com'),
      hasExistingProxy: !!proxyUrl
    });
    
    const processed = processImageUrl(content);
    console.log('🖼️ [IMAGE COMPONENT] URL processada:', { 
      original: content.substring(0, 100), 
      processed: processed ? processed.substring(0, 100) : null 
    });
    
    // Só atualizar processedImageUrl se não temos proxy ativo
    if (!proxyUrl) {
      setProcessedImageUrl(processed);
      setImageError(false);
    }
    
    if (!isValidImageUrl(content)) {
      // Error: invalid URL
      setImageError(true);
      setIsLoading(false);
      return;
    }
    
    console.log('🖼️ [IMAGE COMPONENT] Processing result:', {
      messageId,
      originalContent: content.length > 100 ? content.substring(0, 100) + '...' : content,
      processedUrl: processed ? (processed.length > 100 ? processed.substring(0, 100) + '...' : processed) : null,
      willLoad: !!processed || !!proxyUrl,
      isFirebaseUrl: processed ? processed.includes('firebasestorage.googleapis.com') : false,
      usingProxy: !!proxyUrl
    });
    
    if (processed || proxyUrl) {
      // Starting image loading
      setIsLoading(true);
    } else {
      setIsLoading(false);
      // Só marcar erro se não for placeholder (antigo ou novo)
      const isPlaceholder = content === '[Imagem]' || content === '📷 Imagem' || content.includes('📷');
      setImageError(!isPlaceholder);
    }
  }, [content]); // Removido proxyUrl das dependências para evitar loops



  // Se não há URL processada ou há erro, mostrar placeholder
  if ((!processedImageUrl && !proxyUrl) || (imageError && !proxyUrl)) {
    const isPlaceholder = content === '[Imagem]' || content === '📷 Imagem' || content.includes('📷');
    const isFirebaseUrl = content.includes('firebasestorage.googleapis.com');
    
    return (
      <div className="relative group w-full max-w-sm">
        <div className="w-full max-w-64 h-40 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center text-gray-500">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">
              {isPlaceholder ? 'Imagem enviada' : 
               corsError ? 'Erro de CORS detectado' : 
               isFirebaseUrl ? 'Erro ao carregar do Storage' :
               'Imagem não disponível'}
            </p>
            {isPlaceholder && (
              <p className="text-xs text-gray-400 mt-1">
                Aguardando processamento...
              </p>
            )}
            {corsError && (
              <div className="text-xs text-orange-600 mt-1">
                <p>Problema de acesso à imagem.</p>
                <p>Tentando via proxy...</p>
              </div>
            )}
            {isFirebaseUrl && imageError && !corsError && (
              <div className="text-xs text-red-600 mt-1">
                <p>URL do Firebase Storage com problema</p>
                <p className="font-mono text-xs break-all">
                  {content.length > 50 ? content.substring(0, 50) + '...' : content}
                </p>
                <div className="flex gap-1 mt-2">
                  <button 
                    onClick={() => {
                      window.open(content, '_blank');
                    }}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    Testar URL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative group w-full max-w-sm">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-xs">Carregando...</p>
            </div>
          </div>
        )}
        <img
          src={proxyUrl || processedImageUrl || undefined}
          alt="Imagem enviada"
          className={`rounded-lg cursor-pointer transition-all duration-200 hover:opacity-90 w-full h-auto ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={() => !isLoading && setIsPreviewOpen(true)}
          onError={(e) => {
            console.log('🖼️ [ImageMessage] Erro ao carregar imagem:', {
              url: proxyUrl || processedImageUrl,
              error: e,
              retryCount
            });
            handleImageError(e);
          }}
          onLoad={() => {
            console.log('🖼️ [ImageMessage] Imagem carregada com sucesso:', proxyUrl || processedImageUrl);
            handleImageLoad();
          }}
          crossOrigin={proxyUrl ? undefined : "anonymous"}
          style={{ maxHeight: '400px', width: 'auto' }}
          referrerPolicy="no-referrer"
        />
        
        {/* Overlay com botões */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-black"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-black"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0">
          <div className="relative flex flex-col h-full">
            {/* Header com controles */}
            <div className="flex items-center justify-between p-4 bg-black/50">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-white" />
                <span className="text-white text-sm">Visualização de Imagem</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                
                <span className="text-white text-sm min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setRotation(rotation + 90)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={resetView}
                >
                  Reset
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Imagem */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <img
                src={proxyUrl || processedImageUrl || content}
                alt="Imagem em tela cheia"
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente para exibição de vídeos
export function VideoMessage({ content, messageId, isFromAgent }: { content: string; messageId?: string; isFromAgent?: boolean }) {
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retryMethods, setRetryMethods] = useState<string[]>([]);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [corsError, setCorsError] = useState(false);

  // Processar URL do vídeo
  const processedVideoUrl = useMemo(() => {
    if (!content) return null;
    
    console.log('🎬 [VIDEO COMPONENT] Processing content:', {
      messageId,
      content: content.length > 100 ? content.substring(0, 100) + '...' : content,
      isFirebaseUrl: content.includes('firebasestorage.googleapis.com')
    });
    
    // Se for data URL, usar diretamente
    if (content.startsWith('data:')) {
      return content;
    }
    
    // Se for URL HTTP/HTTPS, usar diretamente
    if (content.startsWith('http://') || content.startsWith('https://')) {
      return content;
    }
    
    return null;
  }, [content, messageId]);

  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = event.target as HTMLVideoElement;
    const videoUrl = target?.src || processedVideoUrl || content;
    
    console.log('🎬 [VIDEO COMPONENT] Erro ao carregar vídeo:', {
      messageId,
      videoUrl: videoUrl.length > 100 ? videoUrl.substring(0, 100) + '...' : videoUrl,
      isFirebaseUrl: videoUrl.includes('firebasestorage.googleapis.com'),
      errorType: event.type,
      retryCount,
      retryMethods,
      hasProxyUrl: !!proxyUrl
    });
    
    const isFirebaseUrl = videoUrl.includes('firebasestorage.googleapis.com');
    const currentMethod = proxyUrl ? 'proxy' : 'direct';
    
    // Evitar loops infinitos - só tentar proxy uma vez para URLs do Firebase
    if (isFirebaseUrl && !proxyUrl && retryCount === 0) {
      // First attempt failed, using Firebase Storage proxy
      setCorsError(true);
      setRetryCount(1);
      setRetryMethods([currentMethod]);
      
      // Usar a URL original para o proxy
      const originalUrl = processedVideoUrl || content;
      const encodedUrl = encodeURIComponent(originalUrl);
      const proxyVideoUrl = `/api/media-proxy?url=${encodedUrl}&_t=${Date.now()}`;
      setProxyUrl(proxyVideoUrl);
      console.log('🔄 [VIDEO COMPONENT] Proxy URL criada:', {
        originalUrl: originalUrl.substring(0, 100) + '...',
        proxyUrl: proxyVideoUrl
      });
      return;
    }
    
    // Se já tentou proxy e ainda falhou, marcar como erro final
    if (proxyUrl && retryCount >= 1) {
      console.log('❌ [VIDEO COMPONENT] Proxy também falhou, marcando como erro final:', {
        messageId,
        proxyUrl,
        retryMethods: [...retryMethods, currentMethod]
      });
    }
    
    setVideoError(true);
    setIsLoading(false);
  };

  const handleVideoLoad = () => {
    console.log('✅ [VIDEO COMPONENT] Vídeo carregado com sucesso:', {
      messageId,
      method: proxyUrl ? 'proxy' : 'direct',
      retryCount
    });
    setIsLoading(false);
    setVideoError(false);
  };

  const handleDownload = () => {
    const downloadUrl = proxyUrl || processedVideoUrl || content;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'video';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Se não for uma URL válida ou houver erro, mostrar placeholder
  if (!processedVideoUrl || videoError) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg w-full max-w-md">
        <div className="w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center">
          <Play className="h-6 w-6 text-gray-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {(content === '[Vídeo]' || content.includes('🎬')) ? 'Vídeo enviado' : 
             videoError ? 'Erro no vídeo' : 'Vídeo não disponível'}
          </p>
          <p className="text-xs text-gray-500">
            {(content === '[Vídeo]' || content.includes('🎬')) ? 'Aguardando processamento...' : 
             corsError ? 'Problema de acesso, tentando proxy...' :
             videoError ? 'Formato não suportado ou URL inválida' : 'URL inválida'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group w-full max-w-md">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600">Carregando vídeo...</span>
          </div>
        </div>
      )}
      
      <video
        src={proxyUrl || processedVideoUrl}
        controls
        className="rounded-lg w-full h-auto"
        style={{ maxHeight: '400px' }}
        preload="metadata"
        onError={handleVideoError}
        onLoadedData={handleVideoLoad}
        onCanPlay={handleVideoLoad}
      >
        Seu navegador não suporta o elemento de vídeo.
      </video>
      
      {/* Botão de download */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Componente para exibição de áudios
export function AudioMessage({ content, messageId, isFromAgent }: { content: string; messageId?: string; isFromAgent?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryMethods, setRetryMethods] = useState<string[]>([]);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [corsError, setCorsError] = useState(false);

  // Processar URL do áudio
  const processedAudioUrl = useMemo(() => {
    if (!content) return null;
    
    console.log('🎵 [AUDIO COMPONENT] Processing content:', {
      messageId,
      content: content.length > 100 ? content.substring(0, 100) + '...' : content,
      isFirebaseUrl: content.includes('firebasestorage.googleapis.com'),
      isMinIOUrl: content.includes('minio') || content.includes('localhost:9000') || content.includes('/api/minio-proxy') || content.includes('n8n-minio.05pdov.easypanel.host'),
      isWhatsAppEncUrl: content.includes('whatsapp.net') && content.includes('.enc')
    });
    
    // Se for data URL, usar diretamente
    if (content.startsWith('data:')) {
      return content;
    }
    
    // Se for URL .enc do WhatsApp, usar o proxy específico
    if (content.includes('whatsapp.net') && content.includes('.enc')) {
      const whatsappProxyUrl = `/api/whatsapp-media-proxy?url=${encodeURIComponent(content)}&instance=evolution_exchange`;
      console.log('🔓 [AUDIO COMPONENT] Using WhatsApp proxy for .enc URL:', whatsappProxyUrl);
      return whatsappProxyUrl;
    }
    
    // Se for URL HTTP/HTTPS, verificar se é MinIO
    if (content.startsWith('http://') || content.startsWith('https://')) {
      // Verificar se é URL do MinIO
      if ((content.includes('minio') || content.includes('localhost:9000') || content.includes('n8n-minio.05pdov.easypanel.host')) && !content.includes('/api/minio-proxy')) {
        // Extrair o objectName da URL do MinIO
        const urlParts = content.split('/');
        const objectName = urlParts.slice(-1)[0]; // Último segmento é o nome do objeto
        const proxyUrl = `/api/minio-proxy?objectName=${encodeURIComponent(objectName)}`;
        console.log('🎵 [AUDIO COMPONENT] Convertendo MinIO para proxy:', {
          original: content,
          objectName,
          proxyUrl
        });
        return proxyUrl;
      }
      
      return content;
    }
    
    return null;
  }, [content, messageId]);

  const handleAudioError = useCallback((event: Event) => {
    const target = event.currentTarget as HTMLAudioElement;
    const audioUrl = target?.src || processedAudioUrl || content;
    
    console.log('🎵 [AUDIO COMPONENT] Erro ao carregar áudio:', {
      messageId,
      audioUrl: audioUrl.length > 100 ? audioUrl.substring(0, 100) + '...' : audioUrl,
      isFirebaseUrl: audioUrl.includes('firebasestorage.googleapis.com'),
      isMinIOUrl: audioUrl.includes('minio') || audioUrl.includes('localhost:9000') || audioUrl.includes('n8n-minio.05pdov.easypanel.host'),
      errorType: event.type,
      retryCount,
      retryMethods,
      hasProxyUrl: !!proxyUrl
    });
    
    const isFirebaseUrl = audioUrl.includes('firebasestorage.googleapis.com');
    const isMinIOUrl = audioUrl.includes('minio') || audioUrl.includes('localhost:9000') || audioUrl.includes('n8n-minio.05pdov.easypanel.host');
    const currentMethod = proxyUrl ? 'proxy' : 'direct';
    
    // Evitar loops infinitos - só tentar proxy uma vez para URLs do Firebase ou MinIO
    if ((isFirebaseUrl || isMinIOUrl) && !proxyUrl && retryCount === 0) {
      console.log('🔄 [AUDIO COMPONENT] Primeira tentativa falhou, usando proxy...', {
        isFirebaseUrl,
        isMinIOUrl
      });
      setCorsError(true);
      setRetryCount(1);
      setRetryMethods([currentMethod]);
      
      // Usar a URL original para o proxy
      const originalUrl = processedAudioUrl || content;
      let proxyAudioUrl;
      
      if (isMinIOUrl) {
        // Para MinIO, usar o endpoint minio-proxy
        const urlParts = originalUrl.split('/');
        const objectName = urlParts.slice(-1)[0];
        proxyAudioUrl = `/api/minio-proxy?objectName=${encodeURIComponent(objectName)}&_t=${Date.now()}`;
      } else {
        // Para Firebase Storage, usar o endpoint media-proxy
        const encodedUrl = encodeURIComponent(originalUrl);
        proxyAudioUrl = `/api/media-proxy?url=${encodedUrl}&_t=${Date.now()}`;
      }
      
      setProxyUrl(proxyAudioUrl);
      console.log('🔄 [AUDIO COMPONENT] Proxy URL criada:', {
        originalUrl: originalUrl.substring(0, 100) + '...',
        proxyUrl: proxyAudioUrl,
        type: isMinIOUrl ? 'MinIO' : 'Firebase'
      });
      return;
    }
    
    // Se já tentou proxy e ainda falhou, marcar como erro final
    if (proxyUrl && retryCount >= 1) {
      console.log('❌ [AUDIO COMPONENT] Proxy também falhou, marcando como erro final:', {
        messageId,
        proxyUrl,
        retryMethods: [...retryMethods, currentMethod]
      });
    }
    
    setAudioError('Erro ao carregar áudio');
    setIsLoading(false);
  }, [messageId, processedAudioUrl, content, retryCount, retryMethods, proxyUrl]);

  const handleAudioLoad = useCallback(() => {
    console.log('✅ [AUDIO COMPONENT] Áudio carregado com sucesso:', {
      messageId,
      method: proxyUrl ? 'proxy' : 'direct',
      retryCount
    });
    setAudioError(null);
    setIsLoading(false); // Parar o loading quando o áudio estiver pronto
  }, [messageId, proxyUrl, retryCount]);

  // Verificar se o content é uma URL válida
  const isValidUrl = useCallback((url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Verificar se é uma URL de áudio válida com formato suportado
  const isValidAudioUrl = useCallback((url: string) => {
    if (!isValidUrl(url)) return false;
    
    // URLs do WhatsApp são sempre válidas para áudio (incluindo .enc)
    if (url.includes('mmg.whatsapp.net') || url.includes('pps.whatsapp.net') || url.includes('media.whatsapp.net')) {
      console.log('🔍 [AUDIO VALIDATION] ✅ WhatsApp URL detected as valid:', url.substring(0, 50));
      return true;
    }
    
    // URLs do Firebase Storage são válidas
    if (url.includes('firebasestorage.googleapis.com')) {
      console.log('🔍 [AUDIO VALIDATION] ✅ Firebase Storage URL detected as valid:', url.substring(0, 50));
      return true;
    }
    
    // URLs do MinIO são válidas
    if (url.includes('minio') || url.includes('localhost:9000') || url.includes('/api/minio-proxy')) {
      console.log('🔍 [AUDIO VALIDATION] ✅ MinIO URL detected as valid:', url.substring(0, 50));
      return true;
    }
    
    // Se for data URL, verificar se é áudio
    if (url.startsWith('data:')) {
      return url.startsWith('data:audio/');
    }
    
    // Formatos de áudio suportados pelos navegadores (incluindo .enc para WhatsApp)
    const supportedFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm', '.enc'];
    const urlLower = url.toLowerCase();
    
    // Verificar se a URL contém um formato suportado
    const hasValidFormat = supportedFormats.some(format => 
      urlLower.includes(format) || urlLower.includes(format.replace('.', ''))
    );
    
    if (hasValidFormat) {
      console.log('🔍 [AUDIO VALIDATION] ✅ Valid format detected:', url.substring(0, 50));
    } else {
      console.log('🔍 [AUDIO VALIDATION] ❌ No valid format found:', url.substring(0, 50));
    }
    
    return hasValidFormat;
  }, [isValidUrl]);

  // Verificar se o áudio pode ser reproduzido
  const canPlayAudio = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const testAudio = new Audio();
      
      const cleanup = () => {
        testAudio.removeEventListener('canplaythrough', onCanPlay);
        testAudio.removeEventListener('error', onError);
        testAudio.src = '';
      };
      
      const onCanPlay = () => {
        cleanup();
        resolve(true);
      };
      
      const onError = () => {
        cleanup();
        resolve(false);
      };
      
      testAudio.addEventListener('canplaythrough', onCanPlay);
      testAudio.addEventListener('error', onError);
      
      try {
        testAudio.src = url;
        testAudio.load();
      } catch (error) {
        cleanup();
        resolve(false);
      }
      
      // Timeout após 5 segundos
      setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000);
    });
  }, []);

  const handleDownload = useCallback(() => {
    const downloadUrl = proxyUrl || processedAudioUrl || content;
    if (!isValidAudioUrl(downloadUrl)) return;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'audio';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [proxyUrl, processedAudioUrl, content, isValidAudioUrl]);

  const togglePlay = useCallback(async () => {
    if (!audioRef) return;
    
    try {
      setIsLoading(true);
      setAudioError(null);
      
      if (isPlaying) {
        audioRef.pause();
        // O estado será atualizado pelo event listener 'pause'
      } else {
        // Usar a URL processada (proxy ou processedAudioUrl) em vez do content original
        const audioUrl = proxyUrl || processedAudioUrl || content;
        
        console.log('🎵 [AUDIO PLAY] Tentando reproduzir áudio:', {
          messageId,
          originalContent: content.substring(0, 50) + '...',
          audioUrl: audioUrl.substring(0, 50) + '...',
          usingProxy: !!proxyUrl,
          isOGG: audioUrl.includes('.ogg') || audioUrl.includes('ogg'),
          audioRefSrc: audioRef.src
        });
        
        // Verificar se o áudio pode ser reproduzido usando a URL processada
        const canPlay = await canPlayAudio(audioUrl);
        
        console.log('🎵 [AUDIO PLAY] Resultado do teste canPlayAudio:', {
          messageId,
          canPlay,
          audioUrl: audioUrl.substring(0, 50) + '...',
          audioRefReady: audioRef.readyState
        });
        
        if (!canPlay) {
          console.log('⚠️ [AUDIO PLAY] canPlayAudio falhou, tentando reprodução direta...', {
            messageId,
            audioUrl: audioUrl.substring(0, 50) + '...'
          });
          
          // Fallback: tentar reproduzir diretamente sem o teste canPlayAudio
          // Isso é especialmente útil para arquivos OGG que podem não passar no teste
          try {
            await audioRef.play();
            // O estado será atualizado pelo event listener 'play'
            // Direct playback successful (fallback)
            return;
          } catch (directPlayError: any) {
            console.log('❌ [AUDIO PLAY] Reprodução direta também falhou:', directPlayError);
            setAudioError('Formato de áudio não suportado pelo navegador');
            setIsLoading(false);
            return;
          }
        }
        
        await audioRef.play();
        // O estado será atualizado pelo event listener 'play'
        // Playback started successfully
      }
    } catch (error: any) {
        console.log('❌ [AUDIO PLAY] Erro durante reprodução:', {
          messageId,
          errorName: error.name,
          errorMessage: error.message,
          errorCode: error.code,
          audioUrl: (proxyUrl || processedAudioUrl || content).substring(0, 50) + '...'
        });
        
        logger.audio.error('Erro ao reproduzir áudio', {
          url: content,
          processedUrl: proxyUrl || processedAudioUrl,
          errorName: error.name,
          errorMessage: error.message,
          errorCode: error.code
        });
        setIsPlaying(false);
        
        // Mensagens de erro mais específicas para formato OGG
        if (error.name === 'NotSupportedError') {
          const audioUrl = proxyUrl || processedAudioUrl || content;
          if (audioUrl.includes('.ogg') || audioUrl.includes('ogg')) {
            setAudioError('Formato OGG não suportado neste navegador. Tente fazer o download.');
          } else {
            setAudioError('Formato de áudio não suportado');
          }
        } else if (error.name === 'NotAllowedError') {
          setAudioError('Reprodução bloqueada pelo navegador. Clique para permitir.');
        } else if (error.name === 'AbortError') {
          setAudioError('Carregamento do áudio foi interrompido');
        } else {
          setAudioError('Erro ao reproduzir áudio. Tente fazer o download.');
        }
    } finally {
      setIsLoading(false);
    }
  }, [audioRef, isPlaying, messageId, proxyUrl, processedAudioUrl, content, canPlayAudio]);

  // Event handlers com useCallback para evitar redefinições
  const handleTimeUpdate = useCallback(() => {
    if (audioRef) {
      setCurrentTime(audioRef.currentTime);
      console.log('🎵 [AUDIO TIME] Tempo atualizado:', {
        messageId,
        currentTime: audioRef.currentTime,
        duration: audioRef.duration
      });
    }
  }, [audioRef, messageId]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef) {
      setDuration(audioRef.duration);
      console.log('🎵 [AUDIO METADATA] Duração carregada:', {
        messageId,
        duration: audioRef.duration
      });
    }
  }, [audioRef, messageId]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setIsLoading(false);
    console.log('🎵 [AUDIO PLAY] Reprodução iniciada:', { messageId });
  }, [messageId]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    console.log('🎵 [AUDIO PAUSE] Reprodução pausada:', { messageId });
  }, [messageId]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef) {
      audioRef.currentTime = 0;
    }
    console.log('🎵 [AUDIO ENDED] Reprodução finalizada:', { messageId });
  }, [audioRef, messageId]);

  // useEffect para configurar event listeners
  useEffect(() => {
    if (!audioRef) return;

    console.log('🎵 [AUDIO SETUP] Configurando event listeners:', { messageId });

    // Event listener adicional para garantir que o loading pare
    const handleCanPlayThrough = () => {
      console.log('🎵 [AUDIO ELEMENT] Áudio totalmente carregado (canplaythrough):', { messageId });
      setIsLoading(false);
      setAudioError(null);
    };

    // Adicionar event listeners
    audioRef.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioRef.addEventListener('error', handleAudioError);
    audioRef.addEventListener('canplay', handleAudioLoad);
    audioRef.addEventListener('canplaythrough', handleCanPlayThrough);
    audioRef.addEventListener('play', handlePlay);
    audioRef.addEventListener('pause', handlePause);
    audioRef.addEventListener('ended', handleEnded);

    // Cleanup function
    return () => {
      console.log('🎵 [AUDIO CLEANUP] Removendo event listeners:', { messageId });
      audioRef.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.removeEventListener('error', handleAudioError);
      audioRef.removeEventListener('canplay', handleAudioLoad);
      audioRef.removeEventListener('canplaythrough', handleCanPlayThrough);
      audioRef.removeEventListener('play', handlePlay);
      audioRef.removeEventListener('pause', handlePause);
      audioRef.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, handleTimeUpdate, handleLoadedMetadata, handlePlay, handlePause, handleEnded, handleAudioError, handleAudioLoad, messageId]);

  // useEffect para configurar event listener de loadstart
  useEffect(() => {
    if (!audioRef) return;

    const audioUrl = proxyUrl || processedAudioUrl || content;
    
    console.log('🎵 [AUDIO ELEMENT] Configurando elemento audio:', {
      messageId,
      originalContent: content.substring(0, 50) + '...',
      audioUrl: audioUrl.substring(0, 50) + '...',
      usingProxy: !!proxyUrl,
      isOGG: audioUrl.includes('.ogg') || audioUrl.includes('ogg')
    });
    
    // Event listener para loadstart
    const handleLoadStart = () => {
      console.log('🎵 [AUDIO ELEMENT] Iniciando carregamento:', {
        messageId,
        audioUrl: audioUrl.substring(0, 50) + '...'
      });
      logger.audio.debug('Iniciando carregamento de áudio', { 
        url: content,
        processedUrl: audioUrl
      });
      setIsLoading(true);
      setAudioError(null);
    };
    
    audioRef.addEventListener('loadstart', handleLoadStart);
    
    return () => {
      audioRef.removeEventListener('loadstart', handleLoadStart);
    };
  }, [audioRef, proxyUrl, processedAudioUrl, content, messageId]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef) {
      audioRef.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Verificar condições de erro APÓS todos os hooks
  if (!processedAudioUrl || audioError) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg w-full max-w-xs">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
          <Music className="h-5 w-5 text-gray-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {(content === '[Áudio]' || content.includes('🎵')) ? 'Áudio enviado' : 
             audioError ? 'Erro no áudio' : 'Áudio não disponível'}
          </p>
          <p className="text-xs text-gray-500">
            {(content === '[Áudio]' || content.includes('🎵')) ? 'Aguardando processamento...' : 
             corsError ? 'Problema de acesso, tentando proxy...' :
             audioError ? audioError : 
             !isValidUrl(content) ? 'URL inválida' : 'Formato não suportado'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded-xl w-full max-w-sm border border-border/50">
      {/* Header com ícone e botão de download */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Music className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground/80">Áudio</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-primary/10"
          onClick={handleDownload}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Player de áudio customizado */}
      <div className="flex items-center gap-3">
        {/* Botão Play/Pause */}
        <Button
          size="sm"
          variant="outline"
          className="h-10 w-10 p-0 rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-all"
          onClick={togglePlay}
          disabled={isLoading || !!audioError}
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : isPlaying ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </Button>

        {/* Barra de progresso e tempo */}
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
            disabled={!duration || duration === 0}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Elemento de áudio oculto */}
      <audio
        ref={(el) => {
          if (el && el !== audioRef) {
            setAudioRef(el);
          }
        }}
        src={proxyUrl || processedAudioUrl || content}
        preload="metadata"
        crossOrigin="anonymous"
      />
    </div>
  );
}

// Componente para exibição de documentos
export function DocumentMessage({ content, messageId, isFromAgent, fileName }: { content: string; messageId?: string; isFromAgent?: boolean; fileName?: string }) {
  // Verificar se o content é uma URL válida
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Se não for uma URL válida, mostrar placeholder
  if (!isValidUrl(content)) {
    return (
      <div className="flex items-center gap-3 p-3 border border-border rounded-lg w-full max-w-sm bg-muted/30">
        <div className="flex-shrink-0">
          <File className="h-6 w-6 text-gray-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {(content === '[Documento]' || content.includes('📄')) ? 'Documento enviado' : 'Documento não disponível'}
          </p>
          <p className="text-xs text-muted-foreground">
            {(content === '[Documento]' || content.includes('📄')) ? 'Aguardando processamento...' : 'URL inválida'}
          </p>
        </div>
      </div>
    );
  }

  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toLowerCase() || 'file';
  };

  const getFileName = (url: string) => {
    // Usar fileName fornecido como propriedade se disponível
    if (fileName) {
      return fileName;
    }
    return url.split('/').pop() || 'documento';
  };

  const getFileIcon = (extension: string) => {
    switch (extension) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-6 w-6 text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-6 w-6 text-orange-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = content;
    link.download = getFileName(content);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    window.open(content, '_blank');
  };

  const extension = getFileExtension(content);
  const displayFileName = getFileName(content);

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg w-full max-w-sm hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0">
        {getFileIcon(extension)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayFileName}</p>
        <p className="text-xs text-muted-foreground uppercase">{extension}</p>
      </div>
      
      <div className="flex gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handlePreview}
          title="Visualizar"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleDownload}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Componente para exibição de stickers
export function StickerMessage({ content, messageId, isFromAgent }: { content: string; messageId?: string; isFromAgent?: boolean }) {
  const [stickerError, setStickerError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retryMethods, setRetryMethods] = useState<string[]>([]);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [corsError, setCorsError] = useState(false);

  // Processar URL do sticker
  const processedStickerUrl = useMemo(() => {
    if (!content) return null;
    
    console.log('🎭 [STICKER COMPONENT] Processing content:', {
      messageId,
      content: content.length > 100 ? content.substring(0, 100) + '...' : content,
      isFirebaseUrl: content.includes('firebasestorage.googleapis.com')
    });
    
    // Se for data URL, usar diretamente
    if (content.startsWith('data:')) {
      return content;
    }
    
    // Se for URL HTTP/HTTPS, usar diretamente
    if (content.startsWith('http://') || content.startsWith('https://')) {
      return content;
    }
    
    return null;
  }, [content, messageId]);

  const handleStickerLoad = () => {
    console.log('✅ [STICKER COMPONENT] Sticker carregado com sucesso:', {
      messageId,
      method: proxyUrl ? 'proxy' : 'direct',
      retryCount
    });
    setIsLoading(false);
    setStickerError(false);
  };

  const handleStickerError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.target as HTMLImageElement;
    const stickerUrl = target?.src || processedStickerUrl || content;
    
    console.log('🎭 [STICKER COMPONENT] Erro ao carregar sticker:', {
      messageId,
      stickerUrl: stickerUrl.length > 100 ? stickerUrl.substring(0, 100) + '...' : stickerUrl,
      isFirebaseUrl: stickerUrl.includes('firebasestorage.googleapis.com'),
      errorType: event.type,
      retryCount,
      retryMethods,
      hasProxyUrl: !!proxyUrl
    });
    
    const isFirebaseUrl = stickerUrl.includes('firebasestorage.googleapis.com');
    const currentMethod = proxyUrl ? 'proxy' : 'direct';
    
    // Evitar loops infinitos - só tentar proxy uma vez para URLs do Firebase
    if (isFirebaseUrl && !proxyUrl && retryCount === 0) {
      // First attempt failed, using Firebase Storage proxy
      setCorsError(true);
      setRetryCount(1);
      setRetryMethods([currentMethod]);
      
      // Usar a URL original para o proxy
      const originalUrl = processedStickerUrl || content;
      const encodedUrl = encodeURIComponent(originalUrl);
      const proxyStickerUrl = `/api/media-proxy?url=${encodedUrl}&_t=${Date.now()}`;
      setProxyUrl(proxyStickerUrl);
      console.log('🔄 [STICKER COMPONENT] Proxy URL criada:', {
        originalUrl: originalUrl.substring(0, 100) + '...',
        proxyUrl: proxyStickerUrl
      });
      return;
    }
    
    // Se já tentou proxy e ainda falhou, marcar como erro final
    if (proxyUrl && retryCount >= 1) {
      console.log('❌ [STICKER COMPONENT] Proxy também falhou, marcando como erro final:', {
        messageId,
        proxyUrl,
        retryMethods: [...retryMethods, currentMethod]
      });
    }
    
    setStickerError(true);
    setIsLoading(false);
  };

  // Se não for uma URL válida ou houver erro, mostrar placeholder
  if (!processedStickerUrl || content === '[Sticker]' || content.includes('🎭') || stickerError) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg w-full max-w-xs">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-lg">🎭</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {stickerError ? 'Erro no sticker' : 'Sticker enviado'}
          </p>
          <p className="text-xs text-gray-500">
            {corsError ? 'Problema de acesso, tentando proxy...' :
             stickerError ? 'Não foi possível carregar' : 'Aguardando processamento...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[200px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      <img
        src={proxyUrl || processedStickerUrl}
        alt="Sticker"
        className="rounded-lg w-full h-auto"
        style={{ maxHeight: '200px' }}
        onLoad={handleStickerLoad}
        onError={handleStickerError}
      />
    </div>
  );
}

// Componente principal que renderiza o tipo correto de mídia
export function MediaMessage({ content, type, messageId, isFromAgent, mediaUrl, fileName }: MediaComponentProps) {
  switch (type) {
    case 'image':
      return <ImageMessage content={mediaUrl || content} messageId={messageId} isFromAgent={isFromAgent} />;
    case 'video':
      return <VideoMessage content={mediaUrl || content} messageId={messageId} isFromAgent={isFromAgent} />;
    case 'audio':
      return <AudioMessage content={mediaUrl || content} messageId={messageId} isFromAgent={isFromAgent} />;
    case 'document':
      return <DocumentMessage content={mediaUrl || content} messageId={messageId} isFromAgent={isFromAgent} fileName={fileName} />;
    case 'sticker':
      return <StickerMessage content={mediaUrl || content} messageId={messageId} isFromAgent={isFromAgent} />;
    case 'text':
    case 'note':
    default:
      return (
        <div className="whitespace-pre-wrap break-words">
          <LinkifiedText text={content} />
        </div>
      );
  }
}

// Função utilitária para detectar o tipo de conteúdo baseado na URL
export function detectContentType(content: string): 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'note' {
  if (!content || typeof content !== 'string') {
    console.log('🔍 [DETECT TYPE] Content is empty or not string:', content);
    return 'text';
  }
  
  // Log para debug
  console.log('🔍 [DETECT TYPE] Analyzing content:', {
    preview: content.substring(0, 100),
    length: content.length,
    startsWithHttp: content.startsWith('http'),
    startsWithData: content.startsWith('data:'),
    includesFirebase: content.includes('firebasestorage.googleapis.com')
  });
  
  // Data URLs (prioridade alta)
  if (content.startsWith('data:image/webp')) {
    // Data WebP URL detected -> sticker
    return 'sticker';
  }
  
  if (content.startsWith('data:image/')) {
    // Data image URL detected -> image
    return 'image';
  }
  
  if (content.startsWith('data:video/')) {
    // Data video URL detected -> video
    return 'video';
  }
  
  if (content.startsWith('data:audio/')) {
    // Data audio URL detected -> audio
    return 'audio';
  }
  
  // Firebase Storage URLs (detectar por path)
  if (content.includes('firebasestorage.googleapis.com')) {
    if (content.includes('/videos/') || content.includes('.mp4') || content.includes('.webm') || content.includes('.mov')) {
      // Firebase Storage video URL detected -> video
      return 'video';
    }
    if (content.includes('/stickers/') || content.includes('.webp')) {
      // Firebase Storage sticker URL detected -> sticker
      return 'sticker';
    }
    if (content.includes('/audios/') || content.includes('.mp3') || content.includes('.ogg')) {
      // Firebase Storage audio URL detected -> audio
      return 'audio';
    }
    if (content.includes('/documents/') || content.includes('.pdf') || content.includes('.doc')) {
      // Firebase Storage document URL detected -> document
      return 'document';
    }
    // Firebase Storage URL detected -> image (default)
    return 'image';
  }
  
  // MinIO URLs (detectar por path e extensão)
  if (content.includes('minio') || content.includes('localhost:9000') || content.includes('/api/minio-proxy') || content.includes('n8n-minio.05pdov.easypanel.host')) {
    if (content.includes('/videos/') || content.includes('.mp4') || content.includes('.webm') || content.includes('.mov')) {
      // MinIO video URL detected -> video
      return 'video';
    }
    if (content.includes('/stickers/') || content.includes('.webp')) {
      // MinIO sticker URL detected -> sticker
      return 'sticker';
    }
    if (content.includes('/audios/') || content.includes('.mp3') || content.includes('.ogg') || content.includes('.m4a') || content.includes('.aac')) {
      // MinIO audio URL detected -> audio
      return 'audio';
    }
    if (content.includes('/documents/') || content.includes('.pdf') || content.includes('.doc') || content.includes('.docx')) {
      // MinIO document URL detected -> document
      return 'document';
    }
    // MinIO URL detected -> image (default)
    return 'image';
  }
  
  // URLs do WhatsApp (prioridade alta)
  if (content.includes('mmg.whatsapp.net') || content.includes('pps.whatsapp.net') || content.includes('media.whatsapp.net')) {
    // WhatsApp media URL detected -> image
    return 'image';
  }
  
  // URLs HTTP/HTTPS
  if (content.startsWith('http')) {
    const extension = content.split('.').pop()?.toLowerCase().split('?')[0];
    
    // Stickers (WebP)
    if (extension === 'webp') {
      console.log('🔍 [DETECT TYPE] ✅ HTTP WebP URL detected -> sticker, extension:', extension);
      return 'sticker';
    }
    
    // Imagens
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tiff'].includes(extension || '')) {
      console.log('🔍 [DETECT TYPE] ✅ HTTP image URL detected -> image, extension:', extension);
      return 'image';
    }
    
    // Vídeos
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'].includes(extension || '')) {
      console.log('🔍 [DETECT TYPE] ✅ HTTP video URL detected -> video, extension:', extension);
      return 'video';
    }
    
    // Áudios
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'].includes(extension || '')) {
      console.log('🔍 [DETECT TYPE] ✅ HTTP audio URL detected -> audio, extension:', extension);
      return 'audio';
    }
    
    // Documentos
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(extension || '')) {
      console.log('🔍 [DETECT TYPE] ✅ HTTP document URL detected -> document, extension:', extension);
      return 'document';
    }
    
    console.log('🔍 [DETECT TYPE] ⚠️ HTTP URL without recognized extension -> document, extension:', extension);
    return 'document';
  }
  
  // Detectar por placeholders ou texto indicativo
  if (content === '[Imagem]' || content.includes('📷') || content.includes('Imagem')) {
    // Image placeholder detected -> image
    return 'image';
  }
  
  if (content === '[Vídeo]' || content.includes('🎬') || content.includes('Vídeo')) {
    // Video placeholder detected -> video
    return 'video';
  }
  
  if (content === '[Sticker]' || content.includes('🎭') || content.includes('Sticker')) {
    // Sticker placeholder detected -> sticker
    return 'sticker';
  }
  
  if (content === '[Áudio]' || content.includes('🎵') || content.includes('Áudio')) {
    // Audio placeholder detected -> audio
    return 'audio';
  }
  
  if (content.startsWith('[') && content.endsWith(']') && 
      (content.includes('Documento') || content.includes('📄'))) {
    // Document placeholder detected -> document
    return 'document';
  }
  
  // Base64 sem prefixo (fallback)
  if (content.length > 100 && !content.includes(' ') && !content.includes('\n')) {
    // Possible base64 without prefix -> image
    return 'image';
  }
  
  // No media indicators found -> text
  return 'text';
}

// Linkifica URLs e telefones mantendo quebras de linha
function LinkifiedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b\d{2}?[\s-]?\d{4,5}-?\d{4}\b)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const [full] = match;
    const start = match.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    let href = full;
    if (/^www\./i.test(full)) {
      href = `https://${full}`;
    } else if (/^\d/.test(full)) {
      // telefone simples
      const digits = full.replace(/\D/g, '');
      href = `tel:${digits}`;
    }

    parts.push(
      <a key={`${start}-${full}`} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-primary text-primary">
        {full}
      </a>
    );
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Preserva quebras de linha dividindo por \n
  const withBreaks: React.ReactNode[] = parts.flatMap((part, i) => {
    if (typeof part === 'string') {
      const segments = part.split('\n');
      return segments.flatMap((seg, idx) => (idx < segments.length - 1 ? [seg, <br key={`br-${i}-${idx}`} />] : [seg])) as React.ReactNode[];
    }
    return [part];
  });

  return <span className="text-xs sm:text-sm leading-relaxed">{withBreaks}</span>;
}