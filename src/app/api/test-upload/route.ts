import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [TEST] Iniciando diagnóstico simples');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };

    // Função auxiliar para adicionar teste
    const addTest = (name: string, success: boolean, details: any, error?: string) => {
      diagnostics.tests.push({
        name,
        success,
        details,
        error,
        timestamp: new Date().toISOString()
      });
      
      if (success) {
        diagnostics.summary.passed++;
      } else {
        diagnostics.summary.failed++;
      }
      diagnostics.summary.total++;
    };

    // Teste 1: Verificar variáveis de ambiente
    try {
      const envVars = {
        MINIO_SERVER_URL: process.env.MINIO_SERVER_URL,
        MINIO_ROOT_USER: process.env.MINIO_ROOT_USER,
        MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD ? '[DEFINIDO]' : '[NÃO DEFINIDO]',
        MINIO_BUCKET_NAME: process.env.MINIO_BUCKET_NAME,
        MINIO_REGION: process.env.MINIO_REGION
      };
      
      const missingVars = Object.entries(envVars)
        .filter(([key, value]) => !value || value === '[NÃO DEFINIDO]')
        .map(([key]) => key);
      
      addTest(
        'Variáveis de Ambiente MinIO',
        missingVars.length === 0,
        { envVars, missingVars },
        missingVars.length > 0 ? `Variáveis ausentes: ${missingVars.join(', ')}` : undefined
      );
    } catch (error) {
      addTest('Variáveis de Ambiente MinIO', false, {}, `Erro: ${error}`);
    }

    // Teste 2: Verificar dependências básicas
    try {
      const dependencies = {
        'file-type': false,
        'crypto': false,
        'minio': false
      };
      
      try {
        await import('file-type');
        dependencies['file-type'] = true;
      } catch (e) {
        console.log('file-type não disponível:', e);
      }
      
      try {
        await import('crypto');
        dependencies['crypto'] = true;
      } catch (e) {
        console.log('crypto não disponível:', e);
      }
      
      try {
        await import('minio');
        dependencies['minio'] = true;
      } catch (e) {
        console.log('minio não disponível:', e);
      }
      
      const missingDeps = Object.entries(dependencies)
        .filter(([, available]) => !available)
        .map(([name]) => name);
      
      addTest(
        'Dependências Básicas',
        missingDeps.length === 0,
        { dependencies, missingDeps },
        missingDeps.length > 0 ? `Dependências ausentes: ${missingDeps.join(', ')}` : undefined
      );
    } catch (error) {
      addTest('Dependências Básicas', false, {}, `Erro: ${error}`);
    }

    // Teste 3: Testar MinIO Service
    try {
      console.log('🔍 [TEST] Testando MinIO Service...');
      const { getMinIOService } = await import('../../../services/minio-service');
      const minioService = getMinIOService();
      const isConnected = await minioService.testConnection();
      
      addTest(
        'MinIO Service',
        isConnected,
        { connected: isConnected },
        !isConnected ? 'Falha na conexão com MinIO' : undefined
      );
    } catch (error) {
      console.log('❌ [TEST] Erro no MinIO Service:', error);
      addTest('MinIO Service', false, {}, `Erro: ${error}`);
    }

    // Teste 4: Testar AdvancedFileValidator
    try {
      console.log('🔍 [TEST] Testando AdvancedFileValidator...');
      const { AdvancedFileValidator } = await import('../../../services/advanced-file-validator');
      
      // Criar um buffer de teste simples
      const testBuffer = Buffer.from('Hello World Test');
      
      const validation = await AdvancedFileValidator.validateFile(
        testBuffer,
        'test.txt',
        'text/plain'
      );
      
      addTest(
        'AdvancedFileValidator',
        true, // Só o fato de não dar erro já é sucesso
        { validation },
        undefined
      );
    } catch (error) {
      console.log('❌ [TEST] Erro no AdvancedFileValidator:', error);
      addTest('AdvancedFileValidator', false, {}, `Erro: ${error}`);
    }

    console.log('✅ [TEST] Diagnóstico concluído');
    
    // Retornar diagnóstico completo
    return NextResponse.json({
      success: diagnostics.summary.failed === 0,
      message: `Diagnóstico concluído: ${diagnostics.summary.passed}/${diagnostics.summary.total} testes passaram`,
      diagnostics
    }, {
      status: diagnostics.summary.failed === 0 ? 200 : 500
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro geral no diagnóstico:', error);
    return NextResponse.json({
      success: false,
      error: `Erro geral: ${error}`,
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

// Configurações
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';