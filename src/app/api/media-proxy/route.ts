import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint proxy para contornar problemas de CORS com mídia do Firebase Storage
 * 
 * Este endpoint funciona como um proxy que:
 * 1. Recebe uma URL de mídia como parâmetro
 * 2. Faz a requisição da mídia do servidor (sem restrições CORS)
 * 3. Retorna a mídia com headers CORS apropriados
 * 
 * Suporta: vídeos, áudios, stickers e outros tipos de mídia
 * Uso: /api/media-proxy?url=https://firebasestorage.googleapis.com/...
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get('url');

    // Validar se a URL foi fornecida
    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'URL da mídia é obrigatória' },
        { status: 400 }
      );
    }

    // Validar se é uma URL do Firebase Storage (segurança)
    if (!mediaUrl.includes('firebasestorage.googleapis.com')) {
      return NextResponse.json(
        { error: 'Apenas URLs do Firebase Storage são permitidas' },
        { status: 403 }
      );
    }

    console.log('🔄 [MEDIA PROXY] Fazendo proxy da mídia:', mediaUrl.substring(0, 100) + '...');

    // Fazer a requisição da mídia
    // Adicionar timeout para evitar pendurar durante compilação/dev
    const controller = new AbortController();
    const TIMEOUT_MS = 30000; // 30s para mídia (maior que imagens)
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'CRM-C4-MediaProxy/1.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow'
    }).finally(() => clearTimeout(timeoutId));

    // Verificar se a requisição foi bem-sucedida
    if (!mediaResponse.ok) {
      console.error('❌ [MEDIA PROXY] Erro ao buscar mídia:', mediaResponse.status, mediaResponse.statusText);
      return NextResponse.json(
        { error: `Erro ao buscar mídia: ${mediaResponse.status} ${mediaResponse.statusText}` },
        { status: mediaResponse.status }
      );
    }

    // Obter os dados da mídia
    const mediaBuffer = await mediaResponse.arrayBuffer();
    
    // Obter o tipo de conteúdo da resposta
    const originalContentType = mediaResponse.headers.get('content-type') || '';
    
    // Detectar tipo de arquivo pelos magic numbers se necessário
    const detectedContentType = detectFileType(new Uint8Array(mediaBuffer)) || originalContentType;
    
    // Usar o tipo detectado ou o original
    const finalContentType = detectedContentType || originalContentType || 'application/octet-stream';
    
    console.log('✅ [MEDIA PROXY] Mídia processada com sucesso:', {
      url: mediaUrl.substring(0, 100) + '...',
      originalContentType,
      detectedContentType,
      finalContentType,
      size: mediaBuffer.byteLength,
      processingTime: Date.now() - startTime + 'ms'
    });

    // Retornar a mídia com headers CORS apropriados
    return new NextResponse(mediaBuffer, {
      status: 200,
      headers: {
        'Content-Type': finalContentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
        'Content-Length': mediaBuffer.byteLength.toString(),
        // Headers específicos para mídia
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error: any) {
    console.error('❌ [MEDIA PROXY] Erro interno:', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime + 'ms'
    });
    
    // Verificar se foi timeout
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Timeout ao buscar mídia' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Detecta o tipo de arquivo pelos magic numbers (bytes iniciais)
 */
function detectFileType(buffer: Uint8Array): string | null {
  if (buffer.length < 12) return null;
  
  // Converter primeiros bytes para hex para comparação
  const hex = Array.from(buffer.slice(0, 12))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Magic numbers para diferentes tipos de arquivo
  
  // Vídeos
  if (hex.startsWith('000000') && (hex.includes('667479704d503431') || hex.includes('667479704d503432'))) {
    return 'video/mp4';
  }
  if (hex.startsWith('1a45dfa3')) {
    return 'video/webm';
  }
  if (hex.startsWith('52494646') && hex.includes('41564920')) {
    return 'video/avi';
  }
  
  // Áudios
  if (hex.startsWith('fffb') || hex.startsWith('fff3') || hex.startsWith('fff2')) {
    return 'audio/mpeg'; // MP3
  }
  if (hex.startsWith('52494646') && hex.includes('57415645')) {
    return 'audio/wav';
  }
  if (hex.startsWith('4f676753')) {
    return 'audio/ogg';
  }
  if (hex.startsWith('000000') && hex.includes('667479704d344120')) {
    return 'audio/m4a';
  }
  
  // Imagens (para compatibilidade)
  if (hex.startsWith('ffd8ff')) {
    return 'image/jpeg';
  }
  if (hex.startsWith('89504e47')) {
    return 'image/png';
  }
  if (hex.startsWith('47494638')) {
    return 'image/gif';
  }
  if (hex.startsWith('52494646') && hex.includes('57454250')) {
    return 'image/webp'; // Também usado para stickers
  }
  
  // Documentos
  if (hex.startsWith('25504446')) {
    return 'application/pdf';
  }
  if (hex.startsWith('504b0304')) {
    return 'application/zip';
  }
  
  return null;
}

// Suporte para OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}