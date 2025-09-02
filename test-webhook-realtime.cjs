// Script para testar webhook em tempo real com monitoramento completo
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, orderBy, limit, onSnapshot } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BASE_URL = 'http://localhost:9003';

// Ticket específico para teste (do usuário que reportou o problema)
const TEST_TICKET_PHONE = '5512981022013@s.whatsapp.net';

async function testWebhookRealtime() {
  console.log('🔍 TESTE DE WEBHOOK EM TEMPO REAL');
  console.log('=' .repeat(60));
  console.log(`📱 Testando com número: ${TEST_TICKET_PHONE}`);
  
  try {
    // 1. Encontrar o ticket específico
    console.log('\n1. 🔍 BUSCANDO TICKET ESPECÍFICO...');
    const ticket = await findTicketByPhone(TEST_TICKET_PHONE);
    
    if (!ticket) {
      console.log('❌ Ticket não encontrado para este número');
      return;
    }
    
    console.log(`✅ Ticket encontrado: ${ticket.id}`);
    console.log(`   📊 Status: ${ticket.status}`);
    console.log(`   🤖 Agente: ${ticket.assignedAgent?.name} (${ticket.assignedAgent?.type})`);
    console.log(`   🔧 Auto Response: ${ticket.aiConfig?.autoResponse}`);
    
    // 2. Configurar listeners em tempo real
    console.log('\n2. 🎧 CONFIGURANDO LISTENERS EM TEMPO REAL...');
    setupRealtimeListeners(ticket.id);
    
    // 3. Aguardar um pouco para os listeners se conectarem
    console.log('⏳ Aguardando 2 segundos para configurar listeners...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Enviar webhook de teste
    console.log('\n3. 📤 ENVIANDO WEBHOOK DE TESTE...');
    const success = await sendTestWebhook(ticket);
    
    if (success) {
      console.log('✅ Webhook enviado com sucesso');
      console.log('\n⏳ Monitorando por 30 segundos...');
      console.log('   (Pressione Ctrl+C para parar)');
      
      // Aguardar 30 segundos monitorando
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log('\n⏰ Tempo de monitoramento finalizado');
    } else {
      console.log('❌ Falha ao enviar webhook');
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

async function findTicketByPhone(phone) {
  try {
    const ticketsRef = collection(db, 'tickets');
    
    // Tentar diferentes formatos do número
    const phoneVariations = [
      phone,
      phone.replace('@s.whatsapp.net', ''),
      `${phone.replace('@s.whatsapp.net', '')}@s.whatsapp.net`
    ];
    
    for (const phoneVar of phoneVariations) {
      // Buscar por client.id
      let q = query(
        ticketsRef,
        where('client.id', '==', phoneVar),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      
      let querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      
      // Buscar por remoteJid
      q = query(
        ticketsRef,
        where('remoteJid', '==', phoneVar),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      
      querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    return null;
  }
}

function setupRealtimeListeners(ticketId) {
  console.log('   🎧 Configurando listener para mensagens...');
  
  // Listener para mensagens do ticket
  const ticketRef = collection(db, 'tickets');
  const ticketQuery = query(ticketRef, where('__name__', '==', ticketId));
  
  onSnapshot(ticketQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'modified') {
        const data = change.doc.data();
        console.log('\n📝 TICKET ATUALIZADO:');
        console.log(`   ⏰ ${new Date().toLocaleTimeString('pt-BR')}`);
        
        if (data.messages && data.messages.length > 0) {
          const lastMessage = data.messages[data.messages.length - 1];
          console.log(`   💬 Nova mensagem: "${lastMessage.content?.substring(0, 100)}..."`);
          console.log(`   👤 De: ${lastMessage.fromMe ? 'Empresa' : 'Cliente'}`);
          console.log(`   🆔 ID: ${lastMessage.id}`);
        }
      }
    });
  });
  
  // Listener para interações do agente
  console.log('   🎧 Configurando listener para interações do agente...');
  
  const interactionsRef = collection(db, 'agent_interactions');
  const interactionsQuery = query(
    interactionsRef,
    where('ticketId', '==', ticketId),
    orderBy('timestamp', 'desc'),
    limit(5)
  );
  
  onSnapshot(interactionsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        console.log('\n🤖 NOVA INTERAÇÃO DO AGENTE:');
        console.log(`   ⏰ ${new Date().toLocaleTimeString('pt-BR')}`);
        console.log(`   📊 Tipo: ${data.type}`);
        console.log(`   🎯 Confiança: ${data.confidence || 'N/A'}`);
        console.log(`   💬 Resposta: "${data.response?.substring(0, 100) || 'N/A'}..."`);
        
        if (data.error) {
          console.log(`   ❌ Erro: ${data.error}`);
        }
      }
    });
  });
  
  console.log('   ✅ Listeners configurados');
}

async function sendTestWebhook(ticket) {
  try {
    const webhookPayload = {
      instance: ticket.instanceName || 'loja',
      data: {
        key: {
          remoteJid: ticket.client?.id || ticket.remoteJid,
          fromMe: false,
          id: `test_realtime_${Date.now()}`
        },
        message: {
          conversation: 'Olá, preciso de ajuda com meu pedido. Este é um teste de diagnóstico.'
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: ticket.client?.name || 'Cliente Teste'
      }
    };
    
    console.log('   📋 Payload do webhook:');
    console.log(`      Instance: ${webhookPayload.instance}`);
    console.log(`      RemoteJid: ${webhookPayload.data.key.remoteJid}`);
    console.log(`      Mensagem: "${webhookPayload.data.message.conversation}"`);
    
    const response = await fetch(`${BASE_URL}/api/webhooks/evolution/messages-upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'webhook_secret_key_2024'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`   ✅ Resposta: ${response.status} - ${responseText}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Erro: ${response.status} - ${errorText}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao enviar webhook: ${error.message}`);
    return false;
  }
}

// Executar teste
console.log('🚀 Iniciando teste de webhook em tempo real...');
console.log('📱 Número alvo: +5512981022013');
console.log('⏰ Timestamp:', new Date().toLocaleString('pt-BR'));
console.log('');

testWebhookRealtime().catch(console.error);