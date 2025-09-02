import { storage, auth } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { evolutionApi } from './evolution-api';
import { mediaLogger } from './media-logger';

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  size?: number;
}

export interface MediaInfo {
  url: string;
  type: 'image' | 'audio' | 'document' | 'video' | 'sticker';
  fileName?: string;
  mimeType?: string;
  instanceName: string;
  messageId: string;
}

/**
 * Determina o tipo de mídia baseado na URL ou MIME type
 */
function getMediaType(url: string, mimeType?: string): 'image' | 'audio' | 'document' | 'video' | 'sticker' {
  const urlLower = url.toLowerCase();
  const mimeLower = mimeType?.toLowerCase() || '';
  
  // Priorizar mimeType sobre extensão da URL para arquivos .enc
  if (mimeLower) {
    if (mimeLower.startsWith('audio/')) {
      console.log(`🎵 [MEDIA TYPE] Detectado como áudio pelo mimeType: ${mimeType}`);
      return 'audio';
    }
    if (mimeLower.startsWith('video/')) {
      console.log(`🎬 [MEDIA TYPE] Detectado como vídeo pelo mimeType: ${mimeType}`);
      return 'video';
    }
    if (mimeLower.startsWith('image/')) {
      if (mimeLower === 'image/webp') {
        console.log(`🎭 [MEDIA TYPE] Detectado como sticker pelo mimeType: ${mimeType}`);
        return 'sticker';
      }
      console.log(`🖼️ [MEDIA TYPE] Detectado como imagem pelo mimeType: ${mimeType}`);
      return 'image';
    }
  }
  
  // Detectar por extensão da URL como fallback
  if (urlLower.includes('.webp')) {
    return 'sticker';
  }
  
  if (/\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(urlLower)) {
    return 'image';
  }
  
  if (/\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(urlLower)) {
    return 'audio';
  }
  
  if (/\.(mp4|avi|mov|wmv|flv|webm|mkv|3gp)$/i.test(urlLower)) {
    return 'video';
  }
  
  // Para URLs .enc sem mimeType, tentar detectar pelo contexto
  if (urlLower.includes('.enc')) {
    console.log(`🔐 [MEDIA TYPE] URL .enc detectada sem mimeType, assumindo documento`);
    return 'document';
  }
  
  return 'document';
}

/**
 * Determina a extensão correta baseada no Content-Type
 */
function getExtensionFromContentType(contentType: string, mediaType: string): string {
  const contentTypeLower = contentType.toLowerCase();
  
  // Mapeamento de Content-Type para extensões
  const contentTypeMap: { [key: string]: string } = {
    // Imagens
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/tiff': 'tiff',
    'image/ico': 'ico',
    
    // Áudios
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/ogg; codecs=opus': 'ogg', // Evolution API específico
    'audio/m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/opus': 'ogg', // Opus geralmente em container OGG
    'audio/flac': 'flac',
    'audio/x-wav': 'wav',
    'audio/x-m4a': 'm4a',
    
    // Vídeos
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/mov': 'mov',
    'video/wmv': 'wmv',
    'video/webm': 'webm',
    'video/mkv': 'mkv',
    'video/3gpp': '3gp',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    
    // Documentos
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z'
  };
  
  // Tentar encontrar extensão pelo Content-Type
  if (contentTypeMap[contentTypeLower]) {
    return contentTypeMap[contentTypeLower];
  }
  
  // Fallback baseado no tipo de mídia se não encontrou no mapeamento
  const fallbackMap: { [key: string]: string } = {
    'image': 'jpg',
    'audio': 'ogg', // Evolution API usa OGG por padrão
    'video': 'mp4',
    'document': 'pdf',
    'sticker': 'webp'
  };
  
  // Para application/octet-stream, usar sempre o fallback baseado no tipo de mídia
  if (contentTypeLower === 'application/octet-stream') {
    return fallbackMap[mediaType] || 'bin';
  }
  
  // Se chegou até aqui, usar fallback baseado no tipo de mídia
  return fallbackMap[mediaType] || 'bin';
}

