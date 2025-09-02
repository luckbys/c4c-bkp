/**
 * Script para monitorar logs específicos do processamento de imagens
 * Identifica falhas e padrões no sistema
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configurações de monitoramento
const LOG_PATTERNS = {
  // Padrões de sucesso
  success: [
    /📤 \[STORAGE UPLOAD\] ✅ Upload concluído/,
    /📥 \[MEDIA URL\] ✅ URL obtida/,
    /🖼️ \[IMAGE DEBUG\] Final image content/
  ],
  
  // Padrões de erro
  errors: [
    /📤 \[STORAGE UPLOAD\] ❌ Falha no upload/,
    /📥 \[MEDIA URL\] ❌ Não foi possível obter URL/,
    /❌ Erro no processo de upload/,
    /EVOLUTION_TIMEOUT/,
    /EVOLUTION_SERVER_ERROR/,
    /EVOLUTION_CLIENT_ERROR/,
    /EVOLUTION_NOT_FOUND/,
    /EVOLUTION_RATE_LIMIT/
  ],
  
  // Padrões de webhook
  webhook: [
    /📨 Message from/,
    /📝 Converted message - Type: image/,
    /🖼️ \[IMAGE DEBUG\]/
  ],
  
  // Padrões de retry
  retry: [
    /Retry attempt/,
    /executeWithRetry/,
    /evolution_media/
  ],
  
  // Padrões de timeout
  timeout: [
    /⏰ Timeout na requisição/,
    /Request timeout/,
    /ETIMEDOUT/
  ]
};

// Estatísticas de monitoramento
const stats = {
  success: 0,
  errors: 0,
  webhook: 0,
  retry: 0,
  timeout: 0,
  totalLines: 0,
  startTime: Date.now(),
  lastActivity: null,
  errorDetails: [],
  successDetails: []
};

// Função para analisar linha de log
function analyzeLine(line) {
  stats.totalLines++;
  
  // Verificar cada categoria de padrão
  for (const [category, patterns] of Object.entries(LOG_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        stats[category]++;
        stats.lastActivity = Date.now();
        
        // Capturar detalhes específicos
        if (category === 'errors') {
          stats.errorDetails.push({
            timestamp: new Date().toISOString(),
            line: line.trim(),
            pattern: pattern.source
          });
        } else if (category === 'success') {
          stats.successDetails.push({
            timestamp: new Date().toISOString(),
            line: line.trim()
          });
        }
        
        // Log em tempo real para categorias importantes
        if (category === 'errors' || category === 'timeout') {
          console.log(`🚨 [${category.toUpperCase()}] ${line.trim()}`);
        } else if (category === 'success') {
          console.log(`✅ [SUCCESS] ${line.trim()}`);
        }
        
        break;
      }
    }
  }
}

// Função para gerar relatório
function generateReport() {
  const runtime = Date.now() - stats.startTime;
  const runtimeMinutes = Math.floor(runtime / 60000);
  const runtimeSeconds = Math.floor((runtime % 60000) / 1000);
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RELATÓRIO DE MONITORAMENTO DE LOGS');
  console.log('=' .repeat(60));
  console.log(`⏱️ Tempo de monitoramento: ${runtimeMinutes}m ${runtimeSeconds}s`);
  console.log(`📄 Total de linhas analisadas: ${stats.totalLines}`);
  console.log(`🕐 Última atividade: ${stats.lastActivity ? new Date(stats.lastActivity).toLocaleTimeString() : 'Nenhuma'}`);
  
  console.log('\n📈 ESTATÍSTICAS POR CATEGORIA:');
  console.log(`✅ Sucessos: ${stats.success}`);
  console.log(`❌ Erros: ${stats.errors}`);
  console.log(`📨 Webhooks: ${stats.webhook}`);
  console.log(`🔄 Retries: ${stats.retry}`);
  console.log(`⏰ Timeouts: ${stats.timeout}`);
  
  // Taxa de sucesso
  const totalActivity = stats.success + stats.errors;
  if (totalActivity > 0) {
    const successRate = ((stats.success / totalActivity) * 100).toFixed(1);
    console.log(`\n📊 Taxa de sucesso: ${successRate}%`);
  }
  
  // Últimos erros
  if (stats.errorDetails.length > 0) {
    console.log('\n🚨 ÚLTIMOS ERROS:');
    stats.errorDetails.slice(-5).forEach((error, index) => {
      console.log(`${index + 1}. [${error.timestamp}] ${error.line}`);
    });
  }
  
  // Últimos sucessos
  if (stats.successDetails.length > 0) {
    console.log('\n✅ ÚLTIMOS SUCESSOS:');
    stats.successDetails.slice(-3).forEach((success, index) => {
      console.log(`${index + 1}. [${success.timestamp}] ${success.line}`);
    });
  }
  
  // Recomendações
  console.log('\n💡 RECOMENDAÇÕES:');
  if (stats.errors > stats.success) {
    console.log('⚠️ Alta taxa de erros detectada - investigar logs de erro');
  }
  if (stats.timeout > 0) {
    console.log('⏰ Timeouts detectados - considerar aumentar timeouts');
  }
  if (stats.retry > stats.success) {
    console.log('🔄 Muitos retries - verificar conectividade com Evolution API');
  }
  if (totalActivity === 0) {
    console.log('📭 Nenhuma atividade de processamento detectada');
    console.log('   - Verificar se há mensagens de imagem sendo recebidas');
    console.log('   - Verificar configuração de webhooks');
  }
}

// Função principal de monitoramento
function startMonitoring() {
  console.log('🔍 INICIANDO MONITORAMENTO DE LOGS');
  console.log('=' .repeat(60));
  console.log('Monitorando logs do servidor Next.js...');
  console.log('Pressione Ctrl+C para parar e gerar relatório\n');
  
  // Monitorar logs do processo npm run dev
  const logProcess = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  
  // Processar stdout
  logProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        analyzeLine(line);
      }
    });
  });
  
  // Processar stderr
  logProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        analyzeLine(line);
      }
    });
  });
  
  // Gerar relatório periódico
  const reportInterval = setInterval(() => {
    if (stats.totalLines > 0) {
      console.log('\n📊 [RELATÓRIO PERIÓDICO]');
      console.log(`Linhas: ${stats.totalLines} | Sucessos: ${stats.success} | Erros: ${stats.errors} | Webhooks: ${stats.webhook}`);
    }
  }, 30000); // A cada 30 segundos
  
  // Capturar Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Parando monitoramento...');
    clearInterval(reportInterval);
    logProcess.kill();
    generateReport();
    process.exit(0);
  });
  
  // Capturar erro do processo
  logProcess.on('error', (error) => {
    console.error('❌ Erro no processo de monitoramento:', error.message);
  });
  
  logProcess.on('exit', (code) => {
    console.log(`\n📋 Processo de monitoramento finalizado com código: ${code}`);
    clearInterval(reportInterval);
    generateReport();
  });
}

// Executar monitoramento
if (require.main === module) {
  startMonitoring();
}

module.exports = { startMonitoring, analyzeLine, generateReport, stats };
