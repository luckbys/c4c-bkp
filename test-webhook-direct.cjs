const fetch = require('node-fetch');

// Teste direto do webhook com logs detalhados
async function testWebhookDirect() {
  console.log('🎯 Teste Direto do Webhook - Resposta Automática');
  console.log('=' .repeat(50));
  
  try {
    // Simular webhook de mensagem para o ticket específico
    const webhookPayload = {
      instance: 'loja',
      data: {
        key: {
          id: `DIRECT_TEST_${Date.now()}`,
          remoteJid: '5512981022013@s.whatsapp.net',
          fromMe: false
        },
        messageType: 'conversation',
        message: {
          conversation: 'Teste direto do webhook - preciso de ajuda com meu pedido urgente!'
        },
        messageTimestamp: Date.now(),
        pushName: 'Teste Usuario'
      }
    };
    
    console.log('📤 Enviando webhook direto:');
    console.log('- Remote JID:', webhookPayload.data.key.remoteJid);
    console.log('- Mensagem:', webhookPayload.data.message.conversation);
    console.log('- Timestamp:', new Date(webhookPayload.data.messageTimestamp).toISOString());
    
    const startTime = Date.now();
    
    const webhookResponse = await fetch('http://localhost:9003/api/webhooks/evolution/messages-upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'webhook_secret_key_2024'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (webhookResponse.ok) {
      const responseData = await webhookResponse.json();
      
      console.log('\n✅ Webhook processado com sucesso!');
      console.log('- Status:', webhookResponse.status);
      console.log('- Duração:', duration + 'ms');
      console.log('- Resposta:', responseData);
      
      console.log('\n💡 Agora verifique os logs do servidor para:');
      console.log('1. Mensagens [EXISTING-AGENT] - processamento de agente atribuído');
      console.log('2. Mensagens [GEMINI-TICKET] - execução do Gemini');
      console.log('3. Mensagens de erro ou fallback');
      console.log('4. Tentativas de envio via Evolution API');
      
    } else {
      const errorText = await webhookResponse.text();
      console.error('❌ Erro ao processar webhook:');
      console.error('- Status:', webhookResponse.status);
      console.error('- Duração:', duration + 'ms');
      console.error('- Erro:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste
testWebhookDirect();