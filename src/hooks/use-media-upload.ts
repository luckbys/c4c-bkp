import { useState, useCallback } from 'react';

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  checksum?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseMediaUploadReturn {
  uploadFile: (
    file: File,
    messageId: string,
    ticketId: string,
    onProgress?: (progress: UploadProgress) => void
  ) => Promise<UploadResult>;
  uploading: boolean;
  progress: UploadProgress;
  cancel: () => void;
}

export function useMediaUpload(): UseMediaUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0
  });
  const [currentXhr, setCurrentXhr] = useState<XMLHttpRequest | null>(null);

  const cancel = useCallback(() => {
    if (currentXhr) {
      currentXhr.abort();
      setCurrentXhr(null);
      setUploading(false);
      setProgress({ loaded: 0, total: 0, percentage: 0 });
    }
  }, [currentXhr]);

  const uploadFile = useCallback(async (
    file: File,
    messageId: string,
    ticketId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    // Validar parâmetros
    if (!file || !messageId || !ticketId) {
      return {
        success: false,
        error: 'Parâmetros obrigatórios ausentes'
      };
    }

    // Validar tamanho do arquivo
    if (file.size === 0) {
      return {
        success: false,
        error: 'Arquivo vazio'
      };
    }

    // Validar tamanho máximo (500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Arquivo muito grande. Máximo: 500MB'
      };
    }

    setUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('messageId', messageId);
      formData.append('ticketId', ticketId);

      const xhr = new XMLHttpRequest();
      setCurrentXhr(xhr);
      
      return new Promise<UploadResult>((resolve, reject) => {
        // Monitorar progresso do upload
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progressData = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            
            setProgress(progressData);
            onProgress?.(progressData);
          }
        });

        // Quando o upload for concluído
        xhr.addEventListener('load', () => {
          setCurrentXhr(null);
          
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (error) {
              resolve({
                success: false,
                error: 'Erro ao processar resposta do servidor'
              });
            }
          } else {
            try {
              const errorResult = JSON.parse(xhr.responseText);
              resolve({
                success: false,
                error: errorResult.error || `Erro HTTP ${xhr.status}`
              });
            } catch {
              resolve({
                success: false,
                error: `Erro HTTP ${xhr.status}: ${xhr.statusText}`
              });
            }
          }
        });

        // Tratar erros de rede
        xhr.addEventListener('error', () => {
          setCurrentXhr(null);
          resolve({
            success: false,
            error: 'Erro de rede durante o upload'
          });
        });

        // Tratar cancelamento
        xhr.addEventListener('abort', () => {
          setCurrentXhr(null);
          resolve({
            success: false,
            error: 'Upload cancelado'
          });
        });

        // Iniciar o upload
        xhr.open('POST', '/api/media/upload');
        xhr.send(formData);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    } finally {
      setUploading(false);
      setCurrentXhr(null);
      setProgress({ loaded: 0, total: 0, percentage: 0 });
    }
  }, []);

  return {
    uploadFile,
    uploading,
    progress,
    cancel
  };
}

// Hook para validação de arquivos
export function useFileValidation() {
  const [validating, setValidating] = useState(false);

  const validateFile = useCallback(async (
    fileName: string,
    mimeType: string,
    size: number
  ): Promise<{ isValid: boolean; error?: string; normalizedName?: string }> => {
    setValidating(true);
    
    try {
      const response = await fetch('/api/media/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName, mimeType, size })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        isValid: false,
        error: 'Erro ao validar arquivo'
      };
    } finally {
      setValidating(false);
    }
  }, []);

  const getValidationRules = useCallback(async () => {
    try {
      const response = await fetch('/api/media/validate');
      return await response.json();
    } catch (error) {
      console.error('Erro ao obter regras de validação:', error);
      return null;
    }
  }, []);

  return {
    validateFile,
    getValidationRules,
    validating
  };
}

// Hook para download de arquivos
export function useMediaDownload() {
  const [downloading, setDownloading] = useState(false);

  const downloadFile = useCallback(async (
    messageId: string,
    ticketId?: string,
    options?: {
      direct?: boolean;
      presigned?: boolean;
      expiry?: number;
    }
  ) => {
    setDownloading(true);
    
    try {
      const params = new URLSearchParams();
      if (ticketId) params.append('ticketId', ticketId);
      if (options?.direct) params.append('direct', 'true');
      if (options?.presigned) params.append('presigned', 'true');
      if (options?.expiry) params.append('expiry', options.expiry.toString());

      const response = await fetch(`/api/media/download/${messageId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro no download:', error);
      throw error;
    } finally {
      setDownloading(false);
    }
  }, []);

  const deleteFile = useCallback(async (
    messageId: string,
    ticketId: string
  ) => {
    try {
      const response = await fetch(
        `/api/media/download/${messageId}?ticketId=${ticketId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  }, []);

  return {
    downloadFile,
    deleteFile,
    downloading
  };
}