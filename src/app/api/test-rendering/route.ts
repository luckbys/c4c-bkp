import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Ler o arquivo HTML de teste
    const htmlPath = join(process.cwd(), 'test-frontend-rendering.html');
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('❌ [TEST RENDERING] Erro ao servir página de teste:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao carregar página de teste',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}