const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } = require('firebase/firestore');
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

async function fixFirebaseMessages() {
  console.log('🔧 Iniciando correção das mensagens no Firebase...');
  
  try {
    // 1. Buscar todas as mensagens
    console.log('📊 Buscando todas as mensagens...');
    const messagesSnapshot = await getDocs(collection(db, 'messages'));
    console.log(`📝 Total de mensagens encontradas: ${messagesSnapshot.size}`);
    
    let fixedCount = 0;
    let errorCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;
    
    // 2. Processar cada mensagem
    for (const messageDoc of messagesSnapshot.docs) {
      const data = messageDoc.data();
      const docId = messageDoc.id;
      
      let needsUpdate = false;
      const updates = {};
      
      // Corrigir campo sender undefined
      if (!data.sender || data.sender === 'undefined') {
        // Determinar sender baseado em isFromMe ou outros campos
        if (data.isFromMe === true) {
          updates.sender = 'agent';
          needsUpdate = true;
        } else if (data.isFromMe === false) {
          updates.sender = 'client';
          needsUpdate = true;
        } else if (data.key?.fromMe === true) {
          updates.sender = 'agent';
          updates.isFromMe = true;
          needsUpdate = true;
        } else if (data.key?.fromMe === false) {
          updates.sender = 'client';
          updates.isFromMe = false;
          needsUpdate = true;
        } else {
          // Fallback: assumir que é cliente se não conseguir determinar
          updates.sender = 'client';
          updates.isFromMe = false;
          needsUpdate = true;
        }
      }
      
      // Corrigir timestamp se necessário
      if (!data.timestamp && data.messageTimestamp) {
        // Converter timestamp Unix para Firestore Timestamp
        const timestamp = new Date(data.messageTimestamp * 1000);
        updates.timestamp = timestamp;
        needsUpdate = true;
      }
      
      // Corrigir messageId se necessário
      if (!data.messageId && data.key?.id) {
        updates.messageId = data.key.id;
        needsUpdate = true;
      }
      
      // Corrigir content se estiver vazio
      if (!data.content && data.body) {
        updates.content = data.body;
        needsUpdate = true;
      }
      
      // Corrigir type se necessário
      if (!data.type && data.messageType) {
        updates.type = data.messageType;
        needsUpdate = true;
      }
      
      // Garantir que pushName não seja undefined
      if (data.pushName === 'undefined' || !data.pushName) {
        if (data.senderName) {
          updates.pushName = data.senderName;
          needsUpdate = true;
        } else if (updates.sender === 'agent') {
          updates.pushName = 'Agente';
          needsUpdate = true;
        } else {
          updates.pushName = 'Cliente';
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        try {
          batch.update(doc(db, 'messages', docId), updates);
          batchCount++;
          fixedCount++;
          
          console.log(`✅ Corrigindo mensagem ${docId}:`);
          Object.keys(updates).forEach(key => {
            console.log(`   ${key}: ${data[key]} → ${updates[key]}`);
          });
          
          // Executar batch a cada 500 operações (limite do Firestore)
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`💾 Batch de ${batchCount} atualizações commitado`);
            batchCount = 0;
          }
        } catch (error) {
          console.error(`❌ Erro ao atualizar mensagem ${docId}:`, error);
          errorCount++;
        }
      }
    }
    
    // Commitar batch restante
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Batch final de ${batchCount} atualizações commitado`);
    }
    
    console.log('\n📊 Resumo da correção:');
    console.log(`✅ Mensagens corrigidas: ${fixedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📝 Total processadas: ${messagesSnapshot.size}`);
    
    // 3. Verificar se as correções foram aplicadas
    console.log('\n🔍 Verificando correções...');
    const verificationSnapshot = await getDocs(collection(db, 'messages'));
    let undefinedSenders = 0;
    
    verificationSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.sender || data.sender === 'undefined') {
        undefinedSenders++;
      }
    });
    
    if (undefinedSenders === 0) {
      console.log('✅ Todas as mensagens têm sender definido corretamente!');
    } else {
      console.log(`⚠️ Ainda existem ${undefinedSenders} mensagens com sender undefined`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    throw error;
  }
}

async function fixTicketMessages() {
  console.log('\n🎫 Verificando e corrigindo tickets...');
  
  try {
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    console.log(`📋 Total de tickets encontrados: ${ticketsSnapshot.size}`);
    
    let ticketsFixed = 0;
    
    for (const ticketDoc of ticketsSnapshot.docs) {
      const ticketData = ticketDoc.data();
      const ticketId = ticketDoc.id;
      
      // Verificar se o ticket tem client.phone definido corretamente
      if (!ticketData.client?.phone && ticketData.remoteJid) {
        const phone = ticketData.remoteJid.replace('@s.whatsapp.net', '');
        
        const updates = {
          'client.phone': phone
        };
        
        if (!ticketData.client?.name) {
          updates['client.name'] = `Cliente ${phone}`;
        }
        
        await updateDoc(doc(db, 'tickets', ticketId), updates);
        console.log(`✅ Ticket ${ticketId} corrigido: phone = ${phone}`);
        ticketsFixed++;
      }
    }
    
    console.log(`✅ Tickets corrigidos: ${ticketsFixed}`);
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tickets:', error);
  }
}

// Executar correções
async function runFixes() {
  try {
    await fixFirebaseMessages();
    await fixTicketMessages();
    
    console.log('\n🎉 Correções concluídas com sucesso!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Testar o carregamento de mensagens na interface');
    console.log('   2. Verificar se os tickets estão exibindo mensagens corretamente');
    console.log('   3. Monitorar logs para novos erros');
    
  } catch (error) {
    console.error('❌ Erro fatal durante as correções:', error);
    process.exit(1);
  }
}

runFixes().then(() => {
  console.log('\n✅ Script concluído');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});