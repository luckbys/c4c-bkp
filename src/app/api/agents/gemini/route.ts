import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// POST /api/agents/gemini - Criar agente usando Gemini
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, role, goal, model, instructions, type } = body;
    
    console.log('🤖 [GEMINI-AGENT] Criando agente:', {
      name,
      model,
      type
    });
    
    // Validar dados obrigatórios
    if (!name || !description || !model) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nome, descrição e modelo são obrigatórios'
        },
        { status: 400 }
      );
    }
    
    // Validar se é um modelo Gemini
    const validGeminiModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    if (!validGeminiModels.includes(model)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Modelo deve ser um dos modelos Gemini suportados'
        },
        { status: 400 }
      );
    }
    
    // Criar agente no Firestore
    const agentData = {
      name,
      description,
      role: role || 'assistant',
      goal: goal || 'Ajudar o usuário',
      model,
      instructions: instructions || `Você é um assistente especializado. Seja sempre útil, preciso e profissional.`,
      type: 'gemini',
      provider: 'google',
      status: 'active',
      config: {
        model,
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        topK: 40
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      totalInteractions: 0,
      successRate: 0
    };
    
    const docRef = await addDoc(collection(db, 'agents'), agentData);
    
    console.log('✅ [GEMINI-AGENT] Agente criado com sucesso:', {
      id: docRef.id,
      name,
      model
    });
    
    return NextResponse.json({
      success: true,
      agent: {
        id: docRef.id,
        ...agentData
      }
    });
    
  } catch (error) {
    console.error('❌ [GEMINI-AGENT] Erro ao criar agente:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// GET /api/agents/gemini - Listar agentes Gemini
export async function GET() {
  try {
    // Por enquanto retorna lista vazia, pode ser implementado depois
    return NextResponse.json({
      success: true,
      agents: []
    });
  } catch (error) {
    console.error('❌ [GEMINI-AGENT] Erro ao listar agentes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}