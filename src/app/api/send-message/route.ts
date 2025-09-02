import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/services/evolution-api';

// POST /api/send-message - Send a message via Evolution API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName, remoteJid, text, messageText, quoted } = body;
    
    // Aceitar tanto 'text' quanto 'messageText' para compatibilidade
    const messageContent = text || messageText;

    console.log('Send message request:', { instanceName, remoteJid, text: messageContent, hasQuoted: !!quoted });

    if (!instanceName || !remoteJid || !messageContent) {
      return NextResponse.json(
        { error: 'Missing required parameters: instanceName, remoteJid, text/messageText' },
        { status: 400 }
      );
    }

    // Convert parameters to Evolution API format
    // Evolution API expects 'number' field, not 'remoteJid'
    const normalizedJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
    
    // Send message via Evolution API
    const result = await evolutionApi.sendMessage(instanceName, normalizedJid, messageContent, quoted);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Check if it's an Evolution API specific error
    if (error instanceof Error) {
      if (error.message.includes('EVOLUTION_NOT_FOUND')) {
        return NextResponse.json(
          { 
            error: 'EVOLUTION_API_UNAVAILABLE',
            message: 'O serviço de mensagens está temporariamente indisponível. A Evolution API não está respondendo.',
            details: 'Verifique se o serviço Evolution API está funcionando ou entre em contato com o suporte.',
            code: 'SERVICE_UNAVAILABLE'
          },
          { status: 503 }
        );
      }
      
      if (error.message.includes('EVOLUTION_TIMEOUT')) {
        return NextResponse.json(
          { 
            error: 'EVOLUTION_API_TIMEOUT',
            message: 'Timeout ao conectar com o serviço de mensagens. Tente novamente em alguns instantes.',
            details: 'A Evolution API não respondeu dentro do tempo esperado.',
            code: 'TIMEOUT'
          },
          { status: 504 }
        );
      }
      
      if (error.message.includes('EVOLUTION_NETWORK_ERROR')) {
        return NextResponse.json(
          { 
            error: 'EVOLUTION_API_NETWORK_ERROR',
            message: 'Erro de conectividade com o serviço de mensagens.',
            details: 'Verifique sua conexão de internet e tente novamente.',
            code: 'NETWORK_ERROR'
          },
          { status: 502 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'SEND_MESSAGE_FAILED',
        message: 'Falha ao enviar mensagem. Tente novamente ou entre em contato com o suporte.',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}