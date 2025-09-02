// Script para diagnosticar problemas no sistema
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Carregar variáveis de ambiente
require('dotenv').config();

async function diagnoseSystem() {
  console.log('🔍 Diagnóstico do Sistema CRM');
  console.log('============================\n');
  
  const baseUrl = 'http://localhost:3000';
  const results = {
    apis: {},
    evolution: {},
    firebase: {},
    redis: {}
  };
  
  // 1. Testar API de Instâncias
  console.log('1️⃣ Testando API de Instâncias...');
  try {
    const response = await fetch(`${baseUrl}/api/instancias`);
    const data = await response.json();
    
    if (response.ok) {
      results.apis.instances = {
        status: 'OK',
        count: data.instances?.length || 0,
        instances: data.instances?.map(i => ({ name: i.name, status: i.status })) || []
      };
      console.log(`   ✅ API funcionando - ${results.apis.instances.count} instâncias encontradas`);
      
      if (results.apis.instances.instances.length > 0) {
        results.apis.instances.instances.forEach(inst => {
          console.log(`      • ${inst.name}: ${inst.status}`);
        });
      }
    } else {
      results.apis.instances = { status: 'ERROR', error: data.error };
      console.log(`   ❌ Erro na API: ${data.error}`);
    }
  } catch (error) {
    results.apis.instances = { status: 'ERROR', error: error.message };
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }
  
  // 2. Testar API de Tickets (se houver instâncias)
  console.log('\n2️⃣ Testando API de Tickets...');
  const testInstance = results.apis.instances?.instances?.[0]?.name || 'loja';
  
  try {
    const response = await fetch(`${baseUrl}/api/tickets?instance=${testInstance}`);
    const data = await response.json();
    
    if (response.ok) {
      results.apis.tickets = {
        status: 'OK',
        count: data.tickets?.length || 0,
        cached: data.meta?.cached || false,
        source: data.meta?.source || 'unknown',
        responseTime: data.meta?.responseTime || 'unknown'
      };
      console.log(`   ✅ API funcionando - ${results.apis.tickets.count} tickets encontrados`);
      console.log(`      • Fonte: ${results.apis.tickets.source}`);
      console.log(`      • Cache: ${results.apis.tickets.cached ? 'HIT' : 'MISS'}`);
      console.log(`      • Tempo: ${results.apis.tickets.responseTime}`);
    } else {
      results.apis.tickets = { status: 'ERROR', error: data.error };
      console.log(`   ❌ Erro na API: ${data.error}`);
    }
  } catch (error) {
    results.apis.tickets = { status: 'ERROR', error: error.message };
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }
  
  // 3. Testar Evolution API
  console.log('\n3️⃣ Testando Evolution API...');
  try {
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionUrl || !apiKey) {
      results.evolution = { status: 'ERROR', error: 'Credenciais não configuradas' };
      console.log('   ❌ Credenciais Evolution API não configuradas');
    } else {
      const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: { 'apikey': apiKey }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.evolution = {
          status: 'OK',
          url: evolutionUrl,
          instanceCount: data.length || 0
        };
        console.log(`   ✅ Evolution API funcionando - ${results.evolution.instanceCount} instâncias`);
      } else {
        results.evolution = { status: 'ERROR', error: `HTTP ${response.status}` };
        console.log(`   ❌ Evolution API erro: HTTP ${response.status}`);
      }
    }
  } catch (error) {
    results.evolution = { status: 'ERROR', error: error.message };
    console.log(`   ❌ Evolution API erro: ${error.message}`);
  }
  
  // 4. Testar Redis
  console.log('\n4️⃣ Testando Redis...');
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/evolution`);
    const data = await response.json();
    
    if (response.ok && data.deduplication) {
      results.redis = {
        status: 'OK',
        totalEvents: data.deduplication.totalEvents,
        cacheSize: data.deduplication.cacheSize,
        filterRate: data.deduplication.filterRate
      };
      console.log(`   ✅ Redis funcionando`);
      console.log(`      • Eventos processados: ${results.redis.totalEvents}`);
      console.log(`      • Cache size: ${results.redis.cacheSize}`);
      console.log(`      • Taxa de filtro: ${results.redis.filterRate}%`);
    } else {
      results.redis = { status: 'UNKNOWN', error: 'Dados não disponíveis' };
      console.log('   ⚠️ Redis status desconhecido');
    }
  } catch (error) {
    results.redis = { status: 'ERROR', error: error.message };
    console.log(`   ❌ Redis erro: ${error.message}`);
  }
  
  // 5. Testar Firebase (indiretamente através das APIs)
  console.log('\n5️⃣ Testando Firebase...');
  if (results.apis.tickets?.status === 'OK') {
    results.firebase = {
      status: 'OK',
      source: results.apis.tickets.source,
      accessible: true
    };
    console.log('   ✅ Firebase acessível através da API de tickets');
  } else {
    results.firebase = {
      status: 'ERROR',
      error: 'Não foi possível acessar através da API de tickets'
    };
    console.log('   ❌ Firebase não acessível');
  }
  
  // Resumo
  console.log('\n📊 RESUMO DO DIAGNÓSTICO');
  console.log('========================');
  
  const components = [
    { name: 'API Instâncias', status: results.apis.instances?.status },
    { name: 'API Tickets', status: results.apis.tickets?.status },
    { name: 'Evolution API', status: results.evolution?.status },
    { name: 'Redis Cache', status: results.redis?.status },
    { name: 'Firebase', status: results.firebase?.status }
  ];
  
  components.forEach(comp => {
    const icon = comp.status === 'OK' ? '✅' : comp.status === 'ERROR' ? '❌' : '⚠️';
    console.log(`${icon} ${comp.name}: ${comp.status}`);
  });
  
  // Recomendações
  console.log('\n💡 RECOMENDAÇÕES');
  console.log('================');
  
  if (results.apis.instances?.status !== 'OK') {
    console.log('🔧 Problema com instâncias:');
    console.log('   • Verificar se Evolution API está rodando');
    console.log('   • Conferir credenciais no .env');
    console.log('   • Testar conectividade manual');
  }
  
  if (results.apis.tickets?.status !== 'OK') {
    console.log('🔧 Problema com tickets:');
    console.log('   • Verificar configuração do Firebase');
    console.log('   • Conferir se há dados no Firestore');
    console.log('   • Verificar logs do servidor');
  }
  
  if (results.redis?.status !== 'OK') {
    console.log('🔧 Problema com Redis:');
    console.log('   • Verificar se Redis está rodando na VPS');
    console.log('   • Conferir credenciais de conexão');
    console.log('   • Sistema funcionará com cache em memória');
  }
  
  const healthyComponents = components.filter(c => c.status === 'OK').length;
  const totalComponents = components.length;
  
  console.log(`\n🎯 SAÚDE DO SISTEMA: ${healthyComponents}/${totalComponents} componentes funcionando`);
  
  if (healthyComponents === totalComponents) {
    console.log('🎉 Sistema totalmente funcional!');
  } else if (healthyComponents >= totalComponents * 0.6) {
    console.log('⚠️ Sistema parcialmente funcional - alguns problemas detectados');
  } else {
    console.log('🚨 Sistema com problemas críticos - requer atenção imediata');
  }
}

// Executar diagnóstico
diagnoseSystem().catch(console.error);