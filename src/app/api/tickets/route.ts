import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/services/firebase-service';
import { RedisService } from '@/services/redis-service';

// Instância do Redis para cache
const redisService = RedisService.getInstance();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Instance name is required' },
        { status: 400 }
      );
    }

    // Chave de cache principal
    const cacheKey = `api:tickets:${instanceName}`;
    const cacheStatsKey = `api:tickets:${instanceName}:stats`;
    
    let tickets;
    let cacheHit = false;
    
    // Verificar cache primeiro (a menos que seja refresh forçado)
    if (!forceRefresh) {
      tickets = await redisService.getTickets(instanceName);
      if (tickets) {
        cacheHit = true;
        console.log(`🚀 Cache HIT para tickets da instância ${instanceName} - ${tickets.length} tickets`);
        
        // Atualizar estatísticas de cache
        await redisService.incrementCacheStats(cacheStatsKey, 'hits');
        
        const responseTime = Date.now() - startTime;
        return NextResponse.json({ 
          tickets,
          meta: {
            cached: true,
            responseTime: `${responseTime}ms`,
            source: 'redis-cache'
          }
        });
      }
    }

    // Cache miss - buscar do Firestore
    console.log(`💾 Cache MISS para tickets da instância ${instanceName} - buscando do Firestore`);
    tickets = await firebaseService.getTickets(instanceName);
    
    // Armazenar no cache com TTL de 15 minutos para lista principal
    if (tickets && tickets.length > 0) {
      await redisService.setTickets(instanceName, tickets, 900);
      console.log(`📦 Cache SET para ${tickets.length} tickets da instância ${instanceName}`);
    }
    
    // Atualizar estatísticas de cache
    await redisService.incrementCacheStats(cacheStatsKey, 'misses');
    
    const responseTime = Date.now() - startTime;
    return NextResponse.json({ 
      tickets,
      meta: {
        cached: false,
        responseTime: `${responseTime}ms`,
        source: 'firestore',
        ticketCount: tickets.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching tickets:', error);
    
    // Em caso de erro, tentar cache como fallback
    try {
      const fallbackTickets = await redisService.getTickets(instanceName!);
      if (fallbackTickets) {
        console.log(`🔄 Usando cache como fallback após erro`);
        return NextResponse.json({ 
          tickets: fallbackTickets,
          meta: {
            cached: true,
            source: 'redis-fallback',
            warning: 'Dados do cache devido a erro no Firestore'
          }
        });
      }
    } catch (cacheError) {
      console.error('Erro também no cache fallback:', cacheError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}