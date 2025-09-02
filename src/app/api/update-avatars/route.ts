import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/services/firebase-service';
import { evolutionApi } from '@/services/evolution-api';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

// POST /api/update-avatars - Update avatars for existing tickets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName } = body;

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Missing required parameter: instanceName' },
        { status: 400 }
      );
    }

    console.log('Starting avatar update for instance:', instanceName);

    // Buscar todos os tickets da instância que não possuem avatar
    const q = query(
      collection(db, 'tickets'),
      where('instanceName', '==', instanceName)
    );
    
    const querySnapshot = await getDocs(q);
    let updatedCount = 0;
    let totalCount = 0;

    for (const ticketDoc of querySnapshot.docs) {
      const ticketData = ticketDoc.data();
      totalCount++;
      
      // Verificar se já tem avatar
      if (ticketData.client?.avatar) {
        console.log(`Ticket ${ticketDoc.id} already has avatar, skipping`);
        continue;
      }

      const phoneNumber = ticketData.client?.phone;
      if (!phoneNumber) {
        console.log(`Ticket ${ticketDoc.id} has no phone number, skipping`);
        continue;
      }

      try {
        // Buscar avatar do contato
        const avatarUrl = await evolutionApi.fetchProfilePictureUrl(instanceName, phoneNumber);
        
        if (avatarUrl) {
          // Atualizar o ticket com o avatar
          await updateDoc(doc(db, 'tickets', ticketDoc.id), {
            'client.avatar': avatarUrl
          });
          
          console.log(`Updated avatar for ticket ${ticketDoc.id} (${phoneNumber}): ${avatarUrl}`);
          updatedCount++;
        } else {
          console.log(`No avatar found for ${phoneNumber}`);
        }
        
        // Pequena pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error updating avatar for ticket ${ticketDoc.id}:`, error);
      }
    }

    console.log(`Avatar update completed. Updated ${updatedCount} out of ${totalCount} tickets.`);

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updatedCount} out of ${totalCount} tickets with avatars`,
      updatedCount,
      totalCount
    });
  } catch (error) {
    console.error('Error updating avatars:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update avatars',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Avatar update endpoint is active' });
}