import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/services/evolution-api';

export async function POST(request: NextRequest) {
  try {
    const { instanceName, remoteJid, mediaUrl, mediaType, fileName, caption, quoted } = await request.json();

    if (!instanceName || !remoteJid || !mediaUrl || !mediaType) {
      return NextResponse.json(
        { error: 'Missing required fields: instanceName, remoteJid, mediaUrl, mediaType' },
        { status: 400 }
      );
    }

    // Normalizar remoteJid
    const normalizedRemoteJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;

    console.log(`Sending ${mediaType} media via Evolution API:`, {
      instanceName,
      remoteJid: normalizedRemoteJid,
      mediaUrl,
      fileName,
      mediaType
    });

    // Determinar mimetype baseado no tipo de mídia e extensão do arquivo
    let mimetype = 'application/octet-stream';
    if (fileName) {
      const extension = fileName.toLowerCase().split('.').pop();
      switch (mediaType) {
        case 'image':
          if (extension === 'png') mimetype = 'image/png';
          else if (extension === 'jpg' || extension === 'jpeg') mimetype = 'image/jpeg';
          else if (extension === 'gif') mimetype = 'image/gif';
          else if (extension === 'webp') mimetype = 'image/webp';
          break;
        case 'video':
          if (extension === 'mp4') mimetype = 'video/mp4';
          else if (extension === 'webm') mimetype = 'video/webm';
          else if (extension === 'avi') mimetype = 'video/avi';
          else if (extension === 'mov') mimetype = 'video/mov';
          break;
        case 'audio':
          if (extension === 'ogg') mimetype = 'audio/ogg';
          else if (extension === 'mp3') mimetype = 'audio/mp3';
          else if (extension === 'wav') mimetype = 'audio/wav';
          break;
        case 'document':
          if (extension === 'pdf') mimetype = 'application/pdf';
          else if (extension === 'xml') mimetype = 'application/xml';
          else if (extension === 'txt') mimetype = 'text/plain';
          break;
      }
    }

    // Preparar dados da mensagem conforme documentação da Evolution API
    const messageData = {
      number: normalizedRemoteJid,
      mediatype: mediaType, // 'image', 'video', 'audio', 'document'
      mimetype: mimetype,
      media: mediaUrl, // URL ou base64
      fileName: fileName || `file.${mediaType}`,
      caption: caption || fileName || ''
    };

    // Adicionar mensagem citada se fornecida
    if (quoted) {
      messageData.quoted = {
        key: {
          id: quoted.id
        },
        message: {
          conversation: quoted.content
        }
      };
    }

    // Enviar via Evolution API usando o método sendMedia
    const response = await evolutionApi.sendMedia(instanceName, messageData);

    if (!response.success) {
      console.error('Evolution API error:', response.error);
      return NextResponse.json(
        { 
          error: 'Failed to send media message', 
          details: response.error 
        },
        { status: 500 }
      );
    }

    console.log('Media message sent successfully via Evolution API');
    return NextResponse.json({ 
      success: true, 
      messageId: response.data?.key?.id,
      data: response.data 
    });

  } catch (error) {
    console.error('Error in send-media API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}