/**
 * Gera o caminho do arquivo no Storage baseado no tipo e data
 */
function generateStoragePath(mediaInfo: MediaInfo, contentType?: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  let extension = 'bin';
  
  // 1. Tentar extrair extensão da URL
  const urlParts = mediaInfo.url.split('.');
  if (urlParts.length > 1) {
    const urlExtension = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
    // Verificar se é uma extensão válida (não muito longa)
    if (urlExtension.length <= 4 && /^[a-z0-9]+$/.test(urlExtension)) {
      extension = urlExtension;
    }
  }
  
  // 2. Se não conseguiu da URL, usar Content-Type
  if (extension === 'bin' && contentType) {
    extension = getExtensionFromContentType(contentType, mediaInfo.type);
  }
  
  // 3. Se ainda não tem extensão, usar mimeType
  if (extension === 'bin' && mediaInfo.mimeType) {
    extension = getExtensionFromContentType(mediaInfo.mimeType, mediaInfo.type);
  }
  
  // Garantir que o fileName sempre tenha uma extensão válida
  let fileName = mediaInfo.fileName;
  if (fileName) {
    // Verificar se o fileName já tem uma extensão válida
    const fileNameParts = fileName.split('.');
    if (fileNameParts.length === 1 || fileNameParts[fileNameParts.length - 1].length > 4) {
      // Arquivo sem extensão ou com extensão inválida, adicionar a extensão correta
      fileName = `${fileName}.${extension}`;
    }
  } else {
    // Gerar fileName com extensão
    fileName = `${mediaInfo.messageId}.${extension}`;
  }
  
  // Usar pasta 'media' para todos os tipos de mídia (alinhado com regras do Firebase Storage)
  return `media/${mediaInfo.instanceName}/${year}/${month}/${fileName}`;
}

/**
 * Verifica se uma URL é do tipo .enc (criptografada)
 */
function isEncryptedUrl(url: string): boolean {
  return url.toLowerCase().includes('.enc');
}

/**
 * Faz download de um arquivo da URL fornecida
 */
/**
 * Detecta o tipo de arquivo baseado nas assinaturas de bytes
 */
function detectFileTypeFromBuffer(buffer: ArrayBuffer): string | null {
  const uint8Array = new Uint8Array(buffer);
  
  // Verificar se o buffer tem tamanho mínimo
  if (buffer.byteLength < 12) {
    return null;
  }
  
  // Verificar assinaturas de formato
  // JPEG
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // PNG
  if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
    return 'image/png';
  }
  
  // GIF
  if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
    return 'image/gif';
  }
  
  // WebP
  if (uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50) {
    return 'image/webp';
  }
  
  // BMP
  if (uint8Array[0] === 0x42 && uint8Array[1] === 0x4D) {
    return 'image/bmp';
  }
  
  // MP3
  if ((uint8Array[0] === 0xFF && (uint8Array[1] & 0xE0) === 0xE0) || 
      (uint8Array[0] === 0x49 && uint8Array[1] === 0x44 && uint8Array[2] === 0x33)) {
    return 'audio/mpeg';
  }
  
  // WAV
  if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
      uint8Array[8] === 0x57 && uint8Array[9] === 0x41 && uint8Array[10] === 0x56 && uint8Array[11] === 0x45) {
    return 'audio/wav';
  }
  
  // OGG
  if (uint8Array[0] === 0x4F && uint8Array[1] === 0x67 && uint8Array[2] === 0x67 && uint8Array[3] === 0x53) {
    return 'audio/ogg';
  }
  
  // MP4
  if (uint8Array[4] === 0x66 && uint8Array[5] === 0x74 && uint8Array[6] === 0x79 && uint8Array[7] === 0x70) {
    return 'video/mp4';
  }
  
  // PDF
  if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
    return 'application/pdf';
  }
  
  return null;
}

