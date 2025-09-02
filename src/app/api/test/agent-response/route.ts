import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/services/firebase-service';
import { geminiAgentService } from '@/services/gemini-agent-service';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { generateId } from '@/utils/id-generator';

// Endpoint de teste para verificar resposta automática de agentes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, message, remoteJid, instanceName } = body;

    console.log('🧪 [TEST-AGENT] Iniciando teste de resposta automática');
    console.log('🧪 [TEST-AGENT] Parâmetros:', { ticketId, message, remoteJid, instanceName });

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: 'ticketId e message são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar ticket diretamente no Firestore
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }
    
    const ticketData = ticketSnap.data();
    const ticket = {
      id: ticketSnap.id,
      ...ticketData
    };

    console.log('🧪 [TEST-AGENT] Ticket encontrado:', {
      id: ticket.id,
      status: ticket.status,
      hasAssignedAgent: !!ticket.assignedAgent,
      agentType: ticket.assignedAgent?.type,
      autoResponse: ticket.aiConfig?.autoResponse
    });

    // Verificar se tem agente IA atribuído
    if (!ticket.assignedAgent || ticket.assignedAgent.type !== 'ai') {
      return NextResponse.json(
        { error: 'Ticket não possui agente IA atribuído' },
        { status: 400 }
      );
    }

    if (!ticket.aiConfig?.autoResponse) {
      return NextResponse.json(
        { error: 'Resposta automática não está ativada para este ticket' },
        { status: 400 }
      );
    }

    // Simular dados da mensagem
    const messageData = {
      messageId: generateId('test'),
      remoteJid: remoteJid || ticket.clientPhone,
      instanceName: instanceName || 'test',
      messageType: 'conversation',
      messageContent: { conversation: message },
      messageTimestamp: Date.now(),
      pushName: 'Cliente Teste'
    };

    // Configurar agente
    const agentConfig = {
      id: ticket.assignedAgent.id,
      name: ticket.assignedAgent.name || 'Agente IA',
      model: 'gemini-2.5-flash',
      prompt: 'Você é um assistente de atendimento ao cliente profissional e prestativo. Responda de forma clara, objetiva e amigável às perguntas dos clientes.',
      aiConfig: ticket.aiConfig
    };

    console.log('🧪 [TEST-AGENT] Executando agente com Gemini...');

    // Buscar histórico da conversa (simulado para teste)
    const conversationHistory: string[] = [];

    // Preparar contexto da execução
    const execution = {
      input: message,
      context: {
        ticketId: ticket.id,
        clientName: messageData.pushName || 'Cliente Teste',
        clientPhone: messageData.remoteJid,
        conversationHistory,
        instanceId: messageData.instanceName,
        metadata: {
          messageType: messageData.messageType,
          timestamp: messageData.messageTimestamp,
          originalMessageId: messageData.messageId
        }
      }
    };

    // Executar agente diretamente para obter a resposta
    const agentResponse = await geminiAgentService.executeAgent(agentConfig, execution);

    console.log('🧪 [TEST-AGENT] Resposta do agente:', {
      hasResponse: !!agentResponse.response,
      responseLength: agentResponse.response?.length || 0,
      confidence: agentResponse.confidence
    });

    console.log('🧪 [TEST-AGENT] Teste concluído com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Teste de resposta automática executado com sucesso',
      response: agentResponse.response,
      confidence: agentResponse.confidence,
      executionTime: agentResponse.executionTime,
      tokensUsed: agentResponse.tokensUsed,
      ticket: {
        id: ticket.id,
        status: ticket.status,
        agent: ticket.assignedAgent,
        autoResponse: ticket.aiConfig?.autoResponse
      },
      testData: {
        messageData,
        agentConfig,
        execution
      }
    });

  } catch (error) {
    console.error('🧪 [TEST-AGENT] Erro no teste:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// GET para listar tickets com agentes IA
export async function GET() {
  try {
    console.log('🧪 [TEST-AGENT] Listando tickets com agentes IA...');

    // Buscar todos os tickets (limitado para teste)
    const tickets = await firebaseService.getAllTickets();
    
    const aiTickets = tickets.filter(ticket => 
      ticket.assignedAgent?.type === 'ai' && 
      (ticket.status === 'open' || ticket.status === 'pending')
    );

    console.log(`🧪 [TEST-AGENT] Encontrados ${aiTickets.length} tickets com agentes IA`);

    return NextResponse.json({
      success: true,
      totalTickets: tickets.length,
      aiTickets: aiTickets.length,
      tickets: aiTickets.map(ticket => ({
        id: ticket.id,
        status: ticket.status,
        clientPhone: ticket.clientPhone,
        agent: {
          id: ticket.assignedAgent?.id,
          name: ticket.assignedAgent?.name,
          type: ticket.assignedAgent?.type
        },
        aiConfig: {
          autoResponse: ticket.aiConfig?.autoResponse,
          activationMode: ticket.aiConfig?.activationMode
        },
        createdAt: ticket.createdAt
      }))
    });

  } catch (error) {
    console.error('🧪 [TEST-AGENT] Erro ao listar tickets:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}