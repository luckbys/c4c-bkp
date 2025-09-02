const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, onSnapshot, doc, getDoc } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDhkVrDrjqKlCpgOdHZQGGHvJmErwWUTpY",
  authDomain: "crm-c4-main.firebaseapp.com",
  projectId: "crm-c4-main",
  storageBucket: "crm-c4-main.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔍 [DEBUG] Iniciando debug do problema de conversas desaparecendo...');

// Função para monitorar um ticket específico
function monitorTicket(ticketId) {
  console.log(`\n📋 [MONITOR] Monitorando ticket: ${ticketId}`);
  
  const ticketRef = doc(db, 'tickets', ticketId);
  
  return onSnapshot(ticketRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      console.log(`\n📊 [TICKET UPDATE] ${new Date().toLocaleTimeString('pt-BR')}`);
      console.log(`   🆔 ID: ${ticketId}`);
      console.log(`   👤 Cliente: ${data.client?.name || 'N/A'}`);
      console.log(`   📱 Telefone: ${data.client?.phone || 'N/A'}`);
      console.log(`   📊 Status: ${data.status || 'N/A'}`);
      console.log(`   💬 Mensagens: ${data.messages?.length || 0}`);
      console.log(`   🔔 Não lidas: ${data.unreadCount || 0}`);
      console.log(`   ⏰ Última atualização: ${data.updatedAt?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'}`);
      
      if (data.messages && data.messages.length > 0) {
        const lastMessage = data.messages[data.messages.length - 1];
        console.log(`   📝 Última mensagem: "${lastMessage.content?.substring(0, 50)}..."`);
        console.log(`   👤 De: ${lastMessage.fromMe ? 'Empresa' : 'Cliente'}`);
      }
      
      // Verificar se as mensagens estão sendo perdidas
      if (data.messages && data.messages.length === 0) {
        console.log('⚠️  [ALERTA] TICKET SEM MENSAGENS DETECTADO!');
      }
    } else {
      console.log(`❌ [ERROR] Ticket ${ticketId} não encontrado!`);
    }
  }, (error) => {
    console.error(`❌ [ERROR] Erro ao monitorar ticket ${ticketId}:`, error);
  });
}

// Função para monitorar todos os tickets de uma instância
function monitorAllTickets(instanceName = 'loja') {
  console.log(`\n📋 [MONITOR ALL] Monitorando todos os tickets da instância: ${instanceName}`);
  
  const ticketsRef = collection(db, 'tickets');
  const ticketsQuery = query(ticketsRef, where('instanceName', '==', instanceName));
  
  return onSnapshot(ticketsQuery, (snapshot) => {
    console.log(`\n📊 [TICKETS UPDATE] ${new Date().toLocaleTimeString('pt-BR')}`);
    console.log(`   📋 Total de tickets: ${snapshot.size}`);
    
    let ticketsWithoutMessages = 0;
    let totalMessages = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const messageCount = data.messages?.length || 0;
      totalMessages += messageCount;
      
      if (messageCount === 0) {
        ticketsWithoutMessages++;
        console.log(`⚠️  [ALERTA] Ticket sem mensagens: ${doc.id} (${data.client?.name})`);
      }
    });
    
    console.log(`   💬 Total de mensagens: ${totalMessages}`);
    console.log(`   ⚠️  Tickets sem mensagens: ${ticketsWithoutMessages}`);
    
    if (ticketsWithoutMessages > 0) {
      console.log('\n🚨 [PROBLEMA DETECTADO] Existem tickets sem mensagens!');
    }
  }, (error) => {
    console.error('❌ [ERROR] Erro ao monitorar tickets:', error);
  });
}

