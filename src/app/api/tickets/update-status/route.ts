import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/services/firebase-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName, ticketId, status } = body;

    if (!instanceName || !ticketId || !status) {
      return NextResponse.json(
        { error: 'Instance name, ticketId, and status are required' },
        { status: 400 }
      );
    }

    await firebaseService.updateTicketStatus(instanceName, ticketId, status);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket status' },
      { status: 500 }
    );
  }
}