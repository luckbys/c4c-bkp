import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// import { evoAiService } from '@/services/evo-ai-service'; // Temporariamente desabilitado

interface RouteParams {
  params: {
    agentId: string;
  };
}

interface ExecuteRequest {
  input: string;
  context?: {
    ticketId?: string;
    clientName?: string;
    clientPhone?: string;
    conversationHistory?: string[];
    instanceId?: string;
    metadata?: Record<string, any>;
  };
}

// GET /api/v1/a2a/[agentId] - Obter informações básicas do agente
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.agentId;
    console.log(`🔍 [A2A-GET] Buscando agente: ${agentId}`);
    
    // Buscar agente no Firestore
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    if (!agentSnap.exists()) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: `Agent with ID ${agentId} does not exist`
        },
        { status: 404 }
      );
    }
    
    const agentData = agentSnap.data();
    
    // Construir URL base dinamicamente
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:9004';
    const baseUrl = `${protocol}://${host}`;
    
    // Retornar informações básicas do agente
    const agentInfo = {
      id: agentId,
      name: agentData.name,
      description: agentData.description,
      status: agentData.status,
      type: agentData.type || 'llm',
      model: agentData.model,
      endpoints: {
        execute: `${baseUrl}/api/v1/a2a/${agentId}/execute`,
        metadata: `${baseUrl}/api/v1/a2a/${agentId}/.well-known/agent.json`
      },
      createdAt: agentData.createdAt,
      updatedAt: agentData.updatedAt
    };
    
    console.log(`✅ [A2A-GET] Informações retornadas para agente: ${agentId}`);
    
    return NextResponse.json(agentInfo);
    
  } catch (error) {
    console.error('❌ [A2A-GET] Erro ao buscar agente:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve agent information'
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/a2a/[agentId]/execute - Executar agente
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.agentId;
    const body: ExecuteRequest = await request.json();
    
    console.log(`🚀 [A2A-EXECUTE] Executando agente: ${agentId}`, {
      input: body.input?.substring(0, 100) + '...',
      hasContext: !!body.context
    });
    
    // Validar dados obrigatórios
    if (!body.input || body.input.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Bad request',
          message: 'Input is required'
        },
        { status: 400 }
      );
    }
    
    // Buscar agente no Firestore
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    if (!agentSnap.exists()) {
      return NextResponse.json(
        {
          error: 'Agent not found',
          message: `Agent with ID ${agentId} does not exist`
        },
        { status: 404 }
      );
    }
    
    const agentData = agentSnap.data();
    
    // Verificar se o agente está ativo
    if (agentData.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Agent unavailable',
          message: `Agent is currently ${agentData.status}`
        },
        { status: 503 }
      );
    }
    
    // Preparar contexto da execução
    const execution = {
      input: body.input,
      context: {
        ticketId: body.context?.ticketId || 'direct-api-call',
        clientName: body.context?.clientName || 'API User',
        clientPhone: body.context?.clientPhone || 'unknown',
        conversationHistory: body.context?.conversationHistory || [],
        instanceId: body.context?.instanceId || 'api',
        metadata: {
          ...body.context?.metadata,
          apiCall: true,
          timestamp: new Date().toISOString(),
          agentId: agentId
        }
      }
    };
    
    // Evo AI temporariamente desabilitado - retornando resposta de fallback
    // const executeAgentId = agentData.evoAiAgentId || agentId;
    // const response = await evoAiService.executeAgent(executeAgentId, execution);
    
    // Resposta de fallback enquanto Evo AI está desabilitado
    const response = {
      response: `Olá! Sou o agente ${agentData.name}. Atualmente estou em modo de manutenção (Evo AI desabilitado). Em breve estarei funcionando apenas com Gemini. Sua mensagem foi: "${body.input}"`,
      confidence: 0.8,
      executionTime: 100,
      tokensUsed: 50,
      shouldContinue: true,
      metadata: {
        fallbackMode: true,
        reason: 'Evo AI temporarily disabled'
      }
    };
    
    console.log(`✅ [A2A-EXECUTE] Agente executado com sucesso:`, {
      agentId,
      confidence: response.confidence,
      executionTime: response.executionTime,
      tokensUsed: response.tokensUsed
    });
    
    // Retornar resposta no formato padrão
    return NextResponse.json({
      success: true,
      response: response.response,
      confidence: response.confidence,
      executionTime: response.executionTime,
      tokensUsed: response.tokensUsed,
      shouldContinue: response.shouldContinue,
      metadata: response.metadata,
      agent: {
        id: agentId,
        name: agentData.name,
        model: agentData.model
      }
    });
    
  } catch (error) {
    console.error('❌ [A2A-EXECUTE] Erro ao executar agente:', error);
    return NextResponse.json(
      {
        error: 'Execution failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      },
      { status: 500 }
    );
  }
}