import { NextRequest, NextResponse } from 'next/server';
import { fetchAllInstancesAction } from '../../instancias/actions';

export async function GET(request: NextRequest) {
  try {
    const result = await fetchAllInstancesAction();
    
    if (result.success) {
      return NextResponse.json({ instances: result.data });
    } else {
      return NextResponse.json(
        { error: result.error || 'Falha ao buscar instâncias' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}