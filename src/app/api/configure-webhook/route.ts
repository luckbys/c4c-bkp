import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/services/evolution-api';

export async function POST(request: NextRequest) {
  try {
    const { instanceName, webhookUrl } = await request.json();
    
    if (!instanceName || !webhookUrl) {
      return NextResponse.json(
        { error: 'Instance name and webhook URL are required' },
        { status: 400 }
      );
    }

    // Configure webhook in Evolution API
    await evolutionApi.configureWebhook(instanceName, webhookUrl);
    
    return NextResponse.json({ 
      success: true, 
      message: `Webhook configured for instance ${instanceName}` 
    });
  } catch (error) {
    console.error('Error configuring webhook:', error);
    return NextResponse.json(
      { error: 'Failed to configure webhook' },
      { status: 500 }
    );
  }
}