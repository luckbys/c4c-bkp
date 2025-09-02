import { NextRequest, NextResponse } from 'next/server';
import { OptimizedServicesManager } from '@/services/optimized-services-config';
import { RedisService } from '@/services/redis-service';

/**
 * API otimizada para mensagens
 * Demonstra como usar os serviços otimizados em rotas existentes
 */

/**
 * GET /api/messages/optimized
 * Busca mensagens usando cache otimizado
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const useOptimized = searchParams.get('optimized') === 'true';
    
    if (!chatId) {
      return NextResponse.json({
        success: false,
        error: 'chatId é obrigatório'
      }, { status: 400 });
    }
    
    let messages;
    let cacheHit = false;
    let responseTime = Date.now();
    
    if (useOptimized) {
      // Usar serviço de cache otimizado
      messages = await getMessagesOptimized(chatId, page, limit);
      cacheHit = true;
    } else {
      // Usar método tradicional
      messages = await getMessagesTraditional(chatId, page, limit);
    }
    
    responseTime = Date.now() - responseTime;
    
    // Notificar clientes via WebSocket se disponível
    if (useOptimized) {
      const optimizedServices = OptimizedServicesManager.getInstance();
      const pushService = optimizedServices.getService('pushNotifications');
      if (pushService) {
        await pushService.notifyChannel(`chat:${chatId}`, {
          type: 'messages_loaded',
          data: {
            chatId,
            count: messages.length,
            page,
            cacheHit
          }
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: messages,
      meta: {
        chatId,
        page,
        limit,
        count: messages.length,
        cacheHit,
        responseTime,
        optimized: useOptimized
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * POST /api/messages/optimized
 * Cria nova mensagem usando coordenação otimizada
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, content, type = 'text', useOptimized = false } = body;
    
    if (!chatId || !content) {
      return NextResponse.json({
        success: false,
        error: 'chatId e content são obrigatórios'
      }, { status: 400 });
    }
    
    const messageData = {
      id: generateMessageId(),
      chatId,
      content,
      type,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    
    let message;
    let processingTime = Date.now();
    
    if (useOptimized) {
      // Usar coordenação otimizada
      message = await createMessageOptimized(messageData);
    } else {
      // Usar método tradicional
      message = await createMessageTraditional(messageData);
    }
    
    processingTime = Date.now() - processingTime;
    
    return NextResponse.json({
      success: true,
      data: message,
      meta: {
        processingTime,
        optimized: useOptimized
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * PUT /api/messages/optimized
 * Atualiza mensagem usando invalidação inteligente de cache
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, updates, useOptimized = false } = body;
    
    if (!messageId || !updates) {
      return NextResponse.json({
        success: false,
        error: 'messageId e updates são obrigatórios'
      }, { status: 400 });
    }
    
    let message;
    let processingTime = Date.now();
    
    if (useOptimized) {
      // Usar atualização otimizada
      message = await updateMessageOptimized(messageId, updates);
    } else {
      // Usar método tradicional
      message = await updateMessageTraditional(messageId, updates);
    }
    
    processingTime = Date.now() - processingTime;
    
    return NextResponse.json({
      success: true,
      data: message,
      meta: {
        processingTime,
        optimized: useOptimized
      }
    });
    
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * Busca mensagens usando cache otimizado
 */
