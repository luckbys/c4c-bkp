import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc } from 'firebase/firestore';

// GET /api/agents/metrics - Obter métricas dos agentes
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

    console.log(`📊 [METRICS] Buscando métricas dos agentes para período: ${period}`);

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

    // Buscar agentes ativos
    const agentsQuery = query(
      collection(db, 'ai_agents'),
      where('status', '==', 'active')
    );

    const agentsSnapshot = await getDocs(agentsQuery);
    const agents: any[] = [];
    
    agentsSnapshot.forEach((doc) => {
      agents.push({ id: doc.id, ...doc.data() });
    });

    // Calcular métricas por agente
    const agentMetrics = agents.map(agent => {
      const agentAssignments = assignmentMetrics.filter(m => m.agentId === agent.id);
      const agentInteractions = interactions.filter(i => i.agentId === agent.id);
      
      const totalAssignments = agentAssignments.length;
      const successfulResponses = agentInteractions.filter(i => 
        i.type === 'auto_response' || i.type === 'fallback_response'
      ).length;
      
      const confidenceValues = agentAssignments
        .map(a => a.confidence)
        .filter(c => typeof c === 'number');
      
      const averageConfidence = confidenceValues.length > 0 
        ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
        : 0;

      const scoreValues = agentAssignments
        .map(a => a.score)
        .filter(s => typeof s === 'number');
      
      const averageScore = scoreValues.length > 0
        ? scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length
        : 0;

      // Calcular tempo de resposta médio (simulado)
      const responseTime = Math.random() * 2000 + 500; // 500ms a 2.5s
      
      // Contar fallbacks usados
      const fallbackUsed = agentInteractions.filter(i => i.type === 'fallback_response').length;
      
      // Última atividade
      const lastInteraction = agentInteractions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      const lastActive = lastInteraction 
        ? new Date(lastInteraction.timestamp)
        : new Date(agent.updatedAt || agent.createdAt);

      // Determinar status do agente
      const hoursSinceLastActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
      let status = 'active';
      
      if (hoursSinceLastActive > 24) {
        status = 'inactive';
      } else if (agent.status === 'maintenance') {
        status = 'maintenance';
      }

      return {
        agentId: agent.id,
        agentName: agent.name || 'Agente IA',
        totalAssignments,
        successfulResponses,
        averageConfidence,
        averageScore,
        responseTime,
        fallbackUsed,
        lastActive,
        status
      };
    });

    console.log(`📊 [METRICS] Métricas calculadas para ${agentMetrics.length} agentes`);

    return NextResponse.json({
      success: true,
      agents: agentMetrics,
      period,
      totalAgents: agents.length,
      totalAssignments: assignmentMetrics.length,
      totalInteractions: interactions.length
    });

  } catch (error) {
    console.error('Erro ao buscar métricas dos agentes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        agents: []
      },
      { status: 500 }
    );
  }
}

// POST /api/agents/metrics - Registrar nova métrica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, type, data } = body;

    if (!agentId || !type) {
      return NextResponse.json(
        { error: 'agentId e type são obrigatórios' },
        { status: 400 }
      );
    }

    // Registrar métrica
    const metricData = {
      agentId,
      type,
      data: data || {},
      timestamp: new Date()
    };

    await addDoc(collection(db, 'agent_metrics'), metricData);

    console.log(`📊 [METRICS] Nova métrica registrada para agente ${agentId}: ${type}`);

    return NextResponse.json({
      success: true,
      message: 'Métrica registrada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao registrar métrica:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}