async function downloadFile(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const startTime = Date.now();
  const DOWNLOAD_TIMEOUT = 30000; // 30 segundos
  
  try {
    console.log('📥 Fazendo download do arquivo:', {
      url: url.substring(0, 100) + '...',
      timeout: `${DOWNLOAD_TIMEOUT}ms`
    });
    
    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error('❌ Download cancelado por timeout:', {
        url: url.substring(0, 100) + '...',
        duration: `${Date.now() - startTime}ms`,
        timeout: `${DOWNLOAD_TIMEOUT}ms`
      });
    }, DOWNLOAD_TIMEOUT);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('📥 Resposta do download:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      duration: `${Date.now() - startTime}ms`
    });
    
    if (!response.ok) {
      throw new Error(`Erro no download: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Se o content-type é genérico, tentar detectar automaticamente
    if (contentType === 'application/octet-stream' || contentType === 'binary/octet-stream') {
      const detectedType = detectFileTypeFromBuffer(buffer);
      if (detectedType) {
        console.log('🔍 Tipo detectado automaticamente:', {
          original: contentType,
          detected: detectedType,
          bufferSize: buffer.byteLength
        });
        contentType = detectedType;
      }
    }
    
    console.log('✅ Download concluído:', {
      size: buffer.byteLength,
      contentType,
      duration: `${Date.now() - startTime}ms`
    });
    
    return { buffer, contentType };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('❌ Download cancelado por timeout:', {
        url: url.substring(0, 100) + '...',
        duration: `${duration}ms`,
        timeout: `${DOWNLOAD_TIMEOUT}ms`
      });
      throw new Error(`Download timeout após ${duration}ms`);
    }
    
    console.error('❌ Erro no download:', {
      url: url.substring(0, 100) + '...',
      error: error instanceof Error ? error.message : error,
      duration: `${duration}ms`
    });
    throw error;
  }
}

/**
 * Valida se o buffer contém dados de imagem válidos
 */
function validateImageBuffer(buffer: ArrayBuffer, expectedType: string): { isValid: boolean; detectedType?: string; correctedContentType?: string; error?: string } {
  const uint8Array = new Uint8Array(buffer);
  
  // Verificar se o buffer tem tamanho mínimo
  if (buffer.byteLength < 10) {
    return { isValid: false, error: 'Arquivo muito pequeno' };
  }
  
  // Verificar assinaturas de formato
  const signatures = {
    jpg: uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF,
    jpeg: uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF,
    png: uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47,
    gif: uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46,
    webp: uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50,
    bmp: uint8Array[0] === 0x42 && uint8Array[1] === 0x4D
  };
  
  const detectedType = Object.keys(signatures).find(format => signatures[format as keyof typeof signatures]);
  
  if (!detectedType) {
    // Verificar se é texto/HTML (erro comum)
    const textStart = new TextDecoder().decode(uint8Array.slice(0, 100));
    if (textStart.includes('<html') || textStart.includes('<!DOCTYPE') || textStart.includes('<?xml')) {
      return { isValid: false, error: 'Arquivo contém HTML/XML em vez de imagem' };
    }
    
    return { isValid: false, error: 'Formato de imagem não reconhecido' };
  }
  
  // Mapear tipo detectado para content-type correto
  const typeToContentType: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp'
  };
  
  const correctedContentType = typeToContentType[detectedType];
  
  // Verificar se o tipo detectado é compatível com o esperado
  const normalizedExpected = expectedType.toLowerCase().replace('image/', '');
  const isCompatible = detectedType === normalizedExpected || 
                      (detectedType === 'jpg' && normalizedExpected === 'jpeg') ||
                      (detectedType === 'jpeg' && normalizedExpected === 'jpg');
  
  return {
    isValid: true,
    detectedType,
    correctedContentType,
    error: isCompatible ? undefined : `Tipo detectado (${detectedType}) corrigido automaticamente de ${expectedType} para ${correctedContentType}`
  };
}

/**
 * Faz upload de um arquivo para o Firebase Storage
 */
// Função para garantir autenticação anônima
async function ensureAuthenticated(): Promise<void> {
  try {
    if (!auth.currentUser) {
      console.log('🔐 Fazendo login anônimo para upload...');
      await signInAnonymously(auth);
      console.log('✅ Login anônimo realizado com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro no login anônimo:', error);
    throw error;
  }
}

async function uploadToStorage(
  buffer: ArrayBuffer,
  storagePath: string,
  contentType: string
): Promise<string> {
  // Validar formato de imagem antes do upload
  if (contentType.startsWith('image/')) {
    const validation = validateImageBuffer(buffer, contentType);
    
    if (!validation.isValid) {
      console.error('❌ Validação de imagem falhou:', {
        error: validation.error,
        contentType,
        bufferSize: buffer.byteLength,
        storagePath
      });
      throw new Error(`Arquivo de imagem inválido: ${validation.error}`);
    }
    
    console.log('✅ Validação de imagem passou:', {
      detectedType: validation.detectedType,
      originalContentType: contentType,
      correctedContentType: validation.correctedContentType,
      bufferSize: buffer.byteLength
    });
    
    // Sempre usar o content-type corrigido quando disponível
    if (validation.correctedContentType) {
      if (validation.correctedContentType !== contentType) {
        console.log('🔧 Corrigindo content-type:', {
          original: contentType,
          corrected: validation.correctedContentType,
          reason: 'Tipo detectado pela validação de assinatura de bytes'
        });
      }
      contentType = validation.correctedContentType;
    }
  }
  
  // Upload usando Firebase Client SDK com autenticação anônima
  try {
    await ensureAuthenticated();
    console.log('📤 Fazendo upload para Storage:', storagePath);
    
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        validated: 'true'
      }
    };
    
    const snapshot = await uploadBytes(storageRef, buffer, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('✅ Upload concluído:', {
      path: storagePath,
      url: downloadURL,
      size: snapshot.metadata.size
    });
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Erro no upload:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      storagePath
    });
    throw error;
  }
}

/**
 * Processa e faz upload de mídia para o Firebase Storage com retry inteligente
 */
export async function uploadMedia(mediaInfo: MediaInfo, retryCount = 0): Promise<MediaUploadResult> {
  const startTime = Date.now();
  const maxRetries = 3;
  
  try {
    // Log início do upload
    mediaLogger.startUpload({
      messageId: mediaInfo.messageId,
      instanceName: mediaInfo.instanceName,
      mediaType: mediaInfo.type,
      originalUrl: mediaInfo.url,
      method: mediaInfo.url.startsWith('data:') ? 'base64' : 'direct_url',
      fileName: mediaInfo.fileName
    });
    
    console.log('🚀 Iniciando upload de mídia:', {
      url: mediaInfo.url.substring(0, 100) + '...',
      type: mediaInfo.type,
      messageId: mediaInfo.messageId,
      instanceName: mediaInfo.instanceName
    });
    
    // 1. Fazer download do arquivo
    mediaLogger.updateDownloadStatus(mediaInfo.messageId, 'downloading');
    const { buffer, contentType } = await downloadFile(mediaInfo.url);
    
    // 2. Gerar caminho no Storage com extensão correta baseada no Content-Type
    const storagePath = generateStoragePath(mediaInfo, contentType);
    
    console.log('📁 Caminho gerado no Storage:', {
      path: storagePath,
      contentType,
      detectedExtension: storagePath.split('.').pop()
    });
    
    // 3. Fazer upload para o Storage
    mediaLogger.updateUploadStatus(mediaInfo.messageId, 'uploading');
    
    try {
      const downloadURL = await uploadToStorage(buffer, storagePath, contentType);
      
      // Log sucesso
      const fileName = storagePath.split('/').pop();
      mediaLogger.logSuccess({
        messageId: mediaInfo.messageId,
        storageUrl: downloadURL,
        fileName,
        fileSize: buffer.byteLength
      });
      
      return {
        success: true,
        url: downloadURL,
        fileName,
        size: buffer.byteLength
      };
    } catch (validationError: any) {
      // Se a validação falhou e ainda temos tentativas, retry
      if (validationError.message?.includes('Arquivo de imagem inválido') && retryCount < maxRetries) {
        console.log(`⚠️ Dados corrompidos detectados, tentativa ${retryCount + 1}/${maxRetries}:`, {
          messageId: mediaInfo.messageId,
          error: validationError.message,
          url: mediaInfo.url
        });
        
        // Aguardar um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        
        // Retry recursivo
        return uploadMedia(mediaInfo, retryCount + 1);
      }
      
      // Se esgotamos as tentativas ou é outro tipo de erro, propagar
      throw validationError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Log erro
    mediaLogger.logError(mediaInfo.messageId, errorMessage);
    
    console.error('❌ Erro no upload de mídia:', {
      messageId: mediaInfo.messageId,
      error: errorMessage,
      duration: `${Date.now() - startTime}ms`
    });
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Processa mídia de uma mensagem do WhatsApp
 */
export async function processWhatsAppMedia(
  mediaUrl: string,
  messageId: string,
  instanceName: string,
  mimeType?: string,
  fileName?: string
): Promise<MediaUploadResult> {
  try {
    console.log(`📱 [PROCESS MEDIA] Processando mídia:`, {
      mediaUrl: mediaUrl.substring(0, 100) + '...',
      messageId,
      instanceName,
      mimeType,
      fileName
    });
    
    // Determinar tipo de mídia
    const type = getMediaType(mediaUrl, mimeType);
    
    console.log(`📱 [PROCESS MEDIA] Tipo detectado: ${type}`);
    
    const mediaInfo: MediaInfo = {
      url: mediaUrl,
      type,
      fileName,
      mimeType,
      instanceName,
      messageId
    };
    
    return await uploadMedia(mediaInfo);
  } catch (error) {
    console.error('❌ Erro ao processar mídia do WhatsApp:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Cache para evitar uploads duplicados
 */
const uploadCache = new Map<string, string>();

/**
 * Verifica se uma mídia já foi processada (cache)
 */
export function isMediaCached(messageId: string): string | null {
  return uploadCache.get(messageId) || null;
}

/**
 * Adiciona uma mídia ao cache
 */
export function cacheMediaUrl(messageId: string, url: string): void {
  uploadCache.set(messageId, url);
}

/**
 * Limpa o cache (pode ser chamado periodicamente)
 */
export function clearMediaCache(): void {
  uploadCache.clear();
}

/**
 * Processa mídia com cache
 */
export async function processMediaWithCache(
  mediaUrl: string,
  messageId: string,
  instanceName: string,
  mimeType?: string,
  fileName?: string
): Promise<MediaUploadResult> {
  console.log(`🔄 [CACHE] Processando mídia com cache:`, {
    mediaUrl: mediaUrl.substring(0, 100) + '...',
    messageId,
    instanceName,
    mimeType,
    fileName
  });
  
  // Verificar cache primeiro
  const cachedUrl = isMediaCached(messageId);
  if (cachedUrl) {
    mediaLogger.logCacheHit(messageId, cachedUrl);
    console.log('📋 Mídia encontrada no cache:', messageId);
    return {
      success: true,
      url: cachedUrl
    };
  }
  
  // Processar mídia
  const result = await processWhatsAppMedia(mediaUrl, messageId, instanceName, mimeType, fileName);
  
  // Adicionar ao cache se sucesso
  if (result.success && result.url) {
    cacheMediaUrl(messageId, result.url);
  }
  
  return result;
}

// Export default
const mediaUploadService = {
  uploadMedia,
  processWhatsAppMedia,
  processMediaWithCache,
  isMediaCached,
  cacheMediaUrl,
  clearMediaCache
};

export default mediaUploadService;