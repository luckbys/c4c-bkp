// Teste simples de deduplicação usando a API do webhook
const https = require('https');
const http = require('http');

// Configuração do teste
const WEBHOOK_URL = 'http://localhost:9003/api/webhooks/evolution/messages-upsert';
const TEST_INSTANCE = 'test-instance';
const TEST_REMOTE_JID = '5511999999999@s.whatsapp.net';

// Função para enviar webhook de teste
function sendTestWebhook(messageData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(messageData);
    
    const options = {
      hostname: 'localhost',
      port: 9003,
      path: '/api/webhooks/evolution/messages-upsert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Teste de deduplicação de mensagens
async function testMessageDeduplication() {
  console.log('🧪 Testando deduplicação de mensagens via webhook...');
  
  const testMessage = {
    instance: TEST_INSTANCE,
    data: {
      key: {
        remoteJid: TEST_REMOTE_JID,
        fromMe: false,
        id: 'test-msg-001'
      },
      messageType: 'conversation',
      message: {
        conversation: 'Mensagem de teste para deduplicação'
      },
      messageTimestamp: Date.now(),
      pushName: 'Teste User'
    }
  };
  
  try {
    // Primeira tentativa - deve processar normalmente
    console.log('📝 Enviando primeira mensagem...');
    const response1 = await sendTestWebhook(testMessage);
    console.log('✅ Primeira resposta:', response1.statusCode);
    
    // Aguardar um pouco para garantir processamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Segunda tentativa - deve ser bloqueada pela deduplicação
    console.log('📝 Enviando segunda mensagem (duplicada)...');
    const response2 = await sendTestWebhook(testMessage);
    console.log('✅ Segunda resposta:', response2.statusCode);
    
    if (response1.statusCode === 200 && response2.statusCode === 200) {
      console.log('✅ Ambas as requisições foram aceitas - verificar logs para deduplicação');
    } else {
      console.log('❌ Erro nas requisições');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de deduplicação:', error.message);
  }
}

// Teste de múltiplas mensagens rápidas
async function testRapidMessages() {
  console.log('\n🧪 Testando múltiplas mensagens rápidas...');
  
  const baseMessageId = 'rapid-test-' + Date.now();
  const promises = [];
  
  // Enviar 5 mensagens rapidamente com o mesmo ID
  for (let i = 0; i < 5; i++) {
    const testMessage = {
      instance: TEST_INSTANCE,
      data: {
        key: {
          remoteJid: TEST_REMOTE_JID,
          fromMe: false,
          id: baseMessageId // Mesmo ID para todas
        },
        messageType: 'conversation',
        message: {
          conversation: 'Mensagem rápida para teste'
        },
        messageTimestamp: Date.now(),
        pushName: 'Rapid User'
      }
    };
    
    promises.push(sendTestWebhook(testMessage));
  }
  
  try {
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.statusCode === 200).length;
    
    console.log(`✅ ${successCount}/5 mensagens processadas com sucesso`);
    console.log('📝 Verificar logs para confirmar que apenas uma foi salva no banco');
    
  } catch (error) {
    console.error('❌ Erro no teste de mensagens rápidas:', error.message);
  }
}

// Verificar se o servidor está rodando
async function checkServerStatus() {
  console.log('🔍 Verificando status do servidor...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 9003,
      path: '/api/tickets?instance=loja',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log('✅ Servidor está respondendo');
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log('❌ Servidor não está acessível:', error.message);
      console.log('💡 Certifique-se de que o servidor está rodando com: npm run dev');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Timeout ao conectar com o servidor');
      resolve(false);
    });
    
    req.end();
  });
}

// Executar todos os testes
async function runDeduplicationTests() {
  console.log('🚀 Iniciando testes de deduplicação...\n');
  
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    console.log('❌ Não é possível executar testes sem o servidor rodando');
    return;
  }
  
  await testMessageDeduplication();
  await testRapidMessages();
  
  console.log('\n✅ Testes de deduplicação concluídos!');
  console.log('📝 Verifique os logs do servidor para confirmar que a deduplicação está funcionando');
}

// Executar se chamado diretamente
if (require.main === module) {
  runDeduplicationTests().catch(console.error);
}

module.exports = {
  testMessageDeduplication,
  testRapidMessages,
  runDeduplicationTests
};