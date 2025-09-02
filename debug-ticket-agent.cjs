// Script para debugar configuração do agente no ticket específico
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBOh7dqJqQKQH9C9vQH9vQH9vQH9vQH9vQ",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugTicketAgent() {
  try {
    console.log('🔍 Debugando configuração do agente no ticket 5512981022013...');
    
    // 1. Buscar o ticket específico
    const ticketId = 'S4waFsks3t96n1WOkVV4'; // ID do ticket no Firestore
    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      console.log('❌ Ticket não encontrado no Firestore');
      
      // Buscar por remoteJid
      console.log('🔍 Buscando ticket por remoteJid...');
      const ticketsRef = collection(db, 'tickets');
      const ticketsQuery = query(
        ticketsRef,
        where('client.phone', '==', '5512981022013')
      );
      
      const ticketsSnapshot = await getDocs(ticketsQuery);
      
      if (ticketsSnapshot.empty) {
        console.log('❌ Nenhum ticket encontrado para o número 5512981022013');
        return;
      }
      
      console.log(`✅ Encontrados ${ticketsSnapshot.size} tickets para este número:`);
      ticketsSnapshot.forEach((doc) => {
        const ticket = doc.data();
        console.log(`📋 Ticket ID: ${doc.id}`);
        console.log(`   Cliente: ${ticket.client?.name || 'N/A'}`);
        console.log(`   Telefone: ${ticket.client?.phone || 'N/A'}`);
        console.log(`   Status: ${ticket.status}`);
        console.log(`   Agente atribuído: ${ticket.assignedAgent ? 'Sim' : 'Não'}`);
        if (ticket.assignedAgent) {
          console.log(`   Tipo de agente: ${ticket.assignedAgent.type}`);
          console.log(`   Nome do agente: ${ticket.assignedAgent.name}`);
        }
        console.log(`   Configuração IA: ${ticket.aiConfig ? 'Sim' : 'Não'}`);
        if (ticket.aiConfig) {
          console.log(`   Auto resposta: ${ticket.aiConfig.autoResponse}`);
          console.log(`   Modo de ativação: ${ticket.aiConfig.activationMode}`);
        }
        console.log('---');
      });
      return;
    }
    
    const ticket = ticketSnap.data();
    console.log('✅ Ticket encontrado!');
    console.log('📋 Dados do ticket:');
    console.log(`   ID: ${ticketSnap.id}`);
    console.log(`   Cliente: ${ticket.client?.name || 'N/A'}`);
    console.log(`   Telefone: ${ticket.client?.phone || 'N/A'}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Instância: ${ticket.instanceName}`);
    console.log(`   RemoteJid: ${ticket.remoteJid}`);
    
    // 2. Verificar agente atribuído
    console.log('\n🤖 Verificando agente atribuído:');
    if (!ticket.assignedAgent) {
      console.log('❌ Nenhum agente atribuído ao ticket');
      return;
    }
    
    console.log(`✅ Agente atribuído:`);
    console.log(`   Tipo: ${ticket.assignedAgent.type}`);
    console.log(`   ID: ${ticket.assignedAgent.id}`);
    console.log(`   Nome: ${ticket.assignedAgent.name}`);
    console.log(`   Evo AI ID: ${ticket.assignedAgent.evoAiAgentId || 'N/A'}`);
    
    // 3. Verificar configuração de IA
    console.log('\n⚙️ Verificando configuração de IA:');
    if (!ticket.aiConfig) {
      console.log('❌ Nenhuma configuração de IA encontrada');
      return;
    }
    
    console.log(`✅ Configuração de IA:`);
    console.log(`   Modo de ativação: ${ticket.aiConfig.activationMode}`);
    console.log(`   Auto resposta: ${ticket.aiConfig.autoResponse}`);
    console.log(`   Trigger keywords: ${ticket.aiConfig.activationTrigger?.keywords?.join(', ') || 'Nenhuma'}`);
    console.log(`   Delay: ${ticket.aiConfig.activationTrigger?.delay || 0} minutos`);
    
    if (ticket.aiConfig.escalationRules) {
      console.log(`   Max interações: ${ticket.aiConfig.escalationRules.maxInteractions}`);
      console.log(`   Escalar para humano: ${ticket.aiConfig.escalationRules.escalateToHuman}`);
    }
    
    // 4. Verificar interações do agente
    console.log('\n📊 Verificando interações do agente:');
    if (!ticket.agentInteractions || ticket.agentInteractions.length === 0) {
      console.log('❌ Nenhuma interação do agente registrada');
    } else {
      console.log(`✅ ${ticket.agentInteractions.length} interações encontradas:`);
      ticket.agentInteractions.forEach((interaction, index) => {
        console.log(`   ${index + 1}. ${interaction.type} - ${new Date(interaction.timestamp.seconds * 1000).toLocaleString()}`);
        if (interaction.content) {
          console.log(`      Conteúdo: ${interaction.content.substring(0, 100)}...`);
        }
        if (interaction.confidence) {
          console.log(`      Confiança: ${(interaction.confidence * 100).toFixed(1)}%`);
        }
      });
    }
    
    // 5. Buscar configuração completa do agente
    if (ticket.assignedAgent && ticket.assignedAgent.type === 'ai') {
      console.log('\n🔍 Buscando configuração completa do agente...');
      const agentRef = doc(db, 'agents', ticket.assignedAgent.id);
      const agentSnap = await getDoc(agentRef);
      
      if (!agentSnap.exists()) {
        console.log('❌ Configuração do agente não encontrada no Firestore');
      } else {
        const agent = agentSnap.data();
        console.log('✅ Configuração do agente:');
        console.log(`   Nome: ${agent.name}`);
        console.log(`   Status: ${agent.status}`);
        console.log(`   Descrição: ${agent.description}`);
        console.log(`   Evo AI ID: ${agent.evoAiAgentId || 'N/A'}`);
        
        if (agent.behavior) {
          console.log(`   Max interações: ${agent.behavior.maxInteractionsPerTicket}`);
          console.log(`   Auto escalação: ${agent.behavior.autoEscalation}`);
          console.log(`   Delay de resposta: ${agent.behavior.responseDelay || 0}ms`);
        }
        
        if (agent.activationRules) {
          console.log(`   Prioridade: ${agent.activationRules.priority}`);
          console.log(`   Condições: ${agent.activationRules.conditions?.length || 0}`);
        }
      }
    }
    
    // 6. Diagnóstico
    console.log('\n🩺 Diagnóstico:');
    
    if (!ticket.assignedAgent) {
      console.log('❌ PROBLEMA: Nenhum agente atribuído');
    } else if (ticket.assignedAgent.type !== 'ai') {
      console.log('❌ PROBLEMA: Agente atribuído não é do tipo IA');
    } else if (!ticket.aiConfig) {
      console.log('❌ PROBLEMA: Configuração de IA ausente');
    } else if (!ticket.aiConfig.autoResponse) {
      console.log('❌ PROBLEMA: Auto resposta desabilitada');
    } else {
      console.log('✅ Configuração parece correta para resposta automática');
      console.log('💡 Possíveis causas:');
      console.log('   1. Webhook de mensagens não está processando');
      console.log('   2. Fluxo de processamento de IA não implementado');
      console.log('   3. Integração com Evo AI não configurada');
      console.log('   4. Mensagens não estão chegando ao sistema');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
  }
}

// Executar debug
debugTicketAgent().catch(console.error);