// Função para testar carregamento de mensagens via API
async function testMessageAPI(instanceName = 'loja', remoteJid) {
  console.log(`\n🔍 [API TEST] Testando API de mensagens...`);
  console.log(`   📱 Instância: ${instanceName}`);
  console.log(`   👤 RemoteJid: ${remoteJid}`);
  
  try {
    const response = await fetch(`http://localhost:9004/api/messages?instance=${instanceName}&remoteJid=${remoteJid}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`   ✅ Resposta da API:`);
    console.log(`      💬 Mensagens: ${data.messages?.length || 0}`);
    console.log(`      📊 Meta: ${JSON.stringify(data.meta || {})}`);
    
    if (data.messages && data.messages.length > 0) {
      console.log(`      📝 Primeira mensagem: "${data.messages[0].content?.substring(0, 50)}..."`);
      console.log(`      📝 Última mensagem: "${data.messages[data.messages.length - 1].content?.substring(0, 50)}..."`);
    } else {
      console.log('⚠️  [ALERTA] API retornou 0 mensagens!');
    }
    
    return data.messages || [];
  } catch (error) {
    console.error('❌ [ERROR] Erro na API de mensagens:', error.message);
    return [];
  }
}

// Função principal
async function main() {
  console.log('🚀 [INICIO] Debug do problema de conversas desaparecendo');
  
  // Primeiro, vamos listar alguns tickets para ter IDs para testar
  console.log('\n📋 [STEP 1] Buscando tickets existentes...');
  
  try {
    const ticketsRef = collection(db, 'tickets');
    const ticketsQuery = query(ticketsRef, where('instanceName', '==', 'loja'));
    
    const snapshot = await new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(ticketsQuery, resolve, reject);
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout'));
      }, 10000);
    });
    
    if (snapshot.size === 0) {
      console.log('❌ [ERROR] Nenhum ticket encontrado!');
      return;
    }
    
    console.log(`✅ [SUCCESS] Encontrados ${snapshot.size} tickets`);
    
    // Pegar o primeiro ticket para teste
    const firstTicket = snapshot.docs[0];
    const ticketData = firstTicket.data();
    const ticketId = firstTicket.id;
    const remoteJid = ticketData.client?.id || ticketData.client?.phone;
    
    console.log(`\n📋 [TICKET SELECIONADO]`);
    console.log(`   🆔 ID: ${ticketId}`);
    console.log(`   👤 Cliente: ${ticketData.client?.name}`);
    console.log(`   📱 RemoteJid: ${remoteJid}`);
    console.log(`   💬 Mensagens no Firebase: ${ticketData.messages?.length || 0}`);
    
    // Testar API de mensagens
    console.log('\n📋 [STEP 2] Testando API de mensagens...');
    const apiMessages = await testMessageAPI('loja', remoteJid);
    
    // Comparar resultados
    const firebaseMessageCount = ticketData.messages?.length || 0;
    const apiMessageCount = apiMessages.length;
    
    console.log(`\n📊 [COMPARAÇÃO]`);
    console.log(`   🔥 Firebase: ${firebaseMessageCount} mensagens`);
    console.log(`   🌐 API: ${apiMessageCount} mensagens`);
    
    if (firebaseMessageCount !== apiMessageCount) {
      console.log('🚨 [PROBLEMA DETECTADO] Discrepância entre Firebase e API!');
      console.log('   Possíveis causas:');
      console.log('   - Sincronização incompleta');
      console.log('   - Cache desatualizado');
      console.log('   - Problema na API');
    } else {
      console.log('✅ [OK] Firebase e API estão sincronizados');
    }
    
    // Monitorar mudanças em tempo real
    console.log('\n📋 [STEP 3] Iniciando monitoramento em tempo real...');
    console.log('   (Pressione Ctrl+C para parar)');
    
    const unsubscribeTicket = monitorTicket(ticketId);
    const unsubscribeAll = monitorAllTickets('loja');
    
    // Manter o script rodando
    process.on('SIGINT', () => {
      console.log('\n🛑 [STOP] Parando monitoramento...');
      unsubscribeTicket();
      unsubscribeAll();
      process.exit(0);
    });
    
    // Teste periódico da API
    setInterval(async () => {
      console.log('\n🔄 [PERIODIC TEST] Testando API novamente...');
      await testMessageAPI('loja', remoteJid);
    }, 30000); // A cada 30 segundos
    
  } catch (error) {
    console.error('❌ [ERROR] Erro no debug:', error);
  }
}

// Executar
main().catch(console.error);