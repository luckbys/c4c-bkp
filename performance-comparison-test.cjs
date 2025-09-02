const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:9003';
const TEST_CHAT_ID = 'test-chat-123';
const TEST_ITERATIONS = 10;

/**
 * Teste de performance comparativo entre APIs tradicionais e otimizadas
 */
async function runPerformanceComparison() {
  console.log('🚀 Iniciando teste de performance comparativo...');
  console.log(`📊 Executando ${TEST_ITERATIONS} iterações para cada API\n`);

  const results = {
    traditional: {
      times: [],
      errors: 0,
      totalTime: 0
    },
    optimized: {
      times: [],
      errors: 0,
      totalTime: 0
    }
  };

  // 1. Teste da API tradicional de mensagens
  console.log('📈 Testando API tradicional...');
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    try {
      const start = performance.now();
      
      await axios.get(`${BASE_URL}/api/messages`, {
        params: {
          instanceName: 'loja',
          remoteJid: '5512997748051@s.whatsapp.net',
          limit: 10
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      results.traditional.times.push(duration);
      results.traditional.totalTime += duration;
      
      process.stdout.write('.');
    } catch (error) {
      results.traditional.errors++;
      process.stdout.write('x');
    }
  }
  console.log(' Concluído\n');

  // 2. Teste da API otimizada de mensagens
  console.log('⚡ Testando API otimizada...');
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    try {
      const start = performance.now();
      
      await axios.get(`${BASE_URL}/api/messages/optimized`, {
        params: {
          chatId: TEST_CHAT_ID,
          optimized: true,
          limit: 10
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      results.optimized.times.push(duration);
      results.optimized.totalTime += duration;
      
      process.stdout.write('.');
    } catch (error) {
      results.optimized.errors++;
      process.stdout.write('x');
    }
  }
  console.log(' Concluído\n');

  // 3. Calcular estatísticas
  const traditionalStats = calculateStats(results.traditional);
  const optimizedStats = calculateStats(results.optimized);

  // 4. Exibir resultados
  console.log('📊 RESULTADOS DO TESTE DE PERFORMANCE');
  console.log('=' .repeat(50));
  
  console.log('\n🔸 API TRADICIONAL:');
  console.log(`   Tempo médio: ${traditionalStats.average.toFixed(2)}ms`);
  console.log(`   Tempo mínimo: ${traditionalStats.min.toFixed(2)}ms`);
  console.log(`   Tempo máximo: ${traditionalStats.max.toFixed(2)}ms`);
  console.log(`   Desvio padrão: ${traditionalStats.stdDev.toFixed(2)}ms`);
  console.log(`   Taxa de erro: ${((results.traditional.errors / TEST_ITERATIONS) * 100).toFixed(1)}%`);
  
  console.log('\n⚡ API OTIMIZADA:');
  console.log(`   Tempo médio: ${optimizedStats.average.toFixed(2)}ms`);
  console.log(`   Tempo mínimo: ${optimizedStats.min.toFixed(2)}ms`);
  console.log(`   Tempo máximo: ${optimizedStats.max.toFixed(2)}ms`);
  console.log(`   Desvio padrão: ${optimizedStats.stdDev.toFixed(2)}ms`);
  console.log(`   Taxa de erro: ${((results.optimized.errors / TEST_ITERATIONS) * 100).toFixed(1)}%`);
  
  // 5. Calcular melhoria
  const improvement = ((traditionalStats.average - optimizedStats.average) / traditionalStats.average) * 100;
  const errorImprovement = results.traditional.errors - results.optimized.errors;
  
  console.log('\n🎯 ANÁLISE COMPARATIVA:');
  console.log(`   Melhoria de performance: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
  console.log(`   Redução de erros: ${errorImprovement} erro(s)`);
  
  if (improvement > 0) {
    console.log(`   ✅ API otimizada é ${improvement.toFixed(1)}% mais rápida!`);
  } else {
    console.log(`   ⚠️ API otimizada é ${Math.abs(improvement).toFixed(1)}% mais lenta`);
  }
  
  // 6. Teste de cache (segunda execução)
  console.log('\n🔄 Testando eficiência do cache (segunda execução)...');
  
  const cacheTestStart = performance.now();
  await axios.get(`${BASE_URL}/api/messages/optimized`, {
    params: {
      chatId: TEST_CHAT_ID,
      optimized: true,
      limit: 10
    }
  });
  const cacheTestEnd = performance.now();
  const cacheTime = cacheTestEnd - cacheTestStart;
  
  console.log(`   Tempo com cache: ${cacheTime.toFixed(2)}ms`);
  
  if (cacheTime < optimizedStats.average) {
    const cacheImprovement = ((optimizedStats.average - cacheTime) / optimizedStats.average) * 100;
    console.log(`   ✅ Cache reduziu tempo em ${cacheImprovement.toFixed(1)}%`);
  }
  
  console.log('\n🎉 Teste de performance concluído!');
}

/**
 * Calcula estatísticas de um array de tempos
 */
function calculateStats(results) {
  if (results.times.length === 0) {
    return { average: 0, min: 0, max: 0, stdDev: 0 };
  }
  
  const times = results.times;
  const average = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  const variance = times.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  return { average, min, max, stdDev };
}

// Executar teste
runPerformanceComparison().catch(error => {
  console.error('❌ Erro durante teste de performance:', error.message);
  process.exit(1);
});