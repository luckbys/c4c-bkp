// Script final para testar resposta automática do agente IA após correção
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit, onSnapshot, doc } = require('firebase/firestore');
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
const TARGET_PHONE = '5512981022013';

async function testFinalAIResponse() {
  console.log('🎯 TESTE FINAL - RESPOSTA AUTOMÁTICA DO AGENTE IA');
  console.log('=' .repeat(60));
  console.log(`📱 Número alvo: +${TARGET_PHONE}`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  
  try {
    // 1. Buscar ticket do cliente
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
    
    // 2. Verificar configuração
    if (!ticket.assignedAgent || ticket.assignedAgent.type !== 'ai') {
      console.log('❌ Ticket não tem agente IA atribuído');
      return;
    }
    
    if (!ticket.aiConfig?.autoResponse) {
      console.log('❌ Auto response não está habilitado');
      return;
    }
    
    // 3. Configurar monitoramento em tempo real
    console.log('\n2. 🎧 CONFIGURANDO MONITORAMENTO EM TEMPO REAL...');
    const stopMonitoring = setupRealTimeMonitoring(ticket.id);
    
    // 4. Aguardar configuração
    console.log('⏳ Aguardando 3 segundos para configurar listeners...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Enviar mensagem de teste via webhook
    console.log('\n3. 📤 ENVIANDO MENSAGEM DE TESTE VIA WEBHOOK...');
    const webhookSuccess = await sendTestWebhook(ticket);
    
    if (!webhookSuccess) {
      console.log('❌ Falha ao enviar webhook');
      return;
    }
    
    console.log('✅ Webhook enviado com sucesso');
    console.log('\n⏳ MONITORANDO RESPOSTA DO AGENTE IA POR 30 SEGUNDOS...');
    console.log('   (O agente deve processar a mensagem e responder automaticamente)');
    
    // 6. Aguardar resposta
    let responseDetected = false;
    const timeout = setTimeout(() => {
      if (!responseDetected) {
        console.log('\n⏰ TIMEOUT - Agente IA não respondeu em 30 segundos');
      }
    }, 30000);
    
    // Aguardar resposta ou timeout
    await new Promise(resolve => {
      const checkResponse = () => {
        if (responseDetected) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkResponse, 1000);
        }
      };
      checkResponse();
      
      // Resolver após 30 segundos de qualquer forma
      setTimeout(resolve, 30000);
    });
    
    // 7. Parar monitoramento
    stopMonitoring();
    
    // 8. Verificar resultado final
    console.log('\n4. 🔍 VERIFICANDO RESULTADO FINAL...');
    await checkFinalResult(ticket.id);
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

async function findTargetTicket() {
  try {
    console.log('   📋 Buscando tickets recentes...');
    
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('updatedAt', 'desc'), limit(30));
    
    const querySnapshot = await getDocs(q);
    const allTickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`   📊 ${allTickets.length} tickets encontrados`);
    
    // Buscar pelo número do cliente
    const targetTicket = allTickets.find(ticket => {
      const clientId = ticket.client?.id || ticket.remoteJid || '';
      return clientId.includes(TARGET_PHONE);
    });
    
    return targetTicket || null;
    
  } catch (error) {
    console.error('   ❌ Erro ao buscar tickets:', error);
    return null;
  }
}

function setupRealTimeMonitoring(ticketId) {
  console.log('   🎧 Configurando listeners em tempo real...');
  
  let responseDetected = false;
  
  // Monitor do ticket específico
  const ticketDocRef = doc(db, 'tickets', ticketId);
  
  const unsubscribeTicket = onSnapshot(ticketDocRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      
      if (data.messages && data.messages.length > 0) {
        const lastMessage = data.messages[data.messages.length - 1];
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        
        // Verificar se é uma mensagem recente (últimos 60 segundos)
        const messageAge = Date.now() - lastMessage.timestamp;
        if (messageAge < 60000) {
          console.log(`\n📝 [${timestamp}] NOVA MENSAGEM DETECTADA:`);
          console.log(`   💬 Conteúdo: "${lastMessage.content?.substring(0, 100)}..."`);
          console.log(`   👤 De: ${lastMessage.fromMe ? '🏢 EMPRESA (AGENTE IA)' : '👤 CLIENTE'}`);
          console.log(`   🆔 ID: ${lastMessage.id}`);
          
          if (lastMessage.fromMe) {
            console.log('   🎉 SUCESSO! RESPOSTA DO AGENTE IA DETECTADA!');
            responseDetected = true;
          }
        }
      }
    }
  });
  
  // Monitor de interações do agente
  const interactionsRef = collection(db, 'agent_interactions');
  
  const unsubscribeInteractions = onSnapshot(interactionsRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        
        if (data.ticketId === ticketId) {
          const timestamp = new Date().toLocaleTimeString('pt-BR');
          
          console.log(`\n🤖 [${timestamp}] INTERAÇÃO DO AGENTE:`);
          console.log(`   📊 Tipo: ${data.type}`);
          console.log(`   🎯 Confiança: ${data.confidence || 'N/A'}`);
          
          if (data.response) {
            console.log(`   💬 Resposta: "${data.response.substring(0, 100)}..."`);
          }
          
          if (data.error) {
            console.log(`   ❌ Erro: ${data.error}`);
          }
          
          if (data.type === 'auto_response') {
            console.log('   ✅ RESPOSTA AUTOMÁTICA PROCESSADA!');
          } else if (data.type === 'low_confidence') {
            console.log('   ⚠️ RESPOSTA REJEITADA POR BAIXA CONFIANÇA!');
          } else if (data.type === 'error') {
            console.log('   ❌ ERRO NO PROCESSAMENTO!');
          }
        }
      }
    });
  });
  
  console.log('   ✅ Monitoramento configurado');
  
  // Retornar função para parar monitoramento
  return () => {
    unsubscribeTicket();
    unsubscribeInteractions();
    console.log('\n🔇 Monitoramento interrompido');
  };
}

