import { NextRequest, NextResponse } from 'next/server';

// Middleware simplificado - não pode usar bibliotecas Node.js no Edge Runtime
export async function middleware(request: NextRequest) {
  // O middleware do Next.js roda no Edge Runtime e não pode usar bibliotecas Node.js
  // A inicialização do RabbitMQ será feita via API routes
  return NextResponse.next();
}

// Configurar para quais rotas o middleware deve ser executado
export const config = {
  matcher: [
    // Executar para todas as rotas da API
    '/api/:path*',
    // Executar para rotas específicas que usam RabbitMQ
    '/chat/:path*',
    '/admin/:path*'
  ]
};