/**
 * Analisador de logs para identificar padrões de falhas no processamento de imagens
 */

const fs = require('fs');
const path = require('path');

// Padrões de análise
const PATTERNS = {
  imageProcessing: {
    success: [
      /📤 \[STORAGE UPLOAD\] ✅ Upload concluído/,
      /📥 \[MEDIA URL\] ✅ URL obtida/,
      /🖼️ \[IMAGE DEBUG\] Final image content/
    ],
    errors: [
      /📤 \[STORAGE UPLOAD\] ❌ Falha no upload/,
      /📥 \[MEDIA URL\] ❌ Não foi possível obter URL/,
      /❌ Erro no processo de upload/
    ],
    timeouts: [
      /⏰ Timeout na requisição Evolution API/,
      /EVOLUTION_TIMEOUT/,
      /Request timeout/
    ],
    retries: [
      /executeWithRetry/,
      /evolution_media/,
      /Retry attempt/
    ]
  },
  evolutionApi: {
    requests: [
      /Making Evolution API request/,
      /Evolution API response/
    ],
    errors: [
      /EVOLUTION_SERVER_ERROR/,
      /EVOLUTION_CLIENT_ERROR/,
      /EVOLUTION_NOT_FOUND/,
      /EVOLUTION_RATE_LIMIT/,
      /Evolution API error/
    ]
  },
  webhooks: [
    /📨 Message from.*image/,
    /📝 Converted message - Type: image/,
    /🖼️ \[IMAGE DEBUG\]/
  ]
};

// Função para analisar texto de log
function analyzeLogText(logText) {
  const lines = logText.split('\n');
  const analysis = {
    totalLines: lines.length,
    imageProcessing: {
      success: 0,
      errors: 0,
      timeouts: 0,
      retries: 0,
      details: []
    },
    evolutionApi: {
      requests: 0,
      errors: 0,
      details: []
    },
    webhooks: 0,
    webhookDetails: [],
    summary: {
      hasImageActivity: false,
      successRate: 0,
      commonErrors: [],
      recommendations: []
    }
  };
  
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    
    // Analisar processamento de imagens
    PATTERNS.imageProcessing.success.forEach(pattern => {
      if (pattern.test(line)) {
        analysis.imageProcessing.success++;
        analysis.imageProcessing.details.push({ type: 'success', line: line.trim(), lineNumber: index + 1 });
        analysis.summary.hasImageActivity = true;
      }
    });
    
    PATTERNS.imageProcessing.errors.forEach(pattern => {
      if (pattern.test(line)) {
        analysis.imageProcessing.errors++;
        analysis.imageProcessing.details.push({ type: 'error', line: line.trim(), lineNumber: index + 1 });
        analysis.summary.hasImageActivity = true;
      }
    });
    
    PATTERNS.imageProcessing.timeouts.forEach(pattern => {
      if (pattern.test(line)) {
        analysis.imageProcessing.timeouts++;
        analysis.imageProcessing.details.push({ type: 'timeout', line: line.trim(), lineNumber: index + 1 });
        analysis.summary.hasImageActivity = true;
      }
    });
    
    PATTERNS.imageProcessing.retries.forEach(pattern => {
      if (pattern.test(line)) {
        analysis.imageProcessing.retries++;
        analysis.imageProcessing.details.push({ type: 'retry', line: line.trim(), lineNumber: index + 1 });
      }
    });
    
    // Analisar Evolution API
    PATTERNS.evolutionApi.requests.forEach(pattern => {
      if (pattern.test(line)) {
        analysis.evolutionApi.requests++;
      }
    });
    
    PATTERNS.evolutionApi.errors.forEach(pattern => {
      if (pattern.test(line)) {
        analysis.evolutionApi.errors++;
        analysis.evolutionApi.details.push({ type: 'error', line: line.trim(), lineNumber: index + 1 });
      }
    });
    
    // Analisar webhooks
    PATTERNS.webhooks.forEach(pattern => {
      if (pattern.test(line)) {
        analysis.webhooks++;
        analysis.webhookDetails.push({ line: line.trim(), lineNumber: index + 1 });
        analysis.summary.hasImageActivity = true;
      }
    });
  });
  
  // Calcular taxa de sucesso
  const totalImageActivity = analysis.imageProcessing.success + analysis.imageProcessing.errors;
  if (totalImageActivity > 0) {
    analysis.summary.successRate = (analysis.imageProcessing.success / totalImageActivity * 100).toFixed(1);
  }
  
  // Identificar erros comuns
  const errorCounts = {};
  analysis.imageProcessing.details
    .filter(d => d.type === 'error')
    .forEach(detail => {
      const errorType = detail.line.match(/❌ ([^:]+)/)?.[1] || 'Erro desconhecido';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });
  
  analysis.summary.commonErrors = Object.entries(errorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([error, count]) => ({ error, count }));
  
  // Gerar recomendações
  if (!analysis.summary.hasImageActivity) {
    analysis.summary.recommendations.push('Nenhuma atividade de processamento de imagem detectada');
    analysis.summary.recommendations.push('Verificar se webhooks estão configurados corretamente');
    analysis.summary.recommendations.push('Testar envio de imagem via WhatsApp');
  } else {
    if (analysis.imageProcessing.errors > analysis.imageProcessing.success) {
      analysis.summary.recommendations.push('Alta taxa de erros - investigar logs detalhados');
    }
    if (analysis.imageProcessing.timeouts > 0) {
      analysis.summary.recommendations.push('Timeouts detectados - verificar conectividade com Evolution API');
    }
    if (analysis.evolutionApi.errors > 0) {
      analysis.summary.recommendations.push('Erros na Evolution API - verificar configuração e status');
    }
  }
  
  return analysis;
}

