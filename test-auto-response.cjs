// Script para testar resposta automática do agente IA
const axios = require('axios');

const BASE_URL = 'http://localhost:9004';
const TICKET_PHONE = '5512981022013';
const REMOTE_JID = `${TICKET_PHONE}@s.whatsapp.net`;
const INSTANCE_NAME = 'loja';

async function testAutoResponse() {
  try {
    console.log('🧪 Testando resposta automática do agente IA...');
    console.log(`📱 Telefone: ${TICKET_PHONE}`);
    console.log(`🆔 RemoteJid: ${REMOTE_JID}`);
    console.log(`🏪 Instância: ${INSTANCE_NAME}\n`);
    
    // 1. Verificar se o ticket existe e tem agente atribuído
    console.log('1. 🔍 Verificando configuração do ticket...');
    
    // Simular dados de mensagem recebida
    const messageData = {
      instance: INSTANCE_NAME,
      data: {
        key: {
          id: `test_${Date.now()}`,
          remoteJid: REMOTE_JID,
          fromMe: false
        },
        messageType: 'conversation',
        message: {
          conversation: 'Olá, preciso de ajuda com meu pedido'
        },
        messageTimestamp: Date.now(),
        pushName: 'Cliente Teste'
      }
    };
    
    console.log('📨 Dados da mensagem simulada:');
    console.log(`   ID: ${messageData.data.key.id}`);
    console.log(`   Conteúdo: ${messageData.data.message.conversation}`);
    console.log(`   De mim: ${messageData.data.key.fromMe}`);
    console.log(`   Timestamp: ${new Date(messageData.data.messageTimestamp).toLocaleString()}\n`);
    
    // 2. Enviar mensagem para o webhook
    console.log('2. 📤 Enviando mensagem para webhook...');
    
    const webhookResponse = await axios.post(
      `${BASE_URL}/api/webhooks/evolution/messages-upsert`,
      messageData,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'test-key'
        },
        timeout: 10000
      }
    );
    
    if (webhookResponse.status === 200) {
      console.log('✅ Webhook processado com sucesso!');
      console.log(`   Status: ${webhookResponse.status}`);
      console.log(`   Resposta: ${JSON.stringify(webhookResponse.data)}\n`);
    } else {
      console.log(`❌ Erro no webhook: ${webhookResponse.status}`);
      return;
    }
    
    // 3. Aguardar processamento
    console.log('3. ⏳ Aguardando processamento do agente IA...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Verificar logs do servidor
    console.log('4. 📋 Verificando logs do servidor...');
    console.log('   Verifique o terminal do servidor para logs como:');
    console.log('   🎯 [EXISTING-AGENT] Verificando agente IA atribuído...');
    console.log('   🎯 [EXISTING-AGENT] Ticket ativo encontrado...');
    console.log('   🤖 [TICKET-AGENT] Processando resposta...');
    console.log('   📤 [TICKET-AGENT] Resposta enviada via WhatsApp...');
    
    console.log('\n✅ Teste de resposta automática concluído!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique os logs do servidor para confirmar o processamento');
    console.log('   2. Verifique se a resposta foi enviada via WhatsApp');
    console.log('   3. Verifique se a interação foi registrada no Firestore');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verifique se o servidor está rodando na porta 9004');
    console.log('   2. Verifique se o ticket 5512981022013 existe');
    console.log('   3. Verifique se o agente IA está atribuído ao ticket');
    console.log('   4. Verifique se autoResponse está habilitado');
    console.log('   5. Verifique os logs do servidor para erros');
  }
}

// Executar teste
if (require.main === module) {
  testAutoResponse();
}

module.exports = { testAutoResponse };