async function getMessagesOptimized(chatId: string, page: number, limit: number) {
  const optimizedServices = OptimizedServicesManager.getInstance();
  const cacheService = optimizedServices.getService('cache');
  
  if (cacheService) {
    // Tentar buscar do cache otimizado
    const cacheKey = `messages:${chatId}:${page}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Se não estiver em cache, buscar do banco e cachear
    const messages = await fetchMessagesFromDatabase(chatId, page, limit);
    
    // Cachear com TTL dinâmico baseado na atividade
    const ttl = calculateMessageTTL(chatId);
    await cacheService.set(cacheKey, messages, ttl);
    
    return messages;
  }
  
  // Fallback para método tradicional
  return getMessagesTraditional(chatId, page, limit);
}

/**
 * Busca mensagens usando método tradicional
 */
async function getMessagesTraditional(chatId: string, page: number, limit: number) {
  const redisService = RedisService.getInstance();
  
  // Tentar cache tradicional
  const cacheKey = `messages:${chatId}:${page}:${limit}`;
  const cached = await redisService.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Buscar do banco
  const messages = await fetchMessagesFromDatabase(chatId, page, limit);
  
  // Cachear por 30 minutos
  await redisService.set(cacheKey, JSON.stringify(messages), 1800);
  
  return messages;
}

/**
 * Cria mensagem usando coordenação otimizada
 */
async function createMessageOptimized(messageData: any) {
  // Salvar no banco
  const message = await saveMessageToDatabase(messageData);
  
  // Usar coordenador para sincronizar cache e notificações
  const optimizedServices = OptimizedServicesManager.getInstance();
  const coordinator = optimizedServices.getService('coordinator');
  if (coordinator) {
    await coordinator.processEvent({
      type: 'message',
      action: 'created',
      data: message
    });
  }
  
  return message;
}

/**
 * Cria mensagem usando método tradicional
 */
async function createMessageTraditional(messageData: any) {
  // Salvar no banco
  const message = await saveMessageToDatabase(messageData);
  
  // Invalidar cache manualmente
  const redisService = RedisService.getInstance();
  await redisService.invalidatePattern(`messages:${messageData.chatId}:*`);
  
  return message;
}

/**
 * Atualiza mensagem usando invalidação inteligente
 */
async function updateMessageOptimized(messageId: string, updates: any) {
  // Atualizar no banco
  const message = await updateMessageInDatabase(messageId, updates);
  
  // Usar coordenador para invalidação inteligente
  const optimizedServices = OptimizedServicesManager.getInstance();
  const coordinator = optimizedServices.getService('coordinator');
  if (coordinator) {
    await coordinator.processEvent({
      type: 'message',
      action: 'updated',
      data: message
    });
  }
  
  return message;
}

/**
 * Atualiza mensagem usando método tradicional
 */
async function updateMessageTraditional(messageId: string, updates: any) {
  // Atualizar no banco
  const message = await updateMessageInDatabase(messageId, updates);
  
  // Invalidar cache manualmente
  const redisService = RedisService.getInstance();
  await redisService.invalidatePattern(`messages:${message.chatId}:*`);
  
  return message;
}

/**
 * Calcula TTL dinâmico para mensagens baseado na atividade do chat
 */
function calculateMessageTTL(chatId: string): number {
  // Lógica simplificada - em produção, seria baseada em métricas reais
  const baseTTL = 1800; // 30 minutos
  const activityMultiplier = 1; // Seria calculado baseado na atividade
  
  return Math.max(300, baseTTL * activityMultiplier); // Mínimo 5 minutos
}

/**
 * Gera ID único para mensagem
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simula busca de mensagens no banco de dados
 */
async function fetchMessagesFromDatabase(chatId: string, page: number, limit: number) {
  // Simulação - em produção, seria uma consulta real ao banco
  await new Promise(resolve => setTimeout(resolve, 100)); // Simular latência
  
  const messages = [];
  const offset = (page - 1) * limit;
  
  for (let i = 0; i < limit; i++) {
    messages.push({
      id: `msg_${chatId}_${offset + i}`,
      chatId,
      content: `Mensagem ${offset + i + 1}`,
      type: 'text',
      timestamp: new Date(Date.now() - (offset + i) * 60000).toISOString(),
      status: 'sent'
    });
  }
  
  return messages;
}

/**
 * Simula salvamento de mensagem no banco de dados
 */
async function saveMessageToDatabase(messageData: any) {
  // Simulação - em produção, seria uma inserção real no banco
  await new Promise(resolve => setTimeout(resolve, 50)); // Simular latência
  
  return {
    ...messageData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Simula atualização de mensagem no banco de dados
 */
async function updateMessageInDatabase(messageId: string, updates: any) {
  // Simulação - em produção, seria uma atualização real no banco
  await new Promise(resolve => setTimeout(resolve, 50)); // Simular latência
  
  return {
    id: messageId,
    ...updates,
    updatedAt: new Date().toISOString()
  };
}