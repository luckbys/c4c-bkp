import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/services/firebase-service';
import { Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    const remoteJid = searchParams.get('remoteJid');
    const limit = searchParams.get('limit');

    if (!instanceName || !remoteJid) {
      return NextResponse.json(
        { error: 'Instance name and remoteJid are required' },
        { status: 400 }
      );
    }

    const messages = await firebaseService.getMessages(
      instanceName,
      remoteJid,
      limit ? parseInt(limit) : undefined
    );
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 POST /api/messages - Iniciando processamento');
    const body = await request.json();
    console.log('📨 Body recebido:', { instanceName: body.instanceName, remoteJid: body.remoteJid, messageText: body.messageText?.substring(0, 50) });
    
    const { instanceName, remoteJid, messageText, quoted, attachments } = body;

    if (!instanceName || !remoteJid || !messageText) {
      console.log('❌ Parâmetros obrigatórios ausentes');
      return NextResponse.json(
        { error: 'Instance name, remoteJid, and messageText are required' },
        { status: 400 }
      );
    }

    console.log('📤 Chamando firebaseService.sendMessage...');
    // Enviar mensagem via Evolution API e salvar no Firebase
    await firebaseService.sendMessage(instanceName, remoteJid, messageText, quoted);
    console.log('✅ Mensagem enviada com sucesso');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}