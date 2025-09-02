// Script simplificado para verificar tickets com agente IA
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
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

async function checkAITickets() {
  console.log('🔍 VERIFICANDO TICKETS COM AGENTE IA');
  console.log('=' .repeat(50));
  
  try {
    // Buscar todos os tickets recentes (sem filtros complexos)
    console.log('📋 Buscando tickets recentes...');
    
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('updatedAt', 'desc'), limit(20));
    
    const querySnapshot = await getDocs(q);
    const allTickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📊 Total de tickets encontrados: ${allTickets.length}`);
    
    // Filtrar tickets com agente IA manualmente
    const aiTickets = allTickets.filter(ticket => 
      ticket.assignedAgent && 
      ticket.assignedAgent.type === 'ai' &&
      ['open', 'pending'].includes(ticket.status)
    );
    
    console.log(`🤖 Tickets com agente IA ativos: ${aiTickets.length}`);
    
    if (aiTickets.length === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO: Nenhum ticket ativo com agente IA');
      console.log('\n📋 Tickets disponíveis:');
      
      allTickets.slice(0, 5).forEach((ticket, index) => {
        console.log(`   ${index + 1}. ID: ${ticket.id}`);
        console.log(`      Status: ${ticket.status}`);
        console.log(`      Agente: ${ticket.assignedAgent ? ticket.assignedAgent.type : 'Nenhum'}`);
        console.log(`      Cliente: ${ticket.client?.name || 'N/A'}`);
        console.log(`      Telefone: ${ticket.client?.id || ticket.remoteJid || 'N/A'}`);
        console.log('');
      });
      
      console.log('💡 SOLUÇÕES:');
      console.log('1. Atribuir um agente IA a um ticket ativo');
      console.log('2. Verificar se o status do ticket está como "open" ou "pending"');
      console.log('3. Confirmar se aiConfig.autoResponse está habilitado');
      
      return false;
    }
    
    // Analisar configuração dos tickets com IA
    console.log('\n🔍 ANALISANDO TICKETS COM AGENTE IA:');
    console.log('=' .repeat(50));
    
    let ticketsWithAutoResponse = 0;
    let ticketsWithValidConfig = 0;
    
    aiTickets.forEach((ticket, index) => {
      console.log(`\n🎫 TICKET ${index + 1}: ${ticket.id}`);
      console.log(`   📱 Cliente: ${ticket.client?.name || 'N/A'} (${ticket.client?.id || ticket.remoteJid || 'N/A'})`);
      console.log(`   📊 Status: ${ticket.status}`);
      console.log(`   🤖 Agente: ${ticket.assignedAgent?.name || 'N/A'} (${ticket.assignedAgent?.type})`);
      console.log(`   🔧 Auto Response: ${ticket.aiConfig?.autoResponse || false}`);
      console.log(`   ⚡ Activation Mode: ${ticket.aiConfig?.activationMode || 'N/A'}`);
      console.log(`   🏢 Instance: ${ticket.instanceName || 'N/A'}`);
      
      if (ticket.aiConfig?.autoResponse) {
        ticketsWithAutoResponse++;
        console.log('   ✅ Auto response habilitado');
      } else {
        console.log('   ❌ Auto response DESABILITADO');
      }
      
      if (ticket.aiConfig?.autoResponse && ticket.assignedAgent?.id) {
        ticketsWithValidConfig++;
        console.log('   ✅ Configuração válida para resposta automática');
      } else {
        console.log('   ❌ Configuração INVÁLIDA para resposta automática');
      }
      
      // Verificar mensagens recentes
      if (ticket.messages && ticket.messages.length > 0) {
        const lastMessage = ticket.messages[ticket.messages.length - 1];
        console.log(`   💬 Última mensagem: ${lastMessage.content?.substring(0, 50) || 'N/A'}...`);
        console.log(`   👤 De: ${lastMessage.fromMe ? 'Empresa' : 'Cliente'}`);
        console.log(`   ⏰ Quando: ${new Date(lastMessage.timestamp).toLocaleString('pt-BR')}`);
      } else {
        console.log('   💬 Nenhuma mensagem encontrada');
      }
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 RESUMO DA ANÁLISE');
    console.log('=' .repeat(50));
    console.log(`🎫 Total de tickets com agente IA: ${aiTickets.length}`);
    console.log(`✅ Tickets com auto response: ${ticketsWithAutoResponse}`);
    console.log(`🔧 Tickets com configuração válida: ${ticketsWithValidConfig}`);
    
    if (ticketsWithValidConfig === 0) {
      console.log('\n❌ PROBLEMA PRINCIPAL: Nenhum ticket tem configuração válida');
      console.log('\n💡 SOLUÇÕES ESPECÍFICAS:');
      console.log('1. Habilitar aiConfig.autoResponse = true');
      console.log('2. Verificar se assignedAgent.id está definido');
      console.log('3. Confirmar que o status está como "open" ou "pending"');
      return false;
    } else {
      console.log('\n✅ CONFIGURAÇÃO OK: Tickets estão configurados corretamente');
      console.log('\n🔍 PRÓXIMOS PASSOS PARA DEBUG:');
      console.log('1. Verificar logs do webhook em tempo real');
      console.log('2. Enviar uma mensagem de teste para um dos tickets válidos');
      console.log('3. Monitorar logs do geminiAgentService');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    return false;
  }
}

// Executar verificação
checkAITickets().catch(console.error);