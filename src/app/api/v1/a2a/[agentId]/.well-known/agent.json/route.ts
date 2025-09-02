import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface RouteParams {
  params: {
    agentId: string;
  };
}

// GET /api/v1/a2a/[agentId]/.well-known/agent.json - Obter metadados do agente
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.agentId;
    console.log(`🔍 [AGENT-METADATA] Buscando metadados do agente: ${agentId}`);
    
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
    
    // Retornar metadados do agente no formato especificado
    const agentMetadata = {
      name: agentData.name || 'Agente IA',
      description: agentData.description || `Agente criado via CRM: ${agentData.name || 'Agente IA'}`,
      url: `${baseUrl}/api/v1/a2a/${agentId}`,
      provider: {
        organization: 'Evo AI Platform',
        url: baseUrl
      },
      version: '1.0.0',
      documentationUrl: `${baseUrl}/docs`,
      capabilities: {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: false
      },
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      },
      security: [
        {
          apiKey: []
        }
      ],
      defaultInputModes: ['text/plain', 'application/json'],
      defaultOutputModes: ['text/plain', 'application/json'],
      skills: [
        {
          id: 'general-assistance',
          name: 'General AI Assistant',
          description: agentData.description || 'Provides general AI assistance and task completion',
          tags: ['assistant', 'general', 'ai', 'help'],
          examples: ['Help me with a task', 'Answer my question'],
          inputModes: ['text'],
          outputModes: ['text']
        }
      ]
    };
    
    console.log(`✅ [AGENT-METADATA] Metadados retornados para agente: ${agentId}`);
    
    return NextResponse.json(agentMetadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache por 5 minutos
      }
    });
    
  } catch (error) {
    console.error('❌ [AGENT-METADATA] Erro ao buscar metadados do agente:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve agent metadata'
      },
      { status: 500 }
    );
  }
}