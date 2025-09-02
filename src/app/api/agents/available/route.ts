import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { AIAgentConfig, TicketContext } from '@/components/crm/types';

// POST - Obter agentes disponíveis para um ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, context } = body;
    
    if (!ticketId) {
      return NextResponse.json(
        { error: 'ticketId é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar todos os agentes ativos
    const agentsRef = collection(db, 'agents');
    const agentsQuery = query(
      agentsRef,
      where('status', '==', 'active')
    );
    
    const agentsSnapshot = await getDocs(agentsQuery);
    const agents: AIAgentConfig[] = [];
    
    agentsSnapshot.forEach((doc) => {
      const agentData = doc.data() as AIAgentConfig;
      agents.push({
        ...agentData,
        id: doc.id
      });
    });
    
    // Se contexto foi fornecido, avaliar compatibilidade
    let scoredAgents = agents;
    
    if (context) {
      scoredAgents = await scoreAgentsForContext(agents, context);
    }
    
    // Ordenar por prioridade e score
    scoredAgents.sort((a, b) => {
      const scoreA = (a as any).score || a.activationRules?.priority || 5;
      const scoreB = (b as any).score || b.activationRules?.priority || 5;
      return scoreB - scoreA;
    });
    
    return NextResponse.json({
      success: true,
      agents: scoredAgents,
      total: scoredAgents.length
    });
  } catch (error) {
    console.error('Erro ao buscar agentes disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Obter todos os agentes ativos (sem contexto)
export async function GET() {
  try {
    const agentsRef = collection(db, 'agents');
    const agentsQuery = query(
      agentsRef,
      where('status', '==', 'active')
    );
    
    const agentsSnapshot = await getDocs(agentsQuery);
    const agents: AIAgentConfig[] = [];
    
    agentsSnapshot.forEach((doc) => {
      const agentData = doc.data() as AIAgentConfig;
      agents.push({
        ...agentData,
        id: doc.id
      });
    });
    
    // Ordenar por prioridade
    agents.sort((a, b) => (b.activationRules?.priority || 5) - (a.activationRules?.priority || 5));
    
    return NextResponse.json({
      success: true,
      agents,
      total: agents.length
    });
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para avaliar compatibilidade dos agentes com o contexto
async function scoreAgentsForContext(
  agents: AIAgentConfig[],
  context: TicketContext
): Promise<(AIAgentConfig & { score: number })[]> {
  const scoredAgents = agents.map(agent => {
    let score = 0;
    
    // Avaliar condições de ativação
    const conditions = agent.activationRules?.conditions || [];
    for (const condition of conditions) {
      if (evaluateCondition(condition, context)) {
        score += 0.2;
      }
    }
    
    // Considerar prioridade do agente (normalizada para 0-1)
    const priority = agent.activationRules?.priority || 5;
    score += (priority / 10) * 0.3;
    
    // Verificar restrições de tempo
    if (isWithinTimeRestrictions(agent.activationRules?.timeRestrictions)) {
      score += 0.1;
    }
    
    // Bonus por status ativo
    if (agent.status === 'active') {
      score += 0.1;
    }
    
    return {
      ...agent,
      score: Math.min(score, 1.0)
    };
  });
  
  return scoredAgents;
}

function evaluateCondition(
  condition: any,
  context: TicketContext
): boolean {
  try {
    switch (condition.type) {
      case 'priority':
        return evaluateStringCondition(
          context.priority,
          condition.operator,
          condition.value
        );
        
      case 'message_count':
        // Assumindo que temos essa informação no contexto
        const messageCount = (context as any).messageCount || 0;
        return evaluateNumberCondition(
          messageCount,
          condition.operator,
          condition.value
        );
        
      case 'keyword':
        return evaluateStringCondition(
          context.content,
          'contains',
          condition.value
        );
        
      case 'sentiment':
        return evaluateStringCondition(
          context.clientSentiment || 'neutral',
          condition.operator,
          condition.value
        );
        
      case 'time':
        const currentHour = new Date().getHours();
        return evaluateNumberCondition(
          currentHour,
          condition.operator,
          condition.value
        );
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Erro ao avaliar condição:', error);
    return false;
  }
}

function evaluateStringCondition(
  value: string,
  operator: string,
  target: string
): boolean {
  const lowerValue = value.toLowerCase();
  const lowerTarget = target.toLowerCase();
  
  switch (operator) {
    case 'equals':
      return lowerValue === lowerTarget;
    case 'contains':
      return lowerValue.includes(lowerTarget);
    default:
      return false;
  }
}

function evaluateNumberCondition(
  value: number,
  operator: string,
  target: number
): boolean {
  switch (operator) {
    case 'equals':
      return value === target;
    case 'greater_than':
      return value > target;
    case 'less_than':
      return value < target;
    default:
      return false;
  }
}

function isWithinTimeRestrictions(
  timeRestrictions?: {
    workingHours?: { start: string; end: string; };
    weekdays?: number[];
    timezone?: string;
  }
): boolean {
  if (!timeRestrictions) {
    return true; // Sem restrições = sempre disponível
  }
  
  const now = new Date();
  
  // Verificar dias da semana
  if (timeRestrictions.weekdays && timeRestrictions.weekdays.length > 0) {
    const currentDay = now.getDay();
    if (!timeRestrictions.weekdays.includes(currentDay)) {
      return false;
    }
  }
  
  // Verificar horário de trabalho
  if (timeRestrictions.workingHours) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const [startHour, startMinute] = timeRestrictions.workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = timeRestrictions.workingHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (currentTime < startTime || currentTime > endTime) {
      return false;
    }
  }
  
  return true;
}