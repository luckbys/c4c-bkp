import { useState } from 'react';

interface DownloadState {
  isDownloading: boolean;
  error: string | null;
}

/**
 * Hook para download de arquivos de mídia
 */
export const useMediaDownload = () => {
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    error: null
  });

  const downloadFile = async (
    messageId: string,
    ticketId: string,
    fileName?: string
  ): Promise<void> => {
    setState({ isDownloading: true, error: null });

    try {
      const response = await fetch(`/api/media/download/${messageId}?ticketId=${ticketId}`);
      
      if (!response.ok) {
        throw new Error(`Erro no download: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `media_${messageId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      setState({ isDownloading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no download';
      setState({ isDownloading: false, error: errorMessage });
      throw error;
    }
  };

  const deleteFile = async (
    messageId: string,
    ticketId: string
  ): Promise<void> => {
    setState({ isDownloading: true, error: null });

    try {
      const response = await fetch(`/api/media/download/${messageId}?ticketId=${ticketId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Erro na exclusão: ${response.status}`);
      }
      
      setState({ isDownloading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na exclusão';
      setState({ isDownloading: false, error: errorMessage });
      throw error;
    }
  };

  return {
    downloadFile,
    deleteFile,
    isDownloading: state.isDownloading,
    error: state.error
  };
};