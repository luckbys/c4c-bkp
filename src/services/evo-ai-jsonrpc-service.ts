/**
 * Serviço de comunicação JSON-RPC 2.0 com Evo AI
 * Implementa o protocolo JSON-RPC 2.0 conforme especificação
 */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

interface TaskSendParams {
  message: {
    role: "user";
    parts: Array<{
      type: "text";
      text: string;
    }>;
  };
  sessionId: string;
  id: string;
}

interface TaskSendResponse {
  status: {
    message: {
      parts: Array<{
        type: "text";
        text: string;
      }>;
    };
  };
}

class EvoAiJsonRpcService {
  private baseUrl: string;
  private timeout = 30000; // 30 segundos
  private requestId = 1;

  constructor() {
    this.baseUrl = process.env.EVO_AI_JSONRPC_URL || process.env.EVO_AI_API_URL || 'https://n8n-evo-ai-frontend.05pdov.easypanel.host';
    
    console.log('🚀 [EVO-AI-JSONRPC] Serviço JSON-RPC 2.0 inicializado:', {
      baseUrl: this.baseUrl
    });
  }

  /**
   * Gera um ID único para a requisição JSON-RPC
   */
  private generateRequestId(): string {
    return `call-${this.requestId++}-${Date.now()}`;
  }

