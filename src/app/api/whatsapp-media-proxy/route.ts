import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint proxy para URLs .enc do WhatsApp
 * 
 * Este endpoint funciona como um proxy que:
 * 1. Recebe uma URL .enc do WhatsApp como parâmetro
 * 2. Tenta descriptografar usando a Evolution API
 * 3. Se falhar, retorna a URL original para o frontend tratar
 * 4. Retorna a mídia com headers CORS apropriados
 * 
 * Uso: /api/whatsapp-media-proxy?url=https://mmg.whatsapp.net/...&instance=evolution_exchange
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get('url');
    const instance = searchParams.get('instance') || 'evolution_exchange';

    // Validar se a URL foi fornecida
    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'URL da mídia é obrigatória' },
        { status: 400 }
      );
    }

    // Validar se é uma URL do WhatsApp
    if (!mediaUrl.includes('whatsapp.net')) {
      return NextResponse.json(
        { error: 'Apenas URLs do WhatsApp são permitidas' },
        { status: 403 }
      );
    }

    // Validar se a URL é válida
    try {
      new URL(mediaUrl);
    } catch (urlError) {
      console.error('❌ [WHATSAPP PROXY] URL inválida:', mediaUrl);
      return NextResponse.json(
        { error: 'URL da mídia é inválida' },
        { status: 400 }
      );
    }

    console.log('🔄 [WHATSAPP PROXY] Processando URL .enc:', {
      url: mediaUrl.substring(0, 100) + '...',
      instance,
      isEncrypted: mediaUrl.includes('.enc')
    });

    // Se não for .enc, tentar download direto
    if (!mediaUrl.includes('.enc')) {
      console.log('🔄 [WHATSAPP PROXY] URL não criptografada, fazendo download direto');
      return await downloadDirectly(mediaUrl);
    }

    // Tentar descriptografar via Evolution API
    console.log('🔓 [WHATSAPP PROXY] Tentando descriptografar via Evolution API');
    
    try {
      // Primeiro, tentar obter a mídia descriptografada
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const evolutionKey = process.env.EVOLUTION_API_KEY || 'B6D711FCDE4D4FD5936544120E713976';
      
      // Tentar diferentes endpoints da Evolution API
      const endpoints = [
        `/message/downloadMedia/${instance}`,
        `/message/getBase64FromMediaMessage/${instance}`,
        `/chat/downloadMedia/${instance}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔓 [WHATSAPP PROXY] Tentando endpoint: ${endpoint}`);
          
          const response: Response = await fetch(`${evolutionUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionKey
            },
            body: JSON.stringify({
              url: mediaUrl,
              mediaUrl: mediaUrl,
              message: {
                url: mediaUrl
              }
            }),
            signal: AbortSignal.timeout(30000) // Aumentado para 30s
          });
          
          if (response.ok) {
            const data: any = await response.json();
            console.log('✅ [WHATSAPP PROXY] Descriptografia bem-sucedida via Evolution API');
            
            // Se retornou base64, converter para buffer
            if (data.base64) {
              const buffer = Buffer.from(data.base64, 'base64');
              return new NextResponse(buffer, {
                status: 200,
                headers: {
                  'Content-Type': data.mimetype || 'audio/ogg',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type',
                  'Cache-Control': 'public, max-age=3600',
                  'Content-Length': buffer.length.toString()
                }
              });
            }
            
            // Se retornou URL descriptografada
            if (data.url && data.url !== mediaUrl) {
              console.log('🔄 [WHATSAPP PROXY] URL descriptografada obtida, fazendo download');
              return await downloadDirectly(data.url);
            }
          }
        } catch (endpointError: any) {
          console.log(`❌ [WHATSAPP PROXY] Endpoint ${endpoint} falhou:`, {
            message: endpointError.message,
            name: endpointError.name,
            code: endpointError.code,
            cause: endpointError.cause
          });
          continue;
        }
      }
      
      // Se todos os endpoints falharam, tentar download direto como fallback
      console.log('⚠️ [WHATSAPP PROXY] Evolution API falhou, tentando download direto como fallback');
      return await downloadDirectly(mediaUrl);
      
    } catch (evolutionError: any) {
      console.error('❌ [WHATSAPP PROXY] Erro na Evolution API:', evolutionError.message);
      
      // Fallback: tentar download direto
      console.log('🔄 [WHATSAPP PROXY] Fallback: tentando download direto');
      return await downloadDirectly(mediaUrl);
    }

  } catch (error: any) {
    console.error('❌ [WHATSAPP PROXY] Erro interno:', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime + 'ms'
    });
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Faz download direto de uma URL
 */
async function downloadDirectly(url: string): Promise<NextResponse> {
  try {
    console.log('📥 [WHATSAPP PROXY] Fazendo download direto:', url.substring(0, 100) + '...');
    
    const response: Response = await fetch(url, {
      headers: {
        'User-Agent': 'WhatsApp/2.23.20.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.error('❌ [WHATSAPP PROXY] Erro no download direto:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Erro ao baixar mídia: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const mediaBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Detectar se é áudio válido
    const uint8Array = new Uint8Array(mediaBuffer);
    const isValidAudio = detectAudioType(uint8Array);
    
    console.log('✅ [WHATSAPP PROXY] Download direto bem-sucedido:', {
      size: mediaBuffer.byteLength,
      contentType,
      isValidAudio
    });

    return new NextResponse(mediaBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': mediaBuffer.byteLength.toString(),
        'X-Is-Valid-Audio': isValidAudio.toString()
      }
    });

  } catch (error: any) {
    console.error('❌ [WHATSAPP PROXY] Erro no download direto:', error.message);
    return NextResponse.json(
      { error: 'Erro ao fazer download da mídia' },
      { status: 500 }
    );
  }
}

/**
 * Detecta se o buffer contém áudio válido
 */
function detectAudioType(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  
  // OGG (usado pelo WhatsApp para áudio)
  if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return true;
  }
  
  // MP3
  if ((buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) || 
      (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)) {
    return true;
  }
  
  // WAV
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45) {
    return true;
  }
  
  // M4A/AAC
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return true;
  }
  
  return false;
}

// Suporte para OPTIONS (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  console.log('🔧 [WHATSAPP PROXY] OPTIONS request received');
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    },
  });
}