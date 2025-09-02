'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useMediaUpload, useFileValidation, UploadProgress } from '@/hooks/use-media-upload';
import { Upload, X, File, Image, Video, Music, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploadProps {
  messageId: string;
  ticketId: string;
  onUploadComplete: (result: { url: string; fileName: string; size: number }) => void;
  onUploadError: (error: string) => void;
  className?: string;
  maxFiles?: number;
  disabled?: boolean;
}

interface FileWithPreview {
  originalFile: File;
  preview?: string;
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  progress?: UploadProgress;
  result?: UploadResult;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
  'audio/ogg': ['.ogg'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/avi': ['.avi'],
  'video/mov': ['.mov']
};

const MAX_FILE_SIZES = {
  'application/pdf': 50 * 1024 * 1024, // 50MB
  'application/xml': 10 * 1024 * 1024, // 10MB
  'text/xml': 10 * 1024 * 1024,
  'audio/ogg': 100 * 1024 * 1024, // 100MB
  'image/jpeg': 20 * 1024 * 1024, // 20MB
  'video/mp4': 500 * 1024 * 1024, // 500MB
  'video/webm': 500 * 1024 * 1024,
  'video/avi': 500 * 1024 * 1024,
  'video/mov': 500 * 1024 * 1024
};

function getFileIcon(mimeType: string | undefined) {
  if (!mimeType || typeof mimeType !== 'string') return File;
  
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createFilePreview(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } else {
      resolve(null);
    }
  });
}

export function MediaUpload({
  messageId,
  ticketId,
  onUploadComplete,
  onUploadError,
  className,
  maxFiles = 5,
  disabled = false
}: MediaUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile } = useMediaUpload();
  const { validateFile } = useFileValidation();

  const validateFileType = useCallback((file: File): { isValid: boolean; error?: string } => {
    const acceptedMimeTypes = Object.keys(ACCEPTED_TYPES);
    
    if (!file.type || !acceptedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Tipo de arquivo não suportado: ${file.type || 'desconhecido'}`
      };
    }

    const maxSize = MAX_FILE_SIZES[file.type as keyof typeof MAX_FILE_SIZES];
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `Arquivo muito grande. Máximo: ${formatFileSize(maxSize)}`
      };
    }

    return { isValid: true };
  }, []);

  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileWithPreview[] = [];
    
    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList[i];
      const validation = validateFileType(file);
      
      const fileWithPreview: FileWithPreview = {
        originalFile: file,
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validation.isValid ? 'pending' : 'error',
        error: validation.error,
        preview: await createFilePreview(file)
      };
      
      newFiles.push(fileWithPreview);
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    
    // Iniciar uploads automáticos para arquivos válidos
    for (const file of newFiles) {
      if (file.status === 'pending') {
        handleFileUpload(file);
      }
    }
  }, [files.length, maxFiles, validateFileType]);

  const handleFileUpload = useCallback(async (file: FileWithPreview) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'uploading' } : f
    ));

    try {
      const result = await uploadFile(
        file.originalFile,
        messageId,
        ticketId,
        (progress) => {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress } : f
          ));
        }
      );

      if (result.success) {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'completed', result } : f
        ));
        
        onUploadComplete({
          url: result.url!,
          fileName: result.fileName!,
          size: result.size!,
          mimeType: file.originalFile.type
        });
      } else {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'error', error: result.error } : f
        ));
        
        onUploadError(result.error || 'Erro no upload');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'error', error: errorMessage } : f
      ));
      
      onUploadError(errorMessage);
    }
  }, [uploadFile, messageId, ticketId, onUploadComplete, onUploadError]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (!disabled && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      e.target.value = '';
    }
  }, [disabled, processFiles]);

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const canAddMoreFiles = files.length < maxFiles;
  const hasActiveUploads = files.some(f => f.status === 'uploading');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Área de Drop */}
      {canAddMoreFiles && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200',
            {
              'border-blue-500 bg-blue-50': isDragOver && !disabled,
              'border-gray-300 hover:border-blue-400 hover:bg-gray-50': !isDragOver && !disabled,
              'border-gray-200 bg-gray-100 cursor-not-allowed': disabled,
            }
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <Upload className={cn(
            'mx-auto h-12 w-12 mb-4',
            {
              'text-blue-500': isDragOver && !disabled,
              'text-gray-400': !isDragOver && !disabled,
              'text-gray-300': disabled
            }
          )} />
          
          <div className="space-y-2">
            <div className={cn(
              'text-lg font-medium',
              {
                'text-blue-600': isDragOver && !disabled,
                'text-gray-700': !isDragOver && !disabled,
                'text-gray-400': disabled
              }
            )}>
              {isDragOver && !disabled
                ? 'Solte os arquivos aqui'
                : 'Clique ou arraste arquivos'
              }
            </div>
            
            <div className="text-sm text-gray-500">
              Formatos suportados: PDF, XML, OGG, JPEG, MP4, WebM, AVI, MOV
            </div>
            
            <div className="text-xs text-gray-400">
              Máximo {maxFiles} arquivos • Até 500MB por arquivo
            </div>
          </div>
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.values(ACCEPTED_TYPES).flat().join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            
            return (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-white border rounded-lg shadow-sm"
              >
                {/* Preview ou ícone */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <Icon className="w-10 h-10 text-gray-400" />
                  )}
                </div>

                {/* Informações do arquivo */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type || 'Tipo desconhecido'}
                  </div>
                  
                  {/* Barra de progresso */}
                  {file.status === 'uploading' && file.progress && (
                    <div className="mt-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {file.progress.percentage}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Erro */}
                  {file.status === 'error' && file.error && (
                    <div className="mt-1 text-xs text-red-600">
                      {file.error}
                    </div>
                  )}
                </div>

                {/* Status e ações */}
                <div className="flex items-center space-x-2">
                  {file.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  
                  {file.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={file.status === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Informações adicionais */}
      {hasActiveUploads && (
        <div className="text-sm text-blue-600 text-center">
          Enviando arquivos...
        </div>
      )}
    </div>
  );
}