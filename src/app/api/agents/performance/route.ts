import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';

// GET /api/agents/performance - Obter dados de performance dos agentes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const agentId = searchParams.get('agentId'); // Opcional: filtrar por agente específico
    
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

    console.log(`📈 [PERFORMANCE] Buscando dados de performance para período: ${period}`);

    // Buscar métricas de atribuição
    let assignmentQuery = query(
      collection(db, 'assignment_metrics'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'asc')
    );

    if (agentId) {
      assignmentQuery = query(
        collection(db, 'assignment_metrics'),
        where('agentId', '==', agentId),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'asc')
      );
    }

    const assignmentSnapshot = await getDocs(assignmentQuery);
    const assignmentMetrics: any[] = [];
    
    assignmentSnapshot.forEach((doc) => {
      assignmentMetrics.push({ id: doc.id, ...doc.data() });
    });

    // Buscar interações dos agentes
    let interactionsQuery = query(
      collection(db, 'agent_interactions'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'asc')
    );

    if (agentId) {
      interactionsQuery = query(
        collection(db, 'agent_interactions'),
        where('agentId', '==', agentId),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'asc')
      );
    }

    const interactionsSnapshot = await getDocs(interactionsQuery);
    const interactions: any[] = [];
    
    interactionsSnapshot.forEach((doc) => {
      interactions.push({ id: doc.id, ...doc.data() });
    });

    // Determinar número de dias para análise
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    
    // Gerar dados de performance por dia
    const performanceData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Filtrar dados do dia
      const dayAssignments = assignmentMetrics.filter(metric => {
        const metricDate = new Date(metric.timestamp.seconds * 1000);
        return metricDate >= date && metricDate < nextDate;
      });
      
      const dayInteractions = interactions.filter(interaction => {
        const interactionDate = new Date(interaction.timestamp.seconds * 1000);
        return interactionDate >= date && interactionDate < nextDate;
      });
      
      // Calcular métricas do dia
      const assignments = dayAssignments.length;
      
      const successfulInteractions = dayInteractions.filter(i => 
        i.type === 'auto_response' || i.type === 'fallback_response'
      ).length;
      
      const totalInteractions = dayInteractions.filter(i => 
        i.type === 'auto_response' || i.type === 'fallback_response' || i.type === 'error'
      ).length;
      
      const successRate = totalInteractions > 0 
        ? (successfulInteractions / totalInteractions) * 100 
        : 0;
      
      const confidenceValues = dayAssignments
        .map(a => a.confidence)
        .filter(c => typeof c === 'number');
      
      const averageConfidence = confidenceValues.length > 0
        ? (confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length) * 100
        : 0;
      
      const scoreValues = dayAssignments
        .map(a => a.score)
        .filter(s => typeof s === 'number');
      
      const averageScore = scoreValues.length > 0
        ? (scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length) * 100
        : 0;
      
      // Calcular tempo médio de resposta
      const responseTimes = dayInteractions
        .filter(i => i.metadata?.executionTime)
        .map(i => i.metadata.executionTime);
      
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;
      
      // Contar fallbacks
      const fallbackCount = dayInteractions.filter(i => i.type === 'fallback_response').length;
      const fallbackRate = totalInteractions > 0 ? (fallbackCount / totalInteractions) * 100 : 0;
      
      performanceData.push({
        date: date.toISOString().split('T')[0],
        assignments,
        successRate: parseFloat(successRate.toFixed(1)),
        averageConfidence: parseFloat(averageConfidence.toFixed(1)),
        averageScore: parseFloat(averageScore.toFixed(1)),
        averageResponseTime: parseFloat(averageResponseTime.toFixed(0)),
        fallbackRate: parseFloat(fallbackRate.toFixed(1)),
        totalInteractions
      });
    }

    // Calcular estatísticas gerais
    const totalAssignments = assignmentMetrics.length;
    const totalInteractions = interactions.length;
    
    const overallSuccessfulInteractions = interactions.filter(i => 
      i.type === 'auto_response' || i.type === 'fallback_response'
    ).length;
    
    const overallSuccessRate = totalInteractions > 0 
      ? (overallSuccessfulInteractions / totalInteractions) * 100 
      : 0;
    
    const overallConfidenceValues = assignmentMetrics
      .map(a => a.confidence)
      .filter(c => typeof c === 'number');
    
    const overallAverageConfidence = overallConfidenceValues.length > 0
      ? (overallConfidenceValues.reduce((sum, c) => sum + c, 0) / overallConfidenceValues.length) * 100
      : 0;
    
    // Performance por agente (se não filtrado por agente específico)
    let agentPerformance = [];
    if (!agentId) {
      const agentGroups = {};
      
      assignmentMetrics.forEach(metric => {
        if (!agentGroups[metric.agentId]) {
          agentGroups[metric.agentId] = {
            agentId: metric.agentId,
            agentName: metric.agentName || 'Agente IA',
            assignments: 0,
            totalScore: 0,
            totalConfidence: 0,
            interactions: []
          };
        }
        
        agentGroups[metric.agentId].assignments++;
        agentGroups[metric.agentId].totalScore += metric.score || 0;
        agentGroups[metric.agentId].totalConfidence += metric.confidence || 0;
      });
      
      interactions.forEach(interaction => {
        if (agentGroups[interaction.agentId]) {
          agentGroups[interaction.agentId].interactions.push(interaction);
        }
      });
      
      agentPerformance = Object.values(agentGroups).map((group: any) => {
        const successfulInteractions = group.interactions.filter(i => 
          i.type === 'auto_response' || i.type === 'fallback_response'
        ).length;
        
        const totalInteractions = group.interactions.filter(i => 
          i.type === 'auto_response' || i.type === 'fallback_response' || i.type === 'error'
        ).length;
        
        return {
          agentId: group.agentId,
          agentName: group.agentName,
          assignments: group.assignments,
          averageScore: group.assignments > 0 ? (group.totalScore / group.assignments) * 100 : 0,
          averageConfidence: group.assignments > 0 ? (group.totalConfidence / group.assignments) * 100 : 0,
          successRate: totalInteractions > 0 ? (successfulInteractions / totalInteractions) * 100 : 0,
          totalInteractions
        };
      }).sort((a, b) => b.assignments - a.assignments);
    }

    const result = {
      success: true,
      data: performanceData,
      summary: {
        period,
        totalAssignments,
        totalInteractions,
        overallSuccessRate: parseFloat(overallSuccessRate.toFixed(1)),
        overallAverageConfidence: parseFloat(overallAverageConfidence.toFixed(1))
      },
      agentPerformance,
      lastUpdated: new Date().toISOString()
    };

    console.log(`📈 [PERFORMANCE] Dados calculados:`, {
      dataPoints: performanceData.length,
      totalAssignments,
      overallSuccessRate: overallSuccessRate.toFixed(1)
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erro ao buscar dados de performance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        data: []
      },
      { status: 500 }
    );
  }
}

// POST /api/agents/performance - Registrar dados de performance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, metrics } = body;

    if (!agentId || !metrics) {
      return NextResponse.json(
        { error: 'agentId e metrics são obrigatórios' },
        { status: 400 }
      );
    }

    // Registrar dados de performance
    const performanceData = {
      agentId,
      metrics,
      timestamp: new Date()
    };

    await addDoc(collection(db, 'agent_performance'), performanceData);

    console.log(`📈 [PERFORMANCE] Dados de performance registrados para agente ${agentId}`);

    return NextResponse.json({
      success: true,
      message: 'Dados de performance registrados com sucesso'
    });

  } catch (error) {
    console.error('Erro ao registrar dados de performance:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}