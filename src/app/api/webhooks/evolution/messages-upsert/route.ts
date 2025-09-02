import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { firebaseService } from '@/services/firebase-service';
// import { evoAiService } from '@/services/evo-ai-service'; // Temporariamente desabilitado
import { agentRulesService, type TicketData } from '@/services/agent-rules-service';
import { evolutionApi } from '@/services/evolution-api';
import { geminiAgentService } from '@/services/gemini-agent-service';
import { evoAiService } from '@/services/evo-ai-service';
import { autoAssignmentService } from '@/services/auto-assignment-service';
import { intelligentAgentSelector, type MessageContext } from '@/services/intelligent-agent-selector';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';

// Webhook handler for Evolution API messages.upsert events
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const apiKey = headersList.get('apikey');
    
    // Validate API key (optional security measure)
    if (process.env.EVOLUTION_WEBHOOK_SECRET && apiKey !== process.env.EVOLUTION_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Evolution API messages.upsert webhook received:', JSON.stringify(body, null, 2));

    const { instance, data } = body;
    await handleMessageUpsert(instance, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Messages upsert webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleMessageUpsert(instance: string, data: any) {
  try {
    console.log('🚀 [WEBHOOK] === INICIANDO PROCESSAMENTO ===');
    // Process message upsert from Evolution API
    console.log(`Message upsert for instance ${instance}:`, JSON.stringify(data, null, 2));
    console.log(`🚀 [WEBHOOK] Instance: ${instance}`);
    console.log(`🚀 [WEBHOOK] MessageData type: ${typeof data}`);
    
    if (!data) {
      console.log('❌ [WEBHOOK] Dados de mensagem inválidos');
      return;
    }
    
    // Extract message information
    const message = data;
    const messageId = message.key?.id;
    const remoteJid = message.key?.remoteJid;
    const fromMe = message.key?.fromMe || false;
    const messageType = message.messageType;
    const messageContent = message.message;
    const messageTimestamp = message.messageTimestamp;
    const pushName = message.pushName;
    const participant = message.key?.participant;
    
    console.log(`Processing message ${messageId} from ${remoteJid} (fromMe: ${fromMe})`);
    
    // Save message to Firebase
    if (messageId && remoteJid) {
      // Extrair conteúdo da mensagem baseado no tipo
      let extractedContent = '';
      if (messageType === 'conversation') {
        extractedContent = messageContent.conversation || '';
      } else if (messageType === 'extendedTextMessage') {
        extractedContent = messageContent.extendedTextMessage?.text || '';
      } else if (messageType === 'imageMessage') {
        extractedContent = messageContent.imageMessage?.caption || 'Imagem';
      } else {
        extractedContent = JSON.stringify(messageContent);
      }
      
      // Mapear messageType para type válido
      const validType = (() => {
        switch (messageType) {
          case 'conversation':
          case 'extendedTextMessage':
            return 'text' as const;
          case 'imageMessage':
            return 'image' as const;
          case 'audioMessage':
          case 'pttMessage':
            return 'audio' as const;
          case 'videoMessage':
            return 'video' as const;
          case 'documentMessage':
            return 'document' as const;
          case 'stickerMessage':
            return 'sticker' as const;
          default:
            return 'text' as const;
        }
      })();

      const firebaseMessage = {
        messageId: messageId, // Usar messageId em vez de id
        remoteJid,
        content: extractedContent, // Usar conteúdo extraído como string
        sender: fromMe ? 'agent' : 'client', // Mapear corretamente o sender
        isFromMe: fromMe, // Mapear fromMe para isFromMe
        timestamp: messageTimestamp || Date.now(),
        pushName: pushName || '',
        participant: participant || '',
        instanceName: instance,
        status: 'received' as const,
        type: validType, // Usar tipo válido mapeado
        messageType, // Manter messageType para compatibilidade
        rawData: message
      };
      
      await firebaseService.saveMessage({
        ...firebaseMessage,
        sender: firebaseMessage.sender as "agent" | "client", // Cast sender to valid enum type
        status: 'sent' // Change status to valid enum value
      });
      console.log(`Message ${messageId} saved to Firebase`);
      
      // Update chat info with last message (converter timestamp para segundos se necessário)
      const validTimestamp = messageTimestamp ? 
        (messageTimestamp > 9999999999 ? Math.floor(messageTimestamp / 1000) : messageTimestamp) : 
        Math.floor(Date.now() / 1000);
      
      await firebaseService.updateChatInfo({
        remoteJid,
        instanceName: instance,
        lastMessageTime: validTimestamp
      });
      
      console.log(`Chat info updated for ${remoteJid}`);
      
      // Processar ativação de agentes apenas para mensagens recebidas (não enviadas)
      if (!fromMe && messageContent) {
        console.log(`🎯 [WEBHOOK] Processando agentes para mensagem não enviada`);
        console.log(`🎯 [WEBHOOK] - Message ID: ${messageId}`);
        console.log(`🎯 [WEBHOOK] - Remote JID: ${remoteJid}`);
        console.log(`🎯 [WEBHOOK] - From Me: ${fromMe}`);
        console.log(`🎯 [WEBHOOK] - Has Content: ${!!messageContent}`);
        
        // 1. Primeiro verificar se há ticket existente com agente IA atribuído
        console.log(`🎯 [WEBHOOK] Chamando processExistingTicketAgent...`);
        await processExistingTicketAgent({
          messageId,
          remoteJid,
          instanceName: instance,
          messageType,
          messageContent,
          messageTimestamp: messageTimestamp || Date.now(),
          pushName: pushName || ''
        });
        console.log(`🎯 [WEBHOOK] processExistingTicketAgent concluído`);
        
        // 2. Auto-atribuição automática DESABILITADA - agentes só são ativados quando atribuídos manualmente
        console.log(`🎯 [WEBHOOK] Auto-atribuição automática desabilitada - agentes só respondem quando atribuídos manualmente`);
        // await processAgentActivation({ ... }); // COMENTADO PARA DESABILITAR AUTO-ATRIBUIÇÃO
      } else {
        console.log(`🎯 [WEBHOOK] Pulando processamento de agentes:`);
        console.log(`🎯 [WEBHOOK] - From Me: ${fromMe}`);
        console.log(`🎯 [WEBHOOK] - Has Content: ${!!messageContent}`);
      }
    }
    
  } catch (error) {
    console.error('Error handling message upsert:', error);
  }
}

// Função para processar agentes IA já atribuídos a tickets existentes
async function processExistingTicketAgent(messageData: {
  messageId: string;
  remoteJid: string;
  instanceName: string;
  messageType: string;
  messageContent: any;
  messageTimestamp: number;
  pushName: string;
}) {
  try {
    console.log(`🎯 [EXISTING-AGENT] ===== INICIANDO PROCESSAMENTO =====`);
    console.log(`🎯 [EXISTING-AGENT] Verificando agente IA atribuído para ${messageData.remoteJid}`);
    console.log(`🎯 [EXISTING-AGENT] Dados da mensagem:`, {
      messageId: messageData.messageId,
      messageType: messageData.messageType,
      instanceName: messageData.instanceName,
      pushName: messageData.pushName
    });
    
    // Buscar tickets existentes para este chat
    console.log(`🎯 [EXISTING-AGENT] Buscando tickets existentes...`);
    const existingTickets = await firebaseService.getTicketsByChat(messageData.remoteJid, messageData.instanceName);
    console.log(`🎯 [EXISTING-AGENT] Tickets encontrados: ${existingTickets.length}`);
    
    if (existingTickets.length > 0) {
      existingTickets.forEach((ticket, index) => {
        console.log(`🎯 [EXISTING-AGENT] Ticket ${index + 1}:`, {
          id: ticket.id,
          status: ticket.status,
          hasAssignedAgent: !!ticket.assignedAgent,
          agentType: ticket.assignedAgent?.type,
          agentName: ticket.assignedAgent?.name,
          hasAiConfig: !!ticket.aiConfig,
          autoResponse: ticket.aiConfig?.autoResponse
        });
      });
    }
    
    // Encontrar ticket ativo (open ou pending) com agente IA atribuído
    console.log(`🎯 [EXISTING-AGENT] Procurando ticket ativo com agente IA...`);
    const activeTicket = existingTickets.find(ticket => 
      (ticket.status === 'open' || ticket.status === 'pending') &&
      ticket.assignedAgent?.type === 'ai' &&
      ticket.aiConfig?.autoResponse === true
    );
    
    console.log(`🎯 [EXISTING-AGENT] Critérios de busca:`, {
      statusValidos: ['open', 'pending'],
      tipoAgente: 'ai',
      autoResponse: true
    });
    
    if (!activeTicket) {
      console.log(`🎯 [EXISTING-AGENT] ❌ Nenhum ticket ativo com agente IA encontrado para ${messageData.remoteJid}`);
      console.log(`🎯 [EXISTING-AGENT] Motivos possíveis:`);
      console.log(`🎯 [EXISTING-AGENT] - Nenhum ticket com status 'open' ou 'pending'`);
      console.log(`🎯 [EXISTING-AGENT] - Agente não é do tipo 'ai'`);
      console.log(`🎯 [EXISTING-AGENT] - autoResponse não está ativado`);
      console.log(`🎯 [EXISTING-AGENT] ===== FIM DO PROCESSAMENTO =====`);
      return;
    }
    
    console.log(`🎯 [EXISTING-AGENT] ✅ Ticket ativo encontrado: ${activeTicket.id} com agente ${activeTicket.assignedAgent.name}`);
    console.log(`🎯 [EXISTING-AGENT] Detalhes do ticket:`, {
      ticketId: activeTicket.id,
      status: activeTicket.status,
      agentId: activeTicket.assignedAgent.id,
      agentName: activeTicket.assignedAgent.name,
      autoResponse: activeTicket.aiConfig?.autoResponse,
      activationMode: activeTicket.aiConfig?.activationMode
    });
    
    // Extrair conteúdo da mensagem
    console.log(`🎯 [EXISTING-AGENT] Extraindo conteúdo da mensagem...`);
    console.log(`🎯 [EXISTING-AGENT] Tipo da mensagem: ${messageData.messageType}`);
    console.log(`🎯 [EXISTING-AGENT] Conteúdo bruto:`, messageData.messageContent);
    
    let textContent = '';
    if (messageData.messageType === 'conversation') {
      textContent = messageData.messageContent.conversation || '';
    } else if (messageData.messageType === 'extendedTextMessage') {
      textContent = messageData.messageContent.extendedTextMessage?.text || '';
    } else if (messageData.messageType === 'imageMessage') {
      textContent = messageData.messageContent.imageMessage?.caption || '';
    }
    
    console.log(`🎯 [EXISTING-AGENT] Texto extraído: "${textContent}"`);
    
    if (!textContent.trim()) {
      console.log(`🎯 [EXISTING-AGENT] ❌ Sem texto para processar na mensagem ${messageData.messageId}`);
      console.log(`🎯 [EXISTING-AGENT] ===== FIM DO PROCESSAMENTO =====`);
      return;
    }
    
    // Processar com o agente IA atribuído usando Gemini
    console.log(`🎯 [EXISTING-AGENT] Preparando configuração do agente...`);
    const agentConfig = {
      id: activeTicket.assignedAgent.id,
      name: activeTicket.assignedAgent.name || 'Agente IA',
      model: 'gemini-2.5-flash',
      prompt: 'Você é um assistente de atendimento ao cliente profissional e prestativo. Responda de forma clara, objetiva e amigável às perguntas dos clientes.',
      aiConfig: activeTicket.aiConfig
    };
    
    console.log(`🎯 [EXISTING-AGENT] Configuração do agente:`, {
      agentId: agentConfig.id,
      agentName: agentConfig.name,
      model: agentConfig.model,
      hasPrompt: !!agentConfig.prompt,
      hasAiConfig: !!agentConfig.aiConfig
    });
    
    console.log(`🎯 [EXISTING-AGENT] Chamando geminiAgentService.processTicketMessage...`);
    
    try {
      await geminiAgentService.processTicketMessage(
        activeTicket.id,
        agentConfig,
        messageData,
        textContent
      );
      console.log(`🎯 [EXISTING-AGENT] ✅ Processamento do Gemini concluído com sucesso`);
    } catch (geminiError) {
      console.error(`🎯 [EXISTING-AGENT] ❌ Erro no processamento do Gemini:`, geminiError);
      throw geminiError;
    }
    
    console.log(`🎯 [EXISTING-AGENT] ===== FIM DO PROCESSAMENTO =====`);
    
  } catch (error: unknown) {
    console.error(`❌ [EXISTING-AGENT] Erro ao processar agente existente:`, error);
    console.error(`❌ [EXISTING-AGENT] Stack trace:`, (error as Error).stack);
    console.log(`🎯 [EXISTING-AGENT] ===== FIM DO PROCESSAMENTO (COM ERRO) =====`);
  }
}

// Função para processar ativação de agentes
async function processAgentActivation(messageData: {
  messageId: string;
  remoteJid: string;
  instanceName: string;
  messageType: string;
  messageContent: any;
  messageTimestamp: number;
  pushName: string;
}) {
  try {
    console.log(`🤖 [AGENT] Avaliando ativação de agentes para mensagem ${messageData.messageId}`);
    
    // Extrair conteúdo da mensagem baseado no tipo
    let textContent = '';
    if (messageData.messageType === 'conversation') {
      textContent = messageData.messageContent.conversation || '';
    } else if (messageData.messageType === 'extendedTextMessage') {
      textContent = messageData.messageContent.extendedTextMessage?.text || '';
    } else if (messageData.messageType === 'imageMessage') {
      textContent = messageData.messageContent.imageMessage?.caption || '';
    }
    
    // Se não há texto para processar, pular
    if (!textContent.trim()) {
      console.log(`🤖 [AGENT] Sem texto para processar na mensagem ${messageData.messageId}`);
      return;
    }

    // Tentar auto-atribuição inteligente primeiro
    await tryIntelligentAutoAssignment(messageData, textContent);
    
    // Fallback para sistema de regras tradicional se auto-atribuição falhar
    await fallbackToRulesSystem(messageData, textContent);
    
  } catch (error) {
    console.error(`❌ [AGENT] Erro ao processar ativação de agentes:`, error);
  }
}

// Função para tentar auto-atribuição inteligente
async function tryIntelligentAutoAssignment(messageData: any, textContent: string) {
  try {
    console.log(`🧠 [INTELLIGENT] Tentando auto-atribuição inteligente...`);
    
    // Preparar contexto da mensagem
    const messageContext: MessageContext = {
      content: textContent,
      messageType: messageData.messageType,
      clientPhone: messageData.remoteJid,
      instanceId: messageData.instanceName,
      timestamp: new Date(messageData.messageTimestamp),
      conversationHistory: [],
      clientName: messageData.pushName || ''
    };
    
    // Buscar histórico da conversa
    const conversationHistory = await getConversationHistory(
      messageData.remoteJid, 
      messageData.instanceName,
      5 // Últimas 5 mensagens para contexto
    );
    
    // Adicionar histórico ao contexto
    messageContext.conversationHistory = conversationHistory.map((msg: any) => 
      `${msg.fromMe ? 'Atendente' : 'Cliente'}: ${msg.content}`
    );
    
    // Usar seletor inteligente para encontrar melhor agente
    const selectedAgent = await intelligentAgentSelector.selectBestAgent(messageContext);
    
    if (selectedAgent) {
      console.log(`🧠 [INTELLIGENT] Agente selecionado: ${selectedAgent.agent.name} (score: ${selectedAgent.score})`);
      
      // Gerar ID do ticket baseado na conversa
      const ticketId = `${messageData.remoteJid}_${messageData.instanceName}`;
      
      // Tentar auto-atribuição
      const assignmentResult = await autoAssignmentService.autoAssignAgent(
        ticketId,
        messageContext,
        {
          minimumScore: 0.3,
          minimumConfidence: 0.2,
          allowFallback: true
        }
      );
      
      if (assignmentResult.success) {
        console.log(`🧠 [INTELLIGENT] ✅ Auto-atribuição bem-sucedida`);
        return true;
      } else {
        console.log(`🧠 [INTELLIGENT] ❌ Auto-atribuição falhou: ${assignmentResult.error}`);
      }
    }
    
    console.log(`🧠 [INTELLIGENT] Nenhum agente adequado encontrado`);
    return false;
    
  } catch (error) {
    console.error(`❌ [INTELLIGENT] Erro na auto-atribuição inteligente:`, error);
    return false;
  }
}

// Função de fallback para sistema de regras tradicional
async function fallbackToRulesSystem(messageData: any, textContent: string) {
  try {
    console.log(`📋 [RULES] Usando sistema de regras tradicional como fallback...`);
    
    // Preparar dados do ticket para avaliação de regras
    const ticketData: TicketData = {
      messageType: messageData.messageType,
      content: textContent,
      timestamp: new Date(messageData.messageTimestamp),
      priority: 'medium', // Prioridade padrão
      clientTags: [], // TODO: buscar tags do cliente
      instanceId: messageData.instanceName,
      ticketId: `${messageData.remoteJid}_${messageData.instanceName}`,
      conversationStage: 'initial_contact', // TODO: determinar estágio
      clientSentiment: 'neutral' // TODO: analisar sentimento
    };
    
    // Avaliar regras e obter agentes que devem ser ativados
    const matchingAgents = await agentRulesService.evaluateRules(ticketData);
    
    if (matchingAgents.length === 0) {
      console.log(`📋 [RULES] Nenhum agente ativado por regras para mensagem ${messageData.messageId}`);
      return;
    }
    
    console.log(`📋 [RULES] ${matchingAgents.length} agente(s) ativado(s) por regras:`, {
      agents: matchingAgents.map(a => ({ agentId: a.agentId, priority: a.priority, confidence: a.confidence }))
    });
    
    // Executar o agente com maior prioridade
    const primaryAgent = matchingAgents[0];
    await executeAgentForMessage(primaryAgent.agentId, messageData, ticketData, primaryAgent.ruleId);
    
  } catch (error) {
    console.error(`❌ [RULES] Erro no sistema de regras tradicional:`, error);
  }
}

// Função para executar agente específico
async function executeAgentForMessage(
  agentId: string,
  messageData: any,
  ticketData: TicketData,
  ruleId: string
) {
  try {
    console.log(`🚀 [AGENT] Executando agente ${agentId} para mensagem ${messageData.messageId}`);
    
    // Buscar histórico da conversa (últimas 10 mensagens)
    const conversationHistory = await getConversationHistory(messageData.remoteJid, messageData.instanceName);
    
    // Preparar contexto da execução
    const execution = {
      input: ticketData.content,
      context: {
        ticketId: ticketData.ticketId,
        clientName: messageData.pushName || 'Cliente',
        clientPhone: messageData.remoteJid,
        conversationHistory: conversationHistory.map((msg: any) => 
        `${msg.fromMe ? 'Atendente' : 'Cliente'}: ${msg.content}`
      ),
        instanceId: messageData.instanceName,
        metadata: {
          messageType: messageData.messageType,
          timestamp: messageData.messageTimestamp,
          ruleId,
          originalMessageId: messageData.messageId
        }
      }
    };
    
    // Evo AI temporariamente desabilitado
    // const response = await evoAiService.executeAgent(agentId, execution);
    
    // Resposta de fallback enquanto Evo AI está desabilitado
    const response = {
      response: `Olá! Agente em manutenção (Evo AI desabilitado). Mensagem recebida: "${execution.input}"`,
      confidence: 0.5,
      executionTime: 100,
      tokensUsed: 30
    };
    
    console.log(`✅ [AGENT] Agente executado:`, {
      agentId,
      confidence: response.confidence,
      executionTime: response.executionTime,
      tokensUsed: response.tokensUsed,
      responseLength: response.response.length
    });
    
    // Se o agente retornou uma resposta com confiança suficiente, enviar
    if (response.response && response.confidence > 0.7) {
      await sendAgentResponse(
        messageData.instanceName,
        messageData.remoteJid,
        response.response
      );
      
      console.log(`📤 [AGENT] Resposta enviada via WhatsApp`);
    } else {
      console.log(`⚠️ [AGENT] Resposta não enviada - confiança baixa: ${response.confidence}`);
    }
    
    // Registrar execução no banco
    await logAgentExecution({
      agentId,
      ticketId: ticketData.ticketId,
      instanceId: messageData.instanceName,
      input: execution.input,
      output: response.response,
      executionTime: response.executionTime,
      tokensUsed: response.tokensUsed,
      confidence: response.confidence,
      status: response.response ? 'success' : 'low_confidence',
      ruleId,
      metadata: {
        originalMessageId: messageData.messageId,
        messageType: messageData.messageType
      }
    });
    
  } catch (error) {
    console.error(`❌ [AGENT] Erro ao executar agente ${agentId}:`, error);
    
    // Registrar erro
    await logAgentExecution({
      agentId,
      ticketId: ticketData.ticketId,
      instanceId: messageData.instanceName,
      input: ticketData.content,
      output: '',
      executionTime: 0,
      tokensUsed: 0,
      confidence: 0,
      status: 'error',
      ruleId,
      metadata: {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        originalMessageId: messageData.messageId
      }
    });
  }
}

// Função para buscar histórico da conversa
async function getConversationHistory(remoteJid: string, instanceName: string, limit = 10) {
  try {
    const messages = await firebaseService.getMessages(remoteJid, instanceName, limit);
    return messages.map((msg: any) => ({
      content: msg.content || '',
      fromMe: msg.isFromMe || false,
      timestamp: msg.timestamp
    }));
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
}

// Função para criar ticket se não existir
async function ensureTicketExists(remoteJid: string, instanceName: string, messageData: any): Promise<string> {
  try {
    const ticketId = `${remoteJid}_${instanceName}`;
    
    // Verificar se ticket já existe
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      // Criar novo ticket
      const newTicket = {
        id: ticketId,
        clientPhone: remoteJid,
        clientName: messageData.pushName || 'Cliente',
        instanceId: instanceName,
        status: 'open',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        tags: [],
        metadata: {
          source: 'whatsapp',
          autoCreated: true
        }
      };
      
      await setDoc(ticketRef, newTicket);
      console.log(`🎫 [TICKET] Novo ticket criado: ${ticketId}`);
    }
    
    return ticketId;
    
  } catch (error) {
    console.error('Erro ao criar/verificar ticket:', error);
    throw error;
  }
}

// Função para enviar resposta do agente
async function sendAgentResponse(instanceName: string, remoteJid: string, response: string) {
  try {
    await evolutionApi.sendMessage(instanceName, remoteJid, response);
  } catch (error) {
    console.error('Erro ao enviar resposta do agente:', error);
    throw error;
  }
}

// Função para processar resposta do agente IA para ticket específico
async function processTicketAgentResponse(params: {
  ticketId: string;
  agentId: string;
  evoAiAgentId: string;
  messageData: any;
  textContent: string;
  aiConfig: any;
}) {
  try {
    console.log(`🤖 [TICKET-AGENT] Processando resposta para ticket ${params.ticketId} com agente ${params.agentId}`);
    
    // Buscar histórico da conversa (últimas 10 mensagens)
    const conversationHistory = await getConversationHistory(
      params.messageData.remoteJid, 
      params.messageData.instanceName
    );
    
    // Preparar contexto da execução
    const execution = {
      input: params.textContent,
      context: {
        ticketId: params.ticketId,
        clientName: params.messageData.pushName || 'Cliente',
        clientPhone: params.messageData.remoteJid,
        conversationHistory: conversationHistory.map((msg: any) => 
          `${msg.fromMe ? 'Atendente' : 'Cliente'}: ${msg.content}`
        ),
        instanceId: params.messageData.instanceName,
        metadata: {
          messageType: params.messageData.messageType,
          timestamp: params.messageData.messageTimestamp,
          ticketId: params.ticketId,
          originalMessageId: params.messageData.messageId
        }
      }
    };
    
    // Buscar configuração do agente para usar com Gemini
    const agentConfig = {
      id: params.agentId,
      name: 'Agente IA',
      model: 'gemini-2.5-flash',
      prompt: 'Você é um assistente de atendimento ao cliente profissional e prestativo. Responda de forma clara, objetiva e amigável às perguntas dos clientes.',
      aiConfig: params.aiConfig
    };
    
    // Usar Gemini para processar a mensagem
    await geminiAgentService.processTicketMessage(
      params.ticketId,
      agentConfig,
      params.messageData,
      params.textContent
    );
    
    // Retornar sucesso (o processamento é feito de forma assíncrona)
     return;
    
  } catch (error) {
    console.error(`❌ [TICKET-AGENT] Erro ao processar resposta do agente:`, error);
    
    // Registrar erro
    await logTicketAgentInteraction({
      ticketId: params.ticketId,
      agentId: params.agentId,
      type: 'error',
      content: `Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      confidence: 0,
      metadata: {
        originalMessageId: params.messageData.messageId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    });
  }
}

// Função para registrar interação do agente no ticket
async function logTicketAgentInteraction(interactionData: {
  ticketId: string;
  agentId: string;
  type: string;
  content: string;
  confidence: number;
  metadata?: any;
}) {
  try {
    await addDoc(collection(db, 'agent_interactions'), {
      ...interactionData,
      timestamp: new Date(),
      createdAt: new Date()
    });
    
    console.log(`📝 [TICKET-AGENT] Interação registrada para ticket ${interactionData.ticketId}`);
  } catch (error) {
    console.error('❌ [TICKET-AGENT] Erro ao registrar interação:', error);
  }
}

// Função para registrar execução do agente
async function logAgentExecution(executionData: {
  agentId: string;
  ticketId: string;
  instanceId: string;
  input: string;
  output: string;
  executionTime: number;
  tokensUsed: number;
  confidence: number;
  status: string;
  ruleId: string;
  metadata?: any;
}) {
  try {
    await addDoc(collection(db, 'agent_executions'), {
      ...executionData,
      executedAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao registrar execução do agente:', error);
  }
}

// GET method for webhook verification (if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Evolution API messages.upsert webhook endpoint is active' });
}