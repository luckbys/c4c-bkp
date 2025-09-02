import { NextRequest, NextResponse } from 'next/server';
import rabbitmqManager from '@/services/rabbitmq-manager';

// Flag para controlar se já foi inicializado
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function initializeServices() {
  if (isInitialized) {
    return;
  }

  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    try {
      console.log('🚀 [STARTUP API] Inicializando RabbitMQ Manager...');
      await rabbitmqManager.start();
      console.log('✅ [STARTUP API] RabbitMQ Manager inicializado com sucesso!');
      isInitialized = true;
    } catch (error) {
      console.error('❌ [STARTUP API] Erro ao inicializar RabbitMQ Manager:', error);
      initializationPromise = null; // Reset para permitir nova tentativa
      throw error;
    }
  })();

  await initializationPromise;
}

export async function GET() {
  try {
    await initializeServices();
    
    return NextResponse.json({
      success: true,
      message: 'Serviços inicializados com sucesso',
      status: rabbitmqManager.getStatus()
    });
  } catch (error) {
    console.error('❌ [STARTUP API] Erro:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao inicializar serviços',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Forçar reinicialização
  isInitialized = false;
  initializationPromise = null;
  
  return GET();
}