// Função para gerar relatório
function generateReport(analysis) {
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ANÁLISE DE LOGS - PROCESSAMENTO DE IMAGENS');
  console.log('=' .repeat(60));
  
  console.log(`📄 Total de linhas analisadas: ${analysis.totalLines}`);
  console.log(`🖼️ Atividade de imagem detectada: ${analysis.summary.hasImageActivity ? 'SIM' : 'NÃO'}`);
  
  if (analysis.summary.hasImageActivity) {
    console.log('\n📈 ESTATÍSTICAS DE PROCESSAMENTO:');
    console.log(`✅ Sucessos: ${analysis.imageProcessing.success}`);
    console.log(`❌ Erros: ${analysis.imageProcessing.errors}`);
    console.log(`⏰ Timeouts: ${analysis.imageProcessing.timeouts}`);
    console.log(`🔄 Retries: ${analysis.imageProcessing.retries}`);
    console.log(`📨 Webhooks de imagem: ${analysis.webhooks}`);
    
    if (analysis.summary.successRate > 0) {
      console.log(`\n📊 Taxa de sucesso: ${analysis.summary.successRate}%`);
    }
    
    // Erros comuns
    if (analysis.summary.commonErrors.length > 0) {
      console.log('\n🚨 ERROS MAIS COMUNS:');
      analysis.summary.commonErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.error}: ${error.count} ocorrências`);
      });
    }
    
    // Últimos eventos
    const recentEvents = analysis.imageProcessing.details.slice(-5);
    if (recentEvents.length > 0) {
      console.log('\n📋 ÚLTIMOS EVENTOS:');
      recentEvents.forEach((event, index) => {
        const icon = event.type === 'success' ? '✅' : event.type === 'error' ? '❌' : event.type === 'timeout' ? '⏰' : '🔄';
        console.log(`${index + 1}. ${icon} [Linha ${event.lineNumber}] ${event.line}`);
      });
    }
  }
  
  // Evolution API
  if (analysis.evolutionApi.requests > 0 || analysis.evolutionApi.errors > 0) {
    console.log('\n🔗 EVOLUTION API:');
    console.log(`📡 Requisições: ${analysis.evolutionApi.requests}`);
    console.log(`❌ Erros: ${analysis.evolutionApi.errors}`);
  }
  
  // Recomendações
  if (analysis.summary.recommendations.length > 0) {
    console.log('\n💡 RECOMENDAÇÕES:');
    analysis.summary.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Função principal
function analyzeCurrentLogs() {
  console.log('🔍 Analisando logs atuais do sistema...');
  
  // Simular análise de logs (em um cenário real, você leria de um arquivo ou stream)
  const sampleLogText = `
📊 [METRICS SUMMARY] ==========================================
🖼️ [METRICS] Total de tentativas: 0
🖼️ [METRICS] Taxa de sucesso: 0%
🖼️ [METRICS] Taxa de cache hit: 0%
🖼️ [METRICS] Tempo médio de carregamento: 0ms
🖼️ [METRICS] Conversões base64: 0
🖼️ [METRICS] Blob URLs criadas: 0
🖼️ [METRICS] Tentativas de retry: 0
  `;
  
  const analysis = analyzeLogText(sampleLogText);
  generateReport(analysis);
  
  return analysis;
}

// Executar se chamado diretamente
if (require.main === module) {
  analyzeCurrentLogs();
}

module.exports = { analyzeLogText, generateReport, analyzeCurrentLogs };
