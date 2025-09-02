// Script para testar resposta do agente IA em ticket específico
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit, onSnapshot, doc, getDoc } = require('firebase/firestore');
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
const TARGET_PHONE = '5512981022013'; // Número do cliente que reportou o problema

async function testSpecificTicketResponse() {
  console.log('🎯 TESTE DE RESPOSTA PARA TICKET ESPECÍFICO');
  console.log('=' .repeat(60));
  console.log(`📱 Número alvo: +${TARGET_PHONE}`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  
  try {
    // 1. Buscar ticket específico
    console.log('\n1. 🔍 BUSCANDO TICKET DO CLIENTE...');
    const ticket = await findTargetTicket();
    
    if (!ticket) {
      console.log('❌ Ticket não encontrado');
      return;
    }
    
    console.log(`✅ Ticket encontrado: ${ticket.id}`);
    console.log(`   📊 Status: ${ticket.status}`);
    console.log(`   🤖 Agente: ${ticket.assignedAgent?.name} (${ticket.assignedAgent?.type})`);
    console.log(`   🔧 Auto Response: ${ticket.aiConfig?.autoResponse}`);
    console.log(`   📱 Cliente: ${ticket.client?.name}`);
    console.log(`   🏢 Instance: ${ticket.instanceName}`);
    
    // 2. Verificar configuração
    if (!ticket.assignedAgent || ticket.assignedAgent.type !== 'ai') {
      console.log('❌ Ticket não tem agente IA atribuído');
      return;
    }
    
    if (!ticket.aiConfig?.autoResponse) {
      console.log('❌ Auto response não está habilitado');
      return;
    }
    
    // 3. Configurar monitoramento
    console.log('\n2. 🎧 CONFIGURANDO MONITORAMENTO...');
    setupTicketMonitoring(ticket.id);
    
    // 4. Aguardar configuração
    console.log('⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Enviar mensagem de teste
    console.log('\n3. 📤 ENVIANDO MENSAGEM DE TESTE...');
    const success = await sendTestMessage(ticket);
    
    if (success) {
      console.log('✅ Mensagem enviada com sucesso');
      console.log('\n⏳ Monitorando resposta por 30 segundos...');
      console.log('   (O agente IA deve responder automaticamente)');
      
      // Aguardar resposta
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log('\n⏰ Monitoramento finalizado');
      
      // 6. Verificar se houve resposta
      console.log('\n4. 🔍 VERIFICANDO RESULTADO...');
      await checkFinalResult(ticket.id);
      
    } else {
      console.log('❌ Falha ao enviar mensagem de teste');
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

async function findTargetTicket() {
  try {
    console.log('   📋 Listando todos os tickets recentes...');
    
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('updatedAt', 'desc'), limit(50));
    
    const querySnapshot = await getDocs(q);
    const allTickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`   📊 ${allTickets.length} tickets encontrados`);
    
    // Buscar pelo número do cliente
    const targetTicket = allTickets.find(ticket => {
      const clientId = ticket.client?.id || ticket.remoteJid || '';
      return clientId.includes(TARGET_PHONE);
    });
    
    if (targetTicket) {
      console.log(`   ✅ Ticket encontrado para ${TARGET_PHONE}`);
      return targetTicket;
    }
    
    console.log(`   ❌ Nenhum ticket encontrado para ${TARGET_PHONE}`);
    console.log('   📋 Tickets disponíveis:');
    
    allTickets.slice(0, 10).forEach((ticket, index) => {
      const clientId = ticket.client?.id || ticket.remoteJid || 'N/A';
      const clientName = ticket.client?.name || 'N/A';
      console.log(`      ${index + 1}. ${clientName} (${clientId})`);
    });
    
    return null;
    
  } catch (error) {
    console.error('   ❌ Erro ao buscar tickets:', error);
    return null;
  }
}

function setupTicketMonitoring(ticketId) {
  console.log('   🎧 Configurando listener para o ticket...');
  
  // Monitor do ticket específico
  const ticketDocRef = doc(db, 'tickets', ticketId);
  
  onSnapshot(ticketDocRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      
      if (data.messages && data.messages.length > 0) {
        const lastMessage = data.messages[data.messages.length - 1];
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        
        console.log(`\n📝 [${timestamp}] NOVA MENSAGEM NO TICKET:`);
        console.log(`   💬 Conteúdo: "${lastMessage.content?.substring(0, 150)}..."`);
        console.log(`   👤 De: ${lastMessage.fromMe ? '🏢 Empresa' : '👤 Cliente'}`);
        console.log(`   🆔 ID: ${lastMessage.id}`);
        console.log(`   ⏰ Timestamp: ${new Date(lastMessage.timestamp).toLocaleString('pt-BR')}`);
        
        if (lastMessage.fromMe) {
          console.log('   🎉 RESPOSTA DO AGENTE IA DETECTADA!');
        }
      }
    }
  });
  
  // Monitor de interações do agente
  console.log('   🎧 Configurando listener para interações...');
  
  const interactionsRef = collection(db, 'agent_interactions');
  
  onSnapshot(interactionsRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        
        if (data.ticketId === ticketId) {
          const timestamp = new Date().toLocaleTimeString('pt-BR');
          
          console.log(`\n🤖 [${timestamp}] INTERAÇÃO DO AGENTE:`);
          console.log(`   📊 Tipo: ${data.type}`);
          console.log(`   🎯 Confiança: ${data.confidence || 'N/A'}`);
          console.log(`   💬 Resposta: "${data.response?.substring(0, 100) || 'N/A'}..."`);
          
          if (data.error) {
            console.log(`   ❌ Erro: ${data.error}`);
          }
          
          if (data.type === 'auto_response') {
            console.log('   ✅ RESPOSTA AUTOMÁTICA PROCESSADA!');
          } else if (data.type === 'low_confidence') {
            console.log('   ⚠️ RESPOSTA REJEITADA POR BAIXA CONFIANÇA!');
          }
        }
      }
    });
  });
  
  console.log('   ✅ Monitoramento configurado');
}

