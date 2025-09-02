import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

// GET /api/debug-tickets - Debug tickets data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance') || 'loja';
    const limitCount = parseInt(searchParams.get('limit') || '5');

    console.log('Debugging tickets for instance:', instanceName);

    // Buscar tickets da instância
    const q = query(
      collection(db, 'tickets'),
      where('instanceName', '==', instanceName),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const tickets = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      tickets.push({
        id: doc.id,
        remoteJid: data.remoteJid,
        instanceName: data.instanceName,
        client: {
          name: data.client?.name || 'Nome não definido',
          phone: data.client?.phone || 'Telefone não definido',
          avatar: data.client?.avatar || null,
          email: data.client?.email || null
        },
        status: data.status,
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime?.toDate?.()?.toISOString() || null,
        unreadCount: data.unreadCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
      });
    }

    console.log(`Found ${tickets.length} tickets for instance ${instanceName}`);
    
    return NextResponse.json({ 
      success: true,
      instanceName,
      totalTickets: tickets.length,
      tickets
    });
  } catch (error) {
    console.error('Error debugging tickets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}