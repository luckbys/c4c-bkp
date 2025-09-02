import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { firebaseService } from '@/services/firebase-service';

// Webhook handler for Evolution API messages.update events
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const apiKey = headersList.get('apikey');
    
    // Validate API key (optional security measure)
    if (process.env.EVOLUTION_WEBHOOK_SECRET && apiKey !== process.env.EVOLUTION_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Evolution API messages.update webhook received:', JSON.stringify(body, null, 2));

    const { instance, data } = body;
    await handleMessageUpdate(instance, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Messages update webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleMessageUpdate(instance: string, data: any) {
  try {
    // Process message update from Evolution API
    console.log(`Message update for instance ${instance}:`, JSON.stringify(data, null, 2));
    
    // Extract message information
    const message = data;
    const messageId = message.key?.id;
    const remoteJid = message.key?.remoteJid;
    const status = message.status; // Message status (sent, delivered, read, etc.)
    const messageTimestamp = message.messageTimestamp;
    
    console.log(`Updating message ${messageId} from ${remoteJid} with status: ${status}`);
    
    // Update message status in Firebase
    if (messageId && remoteJid) {
      const updateData = {
        status: status || 'updated',
        updatedAt: Date.now(),
        rawUpdateData: message
      };
      
      // Try to update existing message
      try {
        await firebaseService.updateMessageStatus(messageId, updateData);
        console.log(`Message ${messageId} status updated to ${status}`);
      } catch (updateError) {
        console.log(`Message ${messageId} not found for update, creating new record`);
        
        // Verificar se a mensagem já existe antes de criar
        const existingMessage = await firebaseService.getMessageById(messageId);
        if (existingMessage) {
          console.log(`Message ${messageId} already exists, updating status only`);
          await firebaseService.updateMessageStatus(messageId, status || 'updated');
        } else {
          // If message doesn't exist, create it
          const firebaseMessage = {
            id: messageId,
            remoteJid,
            fromMe: message.key?.fromMe || false,
            messageType: message.messageType || 'unknown',
            content: message.message || {},
            timestamp: messageTimestamp || Date.now(),
            pushName: message.pushName || '',
            participant: message.key?.participant || '',
            instanceName: instance,
            status: status || 'updated',
            rawData: message
          };
          
          await firebaseService.saveMessage(firebaseMessage);
          console.log(`Message ${messageId} created with status ${status}`);
        }
      }
      
      // Update chat info if needed
      await firebaseService.updateChatInfo({
        remoteJid,
        instanceName: instance,
        lastMessageTime: messageTimestamp || Date.now()
      });
      
      console.log(`Chat info updated for ${remoteJid}`);
    }
    
  } catch (error) {
    console.error('Error handling message update:', error);
  }
}

// GET method for webhook verification (if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Evolution API messages.update webhook endpoint is active' });
}