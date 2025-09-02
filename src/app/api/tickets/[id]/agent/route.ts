import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import type { AIAgentConfig, Ticket } from '@/components/crm/types';

// GET - Obter agente atual do ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    
    // Buscar ticket no Firestore
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }
    
    const ticket = ticketSnap.data() as Ticket;
    
    return NextResponse.json({
      success: true,
      agent: ticket.assignedAgent || null,
      aiConfig: ticket.aiConfig || null
    });
  } catch (error) {
    console.error('Erro ao buscar agente do ticket:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Atribuir agente IA ao ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    console.log(`🎯 [AGENT-ASSIGN] Iniciando atribuição de agente para ticket: ${ticketId}`);
    
    const body = await request.json();
    const { agentId, activationMode = 'immediate', autoResponse = true } = body;
    
    console.log(`🎯 [AGENT-ASSIGN] Dados recebidos:`, { agentId, activationMode, autoResponse });
    
    if (!agentId) {
      console.error(`❌ [AGENT-ASSIGN] agentId não fornecido`);
      return NextResponse.json(
        { error: 'agentId é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar configuração do agente
    console.log(`🔍 [AGENT-ASSIGN] Buscando configuração do agente: ${agentId}`);
    const agentConfig = await getAIAgentConfig(agentId);
    if (!agentConfig) {
      console.error(`❌ [AGENT-ASSIGN] Agente não encontrado: ${agentId}`);
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`✅ [AGENT-ASSIGN] Agente encontrado:`, {
      id: agentConfig.id,
      name: agentConfig.name,
      hasBehavior: !!agentConfig.behavior,
      hasEvoAiId: !!agentConfig.evoAiAgentId
    });
    
    // Buscar ticket atual
    console.log(`🔍 [AGENT-ASSIGN] Buscando ticket: ${ticketId}`);
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      console.error(`❌ [AGENT-ASSIGN] Ticket não encontrado: ${ticketId}`);
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`✅ [AGENT-ASSIGN] Ticket encontrado, preparando dados de atualização`);
    
    // Valores padrão seguros para propriedades que podem não existir
    const behaviorConfig = agentConfig.behavior || {};
    const maxInteractions = behaviorConfig.maxInteractionsPerTicket || 10;
    const autoEscalation = behaviorConfig.autoEscalation || true;
    
    // Atualizar ticket com agente IA
    const updateData = {
      assignedAgent: {
        type: 'ai' as const,
        id: agentId,
        name: agentConfig.name || 'Agente IA',
        evoAiAgentId: agentConfig.evoAiAgentId || null
      },
      aiConfig: {
        activationMode,
        autoResponse,
        activationTrigger: {
          keywords: [],
          delay: 0,
          conditions: []
        },
        escalationRules: {
          maxInteractions,
          escalateToHuman: autoEscalation,
          escalationConditions: []
        }
      },
      updatedAt: new Date()
    };
    
    console.log(`💾 [AGENT-ASSIGN] Atualizando ticket com dados:`, updateData);
    await updateDoc(ticketRef, updateData);
    
    // Registrar interação de ativação
    console.log(`📝 [AGENT-ASSIGN] Registrando interação de ativação`);
    await logAgentInteraction(ticketId, agentId, {
      type: 'activation',
      content: `Agente ${agentConfig.name || 'IA'} atribuído ao ticket`,
      confidence: 1.0,
      metadata: { activationMode, autoResponse }
    });
    
    // Ativar agente se necessário
    if (activationMode === 'immediate') {
      console.log(`🚀 [AGENT-ASSIGN] Ativando agente imediatamente`);
      await activateAgentForTicket(ticketId, agentConfig);
    }
    
    console.log(`✅ [AGENT-ASSIGN] Agente atribuído com sucesso`);
    return NextResponse.json({
      success: true,
      message: 'Agente atribuído com sucesso',
      agent: updateData.assignedAgent
    });
  } catch (error) {
    console.error('❌ [AGENT-ASSIGN] Erro ao atribuir agente:', error);
    console.error('❌ [AGENT-ASSIGN] Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configuração do agente no ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const body = await request.json();
    const { aiConfig } = body;
    
    if (!aiConfig) {
      return NextResponse.json(
        { error: 'aiConfig é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar ticket atual
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }
    
    const ticket = ticketSnap.data() as Ticket;
    
    if (!ticket.assignedAgent || ticket.assignedAgent.type !== 'ai') {
      return NextResponse.json(
        { error: 'Ticket não possui agente IA atribuído' },
        { status: 400 }
      );
    }
    
    // Atualizar configuração
    await updateDoc(ticketRef, {
      aiConfig: {
        ...ticket.aiConfig,
        ...aiConfig
      },
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Configuração do agente atualizada'
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração do agente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Remover agente do ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    
    // Buscar ticket atual
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }
    
    const ticket = ticketSnap.data() as Ticket;
    
    if (!ticket.assignedAgent) {
      return NextResponse.json(
        { error: 'Ticket não possui agente atribuído' },
        { status: 400 }
      );
    }
    
    // Registrar handoff se era agente IA
    if (ticket.assignedAgent.type === 'ai') {
      await logAgentInteraction(ticketId, ticket.assignedAgent.id, {
        type: 'handoff',
        content: `Agente ${ticket.assignedAgent.name} removido do ticket`,
        confidence: 1.0,
        metadata: { reason: 'manual_removal' }
      });
    }
    
    // Remover agente e configuração IA
    await updateDoc(ticketRef, {
      assignedAgent: null,
      aiConfig: null,
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Agente removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover agente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Funções auxiliares
async function getAIAgentConfig(agentId: string): Promise<AIAgentConfig | null> {
  try {
    console.log(`🔍 [GET-AGENT-CONFIG] Buscando agente no Firestore: ${agentId}`);
    
    // Buscar no Firestore (coleção agents)
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    if (!agentSnap.exists()) {
      console.log(`⚠️ [GET-AGENT-CONFIG] Agente não encontrado no Firestore: ${agentId}`);
      return null;
    }
    
    const rawData = agentSnap.data();
    console.log(`📄 [GET-AGENT-CONFIG] Dados brutos do agente:`, rawData);
    
    // Criar configuração com valores padrão seguros
    const agentConfig: AIAgentConfig = {
      id: agentId,
      name: rawData.name || 'Agente IA',
      description: rawData.description || '',
      evoAiAgentId: rawData.evoAiAgentId || null,
      status: rawData.status || 'active',
      
      // Configurações de ativação com valores padrão
      activationRules: {
        priority: rawData.activationRules?.priority || 5,
        conditions: rawData.activationRules?.conditions || [],
        timeRestrictions: rawData.activationRules?.timeRestrictions || undefined
      },
      
      // Configurações de comportamento com valores padrão
      behavior: {
        maxInteractionsPerTicket: rawData.behavior?.maxInteractionsPerTicket || 10,
        autoEscalation: rawData.behavior?.autoEscalation !== false, // default true
        escalationThreshold: rawData.behavior?.escalationThreshold || 0.5,
        responseDelay: rawData.behavior?.responseDelay || 0
      },
      
      // Configurações do modelo com valores padrão
      modelConfig: {
        temperature: rawData.modelConfig?.temperature || 0.7,
        maxTokens: rawData.modelConfig?.maxTokens || 1000,
        systemPrompt: rawData.modelConfig?.systemPrompt || '',
        tools: rawData.modelConfig?.tools || []
      },
      
      createdAt: rawData.createdAt || new Date(),
      updatedAt: rawData.updatedAt || new Date()
    };
    
    console.log(`✅ [GET-AGENT-CONFIG] Configuração processada:`, {
      id: agentConfig.id,
      name: agentConfig.name,
      status: agentConfig.status,
      priority: agentConfig.activationRules.priority,
      maxInteractions: agentConfig.behavior.maxInteractionsPerTicket
    });
    
    return agentConfig;
  } catch (error) {
    console.error('❌ [GET-AGENT-CONFIG] Erro ao buscar configuração do agente:', error);
    console.error('❌ [GET-AGENT-CONFIG] Stack trace:', error.stack);
    return null;
  }
}

async function logAgentInteraction(
  ticketId: string,
  agentId: string,
  interaction: {
    type: 'activation' | 'response' | 'escalation' | 'handoff';
    content?: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }
) {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      return;
    }
    
    const ticket = ticketSnap.data() as Ticket;
    const agentInteractions = ticket.agentInteractions || [];
    
    const newInteraction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      timestamp: new Date(),
      ...interaction
    };
    
    agentInteractions.push(newInteraction);
    
    await updateDoc(ticketRef, {
      agentInteractions,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao registrar interação do agente:', error);
  }
}

async function activateAgentForTicket(
  ticketId: string,
  agentConfig: AIAgentConfig
) {
  try {
    // Aqui seria a integração com o Evo AI
    // Por enquanto, apenas registramos a ativação
    console.log(`🤖 Ativando agente ${agentConfig.name} para ticket ${ticketId}`);
    
    // TODO: Implementar chamada para Evo AI
    // const response = await fetch(`${process.env.EVO_AI_URL}/api/agents/${agentConfig.evoAiAgentId}/activate`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.EVO_AI_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ ticketId, context: {} })
    // });
    
    await logAgentInteraction(ticketId, agentConfig.id, {
      type: 'activation',
      content: `Agente ${agentConfig.name} ativado automaticamente`,
      confidence: 1.0,
      metadata: { activationMode: 'immediate' }
    });
  } catch (error) {
    console.error('Erro ao ativar agente:', error);
  }
}