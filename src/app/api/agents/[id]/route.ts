import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
// import { evoAiService } from '@/services/evo-ai-service'; // Temporariamente desabilitado
import { agentRulesService } from '@/services/agent-rules-service';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/agents/[id] - Obter agente específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.id;
    console.log(`🔍 [API] Buscando agente: ${agentId}`);
    
    // Buscar agente no Firestore
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    if (!agentSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agente não encontrado'
        },
        { status: 404 }
      );
    }
    
    const agentData = { id: agentSnap.id, ...agentSnap.data() };
    
    // Buscar métricas detalhadas
    try {
      const executionsRef = collection(db, 'agent_executions');
      const executionsQuery = query(
        executionsRef,
        where('agentId', '==', agentId)
      );
      const executionsSnapshot = await getDocs(executionsQuery);
      
      const executions = executionsSnapshot.docs.map(doc => doc.data());
      const totalInteractions = executions.length;
      const successfulExecutions = executions.filter(exec => exec.status === 'success').length;
      const successRate = totalInteractions > 0 ? (successfulExecutions / totalInteractions) * 100 : 0;
      const totalTokensUsed = executions.reduce((sum, exec) => sum + (exec.tokensUsed || 0), 0);
      const averageResponseTime = executions.length > 0 
        ? executions.reduce((sum, exec) => sum + (exec.executionTime || 0), 0) / executions.length 
        : 0;
      
      agentData.metrics = {
        totalInteractions,
        successRate: Math.round(successRate),
        totalTokensUsed,
        averageResponseTime: Math.round(averageResponseTime)
      };
    } catch (error) {
      console.warn(`Erro ao buscar métricas do agente ${agentId}:`, error);
      agentData.metrics = {
        totalInteractions: 0,
        successRate: 0,
        totalTokensUsed: 0,
        averageResponseTime: 0
      };
    }
    
    // Buscar regras do agente
    try {
      const rules = await agentRulesService.getRulesByAgent(agentId);
      agentData.rules = rules;
    } catch (error) {
      console.warn(`Erro ao buscar regras do agente ${agentId}:`, error);
      agentData.rules = [];
    }
    
    console.log(`✅ [API] Agente encontrado: ${agentId}`);
    
    return NextResponse.json({
      success: true,
      agent: agentData
    });
  } catch (error) {
    console.error(`❌ [API] Erro ao buscar agente ${params.id}:`, error);
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

// PUT /api/agents/[id] - Atualizar agente
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.id;
    const body = await request.json();
    
    console.log(`🔄 [API] Atualizando agente: ${agentId}`, {
      fields: Object.keys(body),
      apiKey: body.apiKey,
      model: body.model
    });
    
    // Buscar agente atual
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    if (!agentSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agente não encontrado'
        },
        { status: 404 }
      );
    }
    
    const currentAgent = agentSnap.data();
    
    // Evo AI temporariamente desabilitado
    // if (currentAgent.evoAiAgentId && (body.name || body.prompt || body.config || body.model || body.apiKey)) {
    //   try {
    //     await evoAiService.updateAgent(currentAgent.evoAiAgentId, {
    //       name: body.name || currentAgent.name,
    //       prompt: body.prompt || body.instruction || currentAgent.prompt,
    //       config: {
    //         ...currentAgent.config,
    //         ...body.config,
    //         model: body.model || currentAgent.model,
    //         apiKey: body.apiKey || currentAgent.apiKey
    //       }
    //     });
    //     console.log(`✅ [API] Agente atualizado no Evo AI: ${currentAgent.evoAiAgentId}`);
    //   } catch (error) {
    //     console.error('❌ [API] Erro ao atualizar agente no Evo AI:', error);
    //     return NextResponse.json(
    //       {
    //         success: false,
    //         error: 'Erro ao atualizar agente no Evo AI',
    //         details: error instanceof Error ? error.message : 'Erro desconhecido'
    //       },
    //       { status: 500 }
    //     );
    //   }
    // }
    
    console.log('✅ [API] Atualizando agente apenas no Firestore (Evo AI desabilitado)');
    
    // Atualizar agente no Firestore
    const updateData = {
      ...body,
      updatedAt: new Date()
    };
    
    await updateDoc(agentRef, updateData);
    
    console.log(`✅ [API] Agente atualizado no Firestore: ${agentId}`);
    
    // Buscar agente atualizado
    const updatedAgentSnap = await getDoc(agentRef);
    const updatedAgent = { id: updatedAgentSnap.id, ...updatedAgentSnap.data() };
    
    return NextResponse.json({
      success: true,
      agent: updatedAgent
    });
  } catch (error) {
    console.error(`❌ [API] Erro ao atualizar agente ${params.id}:`, error);
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

// PATCH /api/agents/[id] - Atualização parcial (ex: status)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.id;
    const body = await request.json();
    
    console.log(`🔄 [API] Atualizando status do agente: ${agentId}`, body);
    
    // Buscar agente atual
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    if (!agentSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agente não encontrado'
        },
        { status: 404 }
      );
    }
    
    // Atualizar apenas os campos fornecidos
    const updateData = {
      ...body,
      updatedAt: new Date()
    };
    
    await updateDoc(agentRef, updateData);
    
    console.log(`✅ [API] Agente atualizado: ${agentId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Agente atualizado com sucesso'
    });
  } catch (error) {
    console.error(`❌ [API] Erro ao atualizar agente ${params.id}:`, error);
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

// DELETE /api/agents/[id] - Deletar agente
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const agentId = params.id;
    console.log(`🗑️ [API] Deletando agente: ${agentId}`);
    
    // Buscar agente atual
    const agentRef = doc(db, 'agents', agentId);
    const agentSnap = await getDoc(agentRef);
    
    let agentData = null;
    let firestoreExists = false;
    
    if (agentSnap.exists()) {
      agentData = agentSnap.data();
      firestoreExists = true;
      console.log(`✅ [API] Agente encontrado no Firestore: ${agentId}`);
    } else {
      console.log(`ℹ️ [API] Agente não encontrado no Firestore, tentando PostgreSQL: ${agentId}`);
    }
    
    // Evo AI temporariamente desabilitado
    let evoAiDeleted = false;
    let firestoreDeleted = false;
    
    // // Tentar deletar agente do Evo AI usando evoAiAgentId (se existir no Firestore)
    // if (agentData && agentData.evoAiAgentId) {
    //   try {
    //     await evoAiService.deleteAgent(agentData.evoAiAgentId);
    //     console.log(`✅ [API] Agente deletado do Evo AI via evoAiAgentId: ${agentData.evoAiAgentId}`);
    //     evoAiDeleted = true;
    //   } catch (error) {
    //     console.warn('⚠️ [API] Erro ao deletar agente do Evo AI via evoAiAgentId:', error);
    //   }
    // }
    
    // // Se não conseguiu deletar via evoAiAgentId ou não existe, tentar deletar diretamente do PostgreSQL
    // // Mas apenas se o agentId for um UUID válido (PostgreSQL usa UUIDs)
    // if (!evoAiDeleted) {
    //   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    //   const isValidUUID = uuidRegex.test(agentId);
    //   
    //   if (isValidUUID) {
    //     try {
    //       console.log(`🔄 [API] Tentando deletar agente diretamente do PostgreSQL: ${agentId}`);
    //       const { default: evoAiPostgresService } = await import('@/services/evo-ai-postgres-service');
    //       
    //       const deleted = await evoAiPostgresService.deleteAgent(agentId);
    //       
    //       if (deleted) {
    //         console.log(`✅ [API] Agente deletado diretamente do PostgreSQL: ${agentId}`);
    //         evoAiDeleted = true;
    //       } else {
    //         console.log(`ℹ️ [API] Agente não encontrado no PostgreSQL: ${agentId}`);
    //       }
    //     } catch (postgresError) {
    //       console.warn('⚠️ [API] Erro ao deletar agente do PostgreSQL:', postgresError);
    //     }
    //   } else {
    //     console.log(`ℹ️ [API] ID ${agentId} não é um UUID válido, pulando tentativa de deleção no PostgreSQL`);
    //   }
    // }
    
    // // Log do resultado da exclusão no Evo AI
    // if (evoAiDeleted) {
    //   console.log(`✅ [API] Agente removido com sucesso do Evo AI`);
    // } else {
    //   console.log(`⚠️ [API] Agente não foi encontrado no Evo AI (pode já ter sido deletado)`);
    // }
    
    console.log('✅ [API] Deletando agente apenas do Firestore (Evo AI desabilitado)');
    
    // Deletar dados relacionados apenas se o agente existir no Firestore
    if (firestoreExists) {
      // Deletar regras do agente
      try {
        const rules = await agentRulesService.getRulesByAgent(agentId);
        for (const rule of rules) {
          await agentRulesService.deleteRule(rule.id);
        }
        console.log(`✅ [API] ${rules.length} regras deletadas`);
      } catch (error) {
        console.warn('⚠️ [API] Erro ao deletar regras:', error);
      }
      
      // Deletar execuções do agente
      try {
        const executionsRef = collection(db, 'agent_executions');
        const executionsQuery = query(
          executionsRef,
          where('agentId', '==', agentId)
        );
        const executionsSnapshot = await getDocs(executionsQuery);
        
        const deletePromises = executionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(`✅ [API] ${executionsSnapshot.docs.length} execuções deletadas`);
      } catch (error) {
        console.warn('⚠️ [API] Erro ao deletar execuções:', error);
      }
      
      // Deletar agente do Firestore
      await deleteDoc(agentRef);
      firestoreDeleted = true;
      console.log(`✅ [API] Agente deletado do Firestore: ${agentId}`);
    }
    
    // Verificar se pelo menos uma exclusão foi bem-sucedida
    if (evoAiDeleted || firestoreDeleted) {
      console.log(`✅ [API] Agente deletado com sucesso: ${agentId}`);
      return NextResponse.json({
        success: true,
        message: 'Agente deletado com sucesso',
        details: {
          firestoreDeleted,
          evoAiDeleted
        }
      });
    } else {
      console.log(`❌ [API] Agente não encontrado em nenhum sistema: ${agentId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Agente não encontrado em nenhum sistema'
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`❌ [API] Erro ao deletar agente ${params.id}:`, error);
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