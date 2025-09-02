import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Image, Video, Volume2, VolumeX, Play, Pause, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useMediaDownload } from '@/hooks/use-media-download';

interface MediaViewerProps {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'pdf' | 'xml';
  fileName?: string;
  messageId?: string;
  ticketId?: string;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
}

/**
 * Componente para visualização de diferentes tipos de mídia
 * Suporta imagens, vídeos, áudios, PDFs e documentos XML
 */
export const MediaViewer: React.FC<MediaViewerProps> = ({
  url,
  type,
  fileName,
  messageId,
  ticketId,
  className = '',
  showControls = true,
  autoPlay = false
}) => {
  const { downloadFile } = useMediaDownload();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (messageId && ticketId) {
      try {
        await downloadFile(messageId, ticketId, fileName);
      } catch (error) {
        console.error('Erro no download:', error);
      }
    } else {
      // Fallback para download direto
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'media-file';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleError = () => {
    setError('Erro ao carregar mídia');
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">{error}</p>
          {showControls && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Controles superiores */}
      {showControls && (
        <div className="absolute top-2 right-2 z-10 flex space-x-1">
          <button
            onClick={handleDownload}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          {(type === 'image' || type === 'video') && (
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              title="Tela cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Renderização baseada no tipo */}
      {type === 'image' && (
        <ImageViewer
          url={url}
          fileName={fileName}
          onLoad={handleLoad}
          onError={handleError}
          isFullscreen={isFullscreen}
        />
      )}

      {type === 'video' && (
        <VideoViewer
          url={url}
          fileName={fileName}
          onLoad={handleLoad}
          onError={handleError}
          autoPlay={autoPlay}
          isFullscreen={isFullscreen}
        />
      )}

      {type === 'audio' && (
        <AudioViewer
          url={url}
          fileName={fileName}
          onLoad={handleLoad}
          onError={handleError}
          autoPlay={autoPlay}
        />
      )}

      {(type === 'document' || type === 'pdf') && (
        <DocumentViewer
          url={url}
          fileName={fileName}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {type === 'xml' && (
        <XmlViewer
          url={url}
          fileName={fileName}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

// Componente para visualização de imagens
interface ViewerProps {
  url: string;
  fileName?: string;
  onLoad: () => void;
  onError: () => void;
  isFullscreen?: boolean;
  autoPlay?: boolean;
}

const ImageViewer: React.FC<ViewerProps> = ({ url, fileName, onLoad, onError, isFullscreen }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="relative bg-gray-100 rounded-lg overflow-hidden">
      {isFullscreen && (
        <div className="absolute top-4 left-4 z-20 flex space-x-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 text-sm"
          >
            Reset
          </button>
        </div>
      )}
      
      <img
        ref={imgRef}
        src={url}
        alt={fileName || 'Imagem'}
        className="w-full h-auto max-h-96 object-contain transition-transform duration-200"
        style={{
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center'
        }}
        onLoad={onLoad}
        onError={onError}
        loading="lazy"
      />
    </div>
  );
};

// Componente para visualização de vídeos
const VideoViewer: React.FC<ViewerProps> = ({ url, fileName, onLoad, onError, autoPlay, isFullscreen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
    onLoad();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={url}
        className="w-full h-auto max-h-96 object-contain"
        autoPlay={autoPlay}
        muted={isMuted}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onError={onError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      
      {/* Controles de vídeo customizados */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
        <div className="flex items-center space-x-3 text-white">
          <button onClick={togglePlay} className="hover:text-blue-400">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <button onClick={toggleMute} className="hover:text-blue-400">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          
          <div className="flex-1 flex items-center space-x-2">
            <span className="text-sm">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para visualização de áudios
const AudioViewer: React.FC<ViewerProps> = ({ url, fileName, onLoad, onError, autoPlay }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
    onLoad();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
      <audio
        ref={audioRef}
        src={url}
        autoPlay={autoPlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onError={onError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center w-12 h-12 bg-white bg-opacity-20 rounded-full">
          <Volume2 className="w-6 h-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-medium mb-2">{fileName || 'Arquivo de áudio'}</h3>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlay}
              className="flex items-center justify-center w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <div className="flex-1 flex items-center space-x-2">
              <span className="text-sm">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white bg-opacity-30 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm">{formatTime(duration)}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white bg-opacity-30 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para visualização de documentos PDF
const DocumentViewer: React.FC<ViewerProps> = ({ url, fileName, onLoad, onError }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = () => {
    setIsLoading(false);
    onLoad();
  };

  const handleIframeError = () => {
    setIsLoading(false);
    onError();
  };

  return (
    <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Carregando documento...</p>
          </div>
        </div>
      )}
      
      <iframe
        src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
        className="w-full h-full border-0"
        title={fileName || 'Documento PDF'}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
      
      {/* Fallback para quando o iframe não funciona */}
      <div className="absolute bottom-4 right-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          Abrir em nova aba
        </a>
      </div>
    </div>
  );
};

// Componente para visualização de arquivos XML
const XmlViewer: React.FC<ViewerProps> = ({ url, fileName, onLoad, onError }) => {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchXmlContent = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Erro ao carregar XML');
        }
        const content = await response.text();
        setXmlContent(content);
        setIsLoading(false);
        onLoad();
      } catch (error) {
        setIsLoading(false);
        onError();
      }
    };

    fetchXmlContent();
  }, [url, onLoad, onError]);

  const formatXml = (xml: string) => {
    // Formatação básica do XML para melhor visualização
    return xml
      .replace(/></g, '>\n<')
      .replace(/^\s*\n/gm, '')
      .split('\n')
      .map((line, index) => {
        const indent = '  '.repeat(Math.max(0, (line.match(/</g) || []).length - (line.match(/\//g) || []).length));
        return (
          <div key={index} className="font-mono text-sm">
            <span className="text-gray-400 mr-4 select-none">{(index + 1).toString().padStart(3, '0')}</span>
            <span className="text-blue-600">{indent}</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/</g, '&lt;').replace(/>/g, '&gt;') }} />
          </div>
        );
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Carregando XML...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{fileName || 'Arquivo XML'}</span>
        </div>
        <span className="text-xs text-gray-500">{xmlContent.length} caracteres</span>
      </div>
      
      <div className="p-4 max-h-96 overflow-auto bg-gray-50">
        <pre className="whitespace-pre-wrap text-sm">
          {formatXml(xmlContent)}
        </pre>
      </div>
    </div>
  );
};

export default MediaViewer;