async function sendTestWebhook(ticket) {
  try {
    const webhookPayload = {
      instance: ticket.instanceName || 'loja',
      data: {
        key: {
          remoteJid: ticket.client?.id || ticket.remoteJid,
          fromMe: false,
          id: `final_test_${Date.now()}`
        },
        message: {
          conversation: 'Olá! Preciso de ajuda urgente com meu pedido. Vocês podem me ajudar? Este é um teste final para verificar se o agente IA está funcionando após a correção.'
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: ticket.client?.name || 'Cliente Teste Final'
      }
    };
    
    console.log('   📋 Enviando webhook:');
    console.log(`      Instance: ${webhookPayload.instance}`);
    console.log(`      Cliente: ${webhookPayload.data.key.remoteJid}`);
    console.log(`      Mensagem: "${webhookPayload.data.message.conversation.substring(0, 80)}..."`);
    
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
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Erro no webhook: ${response.status} - ${errorText}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao enviar webhook: ${error.message}`);
    return false;
  }
}

async function checkFinalResult(ticketId) {
  try {
    console.log('   🔍 Analisando resultado final...');
    
    // Verificar interações recentes
    const interactionsRef = collection(db, 'agent_interactions');
    const q = query(interactionsRef, orderBy('timestamp', 'desc'), limit(10));
    
    const querySnapshot = await getDocs(q);
    const recentInteractions = querySnapshot.docs
      .map(doc => doc.data())
      .filter(interaction => 
        interaction.ticketId === ticketId &&
        interaction.timestamp > Date.now() - 60000 // Últimos 60 segundos
      );
    
    console.log(`   📊 Interações recentes: ${recentInteractions.length}`);
    
    const successfulResponses = recentInteractions.filter(i => i.type === 'auto_response');
    const errors = recentInteractions.filter(i => i.type === 'error');
    const lowConfidence = recentInteractions.filter(i => i.type === 'low_confidence');
    
    console.log('\n   📈 RESUMO FINAL:');
    console.log(`      ✅ Respostas bem-sucedidas: ${successfulResponses.length}`);
    console.log(`      ❌ Erros: ${errors.length}`);
    console.log(`      ⚠️ Baixa confiança: ${lowConfidence.length}`);
    
    if (successfulResponses.length > 0) {
      console.log('\n   🎉 RESULTADO: AGENTE IA FUNCIONANDO CORRETAMENTE!');
      console.log('   ✅ O problema foi resolvido com sucesso');
      console.log('   📝 O agente consegue processar mensagens e enviar respostas');
    } else if (errors.length > 0) {
      console.log('\n   ❌ RESULTADO: AINDA HÁ ERROS');
      console.log('   📝 O agente processa mas encontra erros ao enviar');
      errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error.error || 'Erro não especificado'}`);
      });
    } else if (lowConfidence.length > 0) {
      console.log('\n   ⚠️ RESULTADO: PROBLEMA DE CONFIANÇA');
      console.log('   📝 O agente processa mas rejeita por baixa confiança');
    } else {
      console.log('\n   ❓ RESULTADO: AGENTE NÃO PROCESSOU');
      console.log('   📝 O webhook pode não estar acionando o agente');
    }
    
  } catch (error) {
    console.error('   ❌ Erro ao verificar resultado:', error);
  }
}

// Executar teste final
console.log('🚀 Iniciando teste final do agente IA...');
testFinalAIResponse().catch(console.error);