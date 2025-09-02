'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw, 
  Eye,
  Copy,
  Download
} from 'lucide-react';

interface ImageDiagnosticProps {
  content: string;
  messageId?: string;
  onRetry?: () => void;
}

export function ImageDiagnostic({ content, messageId, onRetry }: ImageDiagnosticProps) {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    
    const results = {
      url: content,
      messageId,
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    // Teste 1: Validação básica da URL
    const urlTest = {
      name: 'Validação de URL',
      status: 'unknown' as 'success' | 'error' | 'warning',
      details: [] as string[]
    };

    try {
      if (content.startsWith('data:')) {
        urlTest.status = 'success';
        urlTest.details.push('✅ Data URL válida');
        urlTest.details.push(`📏 Tamanho: ${content.length} caracteres`);
      } else if (content.includes('firebasestorage.googleapis.com')) {
        const url = new URL(content);
        urlTest.status = url.searchParams.get('alt') === 'media' && url.searchParams.get('token') ? 'success' : 'warning';
        urlTest.details.push(`🌐 Domínio: ${url.hostname}`);
        urlTest.details.push(`📁 Caminho: ${url.pathname}`);
        urlTest.details.push(`🔑 Token: ${url.searchParams.get('token') ? '✅ Presente' : '❌ Ausente'}`);
        urlTest.details.push(`📄 Alt=media: ${url.searchParams.get('alt') === 'media' ? '✅ Presente' : '❌ Ausente'}`);
      } else {
        const url = new URL(content);
        urlTest.status = 'success';
        urlTest.details.push(`🌐 URL HTTP válida: ${url.hostname}`);
      }
    } catch (error) {
      urlTest.status = 'error';
      urlTest.details.push(`❌ URL inválida: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    results.tests.push(urlTest);

    // Teste 2: Conectividade
    const connectivityTest = {
      name: 'Teste de Conectividade',
      status: 'unknown' as 'success' | 'error' | 'warning',
      details: [] as string[]
    };

    if (!content.startsWith('data:')) {
      try {
        const response = await fetch(content, { method: 'HEAD' });
        connectivityTest.status = response.ok ? 'success' : 'error';
        connectivityTest.details.push(`📊 Status: ${response.status} ${response.statusText}`);
        connectivityTest.details.push(`📄 Content-Type: ${response.headers.get('content-type') || 'N/A'}`);
        connectivityTest.details.push(`📏 Content-Length: ${response.headers.get('content-length') || 'N/A'}`);
      } catch (error) {
        connectivityTest.status = 'error';
        connectivityTest.details.push(`❌ Erro de conectividade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    } else {
      connectivityTest.status = 'success';
      connectivityTest.details.push('✅ Data URL - não requer conectividade');
    }

    results.tests.push(connectivityTest);

    // Teste 3: Proxy (se for Firebase Storage)
    if (content.includes('firebasestorage.googleapis.com')) {
      const proxyTest = {
        name: 'Teste de Proxy',
        status: 'unknown' as 'success' | 'error' | 'warning',
        details: [] as string[]
      };

      try {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(content)}`;
        const response = await fetch(proxyUrl, { method: 'HEAD' });
        proxyTest.status = response.ok ? 'success' : 'error';
        proxyTest.details.push(`📊 Status: ${response.status} ${response.statusText}`);
        proxyTest.details.push(`🔗 Proxy URL: ${proxyUrl}`);
      } catch (error) {
        proxyTest.status = 'error';
        proxyTest.details.push(`❌ Erro no proxy: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      results.tests.push(proxyTest);
    }

    setDiagnosticResults(results);
    setIsRunning(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Diagnóstico de Imagem
          {messageId && <Badge variant="outline">ID: {messageId}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Info */}
        <div className="space-y-2">
          <h4 className="font-medium">URL da Imagem:</h4>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-gray-100 rounded text-sm break-all">
              {content.length > 100 ? content.substring(0, 100) + '...' : content}
            </code>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(content)}>
              <Copy className="h-4 w-4" />
            </Button>
            {!content.startsWith('data:') && (
              <Button size="sm" variant="outline" onClick={() => openInNewTab(content)}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={runDiagnostic} disabled={isRunning}>
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Executar Diagnóstico
              </>
            )}
          </Button>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </div>

        {/* Results */}
        {diagnosticResults && (
          <div className="space-y-3">
            <h4 className="font-medium">Resultados do Diagnóstico:</h4>
            {diagnosticResults.tests.map((test: any, index: number) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(test.status)}
                  <span className="font-medium">{test.name}</span>
                  <Badge className={getStatusColor(test.status)}>
                    {test.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {test.details.map((detail: string, detailIndex: number) => (
                    <div key={detailIndex}>{detail}</div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Summary */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="font-medium text-blue-800 mb-2">Resumo:</h5>
              <div className="text-sm text-blue-700">
                {diagnosticResults.tests.every((t: any) => t.status === 'success') && (
                  <p>✅ Todos os testes passaram. A imagem deveria carregar normalmente.</p>
                )}
                {diagnosticResults.tests.some((t: any) => t.status === 'error') && (
                  <p>❌ Alguns testes falharam. Verifique os detalhes acima para resolver os problemas.</p>
                )}
                {diagnosticResults.tests.some((t: any) => t.status === 'warning') && (
                  <p>⚠️ Alguns problemas foram detectados que podem afetar o carregamento.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ImageDiagnostic;