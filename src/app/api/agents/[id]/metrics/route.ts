import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

interface RouteParams {
  params: {
    id: string;
  };
}

interface MetricsData {
  totalInteractions: number;
  averageResponseTime: number;
  successRate: number;
  totalTokensUsed: number;
  errorCount: number;
  topTopics: string[];
  dailyStats: {
    date: string;
    interactions: number;
    successRate: number;
    averageResponseTime: number;
  }[];
  hourlyDistribution: {
    hour: number;
    interactions: number;
  }[];
  recentExecutions: {
    id: string;
    input: string;
    output: string;
    executionTime: number;
    confidence: number;
    status: string;
    executedAt: Date;
  }[];
}

// GET /api/agents/[id]/metrics - Obter métricas detalhadas do agente
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.id;
    const { searchParams } = new URL(request.url);
    
    // Parâmetros de filtro
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const instanceId = searchParams.get('instanceId');
    
    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    
    console.log(`📊 [API] Buscando métricas do agente: ${agentId}`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      instanceId
    });
    
    // Buscar execuções do agente
    const executionsRef = collection(db, 'agent_executions');
    let executionsQuery = query(
      executionsRef,
      where('agentId', '==', agentId),
      where('executedAt', '>=', Timestamp.fromDate(startDate)),
      where('executedAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('executedAt', 'desc')
    );
    
    // Filtrar por instância se especificado
    if (instanceId) {
      executionsQuery = query(
        executionsRef,
        where('agentId', '==', agentId),
        where('instanceId', '==', instanceId),
        where('executedAt', '>=', Timestamp.fromDate(startDate)),
        where('executedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('executedAt', 'desc')
      );
    }
    
    const executionsSnapshot = await getDocs(executionsQuery);
    const executions = executionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      executedAt: doc.data().executedAt?.toDate() || new Date()
    }));
    
    console.log(`📊 [API] ${executions.length} execuções encontradas`);
    
    // Calcular métricas básicas
    const totalInteractions = executions.length;
    const successfulExecutions = executions.filter(exec => exec.status === 'success');
    const errorExecutions = executions.filter(exec => exec.status === 'error');
    
    const successRate = totalInteractions > 0 ? (successfulExecutions.length / totalInteractions) * 100 : 0;
    const errorCount = errorExecutions.length;
    
    const totalTokensUsed = executions.reduce((sum, exec) => sum + (exec.tokensUsed || 0), 0);
    const averageResponseTime = executions.length > 0 
      ? executions.reduce((sum, exec) => sum + (exec.executionTime || 0), 0) / executions.length 
      : 0;
    
    // Extrair tópicos das mensagens (palavras-chave mais frequentes)
    const topTopics = extractTopTopics(executions.map(exec => exec.input || ''));
    
    // Calcular estatísticas diárias
    const dailyStats = calculateDailyStats(executions, startDate, endDate);
    
    // Calcular distribuição por hora
    const hourlyDistribution = calculateHourlyDistribution(executions);
    
    // Pegar execuções recentes (últimas 10)
    const recentExecutions = executions.slice(0, 10).map(exec => ({
      id: exec.id,
      input: exec.input?.substring(0, 100) + (exec.input?.length > 100 ? '...' : '') || '',
      output: exec.output?.substring(0, 100) + (exec.output?.length > 100 ? '...' : '') || '',
      executionTime: exec.executionTime || 0,
      confidence: exec.confidence || 0,
      status: exec.status || 'unknown',
      executedAt: exec.executedAt
    }));
    
    const metricsData: MetricsData = {
      totalInteractions,
      averageResponseTime: Math.round(averageResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      totalTokensUsed,
      errorCount,
      topTopics,
      dailyStats,
      hourlyDistribution,
      recentExecutions
    };
    
    console.log(`✅ [API] Métricas calculadas:`, {
      totalInteractions,
      successRate: `${Math.round(successRate)}%`,
      averageResponseTime: `${Math.round(averageResponseTime)}ms`
    });
    
    return NextResponse.json({
      success: true,
      metrics: metricsData,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error(`❌ [API] Erro ao buscar métricas do agente ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

function extractTopTopics(inputs: string[]): string[] {
  const wordCount: Record<string, number> = {};
  
  inputs.forEach(input => {
    const words = input.toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3); // Apenas palavras com mais de 3 caracteres
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
  });
  
  // Retornar as 10 palavras mais frequentes
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

function calculateDailyStats(executions: any[], startDate: Date, endDate: Date) {
  const dailyStats: Record<string, {
    interactions: number;
    successCount: number;
    totalResponseTime: number;
  }> = {};
  
  // Inicializar todos os dias no período
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyStats[dateKey] = {
      interactions: 0,
      successCount: 0,
      totalResponseTime: 0
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Agrupar execuções por dia
  executions.forEach(exec => {
    const dateKey = exec.executedAt.toISOString().split('T')[0];
    if (dailyStats[dateKey]) {
      dailyStats[dateKey].interactions++;
      if (exec.status === 'success') {
        dailyStats[dateKey].successCount++;
      }
      dailyStats[dateKey].totalResponseTime += exec.executionTime || 0;
    }
  });
  
  // Converter para array e calcular métricas
  return Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    interactions: stats.interactions,
    successRate: stats.interactions > 0 ? (stats.successCount / stats.interactions) * 100 : 0,
    averageResponseTime: stats.interactions > 0 ? stats.totalResponseTime / stats.interactions : 0
  }));
}

function calculateHourlyDistribution(executions: any[]) {
  const hourlyCount: Record<number, number> = {};
  
  // Inicializar todas as horas
  for (let hour = 0; hour < 24; hour++) {
    hourlyCount[hour] = 0;
  }
  
  // Contar execuções por hora
  executions.forEach(exec => {
    const hour = exec.executedAt.getHours();
    hourlyCount[hour]++;
  });
  
  return Object.entries(hourlyCount).map(([hour, interactions]) => ({
    hour: parseInt(hour),
    interactions
  }));
}