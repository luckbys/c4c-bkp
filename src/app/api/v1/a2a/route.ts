import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// GET /api/v1/a2a - Listar todos os agentes disponíveis
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [A2A-LIST] Buscando lista de agentes disponíveis...');
    
    // Construir URL base dinamicamente
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:9004';
    const baseUrl = `${protocol}://${host}`;
    
    // Buscar apenas agentes ativos (sem orderBy para evitar erro de índice)
    const agentsRef = collection(db, 'agents');
    const q = query(
      agentsRef, 
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    
    const agents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        type: data.type || 'llm',
        model: data.model,
        status: data.status,
        endpoints: {
          info: `${baseUrl}/api/v1/a2a/${doc.id}`,
          execute: `${baseUrl}/api/v1/a2a/${doc.id}/execute`,
          metadata: `${baseUrl}/api/v1/a2a/${doc.id}/.well-known/agent.json`
        },
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });
    
    console.log(`✅ [A2A-LIST] Encontrados ${agents.length} agentes ativos`);
    
    return NextResponse.json({
      success: true,
      count: agents.length,
      agents: agents,
      endpoints: {
        base: `${baseUrl}/api/v1/a2a`,
        documentation: `${baseUrl}/docs/api/v1/a2a`
      }
    });
    
  } catch (error) {
    console.error('❌ [A2A-LIST] Erro ao listar agentes:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve agents list'
      },
      { status: 500 }
    );
  }
}

// OPTIONS /api/v1/a2a - Documentação da API
export async function OPTIONS(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:9004';
  const baseUrl = `${protocol}://${host}`;
  
  return NextResponse.json({
    name: 'Agent-to-Agent (A2A) API',
    version: '1.0.0',
    description: 'API para comunicação e execução de agentes de IA',
    baseUrl: `${baseUrl}/api/v1/a2a`,
    endpoints: {
      'GET /': 'Listar todos os agentes disponíveis',
      'GET /{agentId}': 'Obter informações básicas de um agente',
      'POST /{agentId}/execute': 'Executar um agente com input específico',
      'GET /{agentId}/.well-known/agent.json': 'Obter metadados completos do agente'
    },
    authentication: {
      type: 'API Key',
      header: 'x-api-key',
      description: 'Chave de API necessária para autenticação'
    },
    examples: {
      listAgents: {
        method: 'GET',
        url: `${baseUrl}/api/v1/a2a`,
        description: 'Lista todos os agentes ativos'
      },
      getAgent: {
        method: 'GET',
        url: `${baseUrl}/api/v1/a2a/{agentId}`,
        description: 'Obtém informações de um agente específico'
      },
      executeAgent: {
        method: 'POST',
        url: `${baseUrl}/api/v1/a2a/{agentId}/execute`,
        body: {
          input: 'Olá, preciso de ajuda',
          context: {
            clientName: 'João Silva',
            clientPhone: '+5511999999999',
            ticketId: 'ticket-123'
          }
        },
        description: 'Executa um agente com contexto específico'
      },
      getMetadata: {
        method: 'GET',
        url: `${baseUrl}/api/v1/a2a/{agentId}/.well-known/agent.json`,
        description: 'Obtém metadados completos do agente'
      }
    }
  });
}