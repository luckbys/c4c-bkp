import { NextRequest, NextResponse } from 'next/server';
import { webhookMonitor } from '@/services/webhook-monitor';
import { webhookConnectivity } from '@/services/webhook-connectivity';
import { evolutionApi } from '@/services/evolution-api';

// Endpoint para gerenciamento de webhooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: webhookMonitor.getDetailedStatus(),
          timestamp: new Date().toISOString()
        });
        
      case 'connectivity':
        return NextResponse.json({
          success: true,
          data: webhookConnectivity.getAllConnectivityStats(),
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: true,
          message: 'Webhook Management API',
          availableActions: [
            'GET ?action=status - Obter status detalhado',
            'GET ?action=connectivity - Obter estatísticas de conectividade',
            'POST {"action": "check"} - Forçar verificação',
            'POST {"action": "reset"} - Reset circuit breaker',
            'POST {"action": "monitor"} - Controlar monitoramento'
          ]
        });
    }
    
  } catch (error: any) {
    console.error('❌ [WEBHOOK-MGMT] Erro no GET:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, webhookUrl, instanceName } = body;
    
    switch (action) {
      case 'check':
        if (!webhookUrl) {
          return NextResponse.json(
            { success: false, error: 'webhookUrl é obrigatório para verificação' },
            { status: 400 }
          );
        }
        
        console.log(`🔍 [WEBHOOK-MGMT] Verificação manual solicitada para: ${webhookUrl}`);
        
        const isReachable = await webhookConnectivity.checkWebhookConnectivity(webhookUrl);
        const status = webhookConnectivity.getConnectivityStatus(webhookUrl);
        
        return NextResponse.json({
          success: true,
          data: {
            webhookUrl,
            isReachable,
            status,
            timestamp: new Date().toISOString()
          }
        });
        
      case 'reset':
        if (!webhookUrl) {
          return NextResponse.json(
            { success: false, error: 'webhookUrl é obrigatório para reset' },
            { status: 400 }
          );
        }
        
        console.log(`🔄 [WEBHOOK-MGMT] Reset de circuit breaker solicitado para: ${webhookUrl}`);
        
        webhookConnectivity.resetCircuitBreaker(webhookUrl);
        
        return NextResponse.json({
          success: true,
          message: `Circuit breaker resetado para ${webhookUrl}`,
          timestamp: new Date().toISOString()
        });
        
      case 'monitor':
        const { enable } = body;
        
        if (enable === true) {
          console.log('🔍 [WEBHOOK-MGMT] Iniciando monitoramento...');
          webhookMonitor.startMonitoring();
          
          if (webhookUrl) {
            webhookMonitor.addWebhookUrl(webhookUrl);
          }
          
          return NextResponse.json({
            success: true,
            message: 'Monitoramento iniciado',
            timestamp: new Date().toISOString()
          });
          
        } else if (enable === false) {
          console.log('🔍 [WEBHOOK-MGMT] Parando monitoramento...');
          webhookMonitor.stopMonitoring();
          
          return NextResponse.json({
            success: true,
            message: 'Monitoramento parado',
            timestamp: new Date().toISOString()
          });
          
        } else {
          return NextResponse.json(
            { success: false, error: 'Parâmetro "enable" deve ser true ou false' },
            { status: 400 }
          );
        }
        
      case 'force-check':
        console.log('🔍 [WEBHOOK-MGMT] Verificação forçada solicitada...');
        
        await webhookMonitor.forceHealthCheck();
        
        return NextResponse.json({
          success: true,
          message: 'Verificação de saúde executada',
          data: webhookMonitor.getStats(),
          timestamp: new Date().toISOString()
        });
        
      case 'reconfigure':
        if (!instanceName || !webhookUrl) {
          return NextResponse.json(
            { success: false, error: 'instanceName e webhookUrl são obrigatórios para reconfiguração' },
            { status: 400 }
          );
        }
        
        console.log(`🔧 [WEBHOOK-MGMT] Reconfiguração solicitada para instância: ${instanceName}`);
        
        try {
          const result = await evolutionApi.configureWebhook(instanceName, webhookUrl);
          
          return NextResponse.json({
            success: true,
            message: `Webhook reconfigurado para instância ${instanceName}`,
            data: result,
            timestamp: new Date().toISOString()
          });
          
        } catch (error: any) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Falha na reconfiguração: ${error.message}`,
              instanceName,
              webhookUrl
            },
            { status: 500 }
          );
        }
        
      case 'validate':
        if (!webhookUrl) {
          return NextResponse.json(
            { success: false, error: 'webhookUrl é obrigatório para validação' },
            { status: 400 }
          );
        }
        
        console.log(`✅ [WEBHOOK-MGMT] Validação solicitada para: ${webhookUrl}`);
        
        const validation = await webhookConnectivity.validateWebhookBeforeConfiguration(webhookUrl);
        
        return NextResponse.json({
          success: true,
          data: {
            webhookUrl,
            validation,
            timestamp: new Date().toISOString()
          }
        });
        
      default:
        return NextResponse.json(
          { success: false, error: `Ação desconhecida: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('❌ [WEBHOOK-MGMT] Erro no POST:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Endpoint para obter logs em tempo real
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'reset-stats':
        console.log('📊 [WEBHOOK-MGMT] Reset de estatísticas solicitado...');
        
        webhookMonitor.resetStats();
        
        return NextResponse.json({
          success: true,
          message: 'Estatísticas resetadas',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json(
          { success: false, error: `Ação PUT desconhecida: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('❌ [WEBHOOK-MGMT] Erro no PUT:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}