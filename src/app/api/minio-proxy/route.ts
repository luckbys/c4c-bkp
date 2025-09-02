import { NextRequest, NextResponse } from 'next/server';
import { getMinIOService } from '@/services/minio-service';

/**
 * Endpoint proxy para servir arquivos do MinIO com headers CORS corretos
 * 
 * Este endpoint funciona como um proxy que:
 * 1. Recebe um objectName (nome do arquivo no MinIO) como parâmetro
 * 2. Busca o arquivo no MinIO
 * 3. Retorna o arquivo com headers CORS apropriados
 * 
 * Suporta: imagens, vídeos, áudios, documentos e outros tipos de mídia
 * Uso: /api/minio-proxy?object=tickets/ticket123/image_456.jpg
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const objectName = searchParams.get('objectName') || searchParams.get('object');
    const ticketId = searchParams.get('ticketId');

    // Validar se o objectName foi fornecido
    if (!objectName) {
      return NextResponse.json(
        { error: 'Nome do objeto (object) é obrigatório' },
        { status: 400 }
      );
    }

    // Validação de segurança: verificar se o objeto pertence ao ticket correto
    if (ticketId && !objectName.includes(`tickets/${ticketId}/`)) {
      return NextResponse.json(
        { error: 'Acesso negado: objeto não pertence ao ticket especificado' },
        { status: 403 }
      );
    }

    console.log('🗄️ [MINIO PROXY] Buscando arquivo:', objectName);

    const minioService = getMinIOService();
    
    // Verificar se o arquivo existe
    try {
      await minioService.getFileInfo(objectName);
    } catch (error) {
      console.log('❌ [MINIO PROXY] Arquivo não encontrado:', objectName);
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }

    // Buscar o arquivo do MinIO
    const controller = new AbortController();
    const TIMEOUT_MS = 30000; // 30s para mídia
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const buffer = await minioService.downloadFile(objectName);
      
      clearTimeout(timeoutId);
      
      // Determinar o tipo de conteúdo baseado na extensão do arquivo
      const contentType = getContentType(objectName);
      
      console.log('✅ [MINIO PROXY] Arquivo servido:', {
        objectName,
        size: buffer.length,
        contentType,
        duration: Date.now() - startTime
      });

      // Retornar o arquivo com headers CORS apropriados
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        }
      });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ [MINIO PROXY] Erro ao buscar arquivo:', fetchError);
      
      return NextResponse.json(
        { error: 'Erro ao buscar arquivo do MinIO' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [MINIO PROXY] Erro geral:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Suporte para requisições OPTIONS (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Determina o tipo de conteúdo baseado na extensão do arquivo
 */
function getContentType(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const mimeTypes: { [key: string]: string } = {
    // Imagens
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    
    // Vídeos
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Áudios
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'm4a': 'audio/mp4',
    'wma': 'audio/x-ms-wma',
    
    // Documentos
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    
    // Arquivos compactados
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Outros
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv'
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}