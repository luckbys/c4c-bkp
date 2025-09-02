import { NextRequest, NextResponse } from 'next/server';
import { getMediaIntegrationService } from '@/services/media-integration-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [UPLOAD API] Iniciando upload de mídia');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const messageId = formData.get('messageId') as string;
    const ticketId = formData.get('ticketId') as string;
    
    console.log('🔍 [UPLOAD API] Dados recebidos:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      messageId,
      ticketId
    });
    
    // Validar parâmetros obrigatórios
    if (!file || !messageId || !ticketId) {
      console.log('❌ [UPLOAD API] Parâmetros obrigatórios ausentes:', {
        hasFile: !!file,
        hasMessageId: !!messageId,
        hasTicketId: !!ticketId
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parâmetros obrigatórios ausentes. Necessário: file, messageId, ticketId' 
        },
        { status: 400 }
      );
    }

    // Validar se é um arquivo válido
    if (!file.size || file.size === 0) {
      console.log('❌ [UPLOAD API] Arquivo vazio ou inválido');
      return NextResponse.json(
        { success: false, error: 'Arquivo vazio ou inválido' },
        { status: 400 }
      );
    }
    
    console.log('✅ [UPLOAD API] Validação inicial passou');

    // Converter para buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
      console.log('✅ [UPLOAD API] Buffer criado:', { size: buffer.length });
    } catch (error) {
      console.log('❌ [UPLOAD API] Erro ao criar buffer:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao processar arquivo' },
        { status: 400 }
      );
    }
    
    // Obter metadados adicionais do request
    const additionalMetadata = {
      uploadedBy: request.headers.get('user-id') || 'anonymous',
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    // Upload e integração
    console.log('🔍 [UPLOAD API] Iniciando integração com serviços');
    
    let integrationService;
    try {
      integrationService = getMediaIntegrationService();
      console.log('✅ [UPLOAD API] Serviço de integração obtido');
    } catch (error) {
      console.log('❌ [UPLOAD API] Erro ao obter serviço de integração:', error);
      return NextResponse.json(
        { success: false, error: 'Erro interno: serviço de integração indisponível' },
        { status: 500 }
      );
    }
    
    let result;
    try {
      console.log('🔍 [UPLOAD API] Chamando uploadAndSaveReference');
      result = await integrationService.uploadAndSaveReference(
        buffer,
        file.name,
        file.type,
        messageId,
        ticketId,
        additionalMetadata
      );
      console.log('🔍 [UPLOAD API] Resultado da integração:', result);
    } catch (error) {
      console.log('❌ [UPLOAD API] Erro na integração:', error);
      return NextResponse.json(
        { success: false, error: `Erro na integração: ${error}` },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.log('❌ [UPLOAD API] Upload falhou:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Log de sucesso
    console.log('✅ [UPLOAD API] Upload realizado com sucesso:', {
      fileName: result.fileName,
      size: result.size,
      url: result.url,
      checksum: result.checksum
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      checksum: result.checksum,
      message: 'Arquivo enviado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ [UPLOAD API] Erro geral no upload de mídia:', error);
    console.error('❌ [UPLOAD API] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    // Determinar tipo de erro
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (error instanceof Error) {
      if (error.message.includes('File too large')) {
        statusCode = 413;
        errorMessage = 'Arquivo muito grande';
      } else if (error.message.includes('Invalid file type')) {
        statusCode = 415;
        errorMessage = 'Tipo de arquivo não suportado';
      } else {
        errorMessage = error.message;
      }
    }
    
    console.log('❌ [UPLOAD API] Retornando erro:', {
      statusCode,
      errorMessage,
      originalError: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' ? {
          originalError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: statusCode }
    );
  }
}

// Configuração para permitir uploads grandes (Next.js App Router)
export const maxDuration = 60; // 60 segundos
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';