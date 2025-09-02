import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/services/evolution-api';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/tickets/[id]/messages - Fetch messages for a specific ticket
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!instanceName) {
      return NextResponse.json(
        { error: 'Instance name is required' },
        { status: 400 }
      );
    }

    const ticketId = params.id;
    
    // Fetch messages from Evolution API
    const evolutionMessages = await evolutionApi.getChatMessages(
      instanceName,
      ticketId,
      limit
    );
    
    // Convert to our message format
    const messages = evolutionMessages.map(msg => 
      evolutionApi.convertMessage(msg)
    );

    // Sort by timestamp (oldest first)
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id]/messages - Send a message to this ticket
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json();
    const { instanceName, message } = body;

    if (!instanceName || !message) {
      return NextResponse.json(
        { error: 'Instance name and message are required' },
        { status: 400 }
      );
    }

    const ticketId = params.id;
    
    // Send message via Evolution API
    const result = await evolutionApi.sendMessage(instanceName, ticketId, message);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}