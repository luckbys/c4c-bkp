import { NextRequest, NextResponse } from 'next/server';
import { scheduleParser } from '@/services/schedule-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, clientName } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [Schedule Parser] Analyzing text:', text);

    // Verificar se é um comando de agendamento
    const isScheduleCommand = scheduleParser.isScheduleCommand(text);
    
    if (!isScheduleCommand) {
      return NextResponse.json({
        isScheduleCommand: false,
        confidence: 0,
        message: 'Texto não contém comando de agendamento'
      });
    }

    // Extrair dados do agendamento
    const parsedData = scheduleParser.parseScheduleCommand(text);
    
    console.log('📅 [Schedule Parser] Parsed data:', {
      isValid: parsedData.isValid,
      confidence: parsedData.confidence,
      type: parsedData.type,
      date: parsedData.date,
      time: parsedData.time,
      title: parsedData.title
    });

    // Adicionar nome do cliente ao título se fornecido
    if (clientName && parsedData.title) {
      parsedData.title = parsedData.title.replace('agendada via chat', `com ${clientName}`);
    }

    return NextResponse.json({
      isScheduleCommand: true,
      ...parsedData
    });
  } catch (error) {
    console.error('Error parsing schedule command:', error);
    return NextResponse.json(
      { error: 'Failed to parse schedule command' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const examples = scheduleParser.getExampleCommands();
    
    return NextResponse.json({
      examples,
      description: 'Exemplos de comandos de agendamento válidos'
    });
  } catch (error) {
    console.error('Error getting schedule examples:', error);
    return NextResponse.json(
      { error: 'Failed to get examples' },
      { status: 500 }
    );
  }
}