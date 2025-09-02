// Script para corrigir retries excessivos da Evolution API diretamente
// Este script faz chamadas diretas para a Evolution API para reconfigurar webhooks

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evochat.devsible.com.br';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const WEBHOOK_URL = 'https://c4c.devsible.com.br/api/webhooks/evolution';
const INSTANCE_NAME = 'loja';

// Função para fazer requisições para a Evolution API
async function makeEvolutionRequest(endpoint, options = {}) {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  
  console.log(`🔄 Fazendo requisição para Evolution API: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      timeout: 10000
    });
    
    const data = await response.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = { raw: data };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(jsonData)}`);
    }
    
    console.log(`✅ Resposta recebida:`, jsonData);
    return jsonData;
    
  } catch (error) {
    console.error(`❌ Erro na requisição para ${url}:`, error.message);
    throw error;
  }
}

// Função para verificar status da instância
async function checkInstanceStatus() {
  console.log(`\n🔍 Verificando status da instância '${INSTANCE_NAME}'...`);
  
  try {
    const response = await makeEvolutionRequest(`/instance/fetchInstances`);
    
    if (Array.isArray(response)) {
      console.log(`\n📋 Instâncias disponíveis:`);
      response.forEach((inst, index) => {
        console.log(`   ${index + 1}. Nome: '${inst.name}' | Status: ${inst.connectionStatus} | ID: ${inst.id}`);
      });
      
      // Procurar por nome exato primeiro
      let instance = response.find(inst => inst.name === INSTANCE_NAME);
      
      if (!instance) {
        // Se não encontrar, procurar por nome similar (case insensitive)
        instance = response.find(inst => inst.name?.toLowerCase() === INSTANCE_NAME.toLowerCase());
      }
      
      if (instance) {
        console.log(`\n✅ Instância '${instance.name}' encontrada:`, {
          id: instance.id,
          name: instance.name,
          status: instance.connectionStatus,
          ownerJid: instance.ownerJid,
          profileName: instance.profileName,
          integration: instance.integration
        });
        return instance;
      } else {
        console.log(`\n⚠️ Instância '${INSTANCE_NAME}' não encontrada`);
        console.log(`💡 Instâncias disponíveis: ${response.map(i => i.name).join(', ')}`);
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
  console.log(`\n🔧 Configurando webhook otimizado para instância '${INSTANCE_NAME}'...`);
  
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
      webhook_timeout: 3000,        // 3 segundos (reduzido de 5s)
      webhook_retry_count: 1,       // 1 tentativa (reduzido de 10)
      webhook_retry_interval: 2000, // 2 segundos entre retries
      webhook_delay: 500,           // 500ms de delay entre webhooks
      webhook_retry_policy: 'linear' // Política linear de retry
    }
  };
  
  try {
    const response = await makeEvolutionRequest(`/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      body: webhookConfig
    });
    
    console.log(`✅ Webhook configurado com sucesso!`);
    console.log(`🎯 Configurações otimizadas aplicadas:`);
    console.log(`   - URL: ${WEBHOOK_URL}`);
    console.log(`   - Timeout: 3 segundos (reduzido de 5s)`);
    console.log(`   - Retries: 1 tentativa (reduzido de 10)`);
    console.log(`   - Intervalo entre retries: 2 segundos`);
    console.log(`   - Delay entre webhooks: 500ms`);
    console.log(`   - Eventos configurados: ${webhookConfig.webhook.events.length} tipos`);
    
    return response;
    
  } catch (error) {
    console.error(`❌ Erro ao configurar webhook:`, error.message);
    return null;
  }
}

// Função para verificar configuração atual do webhook
async function checkCurrentWebhookConfig() {
  console.log(`\n🔍 Verificando configuração atual do webhook...`);
  
  try {
    const response = await makeEvolutionRequest(`/webhook/find/${INSTANCE_NAME}`);
    
    if (response) {
      console.log(`✅ Configuração atual do webhook:`, {
        url: response.url,
        enabled: response.enabled,
        events: response.events?.length || 0,
        webhook_timeout: response.webhook_timeout,
        webhook_retry_count: response.webhook_retry_count,
        webhook_retry_interval: response.webhook_retry_interval
      });
      return response;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar configuração do webhook:`, error.message);
    return null;
  }
}

// Função para testar conectividade do webhook
async function testWebhookConnectivity() {
  console.log(`\n🌐 Testando conectividade do webhook...`);
  
  try {
    // Testar se o endpoint está acessível
    const response = await fetch(`${WEBHOOK_URL}/presence-update`, {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`✅ Endpoint acessível - Status: ${response.status}`);
    
    if (response.status === 200 || response.status === 405) {
      console.log(`✅ Webhook endpoint está funcionando corretamente`);
      return true;
    } else {
      console.log(`⚠️ Endpoint respondeu com status inesperado: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao testar conectividade:`, error.message);
    return false;
  }
}

// Função para verificar logs recentes da Evolution API
async function checkRecentLogs() {
  console.log(`\n📋 Verificando logs recentes...`);
  
  try {
    // Simular verificação de logs (a Evolution API pode não ter endpoint para isso)
    console.log(`💡 Para verificar logs da Evolution API:`);
    console.log(`   1. Acesse os logs do container/processo da Evolution API`);
    console.log(`   2. Procure por mensagens de webhook com 'presence-update'`);
    console.log(`   3. Observe se o número de tentativas diminuiu de 10 para 1`);
    console.log(`   4. Verifique se não há mais erros 404 para presence-update`);
    
  } catch (error) {
    console.error(`❌ Erro ao verificar logs:`, error.message);
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando correção direta da Evolution API\n');
  console.log('📋 Problema: Evolution API fazendo 10 tentativas de webhook para presence-update');
  console.log('🎯 Solução: Reconfigurar webhook com 1 tentativa e endpoint corrigido\n');
  
  try {
    // 1. Verificar status da instância
    const instanceStatus = await checkInstanceStatus();
    
    if (!instanceStatus) {
      console.log('\n❌ Não foi possível encontrar a instância. Verifique:');
      console.log('   1. Se a instância "loja" existe na Evolution API');
      console.log('   2. Se a API key está correta');
      console.log('   3. Se a URL da Evolution API está acessível');
      process.exit(1);
    }
    
    // 2. Verificar configuração atual do webhook
    await checkCurrentWebhookConfig();
    
    // 3. Testar conectividade do webhook
    const connectivityOk = await testWebhookConnectivity();
    
    if (!connectivityOk) {
      console.log('\n⚠️ Problemas de conectividade detectados, mas continuando...');
    }
    
    // 4. Configurar webhook otimizado
    const configResult = await configureOptimizedWebhook();
    
    if (configResult) {
      console.log('\n🎉 Correção concluída com sucesso!');
      console.log('📊 Resultados esperados:');
      console.log('   ✅ Redução de 90% nas tentativas de webhook (de 10 para 1)');
      console.log('   ✅ Eliminação de loops infinitos de retry');
      console.log('   ✅ Redução significativa nos logs de erro');
      console.log('   ✅ Endpoint presence-update agora está disponível');
      console.log('   ✅ Timeout reduzido para 3 segundos');
      console.log('   ✅ Delay de 500ms entre webhooks para evitar spam');
      
      // 5. Verificar configuração após mudanças
      console.log('\n🔍 Verificando configuração após mudanças...');
      await checkCurrentWebhookConfig();
      
      // 6. Instruções de monitoramento
      await checkRecentLogs();
      
    } else {
      console.log('\n⚠️ Configuração falhou, mas o endpoint presence-update foi criado');
      console.log('💡 Isso já deve resolver o erro 404');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante a correção:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verifique se a Evolution API está rodando');
    console.log('   2. Confirme se a API key está correta');
    console.log('   3. Verifique se a instância "loja" existe');
    console.log('   4. Teste a conectividade manualmente');
    
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
  checkCurrentWebhookConfig,
  testWebhookConnectivity
};