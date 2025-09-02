import { NextRequest, NextResponse } from 'next/server';
import rabbitmqManager from '@/services/rabbitmq-manager';

export async function POST() {
  try {
    console.log('🚀 Inicializando RabbitMQ Manager via API...');
    
    // Inicializar o RabbitMQ Manager
    await rabbitmqManager.start();
    
    console.log('✅ RabbitMQ Manager inicializado com sucesso!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'RabbitMQ Manager inicializado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao inicializar RabbitMQ Manager:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao inicializar RabbitMQ Manager',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verificar status do RabbitMQ Manager
    const status = rabbitmqManager.getStatus();
    
    return NextResponse.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar status do RabbitMQ Manager:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}