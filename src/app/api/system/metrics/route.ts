import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';

// GET /api/system/metrics - Obter métricas do sistema
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    
    // Calcular data de início baseada no período
    const startDate = new Date();
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    console.log(`🏢 [SYSTEM-METRICS] Buscando métricas do sistema para período: ${period}`);

    // Buscar todos os tickets
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );

    const ticketsSnapshot = await getDocs(ticketsQuery);
    const tickets: any[] = [];
    
    ticketsSnapshot.forEach((doc) => {
      tickets.push({ id: doc.id, ...doc.data() });
    });

    // Buscar métricas de atribuição
    const assignmentMetricsQuery = query(
      collection(db, 'assignment_metrics'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const assignmentSnapshot = await getDocs(assignmentMetricsQuery);
    const assignmentMetrics: any[] = [];
    
    assignmentSnapshot.forEach((doc) => {
      assignmentMetrics.push({ id: doc.id, ...doc.data() });
    });

    // Buscar interações dos agentes
    const interactionsQuery = query(
      collection(db, 'agent_interactions'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const interactionsSnapshot = await getDocs(interactionsQuery);
    const interactions: any[] = [];
    
    interactionsSnapshot.forEach((doc) => {
      interactions.push({ id: doc.id, ...doc.data() });
    });

    // Calcular métricas do sistema
    const totalTickets = tickets.length;
    const autoAssignedTickets = tickets.filter(t => t.autoAssigned === true).length;
    const manualAssignedTickets = tickets.filter(t => 
      t.assignedAgent && t.autoAssigned !== true
    ).length;
    const unassignedTickets = tickets.filter(t => !t.assignedAgent).length;

    // Calcular taxa de sucesso
    const successfulInteractions = interactions.filter(i => 
      i.type === 'auto_response' || i.type === 'fallback_response'
    ).length;
    const totalInteractions = interactions.filter(i => 
      i.type === 'auto_response' || i.type === 'fallback_response' || i.type === 'error'
    ).length;
    const successRate = totalInteractions > 0 
      ? (successfulInteractions / totalInteractions) * 100 
      : 0;

    // Calcular tempo médio de resposta (simulado baseado em dados reais)
    const responseTimes = interactions
      .filter(i => i.metadata?.executionTime)
      .map(i => i.metadata.executionTime);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 1500; // Padrão de 1.5s

    // Calcular taxa de fallback
    const fallbackInteractions = interactions.filter(i => i.type === 'fallback_response').length;
    const fallbackRate = totalInteractions > 0
      ? (fallbackInteractions / totalInteractions) * 100
      : 0;

    // Métricas por categoria
    const categoryMetrics = {};
    assignmentMetrics.forEach(metric => {
      const category = metric.category || 'geral';
      if (!categoryMetrics[category]) {
        categoryMetrics[category] = {
          assignments: 0,
          averageScore: 0,
          averageConfidence: 0
        };
      }
      categoryMetrics[category].assignments++;
      categoryMetrics[category].averageScore += metric.score || 0;
      categoryMetrics[category].averageConfidence += metric.confidence || 0;
    });

    // Calcular médias por categoria
    Object.keys(categoryMetrics).forEach(category => {
      const cat = categoryMetrics[category];
      cat.averageScore = cat.assignments > 0 ? cat.averageScore / cat.assignments : 0;
      cat.averageConfidence = cat.assignments > 0 ? cat.averageConfidence / cat.assignments : 0;
    });

    // Métricas de tendência (últimos 7 dias)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayTickets = tickets.filter(t => {
        const ticketDate = new Date(t.createdAt.seconds * 1000);
        return ticketDate >= date && ticketDate < nextDate;
      });
      
      const dayInteractions = interactions.filter(i => {
        const interactionDate = new Date(i.timestamp.seconds * 1000);
        return interactionDate >= date && interactionDate < nextDate;
      });
      
      const daySuccessful = dayInteractions.filter(i => 
        i.type === 'auto_response' || i.type === 'fallback_response'
      ).length;
      
      const dayTotal = dayInteractions.filter(i => 
        i.type === 'auto_response' || i.type === 'fallback_response' || i.type === 'error'
      ).length;
      
      trendData.push({
        date: date.toISOString().split('T')[0],
        tickets: dayTickets.length,
        interactions: dayInteractions.length,
        successRate: dayTotal > 0 ? (daySuccessful / dayTotal) * 100 : 0
      });
    }

    const systemMetrics = {
      totalTickets,
      autoAssignedTickets,
      manualAssignedTickets,
      unassignedTickets,
      averageResponseTime,
      successRate,
      fallbackRate,
      categoryMetrics,
      trendData,
      period,
      lastUpdated: new Date().toISOString()
    };

    console.log(`🏢 [SYSTEM-METRICS] Métricas calculadas:`, {
      totalTickets,
      successRate: successRate.toFixed(1),
      fallbackRate: fallbackRate.toFixed(1)
    });

    return NextResponse.json({
      success: true,
      metrics: systemMetrics
    });

  } catch (error) {
    console.error('Erro ao buscar métricas do sistema:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        metrics: null
      },
      { status: 500 }
    );
  }
}

// POST /api/system/metrics - Registrar evento do sistema
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (!event) {
      return NextResponse.json(
        { error: 'event é obrigatório' },
        { status: 400 }
      );
    }

    // Registrar evento do sistema
    const eventData = {
      event,
      data: data || {},
      timestamp: new Date()
    };

    await addDoc(collection(db, 'system_events'), eventData);

    console.log(`🏢 [SYSTEM-METRICS] Evento registrado: ${event}`);

    return NextResponse.json({
      success: true,
      message: 'Evento registrado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao registrar evento do sistema:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}