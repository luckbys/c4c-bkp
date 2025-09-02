const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');
const axios = require('axios');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDlvNKH-TKU5aOzNOaOJ8l8Xv8Z9Qg9X9Y",
  authDomain: "crm-c4-2024.firebaseapp.com",
  projectId: "crm-c4-2024",
  storageBucket: "crm-c4-2024.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testAgentResponseDebug() {
  try {
    console.log('🔍 [DEBUG] Iniciando teste de resposta automática do agente...');
    
    // 1. Buscar tickets com agentes atribuídos
    console.log('\n📋 [DEBUG] Buscando tickets com agentes IA atribuídos...');
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('assignedAgent.type', '==', 'ai'),
      where('status', 'in', ['open', 'pending'])
    );
    
    const ticketsSnapshot = await getDocs(q);
    console.log(`📋 [DEBUG] Encontrados ${ticketsSnapshot.size} tickets com agentes IA`);
    
    if (ticketsSnapshot.empty) {
      console.log('❌ [DEBUG] Nenhum ticket com agente IA encontrado!');
      return;
    }
    
    // 2. Analisar primeiro ticket
    const firstTicket = ticketsSnapshot.docs[0];
    const ticketData = firstTicket.data();
    
    console.log('\n🎯 [DEBUG] Analisando ticket:', {
      id: firstTicket.id,
      status: ticketData.status,
      assignedAgent: ticketData.assignedAgent,
      aiConfig: ticketData.aiConfig,
      clientPhone: ticketData.clientPhone,
      instanceId: ticketData.instanceId
    });
    
    // 3. Verificar configuração do agente
    if (!ticketData.aiConfig?.autoResponse) {
      console.log('⚠️ [DEBUG] autoResponse está desabilitado para este ticket!');
      console.log('💡 [DEBUG] Para habilitar, defina aiConfig.autoResponse = true');
    } else {
      console.log('✅ [DEBUG] autoResponse está habilitado');
    }
    
    // 4. Simular webhook de mensagem
    console.log('\n📤 [DEBUG] Simulando webhook de mensagem...');
    
    const webhookData = {
      instance: ticketData.instanceId || 'loja',
      data: {
        key: {
          remoteJid: ticketData.clientPhone,
          fromMe: false,
          id: `test_${Date.now()}`
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'Cliente Teste',
        message: {
          conversation: 'Olá, preciso de ajuda com meu pedido'
        }
      }
    };
    
    console.log('📤 [DEBUG] Dados do webhook:', JSON.stringify(webhookData, null, 2));
    
    // 5. Enviar para o webhook local
    try {
      const response = await axios.post('http://localhost:9004/api/webhooks/evolution', webhookData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ [DEBUG] Webhook enviado com sucesso:', {
        status: response.status,
        data: response.data
      });
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao enviar webhook:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
    // 6. Aguardar processamento
    console.log('\n⏳ [DEBUG] Aguardando 5 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n✅ [DEBUG] Teste concluído!');
    console.log('\n📝 [DEBUG] Próximos passos:');
    console.log('   1. Verificar logs do servidor para mensagens EXISTING-AGENT');
    console.log('   2. Verificar se o agente foi executado (logs TICKET-AGENT)');
    console.log('   3. Verificar se a resposta foi enviada via WhatsApp');
    console.log('   4. Se não funcionou, verificar configuração aiConfig.autoResponse');
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro no teste:', error);
  }
}

// Executar teste
testAgentResponseDebug().catch(console.error);