import { NextRequest, NextResponse } from 'next/server';
import { webhookDeduplication } from '@/services/webhook-deduplication';

// Webhook handler para eventos de presence-update da Evolution API
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Log do evento recebido
    console.log('👁️ [PRESENCE-UPDATE] Evento recebido:', {
      instance: body.instance,
      event: body.event,
      data: body.data ? {
        id: body.data.id,
        presences: body.data.presences ? Object.keys(body.data.presences).length : 0
      } : null,
      timestamp: new Date().toISOString()
    });
    
    // Verificar deduplicação
    const eventHash = webhookDeduplication.generateEventHash(body);
    const isDuplicate = webhookDeduplication.isDuplicate(eventHash, 'presence-update');
    
    if (isDuplicate.isDuplicate) {
      console.log('🔄 [PRESENCE-UPDATE] Evento duplicado ignorado:', {
        hash: eventHash,
        lastSeen: isDuplicate.lastSeen,
        timeSinceLastSeen: isDuplicate.timeSinceLastSeen
      });
      
      return NextResponse.json({
        success: true,
        message: 'Evento duplicado ignorado',
        processed: false,
        hash: eventHash
      });
    }
    
    // Processar evento de presence
    if (body.data && body.data.presences) {
      const presences = body.data.presences;
      const presenceCount = Object.keys(presences).length;
      
      console.log('👁️ [PRESENCE-UPDATE] Processando presenças:', {
        instance: body.instance,
        presenceCount,
        contacts: Object.keys(presences).slice(0, 5) // Mostrar apenas os primeiros 5
      });
      
      // Aqui você pode adicionar lógica específica para processar as presenças
      // Por exemplo, atualizar status de usuários no Firebase
      
      // Para agora, apenas logamos o evento
      if (presenceCount > 0) {
        console.log('👁️ [PRESENCE-UPDATE] ✅ Evento processado com sucesso');
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Log de performance apenas se demorar mais que 100ms
    if (processingTime > 100) {
      console.log('⚡ [PRESENCE-UPDATE] Performance:', {
        processingTime: `${processingTime}ms`,
        instance: body.instance
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Presence update processado com sucesso',
      processed: true,
      processingTime,
      hash: eventHash
    });
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ [PRESENCE-UPDATE] Erro ao processar webhook:', {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        processingTime
      },
      { status: 500 }
    );
  }
}

// Método GET para verificação de saúde do endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Endpoint presence-update está funcionando',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhooks/evolution/presence-update'
  });
}