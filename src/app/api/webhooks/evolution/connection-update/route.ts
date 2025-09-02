import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { firebaseService } from '@/services/firebase-service';

// Webhook handler for Evolution API connection.update events
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const apiKey = headersList.get('apikey');
    
    // Validate API key (optional security measure)
    if (process.env.EVOLUTION_WEBHOOK_SECRET && apiKey !== process.env.EVOLUTION_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Evolution API connection.update webhook received:', JSON.stringify(body, null, 2));

    const { instance, data } = body;
    await handleConnectionUpdate(instance, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Connection update webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleConnectionUpdate(instance: string, data: any) {
  try {
    // Process connection update from Evolution API
    console.log(`Connection update for instance ${instance}:`, JSON.stringify(data, null, 2));
    
    // Extract connection information
    const { state, statusReason, wuid, profileName, profilePictureUrl } = data;
    
    console.log(`Instance ${instance} connection state: ${state} (${statusReason})`);
    
    // Update instance connection status in Firebase
    if (instance) {
      await firebaseService.updateInstanceConnection({
        instanceName: instance,
        connectionState: state,
        statusReason,
        wuid,
        profileName,
        profilePictureUrl,
        lastUpdate: new Date()
      });
    }
    
    console.log(`Instance connection info updated in Firebase for ${instance}`);
    
  } catch (error) {
    console.error('Error handling connection update:', error);
  }
}

// GET method for webhook verification (if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Evolution API connection.update webhook endpoint is active' });
}