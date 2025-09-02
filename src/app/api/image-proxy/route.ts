import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint proxy para contornar problemas de CORS com imagens do Firebase Storage
 * 
 * Este endpoint funciona como um proxy que:
 * 1. Recebe uma URL de imagem como parâmetro
 * 2. Faz a requisição da imagem do servidor (sem restrições CORS)
 * 3. Retorna a imagem com headers CORS apropriados
 * 
 * Uso: /api/image-proxy?url=https://firebasestorage.googleapis.com/...
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    // Validar se a URL foi fornecida
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL da imagem é obrigatória' },
        { status: 400 }
      );
    }

    // Validar se é uma URL do Firebase Storage (segurança)
    if (!imageUrl.includes('firebasestorage.googleapis.com')) {
      return NextResponse.json(
        { error: 'Apenas URLs do Firebase Storage são permitidas' },
        { status: 403 }
      );
    }

    console.log('🔄 [IMAGE PROXY] Fazendo proxy da imagem:', imageUrl.substring(0, 100) + '...');

    // Fazer a requisição da imagem
    // Adicionar timeout para evitar pendurar durante compilação/dev
    const controller = new AbortController();
    const TIMEOUT_MS = 15000; // 15s
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'CRM-C4-ImageProxy/1.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow'
    }).finally(() => clearTimeout(timeoutId));

    // Verificar se a requisição foi bem-sucedida
    if (!imageResponse.ok) {
      console.error('❌ [IMAGE PROXY] Erro ao buscar imagem:', imageResponse.status, imageResponse.statusText);
      return NextResponse.json(
        { error: `Erro ao buscar imagem: ${imageResponse.status} ${imageResponse.statusText}` },
        { status: imageResponse.status }
      );
    }

    // Obter os dados da imagem primeiro
    // Usar streaming para reduzir memória e começar a responder mais cedo
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Obter o tipo de conteúdo da resposta
    const originalContentType = imageResponse.headers.get('content-type') || '';
    
    // Detectar tipo de arquivo pelos bytes iniciais (magic numbers)
    const detectFileType = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer.slice(0, 16)); // Aumentado para 16 bytes
      
      // JPEG
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return 'image/jpeg';
      }
      
      // PNG
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
          bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
        return 'image/png';
      }
      
      // GIF87a ou GIF89a
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
          bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
        return 'image/gif';
      }
      
      // WebP
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return 'image/webp';
      }
      
      // BMP
      if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
        return 'image/bmp';
      }
      
      // TIFF (Little Endian)
      if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) {
        return 'image/tiff';
      }
      
      // TIFF (Big Endian)
      if (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A) {
        return 'image/tiff';
      }
      
      // MP3
      if ((bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) || // MPEG frame sync
          (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)) { // ID3 tag
        return 'audio/mpeg';
      }
      
      // WAV
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
        return 'audio/wav';
      }
      
      // OGG
      if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
        return 'audio/ogg';
      }
      
      // MP4/M4A
      if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        // Verificar se é áudio ou vídeo pelo subtipo
        const subtype = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
        if (subtype === 'M4A ' || subtype === 'mp41' || subtype === 'mp42') {
          return bytes[8] === 0x4D ? 'audio/mp4' : 'video/mp4';
        }
        return 'video/mp4';
      }
      
      // PDF
      if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return 'application/pdf';
      }
      
      // ZIP (pode ser DOCX, XLSX, etc.)
      if (bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
        return 'application/zip';
      }
      
      console.log('🔍 [IMAGE PROXY] Bytes não reconhecidos:', Array.from(bytes.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      return 'image/jpeg'; // Default para JPEG (assumindo que é imagem)
    };
    
    // Determinar o Content-Type correto
    let contentType: string;
    if (originalContentType && originalContentType.startsWith('image/')) {
      contentType = originalContentType;
    } else if (originalContentType === 'application/octet-stream' || !originalContentType || originalContentType === 'binary/octet-stream') {
      // Firebase Storage às vezes retorna application/octet-stream para arquivos
      contentType = detectFileType(imageBuffer);
      console.log('🔍 [IMAGE PROXY] Detectado tipo de arquivo pelos bytes:', contentType);
    } else {
      // Aceitar outros tipos de conteúdo também
      contentType = originalContentType;
      console.log('🔍 [IMAGE PROXY] Usando Content-Type original:', contentType);
    }

    console.log('✅ [IMAGE PROXY] Arquivo carregado com sucesso:', {
      url: imageUrl.substring(0, 100) + '...',
      originalContentType,
      detectedContentType: contentType,
      size: imageBuffer.byteLength,
      durationMs: Date.now() - startTime
    });

    // Retornar a imagem com headers CORS apropriados
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });

  } catch (error: any) {
    const isAbort = error?.name === 'AbortError' || /aborted|timeout/i.test(error?.message || '');
    console.error('❌ [IMAGE PROXY] Erro interno:', {
      message: error instanceof Error ? error.message : String(error),
      isAbort,
      durationMs: Date.now() - startTime
    });
    
    const status = isAbort ? 504 : 500;
    const msg = isAbort ? 'Timeout ao buscar imagem do Storage' : 'Erro interno do servidor ao processar imagem';

    return NextResponse.json(
      { 
        error: msg,
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status }
    );
  }
}

// Suporte para requisições OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 horas
    },
  });
}