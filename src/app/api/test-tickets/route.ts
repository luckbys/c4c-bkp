import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/services/firebase-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const instance = searchParams.get('instance') || 'loja';
    
    console.log(`Testing tickets fetch for instance: ${instance}`);
    
    // Buscar tickets diretamente
    const tickets = await firebaseService.getTickets(instance);
    
    console.log(`Found ${tickets.length} tickets:`, tickets.map(t => ({
      id: t.id,
      clientName: t.client.name,
      status: t.status,
      lastMessage: t.lastMessage,
      updatedAt: t.updatedAt
    })));
    
    return NextResponse.json({
      success: true,
      instance,
      ticketCount: tickets.length,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        client: ticket.client,
        status: ticket.status,
        lastMessage: ticket.lastMessage,
        updatedAt: ticket.updatedAt,
        unreadCount: ticket.unreadCount
      }))
    });
  } catch (error) {
    console.error('Error testing tickets:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}