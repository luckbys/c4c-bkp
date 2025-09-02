import { NextRequest, NextResponse } from 'next/server';
// import { evoAiService, EvoAiAgent } from '@/services/evo-ai-service'; // Temporariamente desabilitado
import { agentRulesService } from '@/services/agent-rules-service';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';

interface AgentData {
  id: string;
  name: string;
  description: string;
  model: string;
  evoAiAgentId?: string;
  status: 'active' | 'inactive' | 'error';
  config: {
    temperature: number;
    maxTokens: number;
    tools?: string[];
    systemPrompt?: string;
  };
  prompt: string;
  totalInteractions: number;
  successRate: number;
  lastExecution?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/agents - Listar todos os agentes
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] Buscando lista de agentes...');
    
    // Buscar agentes do Firestore (dados do CRM)
    const agentsRef = collection(db, 'agents');
    const q = query(agentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const agents: AgentData[] = [];
    
    for (const doc of querySnapshot.docs) {
      const agentData = { id: doc.id, ...doc.data() } as AgentData;
      
      // Buscar métricas básicas do agente
      try {
        const executionsRef = collection(db, 'agent_executions');
        const executionsQuery = query(
          executionsRef,
          where('agentId', '==', doc.id),
          orderBy('executedAt', 'desc')
        );
        const executionsSnapshot = await getDocs(executionsQuery);
        
        const executions = executionsSnapshot.docs.map(doc => doc.data());
        const totalInteractions = executions.length;
        const successfulExecutions = executions.filter(exec => exec.status === 'success').length;
        const successRate = totalInteractions > 0 ? (successfulExecutions / totalInteractions) * 100 : 0;
        const lastExecution = executions.length > 0 ? executions[0].executedAt?.toDate() : undefined;
        
        agentData.totalInteractions = totalInteractions;
        agentData.successRate = Math.round(successRate);
        agentData.lastExecution = lastExecution;
      } catch (error) {
        console.warn(`Erro ao buscar métricas do agente ${doc.id}:`, error);
        agentData.totalInteractions = 0;
        agentData.successRate = 0;
      }
      
      agents.push(agentData);
    }
    
    console.log(`✅ [API] ${agents.length} agentes encontrados`);
    
    return NextResponse.json({
      success: true,
      agents,
      total: agents.length
    });
  } catch (error) {
    console.error('❌ [API] Erro ao buscar agentes:', error);
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

// POST /api/agents - Criar novo agente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🚀 [API] Criando novo agente:', {
      name: body.name,
      model: body.model,
      type: body.type || 'llm'
    });
    
    // Validar dados obrigatórios
    if (!body.name || !body.model || !body.instruction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados obrigatórios: name, model, instruction'
        },
        { status: 400 }
      );
    }

    // Log dos dados recebidos para debug
    console.log('📥 [API] Dados recebidos:', {
      name: body.name,
      model: body.model,
      apiKey: body.apiKey,
      instruction: body.instruction,
      description: body.description,
      role: body.role,
      goal: body.goal
    });
    
    // Evo AI temporariamente desabilitado - usando apenas Gemini
    // let evoAiAgentId: string | undefined;
    // try {
    //   const evoAiAgent = await evoAiService.createAgent({
    //     name: body.name,
    //     type: body.type || 'llm',
    //     config: {
    //       model: body.model,
    //       temperature: body.config?.temperature || 0.7,
    //       maxTokens: body.config?.maxTokens || 1000,
    //       tools: body.config?.tools || [],
    //       systemPrompt: body.config?.systemPrompt || body.instruction,
    //       apiKey: body.apiKey
    //     },
    //     prompt: body.instruction,
    //     status: 'active'
    //   });
    //   evoAiAgentId = evoAiAgent.id;
    //   console.log(`✅ [API] Agente criado no Evo AI: ${evoAiAgentId}`);
    // } catch (error) {
    //   console.error('❌ [API] Erro ao criar agente no Evo AI:', error);
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'Erro ao criar agente no Evo AI',
    //       details: error instanceof Error ? error.message : 'Erro desconhecido'
    //     },
    //     { status: 500 }
    //   );
    // }
    
    console.log('✅ [API] Criando agente apenas com Gemini (Evo AI desabilitado)');
    
    // Salvar agente no Firestore
    const now = new Date();
    
    // Função para remover campos undefined
    const removeUndefinedFields = (obj: any): any => {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
            const cleanedNested = removeUndefinedFields(value);
            if (Object.keys(cleanedNested).length > 0) {
              cleaned[key] = cleanedNested;
            }
          } else {
            cleaned[key] = value;
          }
        }
      }
      return cleaned;
    };
    
    // Preparar dados do agente, tratando campos opcionais
    const rawAgentData = {
      name: body.name,
      description: body.description || '',
      model: body.model,
      ...(body.apiKey && { apiKey: body.apiKey }), // Só incluir se não for undefined
      role: body.role || 'assistant',
      goal: body.goal || 'Ajudar o usuário com suas necessidades',
      type: body.type || 'llm',
      // evoAiAgentId, // Temporariamente desabilitado
      status: 'active' as const,
      config: {
        temperature: body.config?.temperature || 0.7,
        maxTokens: body.config?.maxTokens || 1000,
        tools: body.config?.tools || [],
        systemPrompt: body.config?.systemPrompt || body.instruction,
        ...(body.apiKey && { apiKey: body.apiKey }) // Só incluir se não for undefined
      },
      prompt: body.instruction,
      totalInteractions: 0,
      successRate: 0,
      createdAt: now,
      updatedAt: now
    };
    
    // Remover campos undefined para evitar erro do Firestore
    const agentData = removeUndefinedFields(rawAgentData);
    
    console.log('📝 [API] Dados limpos para Firestore:', {
      ...agentData,
      config: { ...agentData.config, apiKey: agentData.config?.apiKey ? '[HIDDEN]' : undefined }
    });
    
    const docRef = await addDoc(collection(db, 'agents'), agentData);
    const agentId = docRef.id;
    
    console.log(`✅ [API] Agente salvo no Firestore: ${agentId}`);
    
    // Criar regras padrão para o agente
    try {
      await agentRulesService.createDefaultRules(agentId);
      console.log(`✅ [API] Regras padrão criadas para agente ${agentId}`);
    } catch (error) {
      console.warn(`⚠️ [API] Erro ao criar regras padrão:`, error);
    }
    
    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        ...agentData
      }
    }, { status: 201 });
  } catch (error) {
    console.error('❌ [API] Erro ao criar agente:', error);
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