  /**
   * Faz uma chamada JSON-RPC 2.0
   */
  private async makeJsonRpcCall(
    method: string,
    params?: any,
    sessionId?: string
  ): Promise<JsonRpcResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: requestId
    };

    try {
      console.log(`🔄 [EVO-AI-JSONRPC] Enviando requisição:`, {
        method,
        id: requestId,
        sessionId,
        paramsKeys: params ? Object.keys(params) : []
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CRM-WhatsApp-Integration/1.0'
      };

      // Adicionar autenticação se disponível
      const apiKey = process.env.EVO_AI_API_KEY || process.env.EVO_AI_JWT_SECRET;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['X-API-Key'] = apiKey;
      }

      // Adicionar sessionId se fornecido
      if (sessionId) {
        headers['X-Session-ID'] = sessionId;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      console.log(`📊 [EVO-AI-JSONRPC] Resposta recebida:`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [EVO-AI-JSONRPC] Erro HTTP:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
          duration: `${duration}ms`
        });

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonResponse: JsonRpcResponse = await response.json();

      console.log(`✅ [EVO-AI-JSONRPC] Resposta JSON-RPC:`, {
        id: jsonResponse.id,
        hasResult: !!jsonResponse.result,
        hasError: !!jsonResponse.error,
        duration: `${duration}ms`
      });

      // Verificar se há erro na resposta JSON-RPC
      if (jsonResponse.error) {
        console.error(`❌ [EVO-AI-JSONRPC] Erro JSON-RPC:`, jsonResponse.error);
        throw new Error(`JSON-RPC Error ${jsonResponse.error.code}: ${jsonResponse.error.message}`);
      }

      return jsonResponse;

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`❌ [EVO-AI-JSONRPC] Timeout:`, {
          method,
          id: requestId,
          duration: `${duration}ms`,
          timeout: `${this.timeout}ms`
        });
        throw new Error(`JSON-RPC timeout após ${duration}ms`);
      }

      console.error(`❌ [EVO-AI-JSONRPC] Erro na requisição:`, {
        method,
        id: requestId,
        error: error instanceof Error ? error.message : error,
        duration: `${duration}ms`
      });

      throw error;
    }
  }

  /**
   * Implementa o método 'tasks/send' conforme especificação JSON-RPC
   */
  async sendTask(
    userMessage: string,
    sessionId: string,
    taskId?: string
  ): Promise<string> {
    try {
      console.log(`🤖 [EVO-AI-JSONRPC] Enviando task:`, {
        sessionId,
        taskId,
        messageLength: userMessage.length
      });

      const params: TaskSendParams = {
        message: {
          role: "user",
          parts: [
            {
              type: "text",
              text: userMessage
            }
          ]
        },
        sessionId,
        id: taskId || `task-${Date.now()}`
      };

      const response = await this.makeJsonRpcCall('tasks/send', params, sessionId);

      if (!response.result) {
        throw new Error('Resposta JSON-RPC sem resultado');
      }

      const taskResponse = response.result as TaskSendResponse;
      
      // Extrair texto da resposta
      const responseParts = taskResponse.status?.message?.parts || [];
      const textParts = responseParts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join(' ');

      if (!textParts.trim()) {
        throw new Error('Resposta do agente vazia');
      }

      console.log(`✅ [EVO-AI-JSONRPC] Task processada com sucesso:`, {
        sessionId,
        responseLength: textParts.length,
        partsCount: responseParts.length
      });

      return textParts;

    } catch (error) {
      console.error(`❌ [EVO-AI-JSONRPC] Erro ao enviar task:`, {
        sessionId,
        taskId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Processa mensagem com agente IA usando JSON-RPC 2.0
   */
  async processMessage(
    message: string,
    context: {
      ticketId: string;
      clientName: string;
      clientPhone: string;
      conversationHistory: string[];
      agentId: string;
      sessionId?: string;
    }
  ): Promise<{
    response: string;
    confidence: number;
    metadata: any;
  }> {
    try {
      const sessionId = context.sessionId || `session-${context.ticketId}-${Date.now()}`;
      const taskId = `task-${context.ticketId}-${Date.now()}`;

      console.log(`🔄 [EVO-AI-JSONRPC] Processando mensagem:`, {
        ticketId: context.ticketId,
        agentId: context.agentId,
        sessionId,
        taskId
      });

      // Construir contexto completo para o agente
      const contextualMessage = this.buildContextualMessage(message, context);

      // Enviar task via JSON-RPC
      const agentResponse = await this.sendTask(contextualMessage, sessionId, taskId);

      // Calcular confiança baseada no tamanho e qualidade da resposta
      const confidence = this.calculateConfidence(agentResponse, message);

      const result = {
        response: agentResponse,
        confidence,
        metadata: {
          sessionId,
          taskId,
          agentId: context.agentId,
          protocol: 'JSON-RPC 2.0',
          timestamp: new Date().toISOString(),
          processingTime: Date.now()
        }
      };

      console.log(`✅ [EVO-AI-JSONRPC] Mensagem processada:`, {
        ticketId: context.ticketId,
        confidence,
        responseLength: agentResponse.length
      });

      return result;

    } catch (error) {
      console.error(`❌ [EVO-AI-JSONRPC] Erro ao processar mensagem:`, {
        ticketId: context.ticketId,
        agentId: context.agentId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Constrói mensagem contextual para o agente
   */
  private buildContextualMessage(message: string, context: any): string {
    const parts = [
      `Cliente: ${context.clientName} (${context.clientPhone})`,
      `Ticket: ${context.ticketId}`,
      ''
    ];

    // Adicionar histórico recente se disponível
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      parts.push('Histórico da conversa:');
      const recentHistory = context.conversationHistory.slice(-5); // Últimas 5 mensagens
      recentHistory.forEach((msg: any, index: number) => {
        parts.push(`${index + 1}. ${typeof msg === 'string' ? msg : `${msg.role === 'user' ? 'Cliente' : 'Agente'}: ${msg.content}`}`);
      });
      parts.push('');
    }

    parts.push('Mensagem atual:');
    parts.push(message);

    return parts.join('\n');
  }

  /**
   * Calcula confiança da resposta
   */
  private calculateConfidence(response: string, originalMessage: string): number {
    // Algoritmo simples de confiança baseado em:
    // - Tamanho da resposta
    // - Presença de palavras-chave relevantes
    // - Estrutura da resposta

    let confidence = 0.5; // Base

    // Bonus por tamanho adequado (não muito curta, não muito longa)
    const responseLength = response.length;
    if (responseLength >= 20 && responseLength <= 500) {
      confidence += 0.2;
    }

    // Bonus por estrutura (frases completas)
    if (response.includes('.') || response.includes('!') || response.includes('?')) {
      confidence += 0.1;
    }

    // Bonus por cortesia
    const courtesyWords = ['obrigado', 'por favor', 'desculpe', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite'];
    if (courtesyWords.some(word => response.toLowerCase().includes(word))) {
      confidence += 0.1;
    }

    // Bonus por relevância (palavras em comum)
    const originalWords = originalMessage.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase().split(/\s+/);
    const commonWords = originalWords.filter(word => 
      word.length > 3 && responseWords.includes(word)
    );
    if (commonWords.length > 0) {
      confidence += Math.min(0.1, commonWords.length * 0.02);
    }

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Testa conexão com o serviço JSON-RPC
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 [EVO-AI-JSONRPC] Testando conexão JSON-RPC...');

      // Tentar uma chamada simples para testar a conectividade
      const testMessage = 'Olá, este é um teste de conexão.';
      const testSessionId = `test-${Date.now()}`;

      await this.sendTask(testMessage, testSessionId, 'test-connection');

      console.log('✅ [EVO-AI-JSONRPC] Conexão JSON-RPC estabelecida com sucesso');
      return true;

    } catch (error) {
      console.error('❌ [EVO-AI-JSONRPC] Falha na conexão JSON-RPC:', error);
      return false;
    }
  }
}

export const evoAiJsonRpcService = new EvoAiJsonRpcService();
export type { JsonRpcRequest, JsonRpcResponse, TaskSendParams, TaskSendResponse };