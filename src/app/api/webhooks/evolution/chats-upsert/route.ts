import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { firebaseService } from '@/services/firebase-service';

// Webhook handler for Evolution API chats.upsert events
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const apiKey = headersList.get('apikey');
    
    // Validate API key (optional security measure)
    if (process.env.EVOLUTION_WEBHOOK_SECRET && apiKey !== process.env.EVOLUTION_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Evolution API chats.upsert webhook received:', JSON.stringify(body, null, 2));

    const { instance, data } = body;
    await handleChatUpsert(instance, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chats upsert webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleChatUpsert(instance: string, data: any) {
  try {
    // Process chat upsert from Evolution API
    console.log(`Chat upsert for instance ${instance}:`, JSON.stringify(data, null, 2));
    
    // Extract chat information
    const chat = data;
    const remoteJid = chat.id;
    const unreadCount = chat.unreadCount || 0;
    const lastMessageTime = chat.conversationTimestamp || Date.now();
    const name = chat.name || '';
    const profilePictureUrl = chat.profilePictureUrl || '';
    const isGroup = chat.isGroup || false;
    const participants = chat.participants || [];
    
    console.log(`Processing chat upsert for ${remoteJid}: unread count ${unreadCount}, isGroup: ${isGroup}`);
    
    // Save or update chat information in Firebase
    if (remoteJid) {
      const chatData = {
        remoteJid,
        instanceName: instance,
        unreadCount,
        lastMessageTime,
        name,
        profilePictureUrl,
        isGroup,
        participants,
        updatedAt: Date.now(),
        rawData: chat
      };
      
      // Update chat info in Firebase
      await firebaseService.updateChatInfo(chatData);
      console.log(`Chat info upserted in Firebase for ${remoteJid}`);
      
      // If this is a new chat or has unread messages, we might want to create a ticket
      if (unreadCount > 0 && !isGroup) {
        try {
          // Check if there's already an open ticket for this chat
          const existingTickets = await firebaseService.getTicketsByChat(remoteJid, instance);
          const openTicket = existingTickets.find(ticket => 
            ticket.status === 'open' || ticket.status === 'pending'
          );
          
          if (!openTicket) {
            // Create a new ticket for this chat
            const newTicket = {
              id: `ticket_${remoteJid}_${Date.now()}`,
              remoteJid,
              instanceName: instance,
              contactName: name || remoteJid,
              status: 'open' as const,
              priority: 'medium' as const,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              unreadCount,
              lastMessageTime,
              assignedTo: '',
              tags: [],
              notes: `Ticket criado automaticamente para chat com ${unreadCount} mensagem(s) não lida(s)`
            };
            
            await firebaseService.saveTicket(newTicket);
            console.log(`New ticket created for chat ${remoteJid}: ${newTicket.id}`);
          } else {
            // Update existing ticket with new unread count
            await firebaseService.updateTicket(openTicket.id, {
              unreadCount,
              lastMessageTime,
              updatedAt: Date.now()
            });
            console.log(`Updated existing ticket ${openTicket.id} for chat ${remoteJid}`);
          }
        } catch (ticketError) {
          console.error('Error handling ticket for chat upsert:', ticketError);
        }
      }
    }
    
  } catch (error) {
    console.error('Error handling chat upsert:', error);
  }
}

// GET method for webhook verification (if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Evolution API chats.upsert webhook endpoint is active' });
}