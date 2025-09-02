const axios = require('axios');
const { config } = require('dotenv');

// Carrega variáveis de ambiente
config({ path: '.env.local' });

console.log('🧪 Teste Final - Resposta Automática com Endpoint Corrigido');
console.log('==========================================================');
console.log('');

async function testFinalAutoResponse() {
  try {
    // Simular webhook de mensagem recebida
    const webhookPayload = {
      event: 'messages.upsert',
      instance: {
        instanceName: 'loja',
        instanceId: 'test-instance'
      },
      data: {
        key: {
          remoteJid: '5512981022013@s.whatsapp.net',
          fromMe: false,
          id: `test_final_${Date.now()}`
        },
        message: {
          conversation: 'Olá, preciso de ajuda com meu pedido urgente!'
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'Cliente Teste Final'
      }
    };
    
    console.log('📨 Simulando mensagem recebida...');
    console.log('📱 Ticket:', '5512981022013');
    console.log('💬 Mensagem:', webhookPayload.data.message.conversation);
    console.log('');
    
    // Enviar para o webhook local
    const webhookUrl = 'http://localhost:9004/api/webhooks/evolution';
    console.log('🔗 Enviando para webhook:', webhookUrl);
    
    const response = await axios.post(webhookUrl, webhookPayload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-Webhook-Test'
      }
    });
    
    console.log('✅ Webhook processado com sucesso!');
    console.log('📊 Status:', response.status);
    console.log('📄 Resposta:', response.data);
    console.log('');
    
    console.log('🔍 Verificações recomendadas:');
    console.log('1. ✅ Verifique os logs do servidor para confirmar o processamento');
    console.log('2. ✅ Confirme se a resposta foi enviada via WhatsApp');
    console.log('3. ✅ Verifique se a interação foi registrada no Firestore');
    console.log('4. ✅ Confirme se o agente usou a API real ou fallback');
    console.log('');
    
    console.log('🎯 Resultado esperado:');
    console.log('- O agente deve detectar a mensagem automaticamente');
    console.log('- Deve tentar usar a API real do Evo AI com endpoint correto');
    console.log('- Se a API falhar, deve usar o fallback inteligente');
    console.log('- Deve enviar uma resposta personalizada via WhatsApp');
    console.log('- Deve registrar a interação no sistema');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error('📄 Status:', error.response.status);
      console.error('📄 Dados:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Dica: Certifique-se de que o servidor está rodando em http://localhost:9004');
      console.log('   Execute: npm run dev');
    }
  }
}

// Executar teste
testFinalAutoResponse()
  .then(() => {
    console.log('\n✅ Teste final concluído!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Verificar logs do servidor para confirmar o processamento');
    console.log('2. Testar com mensagens reais no WhatsApp');
    console.log('3. Monitorar métricas de resposta automática');
    console.log('4. Configurar alertas para falhas da API');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });