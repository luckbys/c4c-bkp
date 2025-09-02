// Script para testar envio e recebimento de mensagens
// Este script verifica o status da instância e testa funcionalidades básicas

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evochat.devsible.com.br';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
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
        'apikey': EVOLUTION_API_KEY,
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      timeout: 10000
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    return data;
    
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
    
    if (response && Array.isArray(response)) {
      const instance = response.find(inst => inst.name === INSTANCE_NAME);
      
      if (instance) {
        console.log(`\n✅ Instância '${instance.name}' encontrada:`);
        console.log(`   📱 Status: ${instance.connectionStatus}`);
        console.log(`   👤 Perfil: ${instance.profileName}`);
        console.log(`   📞 WhatsApp: ${instance.ownerJid}`);
        console.log(`   🔗 Integração: ${instance.integration}`);
        console.log(`   📊 Mensagens: ${instance._count?.Message || 0}`);
        console.log(`   👥 Contatos: ${instance._count?.Contact || 0}`);
        console.log(`   💬 Chats: ${instance._count?.Chat || 0}`);
        
        return instance;
      } else {
        console.log(`\n⚠️ Instância '${INSTANCE_NAME}' não encontrada`);
        return null;
      }
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar status da instância:`, error.message);
    return null;
  }
}

// Função para verificar configuração do webhook
async function checkWebhookConfig() {
  console.log(`\n🔍 Verificando configuração do webhook...`);
  
  try {
    const response = await makeEvolutionRequest(`/webhook/find/${INSTANCE_NAME}`);
    
    if (response) {
      console.log(`\n✅ Webhook configurado:`);
      console.log(`   🌐 URL: ${response.url}`);
      console.log(`   ✅ Habilitado: ${response.enabled}`);
      console.log(`   📋 Eventos: ${response.events?.length || 0} tipos`);
      console.log(`   🔄 Por eventos: ${response.webhookByEvents}`);
      console.log(`   📝 Base64: ${response.webhookBase64}`);
      console.log(`   📅 Atualizado: ${new Date(response.updatedAt).toLocaleString('pt-BR')}`);
      
      if (response.events && response.events.length > 0) {
        console.log(`   📋 Tipos de eventos:`);
        response.events.forEach(event => {
          console.log(`      - ${event}`);
        });
      }
      
      return response;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar webhook:`, error.message);
    return null;
  }
}

// Função para testar conectividade básica
async function testBasicConnectivity() {
  console.log(`\n🌐 Testando conectividade básica...`);
  
  try {
    // Testar endpoint de instâncias
    const instances = await makeEvolutionRequest('/instance/fetchInstances');
    console.log(`✅ API Evolution acessível - ${instances.length} instâncias encontradas`);
    
    // Testar webhook endpoint local
    const webhookTest = await fetch('https://c4c.devsible.com.br/api/webhooks/evolution/presence-update', {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`✅ Webhook endpoint acessível - Status: ${webhookTest.status}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Erro de conectividade:`, error.message);
    return false;
  }
}

// Função para verificar mensagens recentes
async function checkRecentMessages() {
  console.log(`\n📱 Verificando mensagens recentes...`);
  
  try {
    // Tentar buscar mensagens recentes (se a API permitir)
    console.log(`💡 Para verificar mensagens:`);
    console.log(`   1. Acesse o painel da Evolution API`);
    console.log(`   2. Verifique os logs de webhook`);
    console.log(`   3. Teste enviar uma mensagem pelo WhatsApp`);
    console.log(`   4. Observe se o webhook recebe o evento`);
    
  } catch (error) {
    console.error(`❌ Erro ao verificar mensagens:`, error.message);
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando diagnóstico de mensagens\n');
  console.log('📋 Problema: Sistema não está enviando nem recebendo mensagens');
  console.log('🎯 Objetivo: Verificar status e conectividade\n');
  
  try {
    // 1. Verificar conectividade básica
    const connectivityOk = await testBasicConnectivity();
    
    if (!connectivityOk) {
      console.log('\n❌ Problemas de conectividade detectados!');
      console.log('💡 Verifique se a Evolution API está rodando');
      process.exit(1);
    }
    
    // 2. Verificar status da instância
    const instance = await checkInstanceStatus();
    
    if (!instance) {
      console.log('\n❌ Instância não encontrada!');
      console.log('💡 Verifique se a instância "loja" existe na Evolution API');
      process.exit(1);
    }
    
    // 3. Verificar se a instância está conectada
    if (instance.connectionStatus !== 'open') {
      console.log(`\n⚠️ Instância não está conectada!`);
      console.log(`   Status atual: ${instance.connectionStatus}`);
      console.log(`💡 Soluções:`);
      console.log(`   1. Reconecte a instância no painel da Evolution API`);
      console.log(`   2. Escaneie o QR Code novamente`);
      console.log(`   3. Verifique se o WhatsApp não foi desconectado`);
    } else {
      console.log(`\n✅ Instância está conectada e funcionando!`);
    }
    
    // 4. Verificar configuração do webhook
    const webhook = await checkWebhookConfig();
    
    if (!webhook || !webhook.enabled) {
      console.log(`\n⚠️ Webhook não está configurado ou desabilitado!`);
      console.log(`💡 Execute o script de correção novamente`);
    } else {
      console.log(`\n✅ Webhook está configurado e habilitado!`);
    }
    
    // 5. Verificar mensagens recentes
    await checkRecentMessages();
    
    // 6. Resumo e próximos passos
    console.log(`\n📊 RESUMO DO DIAGNÓSTICO:`);
    console.log(`   🔗 Conectividade: ${connectivityOk ? '✅ OK' : '❌ FALHA'}`);
    console.log(`   📱 Instância: ${instance ? '✅ ENCONTRADA' : '❌ NÃO ENCONTRADA'}`);
    console.log(`   🔌 Conexão WhatsApp: ${instance?.connectionStatus === 'open' ? '✅ CONECTADA' : '❌ DESCONECTADA'}`);
    console.log(`   🌐 Webhook: ${webhook?.enabled ? '✅ HABILITADO' : '❌ DESABILITADO'}`);
    
    console.log(`\n🔧 PRÓXIMOS PASSOS:`);
    
    if (instance?.connectionStatus !== 'open') {
      console.log(`   1. 🔴 URGENTE: Reconectar a instância '${INSTANCE_NAME}' no WhatsApp`);
      console.log(`      - Acesse o painel da Evolution API`);
      console.log(`      - Vá para a instância '${INSTANCE_NAME}'`);
      console.log(`      - Clique em 'Conectar' ou 'Restart'`);
      console.log(`      - Escaneie o QR Code com o WhatsApp`);
    } else {
      console.log(`   1. ✅ Instância conectada - teste enviar uma mensagem`);
      console.log(`   2. 📱 Envie uma mensagem para o número da instância`);
      console.log(`   3. 👀 Observe os logs do servidor local (porta 9004)`);
      console.log(`   4. 🔍 Verifique se o webhook recebe os eventos`);
    }
    
    console.log(`\n💡 DICAS ADICIONAIS:`);
    console.log(`   - Servidor local rodando em: http://localhost:9004`);
    console.log(`   - Webhook configurado para: https://c4c.devsible.com.br/api/webhooks/evolution`);
    console.log(`   - Logs em tempo real no terminal do servidor`);
    console.log(`   - Configurações otimizadas: 1 retry, 3s timeout`);
    
  } catch (error) {
    console.error('\n❌ Erro durante o diagnóstico:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkInstanceStatus,
  checkWebhookConfig,
  testBasicConnectivity
};