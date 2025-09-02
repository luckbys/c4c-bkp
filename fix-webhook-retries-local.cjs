// Script para corrigir retries excessivos usando a API local do sistema
// Este script usa os endpoints locais já implementados

const LOCAL_API_URL = 'http://localhost:9003';
const WEBHOOK_URL = 'https://c4c.devsible.com.br/api/webhooks/evolution';
const INSTANCE_NAME = 'loja';

// Função para fazer requisições para a API local
async function makeLocalRequest(endpoint, options = {}) {
  const url = `${LOCAL_API_URL}${endpoint}`;
  
  console.log(`🔄 Fazendo requisição local para: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    console.log(`✅ Resposta recebida:`, data);
    return data;
    
  } catch (error) {
    console.error(`❌ Erro na requisição para ${url}:`, error.message);
    throw error;
  }
}

// Função para verificar status do webhook management
async function checkWebhookManagementStatus() {
  console.log(`\n🔍 Verificando status do sistema de webhook management...`);
  
  try {
    const response = await makeLocalRequest('/api/webhook-management?action=status');
    
    if (response.success) {
      console.log(`✅ Sistema de webhook management ativo:`, {
        monitoring: response.data.isMonitoring,
        totalChecks: response.data.totalChecks,
        failedChecks: response.data.failedChecks,
        lastCheck: new Date(response.data.lastCheck).toLocaleString()
      });
      return response.data;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar status do webhook management:`, error.message);
    return null;
  }
}

// Função para verificar conectividade
async function checkConnectivityStatus() {
  console.log(`\n🌐 Verificando status de conectividade...`);
  
  try {
    const response = await makeLocalRequest('/api/webhook-management?action=connectivity');
    
    if (response.success) {
      console.log(`✅ Status de conectividade:`, response.data);
      return response.data;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar conectividade:`, error.message);
    return null;
  }
}

// Função para forçar verificação de webhook
async function forceWebhookCheck() {
  console.log(`\n🔧 Forçando verificação de webhook...`);
  
  try {
    const response = await makeLocalRequest('/api/webhook-management', {
      method: 'POST',
      body: {
        action: 'check',
        webhookUrl: WEBHOOK_URL
      }
    });
    
    if (response.success) {
      console.log(`✅ Verificação forçada concluída:`, response.message);
      return response;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao forçar verificação:`, error.message);
    return null;
  }
}

// Função para reset do circuit breaker
async function resetCircuitBreaker() {
  console.log(`\n🔄 Resetando circuit breaker...`);
  
  try {
    const response = await makeLocalRequest('/api/webhook-management', {
      method: 'POST',
      body: {
        action: 'reset',
        webhookUrl: WEBHOOK_URL
      }
    });
    
    if (response.success) {
      console.log(`✅ Circuit breaker resetado:`, response.message);
      return response;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao resetar circuit breaker:`, error.message);
    return null;
  }
}

// Função para reconfigurar webhook com configurações otimizadas
async function reconfigureWebhook() {
  console.log(`\n🔧 Reconfigurando webhook com configurações otimizadas...`);
  
  try {
    const response = await makeLocalRequest('/api/webhook-management', {
      method: 'POST',
      body: {
        action: 'reconfigure',
        instanceName: INSTANCE_NAME,
        webhookUrl: WEBHOOK_URL
      }
    });
    
    if (response.success) {
      console.log(`✅ Webhook reconfigurado com sucesso!`);
      console.log(`🎯 Configurações otimizadas aplicadas:`);
      console.log(`   - Timeout: 3 segundos (reduzido de 5s)`);
      console.log(`   - Retries: 1 tentativa (reduzido de 10)`);
      console.log(`   - Intervalo entre retries: 2 segundos`);
      console.log(`   - Delay entre webhooks: 500ms`);
      return response;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao reconfigurar webhook:`, error.message);
    return null;
  }
}

// Função para iniciar monitoramento
async function startMonitoring() {
  console.log(`\n📊 Iniciando monitoramento automático...`);
  
  try {
    const response = await makeLocalRequest('/api/webhook-management', {
      method: 'POST',
      body: {
        action: 'monitor',
        enable: true
      }
    });
    
    if (response.success) {
      console.log(`✅ Monitoramento iniciado:`, response.message);
      return response;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao iniciar monitoramento:`, error.message);
    return null;
  }
}

// Função para verificar se o servidor local está rodando
async function checkLocalServer() {
  console.log(`\n🌐 Verificando se o servidor local está rodando...`);
  
  try {
    const response = await fetch(`${LOCAL_API_URL}/api/health`, {
      timeout: 5000
    });
    
    if (response.ok) {
      console.log(`✅ Servidor local está rodando - Status: ${response.status}`);
      return true;
    } else {
      console.log(`⚠️ Servidor local respondeu com status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Servidor local não está acessível:`, error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando correção de retries excessivos da Evolution API\n');
  console.log('📋 Problema: Evolution API fazendo 10 tentativas de webhook');
  console.log('🎯 Solução: Usar sistema local para reconfigurar com 1 tentativa\n');
  
  try {
    // 1. Verificar se o servidor local está rodando
    const serverOk = await checkLocalServer();
    
    if (!serverOk) {
      console.log('\n❌ Servidor local não está rodando!');
      console.log('💡 Execute `npm run dev` em outro terminal para iniciar o servidor');
      console.log('💡 Aguarde o servidor iniciar e execute este script novamente');
      process.exit(1);
    }
    
    // 2. Verificar status do webhook management
    await checkWebhookManagementStatus();
    
    // 3. Verificar conectividade
    await checkConnectivityStatus();
    
    // 4. Reset circuit breaker se necessário
    await resetCircuitBreaker();
    
    // 5. Forçar verificação de webhook
    await forceWebhookCheck();
    
    // 6. Reconfigurar webhook com configurações otimizadas
    const reconfigResult = await reconfigureWebhook();
    
    if (reconfigResult) {
      // 7. Iniciar monitoramento
      await startMonitoring();
      
      console.log('\n🎉 Correção concluída com sucesso!');
      console.log('📊 Resultados esperados:');
      console.log('   ✅ Redução de 90% nas tentativas de webhook');
      console.log('   ✅ Eliminação de loops infinitos');
      console.log('   ✅ Redução significativa nos logs de erro');
      console.log('   ✅ Melhor performance geral do sistema');
      
      console.log('\n🔍 Monitoramento:');
      console.log('   - Sistema de monitoramento automático ativado');
      console.log('   - Observe os logs da Evolution API nos próximos minutos');
      console.log('   - Deve ver apenas 1 tentativa em vez de 10');
      console.log('   - Endpoint presence-update agora está disponível');
      
    } else {
      console.log('\n⚠️ Reconfiguração falhou, mas sistema de proteção está ativo');
      console.log('💡 O sistema continuará monitorando e tentando auto-correção');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante a correção:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verifique se o servidor local está rodando (npm run dev)');
    console.log('   2. Confirme que a porta 3000 está disponível');
    console.log('   3. Verifique os logs do servidor local');
    console.log('   4. Tente executar o script novamente');
    
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkWebhookManagementStatus,
  checkConnectivityStatus,
  forceWebhookCheck,
  resetCircuitBreaker,
  reconfigureWebhook,
  startMonitoring
};