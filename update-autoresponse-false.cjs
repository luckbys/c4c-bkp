// Script para alterar autoResponse de true para false nos tickets
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');
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

async function updateAutoResponseToFalse() {
  try {
    console.log('🔍 Buscando tickets com autoResponse = true...');
    
    // Buscar todos os tickets que têm aiConfig.autoResponse = true
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('aiConfig.autoResponse', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`📊 Encontrados ${querySnapshot.size} tickets com autoResponse = true`);
    
    if (querySnapshot.empty) {
      console.log('✅ Nenhum ticket encontrado com autoResponse = true');
      return;
    }
    
    // Listar tickets encontrados
    console.log('\n📋 TICKETS ENCONTRADOS:');
    console.log('=' .repeat(60));
    
    const ticketsToUpdate = [];
    querySnapshot.forEach((docSnapshot) => {
      const ticketData = docSnapshot.data();
      const ticketInfo = {
        id: docSnapshot.id,
        client: ticketData.client?.name || 'N/A',
        phone: ticketData.client?.phone || ticketData.remoteJid || 'N/A',
        status: ticketData.status,
        agent: ticketData.assignedAgent?.name || 'N/A',
        instance: ticketData.instanceName || 'N/A',
        autoResponse: ticketData.aiConfig?.autoResponse
      };
      
      ticketsToUpdate.push({ id: docSnapshot.id, data: ticketData });
      
      console.log(`🎫 Ticket: ${ticketInfo.id}`);
      console.log(`   📱 Cliente: ${ticketInfo.client} (${ticketInfo.phone})`);
      console.log(`   📊 Status: ${ticketInfo.status}`);
      console.log(`   🤖 Agente: ${ticketInfo.agent}`);
      console.log(`   🏢 Instância: ${ticketInfo.instance}`);
      console.log(`   🔧 Auto Response: ${ticketInfo.autoResponse}`);
      console.log('');
    });
    
    // Confirmar atualização
    console.log(`\n⚠️  ATENÇÃO: Você está prestes a alterar autoResponse de TRUE para FALSE em ${ticketsToUpdate.length} tickets.`);
    console.log('\n🔄 Iniciando atualização...');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Atualizar cada ticket
    for (const ticket of ticketsToUpdate) {
      try {
        const ticketRef = doc(db, 'tickets', ticket.id);
        
        // Atualizar apenas o campo autoResponse dentro de aiConfig
        await updateDoc(ticketRef, {
          'aiConfig.autoResponse': false,
          updatedAt: new Date()
        });
        
        console.log(`✅ Ticket ${ticket.id} atualizado com sucesso`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Erro ao atualizar ticket ${ticket.id}:`, error.message);
        errorCount++;
      }
    }
    
    // Resumo final
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO DA ATUALIZAÇÃO');
    console.log('=' .repeat(60));
    console.log(`✅ Tickets atualizados com sucesso: ${successCount}`);
    console.log(`❌ Tickets com erro: ${errorCount}`);
    console.log(`📋 Total processado: ${ticketsToUpdate.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Atualização concluída! Todos os tickets agora têm autoResponse = false');
    }
    
    if (errorCount > 0) {
      console.log('\n⚠️  Alguns tickets não puderam ser atualizados. Verifique os erros acima.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral ao atualizar tickets:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('permission-denied') || error.message.includes('PERMISSION_DENIED')) {
      console.log('\n💡 ERRO DE PERMISSÃO:');
      console.log('   - Verifique as regras do Firestore');
      console.log('   - Confirme se a configuração do Firebase está correta');
      console.log('   - Verifique se o projeto Firebase está ativo');
    }
  }
}

// Função para verificar tickets após atualização
async function verifyUpdate() {
  try {
    console.log('\n🔍 Verificando se ainda existem tickets com autoResponse = true...');
    
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('aiConfig.autoResponse', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('✅ Perfeito! Nenhum ticket encontrado com autoResponse = true');
    } else {
      console.log(`⚠️  Ainda existem ${querySnapshot.size} tickets com autoResponse = true`);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`   - Ticket ${doc.id}: ${data.client?.name || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar atualização:', error.message);
  }
}

// Executar script
console.log('🚀 INICIANDO ATUALIZAÇÃO DE AUTORESPONSE');
console.log('=' .repeat(60));

updateAutoResponseToFalse()
  .then(() => {
    console.log('\n⏳ Aguardando 2 segundos antes da verificação...');
    return new Promise(resolve => setTimeout(resolve, 2000));
  })
  .then(() => verifyUpdate())
  .then(() => {
    console.log('\n🏁 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });