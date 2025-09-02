// Script para testar se a auto-atribuição automática foi desabilitada
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, deleteDoc, doc } = require('firebase/firestore');
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

const BASE_URL = 'http://localhost:4000';
const TEST_PHONE = '5512999999999'; // Número de teste que não deve ter agente
const REMOTE_JID = `${TEST_PHONE}@s.whatsapp.net`;
const INSTANCE_NAME = 'loja';

async function testNoAutoAssignment() {
  try {
    console.log('🧪 TESTE: Verificando se auto-atribuição automática foi desabilitada');
    console.log('=' .repeat(70));
    console.log(`📱 Telefone de teste: ${TEST_PHONE}`);
    console.log(`🆔 RemoteJid: ${REMOTE_JID}`);
    console.log(`🏪 Instância: ${INSTANCE_NAME}\n`);
    
    // 1. Limpar tickets existentes para este número de teste
    console.log('1. 🧹 Limpando tickets existentes para o número de teste...');
    await cleanupTestTickets();
    
    // 2. Verificar que não há tickets com agente atribuído para este número
    console.log('\n2. 🔍 Verificando que não há tickets com agente para este número...');
    const existingTickets = await checkExistingTickets();
    
    if (existingTickets.length > 0) {
      console.log(`❌ Ainda existem ${existingTickets.length} tickets para este número`);
      return;
    }
    
    console.log('✅ Nenhum ticket existente encontrado');
    
    // 3. Simular mensagem de cliente novo (sem agente atribuído)
    console.log('\n3. 📨 Simulando mensagem de cliente novo...');
    const messageData = {
      instance: INSTANCE_NAME,
      data: {
        key: {
          id: `test_no_auto_${Date.now()}`,
          remoteJid: REMOTE_JID,
          fromMe: false
        },
        messageType: 'conversation',
        message: {
          conversation: 'Olá, preciso de ajuda - teste de auto-atribuição'
        },
        messageTimestamp: Date.now(),
        pushName: 'Cliente Teste Auto-Atribuição'
      }
    };
    
    console.log('📤 Enviando mensagem para webhook...');
    console.log(`   ID: ${messageData.data.key.id}`);
    console.log(`   Conteúdo: ${messageData.data.message.conversation}`);
    
    // 4. Enviar mensagem para o webhook
    const webhookResponse = await axios.post(
      `${BASE_URL}/api/webhooks/evolution/messages-upsert`,
      messageData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (webhookResponse.status === 200) {
      console.log('✅ Webhook processou a mensagem com sucesso');
    } else {
      console.log(`❌ Erro no webhook: ${webhookResponse.status}`);
      return;
    }
    
    // 5. Aguardar processamento
    console.log('\n⏳ Aguardando 3 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. Verificar se algum agente foi atribuído automaticamente
    console.log('\n4. 🔍 Verificando se algum agente foi atribuído automaticamente...');
    const ticketsAfter = await checkExistingTickets();
    
    console.log(`📊 Tickets encontrados após mensagem: ${ticketsAfter.length}`);
    
    if (ticketsAfter.length === 0) {
      console.log('✅ SUCESSO: Nenhum ticket foi criado (comportamento esperado)');
      console.log('✅ Auto-atribuição automática foi desabilitada corretamente');
    } else {
      // Verificar se algum ticket tem agente atribuído
      const ticketsWithAgent = ticketsAfter.filter(ticket => ticket.assignedAgent);
      
      if (ticketsWithAgent.length === 0) {
        console.log('✅ SUCESSO: Ticket criado mas SEM agente atribuído automaticamente');
        console.log('✅ Auto-atribuição automática foi desabilitada corretamente');
        
        // Mostrar detalhes do ticket criado
        ticketsAfter.forEach((ticket, index) => {
          console.log(`\n📋 Ticket ${index + 1}:`);
          console.log(`   ID: ${ticket.id}`);
          console.log(`   Status: ${ticket.status}`);
          console.log(`   Cliente: ${ticket.clientName || 'N/A'}`);
          console.log(`   Agente atribuído: ${ticket.assignedAgent ? 'SIM' : 'NÃO'}`);
          console.log(`   Auto Response: ${ticket.aiConfig?.autoResponse || 'N/A'}`);
        });
      } else {
        console.log('❌ FALHA: Agente foi atribuído automaticamente!');
        console.log('❌ Auto-atribuição automática ainda está ativa');
        
        ticketsWithAgent.forEach((ticket, index) => {
          console.log(`\n🚨 Ticket ${index + 1} com agente atribuído:`);
          console.log(`   ID: ${ticket.id}`);
          console.log(`   Agente: ${ticket.assignedAgent.name} (${ticket.assignedAgent.type})`);
          console.log(`   Auto Response: ${ticket.aiConfig?.autoResponse}`);
        });
      }
    }
    
    // 7. Limpeza final
    console.log('\n5. 🧹 Limpeza final...');
    await cleanupTestTickets();
    console.log('✅ Limpeza concluída');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

async function cleanupTestTickets() {
  try {
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('remoteJid', '==', REMOTE_JID)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('   Nenhum ticket de teste para limpar');
      return;
    }
    
    console.log(`   Removendo ${querySnapshot.size} tickets de teste...`);
    
    for (const docSnapshot of querySnapshot.docs) {
      await deleteDoc(doc(db, 'tickets', docSnapshot.id));
    }
    
    console.log('   ✅ Tickets de teste removidos');
    
  } catch (error) {
    console.error('   ❌ Erro ao limpar tickets:', error.message);
  }
}

async function checkExistingTickets() {
  try {
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('remoteJid', '==', REMOTE_JID)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
  } catch (error) {
    console.error('Erro ao verificar tickets existentes:', error.message);
    return [];
  }
}

// Executar teste
testNoAutoAssignment().catch(console.error);