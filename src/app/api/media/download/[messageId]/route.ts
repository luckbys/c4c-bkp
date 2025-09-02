import { NextRequest, NextResponse } from 'next/server';
import { getMediaIntegrationService } from '@/services/media-integration-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params;
    const { searchParams } = new URL(request.url);
    
    const ticketId = searchParams.get('ticketId');
    const direct = searchParams.get('direct') === 'true';
    const presigned = searchParams.get('presigned') === 'true';
    const expiry = parseInt(searchParams.get('expiry') || '3600');
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId é obrigatório' },
        { status: 400 }
      );
    }

    const integrationService = getMediaIntegrationService();
    const mediaInfo = await integrationService.getMediaInfo(messageId, ticketId || undefined);
    
    if (!mediaInfo) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }

    // Para downloads diretos, redirecionar para URL do MinIO
    if (direct) {
      return NextResponse.redirect(mediaInfo.url);
    }

    // Para URLs presignadas (mais seguras)
    if (presigned) {
      const presignedUrl = await integrationService.generateDownloadUrl(
        messageId, 
        ticketId || '', 
        expiry
      );
      
      if (!presignedUrl) {
        return NextResponse.json(
          { error: 'Erro ao gerar URL de download' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        url: presignedUrl,
        fileName: mediaInfo.fileName,
        originalName: mediaInfo.originalName,
        mimeType: mediaInfo.mimeType,
        size: mediaInfo.size,
        expiresIn: expiry
      });
    }

    // Para visualização, retornar informações do arquivo
    return NextResponse.json({
      url: mediaInfo.url,
      fileName: mediaInfo.fileName,
      originalName: mediaInfo.originalName,
      mimeType: mediaInfo.mimeType,
      size: mediaInfo.size,
      uploadedAt: mediaInfo.uploadedAt,
      category: mediaInfo.category,
      checksum: mediaInfo.checksum
    });
    
  } catch (error) {
    console.error('Erro no download de mídia:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params;
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    
    if (!messageId || !ticketId) {
      return NextResponse.json(
        { error: 'messageId e ticketId são obrigatórios' },
        { status: 400 }
      );
    }

    const integrationService = getMediaIntegrationService();
    const result = await integrationService.deleteMedia(messageId, ticketId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Arquivo deletado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar mídia:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}