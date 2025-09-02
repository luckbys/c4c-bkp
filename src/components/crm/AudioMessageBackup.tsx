'use client';

import React, { useState, useMemo } from 'react';
import { Music, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

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
      isMinIOUrl: content.includes('minio') || content.includes('localhost:9000') || content.includes('/api/minio-proxy'),
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
      if ((content.includes('minio') || content.includes('localhost:9000')) && !content.includes('/api/minio-proxy')) {
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

  // Event handlers corrigidos
  const handleTimeUpdate = () => {
    if (audioRef) {
      setCurrentTime(audioRef.currentTime);
      console.log('🎵 [AUDIO TIME] Tempo atualizado:', {
        messageId,
        currentTime: audioRef.currentTime,
        duration: audioRef.duration
      });
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef) {
      setDuration(audioRef.duration);
      console.log('🎵 [AUDIO METADATA] Duração carregada:', {
        messageId,
        duration: audioRef.duration
      });
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
    console.log('🎵 [AUDIO PLAY] Reprodução iniciada:', { messageId });
  };

  const handlePause = () => {
    setIsPlaying(false);
    console.log('🎵 [AUDIO PAUSE] Reprodução pausada:', { messageId });
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef) {
      audioRef.currentTime = 0;
    }
    console.log('🎵 [AUDIO ENDED] Reprodução finalizada:', { messageId });
  };

  const handleAudioError = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const target = event.target as HTMLAudioElement;
    const audioUrl = target?.src || processedAudioUrl || content;
    
    console.log('🎵 [AUDIO COMPONENT] Erro ao carregar áudio:', {
      messageId,
      audioUrl: audioUrl.length > 100 ? audioUrl.substring(0, 100) + '...' : audioUrl,
      isFirebaseUrl: audioUrl.includes('firebasestorage.googleapis.com'),
      isMinIOUrl: audioUrl.includes('minio') || audioUrl.includes('localhost:9000'),
      errorType: event.type,
      retryCount,
      retryMethods,
      hasProxyUrl: !!proxyUrl
    });
    
    const isFirebaseUrl = audioUrl.includes('firebasestorage.googleapis.com');
    const isMinIOUrl = audioUrl.includes('minio') || audioUrl.includes('localhost:9000');
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
  };

  const handleAudioLoad = () => {
    console.log('✅ [AUDIO COMPONENT] Áudio carregado com sucesso:', {
      messageId,
      method: proxyUrl ? 'proxy' : 'direct',
      retryCount
    });
    setAudioError(null);
  };

  const handleDownload = () => {
    const downloadUrl = proxyUrl || processedAudioUrl || content;
    if (!isValidAudioUrl(downloadUrl)) return;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'audio';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Verificar se o content é uma URL válida
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Verificar se é uma URL de áudio válida com formato suportado
  const isValidAudioUrl = (url: string) => {
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
  };

  // Verificar se o áudio pode ser reproduzido
  const canPlayAudio = (url: string): Promise<boolean> => {
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
  };

  // Se não for uma URL válida ou houver erro, mostrar placeholder
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

  const togglePlay = async () => {
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
  };

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
            
            // Limpar event listeners anteriores se existirem
            if (audioRef) {
              audioRef.removeEventListener('timeupdate', handleTimeUpdate);
              audioRef.removeEventListener('loadedmetadata', handleLoadedMetadata);
              audioRef.removeEventListener('error', handleAudioError);
              audioRef.removeEventListener('canplay', handleAudioLoad);
              audioRef.removeEventListener('play', handlePlay);
              audioRef.removeEventListener('pause', handlePause);
              audioRef.removeEventListener('ended', handleEnded);
            }
            
            // Event listeners com tratamento de erro melhorado
            el.addEventListener('timeupdate', handleTimeUpdate);
            el.addEventListener('loadedmetadata', handleLoadedMetadata);
            el.addEventListener('error', handleAudioError);
            el.addEventListener('canplay', handleAudioLoad);
            el.addEventListener('play', handlePlay);
            el.addEventListener('pause', handlePause);
            el.addEventListener('ended', handleEnded);
            
            // Usar a URL processada (proxy ou processedAudioUrl) em vez do content original
            const audioUrl = proxyUrl || processedAudioUrl || content;
            
            console.log('🎵 [AUDIO ELEMENT] Configurando elemento audio:', {
              messageId,
              originalContent: content.substring(0, 50) + '...',
              audioUrl: audioUrl.substring(0, 50) + '...',
              usingProxy: !!proxyUrl,
              isOGG: audioUrl.includes('.ogg') || audioUrl.includes('ogg')
            });
            
            // Definir a src do áudio com a URL processada
            el.src = audioUrl;
            
            // Configurações específicas para melhor compatibilidade com OGG
            el.preload = 'metadata';
            el.crossOrigin = 'anonymous';
            
            el.addEventListener('loadstart', () => {
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
             });
             
             el.addEventListener('canplay', () => {
               console.log('🎵 [AUDIO ELEMENT] Áudio pronto para reprodução:', {
                 messageId,
                 duration: el.duration,
                 readyState: el.readyState
               });
               logger.audio.debug('Áudio pronto para reprodução', { 
                 url: content,
                 processedUrl: audioUrl,
                 duration: el.duration
               });
               setIsLoading(false);
             });
             
             el.addEventListener('loadedmetadata', () => {
               console.log('🎵 [AUDIO ELEMENT] Metadados carregados:', {
                 messageId,
                 duration: el.duration,
                 readyState: el.readyState,
                 networkState: el.networkState
               });
               logger.audio.debug('Metadados do áudio carregados', { 
                 url: content,
                 processedUrl: audioUrl,
                 duration: el.duration,
                 readyState: el.readyState
               });
             });
          }
        }}
        preload="metadata"
        crossOrigin="anonymous"
      />
    </div>
  );
}