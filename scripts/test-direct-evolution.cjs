const https = require('https');
const http = require('http');

// Configurações da Evolution API
const EVOLUTION_API_URL = 'https://evochat.devsible.com.br';
const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = 'loja';
const TEST_NUMBER = '5511999999999@s.whatsapp.net';

console.log('🧪 Testando Evolution API diretamente...');
console.log(`🌐 URL: ${EVOLUTION_API_URL}`);
console.log(`🔑 API Key: ${EVOLUTION_API_KEY ? '***configurada***' : '❌ não configurada'}`);
console.log(`📱 Instância: ${INSTANCE_NAME}`);
console.log(`📞 Número de teste: ${TEST_NUMBER}`);
console.log('\n' + '='.repeat(60));

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 15000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout (15s)'));
    });
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testEvolutionAPI() {
  try {
    // 1. Verificar se a API está online
    console.log('1️⃣ Verificando se Evolution API está online...');
    const healthResponse = await makeRequest(`${EVOLUTION_API_URL}/manager/findInstances`);
    
    if (healthResponse.status === 200) {
      console.log('✅ Evolution API está online!');
      console.log(`📊 Resposta da API:`, typeof healthResponse.data);
      
      // Verificar se a instância 'loja' existe usando endpoint específico
      console.log('🔍 Verificando instância específica...');
      const instanceResponse = await makeRequest(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`);
      
      if (instanceResponse.status === 200) {
        console.log(`📱 Instância '${INSTANCE_NAME}' encontrada - Status: ${instanceResponse.data.state}`);
      } else {
        console.log(`⚠️ Instância '${INSTANCE_NAME}' não encontrada ou erro: ${instanceResponse.status}`);
        console.log('📄 Resposta:', JSON.stringify(instanceResponse.data, null, 2));
        return;
      }
    } else {
      console.log(`❌ Evolution API offline - Status: ${healthResponse.status}`);
      return;
    }
    
    // 2. Testar envio de mensagem
    console.log('\n2️⃣ Testando envio de mensagem...');
    const messageData = {
      number: TEST_NUMBER,
      text: `Teste direto Evolution API - ${new Date().toISOString()}`
    };
    
    const sendResponse = await makeRequest(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    
    console.log(`📤 Status do envio: ${sendResponse.status}`);
    
    if (sendResponse.status === 201 || sendResponse.status === 200) {
      console.log('✅ Mensagem enviada com sucesso!');
      console.log('📋 Resposta:', JSON.stringify(sendResponse.data, null, 2));
    } else {
      console.log('❌ Falha no envio da mensagem');
      console.log('📄 Erro:', JSON.stringify(sendResponse.data, null, 2));
      
      // Analisar o erro
      if (sendResponse.status === 400) {
        console.log('\n🔍 Análise do erro 400:');
        if (sendResponse.data && sendResponse.data.response && sendResponse.data.response.message) {
          const errorMessage = sendResponse.data.response.message;
          if (Array.isArray(errorMessage) && errorMessage[0] && errorMessage[0].exists === false) {
            console.log('📞 O número de teste não existe no WhatsApp');
            console.log('💡 Isso é esperado para números de teste fictícios');
            console.log('✅ A Evolution API está funcionando corretamente!');
          }
        }
      }
    }
    
    // 3. Testar com número real (se fornecido)
    const realNumber = process.env.REAL_TEST_NUMBER;
    if (realNumber) {
      console.log('\n3️⃣ Testando com número real...');
      const realMessageData = {
        number: realNumber,
        text: `Teste real Evolution API - ${new Date().toISOString()}`
      };
      
      const realSendResponse = await makeRequest(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        body: JSON.stringify(realMessageData)
      });
      
      console.log(`📤 Status do envio real: ${realSendResponse.status}`);
      
      if (realSendResponse.status === 201 || realSendResponse.status === 200) {
        console.log('✅ Mensagem real enviada com sucesso!');
      } else {
        console.log('❌ Falha no envio da mensagem real');
        console.log('📄 Erro:', JSON.stringify(realSendResponse.data, null, 2));
      }
    }
    
  } catch (error) {
    console.log(`❌ Erro durante o teste: ${error.message}`);
  }
}

// Relatório final
async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(60));
  
  try {
    await testEvolutionAPI();
    
    console.log('\n💡 Conclusões:');
    console.log('1. Se a Evolution API está online e a instância está conectada,');
    console.log('   o problema não está na Evolution API.');
    console.log('2. Se o erro 400 "number not exists" apareceu, isso é normal');
    console.log('   para números de teste fictícios.');
    console.log('3. O problema pode estar na integração com o Firebase ou');
    console.log('   na configuração das variáveis de ambiente.');
    
    console.log('\n📋 Próximos passos:');
    console.log('1. Verificar se as variáveis de ambiente estão sendo carregadas');
    console.log('2. Verificar se o Firebase Admin SDK está configurado');
    console.log('3. Testar com um número real do WhatsApp');
    
  } catch (error) {
    console.log(`❌ Erro no relatório: ${error.message}`);
  }
}

// Executar teste
generateReport().catch(console.error);