const http = require('http');

// Configurações
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/evolution/messages-upsert';
const TARGET_PHONE = '5512981022013@s.whatsapp.net';
const INSTANCE_NAME = 'loja';

// Função para enviar webhook simulado
async function sendTestWebhook() {
  console.log('🧪 Iniciando teste de webhook de mensagem...');
  console.log(`📱 Número alvo: ${TARGET_PHONE}`);
  console.log(`🏪 Instância: ${INSTANCE_NAME}`);
  console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);
  
  // Simular mensagem recebida do Evolution API
  const webhookPayload = {
    event: 'messages.upsert',
    instance: INSTANCE_NAME,
    data: {
      key: {
        remoteJid: TARGET_PHONE,
        fromMe: false,
        id: `TEST_MESSAGE_${Date.now()}`,
        participant: undefined
      },
      messageType: 'conversation',
      message: {
        conversation: 'Olá! Preciso de ajuda com meu pedido. Podem me ajudar?'
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: 'Cliente Teste',
      status: 'RECEIVED'
    }
  };
  
  console.log('\n📤 Enviando payload do webhook:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(webhookPayload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/webhooks/evolution/messages-upsert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': 'webhook_secret_key_2024'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log(`\n📥 Resposta do webhook:`);
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers:`, res.headers);
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Body:`, responseData);
        
        if (res.statusCode === 200) {
          console.log('\n✅ Webhook processado com sucesso!');
          console.log('\n🔍 Verificando logs do servidor para resposta automática...');
          console.log('   Procure por logs com:');
          console.log('   - [EXISTING-AGENT]');
          console.log('   - [TICKET-AGENT]');
          console.log('   - "Resposta enviada via WhatsApp"');
          
          resolve({
            success: true,
            status: res.statusCode,
            response: responseData
          });
        } else {
          console.log(`\n❌ Erro no webhook: ${res.statusCode}`);
          resolve({
            success: false,
            status: res.statusCode,
            response: responseData
          });
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`\n❌ Erro na requisição: ${e.message}`);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

// Função para aguardar e verificar resposta
async function waitAndCheckResponse() {
  console.log('\n⏳ Aguardando 5 segundos para processamento...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n📋 INSTRUÇÕES PARA VERIFICAR RESPOSTA AUTOMÁTICA:');
  console.log('\n1. 📱 Verifique o WhatsApp do número 5512981022013');
  console.log('2. 🔍 Procure por uma resposta automática do agente IA');
  console.log('3. 📊 Verifique os logs do servidor Next.js');
  console.log('4. 🗄️ Verifique a coleção "agent_interactions" no Firebase');
  
  console.log('\n🔧 LOGS IMPORTANTES PARA PROCURAR:');
  console.log('   - "🎯 [EXISTING-AGENT] Ticket ativo encontrado"');
  console.log('   - "🤖 [TICKET-AGENT] Processando resposta"');
  console.log('   - "📤 [TICKET-AGENT] Resposta enviada via WhatsApp"');
  console.log('   - "⚠️ [TICKET-AGENT] Resposta não enviada - confiança baixa"');
  
  console.log('\n🚨 SE NÃO HOUVER RESPOSTA AUTOMÁTICA:');
  console.log('   1. Verifique se o servidor Next.js está rodando');
  console.log('   2. Verifique se há ticket ativo para 5512981022013');
  console.log('   3. Verifique se o agente IA está atribuído ao ticket');
  console.log('   4. Verifique se autoResponse=true na configuração');
  console.log('   5. Execute: node check-active-tickets.cjs');
}

// Executar teste
async function runTest() {
  try {
    console.log('🚀 TESTE DE RESPOSTA AUTOMÁTICA DO AGENTE IA');
    console.log('=' .repeat(50));
    
    const result = await sendTestWebhook();
    
    if (result.success) {
      await waitAndCheckResponse();
    } else {
      console.log('\n❌ Falha no webhook. Verifique se o servidor está rodando.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.log('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.log('   1. Verifique se o servidor Next.js está rodando na porta 9003');
    console.log('   2. Execute: npm run dev');
    console.log('   3. Verifique se não há firewall bloqueando a porta');
  }
}

// Executar
runTest()
  .then(() => {
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  });