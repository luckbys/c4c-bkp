import { NextRequest, NextResponse } from 'next/server';
import rabbitmqService from '@/services/rabbitmq-service';

export interface MessagePayload {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content: string;
  ticketId: string;
  contactId: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Gerar ID automaticamente se não fornecido
    const messagePayload: MessagePayload = {
      id: requestData.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: requestData.type || 'text',
      content: requestData.message || requestData.content || '',
      ticketId: requestData.ticketId || 'default',
      contactId: requestData.contactId,
      userId: requestData.userId,
      timestamp: requestData.timestamp || Date.now(),
      metadata: requestData.metadata
    };
    
    console.log('📤 Enviando mensagem via RabbitMQ API:', {
      id: messagePayload.id,
      type: messagePayload.type,
      ticketId: messagePayload.ticketId,
      contactId: messagePayload.contactId
    });

    // Verificar se o RabbitMQ está conectado
    if (!rabbitmqService.isConnected()) {
      console.log('⚠️ RabbitMQ não conectado, tentando conectar...');
      await rabbitmqService.connect();
      await rabbitmqService.setupExchangesAndQueues();
    }

    // Enviar mensagem via RabbitMQ
    await rabbitmqService.publishOutboundMessage(messagePayload);
    
    console.log('✅ Mensagem enviada via RabbitMQ com sucesso!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Mensagem enviada via RabbitMQ com sucesso',
      messageId: messagePayload.id
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via RabbitMQ API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao enviar mensagem via RabbitMQ',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verificar status do RabbitMQ
    const isConnected = rabbitmqService.isConnected();
    
    return NextResponse.json({
      success: true,
      rabbitmqConnected: isConnected,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar status do RabbitMQ:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        rabbitmqConnected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}