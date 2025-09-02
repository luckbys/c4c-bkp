import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// POST /api/agents/generate-info - Gerar informações do agente com Gemini
export async function POST(request: NextRequest) {
  try {
    const { name, provider } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Nome do agente é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se é para usar Gemini
    if (provider !== 'gemini') {
      return NextResponse.json(
        { error: 'Apenas o provedor Gemini é suportado' },
        { status: 400 }
      );
    }
    
    // Verificar se a API key do Gemini está configurada
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ [GEMINI] API key não configurada, usando fallback');
      
      // Fallback quando API key não está configurada
      const generatedInfo = {
        description: `Assistente especializado em ${name.toLowerCase()} com capacidades avançadas do Google Gemini.`,
        role: `Especialista em ${name} (Gemini)`,
        goal: `Fornecer assistência completa usando a inteligência do Google Gemini para ${name.toLowerCase()}.`,
        instructions: `Você é um assistente especializado em ${name.toLowerCase()} powered by Google Gemini. Suas principais responsabilidades incluem:\n\n1. Fornecer informações precisas usando capacidades avançadas de IA\n2. Análise inteligente e resolução de problemas\n3. Manter um tom profissional e prestativo\n4. Adaptar respostas ao contexto e necessidades do usuário\n\nSempre seja claro, objetivo e útil em suas respostas.`
      };
      
      return NextResponse.json(generatedInfo);
    }
    
    try {
      // Usar Gemini para gerar informações
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      
      const prompt = `Gere informações para um agente de IA especializado em "${name}". Retorne um JSON com os seguintes campos:
      - description: Uma descrição profissional do agente (máximo 150 caracteres)
      - role: O papel/função do agente (máximo 50 caracteres)
      - goal: O objetivo principal do agente (máximo 100 caracteres)
      - instructions: Instruções detalhadas para o agente (máximo 500 caracteres)
      
      Seja específico e profissional. Foque nas capacidades e responsabilidades do agente.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Tentar extrair JSON da resposta
      let generatedInfo;
      try {
        // Procurar por JSON na resposta
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          generatedInfo = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('JSON não encontrado na resposta');
        }
      } catch (parseError) {
        console.warn('⚠️ [GEMINI] Erro ao parsear resposta, usando fallback');
        
        // Fallback se não conseguir parsear
        generatedInfo = {
          description: `Assistente especializado em ${name.toLowerCase()} com IA avançada do Google Gemini.`,
          role: `Especialista em ${name}`,
          goal: `Fornecer assistência inteligente para ${name.toLowerCase()}.`,
          instructions: `Você é um assistente especializado em ${name.toLowerCase()} powered by Google Gemini. Seja sempre útil, preciso e profissional.`
        };
      }
      
      console.log('✅ [GEMINI] Informações geradas com sucesso para:', name);
      return NextResponse.json(generatedInfo);
      
    } catch (geminiError) {
      console.error('❌ [GEMINI] Erro na API:', geminiError);
      
      // Fallback em caso de erro na API do Gemini
      const generatedInfo = {
        description: `Assistente especializado em ${name.toLowerCase()} com capacidades avançadas do Google Gemini.`,
        role: `Especialista em ${name} (Gemini)`,
        goal: `Fornecer assistência completa usando a inteligência do Google Gemini para ${name.toLowerCase()}.`,
        instructions: `Você é um assistente especializado em ${name.toLowerCase()} powered by Google Gemini. Suas principais responsabilidades incluem:\n\n1. Fornecer informações precisas usando capacidades avançadas de IA\n2. Análise inteligente e resolução de problemas\n3. Manter um tom profissional e prestativo\n4. Adaptar respostas ao contexto e necessidades do usuário\n\nSempre seja claro, objetivo e útil em suas respostas.`
      };
      
      return NextResponse.json(generatedInfo);
    }
    
  } catch (error) {
    console.error('❌ [GEMINI] Erro ao gerar informações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}