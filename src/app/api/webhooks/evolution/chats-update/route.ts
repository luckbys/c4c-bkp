import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { firebaseService } from '@/services/firebase-service';

// Webhook handler for Evolution API chats.update events
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const apiKey = headersList.get('apikey');
    
    // Validate API key (optional security measure)
    if (process.env.EVOLUTION_WEBHOOK_SECRET && apiKey !== process.env.EVOLUTION_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Evolution API chats.update webhook received:', JSON.stringify(body, null, 2));

    const { instance, data } = body;
    await handleChatUpdate(instance, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chats update webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleChatUpdate(instance: string, data: any) {
  try {
    // Process chat update from Evolution API
    console.log(`Chat update for instance ${instance}:`, JSON.stringify(data, null, 2));
    
    // Extract chat information
    const chat = data;
    const remoteJid = chat.id;
    const unreadCount = chat.unreadCount || 0;
    const lastMessageTime = chat.conversationTimestamp;
    
    console.log(`Chat update for ${remoteJid}: unread count ${unreadCount}`);
    
    // Atualizar informações do chat no Firebase
    if (remoteJid) {
      await firebaseService.updateChatInfo({
        remoteJid,
        instanceName: instance,
        unreadCount,
        lastMessageTime,
        chatData: chat
      });
    }
    
    console.log(`Chat info updated in Firebase for ${remoteJid}`);
    
  } catch (error) {
    console.error('Error handling chat update:', error);
  }
}

// GET method for webhook verification (if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Evolution API chats.update webhook endpoint is active' });
}