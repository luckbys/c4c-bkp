// Script para corrigir os retries excessivos da Evolution API
// Este script reconfigura a instância 'loja' com configurações otimizadas

const EVOLUTION_API_URL = 'https://evochat.devsible.com.br';
const WEBHOOK_URL = 'https://c4c.devsible.com.br/api/webhooks/evolution';
const INSTANCE_NAME = 'loja';

// Função para fazer requisições para a Evolution API
async function makeEvolutionRequest(endpoint, options = {}) {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  
  console.log(`🔄 Fazendo requisição para: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY || 'SUA_API_KEY_AQUI',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      timeout: 10000 // 10 segundos timeout
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

// Função para verificar o status atual da instância
async function checkInstanceStatus() {
  console.log(`\n🔍 Verificando status da instância '${INSTANCE_NAME}'...`);
  
  try {
    const response = await makeEvolutionRequest(`/instance/fetchInstances`);
    
    if (response && Array.isArray(response)) {
      const instance = response.find(inst => inst.instance?.instanceName === INSTANCE_NAME);
      
      if (instance) {
        console.log(`✅ Instância '${INSTANCE_NAME}' encontrada:`, {
          name: instance.instance?.instanceName,
          status: instance.instance?.status,
          webhook: instance.webhook ? {
            enabled: instance.webhook.enabled,
            url: instance.webhook.url,
            events: instance.webhook.events
          } : 'Não configurado'
        });
        return instance;
      } else {
        console.log(`⚠️ Instância '${INSTANCE_NAME}' não encontrada`);
        return null;
      }
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar status da instância:`, error.message);
    return null;
  }
}

// Função para configurar webhook com configurações otimizadas
async function configureOptimizedWebhook() {
  console.log(`\n🔧 Configurando webhook otimizado para '${INSTANCE_NAME}'...`);
  
  const webhookConfig = {
    webhook: {
      enabled: true,
      url: WEBHOOK_URL,
      webhook_by_events: true,
      webhook_base64: true,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE', 
        'CHATS_UPSERT',
        'CHATS_UPDATE',
        'CONNECTION_UPDATE',
        'PRESENCE_UPDATE'
      ],
      // ⭐ CONFIGURAÇÕES OTIMIZADAS PARA REDUZIR LOOPS
      webhook_timeout: 3000,        // Reduzido de 5000 para 3000ms
      webhook_retry_count: 1,       // ⭐ REDUZIDO DE 10 PARA 1 RETRY
      webhook_retry_interval: 2000, // Aumentado de 1000 para 2000ms
      webhook_delay: 500,           // Delay entre webhooks para evitar spam
      webhook_retry_policy: 'linear' // Política linear em vez de exponencial
    }
  };
  
  try {
    const response = await makeEvolutionRequest(`/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      body: webhookConfig
    });
    
    console.log(`✅ Webhook configurado com sucesso!`);
    console.log(`🎯 Configurações aplicadas:`);
    console.log(`   - Timeout: 3 segundos (reduzido de 5s)`);
    console.log(`   - Retries: 1 tentativa (reduzido de 10)`);
    console.log(`   - Intervalo entre retries: 2 segundos`);
    console.log(`   - Delay entre webhooks: 500ms`);
    
    return response;
    
  } catch (error) {
    console.error(`❌ Erro ao configurar webhook:`, error.message);
    throw error;
  }
}

// Função para verificar conectividade do webhook
async function checkWebhookConnectivity() {
  console.log(`\n🌐 Verificando conectividade do webhook...`);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`✅ Webhook acessível - Status: ${response.status}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Webhook não acessível:`, error.message);
    return false;
  }
}

// Função para verificar logs recentes
async function checkRecentLogs() {
  console.log(`\n📋 Verificando logs recentes da instância...`);
  
  try {
    // Tentar obter logs se disponível
    const response = await makeEvolutionRequest(`/instance/logs/${INSTANCE_NAME}`);
    
    if (response && response.logs) {
      const recentErrors = response.logs
        .filter(log => log.level === 'ERROR' && log.message.includes('Tentativa'))
        .slice(-5); // Últimos 5 erros
      
      if (recentErrors.length > 0) {
        console.log(`⚠️ Erros recentes encontrados:`);
        recentErrors.forEach((log, index) => {
          console.log(`   ${index + 1}. ${log.message}`);
        });
      } else {
        console.log(`✅ Nenhum erro de retry encontrado nos logs recentes`);
      }
    }
    
  } catch (error) {
    console.log(`ℹ️ Logs não disponíveis ou erro ao acessar: ${error.message}`);
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando correção de retries excessivos da Evolution API\n');
  console.log('📋 Problema: Evolution API fazendo 10 tentativas de webhook');
  console.log('🎯 Solução: Reduzir para 1 tentativa com configurações otimizadas\n');
  
  try {
    // 1. Verificar conectividade do webhook
    const webhookOk = await checkWebhookConnectivity();
    
    if (!webhookOk) {
      console.log('⚠️ Webhook não está acessível. Verifique se o servidor está rodando.');
      console.log('💡 Dica: Execute `npm run dev` para iniciar o servidor local\n');
    }
    
    // 2. Verificar status atual da instância
    const currentStatus = await checkInstanceStatus();
    
    // 3. Configurar webhook otimizado
    await configureOptimizedWebhook();
    
    // 4. Verificar logs recentes
    await checkRecentLogs();
    
    console.log('\n🎉 Correção concluída com sucesso!');
    console.log('📊 Resultados esperados:');
    console.log('   ✅ Redução de 90% nas tentativas de webhook');
    console.log('   ✅ Eliminação de loops infinitos');
    console.log('   ✅ Redução significativa nos logs de erro');
    console.log('   ✅ Melhor performance geral do sistema');
    
    console.log('\n🔍 Monitoramento:');
    console.log('   - Observe os logs da Evolution API nos próximos minutos');
    console.log('   - Deve ver apenas 1 tentativa em vez de 10');
    console.log('   - Erros 404 devem parar após criação do endpoint presence-update');
    
  } catch (error) {
    console.error('\n❌ Erro durante a correção:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verifique se a Evolution API está rodando');
    console.log('   2. Confirme a API key no arquivo .env');
    console.log('   3. Teste a conectividade manualmente');
    console.log('   4. Verifique os logs da Evolution API');
    
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkInstanceStatus,
  configureOptimizedWebhook,
  checkWebhookConnectivity,
  checkRecentLogs
};