async function sendTestMessage(ticket) {
  try {
    const webhookPayload = {
      instance: ticket.instanceName || 'loja',
      data: {
        key: {
          remoteJid: ticket.client?.id || ticket.remoteJid,
          fromMe: false,
          id: `test_specific_${Date.now()}`
        },
        message: {
          conversation: 'Olá! Preciso de ajuda com meu pedido. Vocês podem me ajudar? Este é um teste para verificar se o agente IA está funcionando.'
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: ticket.client?.name || 'Cliente Teste'
      }
    };
    
    console.log('   📋 Enviando webhook:');
    console.log(`      Instance: ${webhookPayload.instance}`);
    console.log(`      Cliente: ${webhookPayload.data.key.remoteJid}`);
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
      console.log(`   ✅ Webhook aceito: ${response.status}`);
      console.log(`   📄 Resposta: ${responseText}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Erro no webhook: ${response.status} - ${errorText}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao enviar: ${error.message}`);
    return false;
  }
}

async function checkFinalResult(ticketId) {
  try {
    console.log('   🔍 Verificando estado final do ticket...');
    
    const ticketDocRef = doc(db, 'tickets', ticketId);
    const ticketDoc = await getDoc(ticketDocRef);
    
    if (ticketDoc.exists()) {
      const data = ticketDoc.data();
      
      if (data.messages && data.messages.length > 0) {
        const messages = data.messages;
        const lastMessages = messages.slice(-3); // Últimas 3 mensagens
        
        console.log('   📝 Últimas mensagens:');
        lastMessages.forEach((msg, index) => {
          const from = msg.fromMe ? '🏢 Empresa' : '👤 Cliente';
          const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
          console.log(`      ${index + 1}. [${time}] ${from}: "${msg.content?.substring(0, 80)}..."`);
        });
        
        // Verificar se há resposta da empresa após a mensagem de teste
        const hasResponse = messages.some(msg => 
          msg.fromMe && 
          msg.timestamp > Date.now() - 60000 // Últimos 60 segundos
        );
        
        if (hasResponse) {
          console.log('\n   ✅ SUCESSO: Agente IA respondeu!');
        } else {
          console.log('\n   ❌ PROBLEMA: Agente IA não respondeu');
        }
      }
    }
    
    // Verificar interações do agente
    console.log('\n   🤖 Verificando interações do agente...');
    
    const interactionsRef = collection(db, 'agent_interactions');
    const q = query(interactionsRef, orderBy('timestamp', 'desc'), limit(5));
    
    const querySnapshot = await getDocs(q);
    const recentInteractions = querySnapshot.docs
      .map(doc => doc.data())
      .filter(interaction => 
        interaction.ticketId === ticketId &&
        interaction.timestamp > Date.now() - 60000
      );
    
    if (recentInteractions.length > 0) {
      console.log(`   📊 ${recentInteractions.length} interações recentes encontradas:`);
      recentInteractions.forEach((interaction, index) => {
        console.log(`      ${index + 1}. Tipo: ${interaction.type}, Confiança: ${interaction.confidence || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️ Nenhuma interação do agente encontrada');
      console.log('   💡 Isso indica que o webhook pode não estar acionando o agente');
    }
    
  } catch (error) {
    console.error('   ❌ Erro ao verificar resultado:', error);
  }
}

// Executar teste
console.log('🚀 Iniciando teste específico...');
testSpecificTicketResponse().catch(console.error);