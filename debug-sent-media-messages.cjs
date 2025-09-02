const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
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

async function debugSentMediaMessages() {
  try {
    console.log('🔍 [DEBUG] Verificando mensagens de mídia enviadas vs recebidas...');
    
    const testRemoteJid = '5512981022013@s.whatsapp.net';
    const instanceName = 'loja';
    
    // Buscar todas as mensagens do contato de teste
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('remoteJid', '==', testRemoteJid),
      where('instanceName', '==', instanceName)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma mensagem encontrada para o contato de teste');
      return;
    }
    
    console.log(`📊 Total de mensagens encontradas: ${snapshot.size}`);
    
    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date()
      });
    });
    
    // Ordenar por timestamp
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Separar mensagens enviadas e recebidas
    const sentMessages = messages.filter(msg => msg.isFromMe === true || msg.sender === 'agent');
    const receivedMessages = messages.filter(msg => msg.isFromMe === false || msg.sender === 'client');
    
    console.log('\n📤 MENSAGENS ENVIADAS:');
    console.log(`Total: ${sentMessages.length}`);
    
    sentMessages.forEach((msg, index) => {
      console.log(`\n${index + 1}. Mensagem Enviada:`);
      console.log(`   ID: ${msg.id}`);
      console.log(`   MessageID: ${msg.messageId}`);
      console.log(`   Tipo: ${msg.type}`);
      console.log(`   Sender: ${msg.sender}`);
      console.log(`   IsFromMe: ${msg.isFromMe}`);
      console.log(`   Content: ${msg.content?.substring(0, 100)}${msg.content?.length > 100 ? '...' : ''}`);
      console.log(`   MediaURL: ${msg.mediaUrl || 'N/A'}`);
      console.log(`   FileName: ${msg.fileName || 'N/A'}`);
      console.log(`   Timestamp: ${msg.timestamp.toLocaleString('pt-BR')}`);
    });
    
    console.log('\n📥 MENSAGENS RECEBIDAS:');
    console.log(`Total: ${receivedMessages.length}`);
    
    receivedMessages.forEach((msg, index) => {
      console.log(`\n${index + 1}. Mensagem Recebida:`);
      console.log(`   ID: ${msg.id}`);
      console.log(`   MessageID: ${msg.messageId}`);
      console.log(`   Tipo: ${msg.type}`);
      console.log(`   Sender: ${msg.sender}`);
      console.log(`   IsFromMe: ${msg.isFromMe}`);
      console.log(`   Content: ${msg.content?.substring(0, 100)}${msg.content?.length > 100 ? '...' : ''}`);
      console.log(`   MediaURL: ${msg.mediaUrl || 'N/A'}`);
      console.log(`   FileName: ${msg.fileName || 'N/A'}`);
      console.log(`   Timestamp: ${msg.timestamp.toLocaleString('pt-BR')}`);
    });
    
    // Análise de mensagens de mídia
    const sentMediaMessages = sentMessages.filter(msg => msg.type !== 'text' && msg.type !== 'note');
    const receivedMediaMessages = receivedMessages.filter(msg => msg.type !== 'text' && msg.type !== 'note');
    
    console.log('\n🎯 ANÁLISE DE MENSAGENS DE MÍDIA:');
    console.log(`📤 Mensagens de mídia enviadas: ${sentMediaMessages.length}`);
    console.log(`📥 Mensagens de mídia recebidas: ${receivedMediaMessages.length}`);
    
    if (sentMediaMessages.length > 0) {
      console.log('\n📤 DETALHES DAS MENSAGENS DE MÍDIA ENVIADAS:');
      sentMediaMessages.forEach((msg, index) => {
        console.log(`\n${index + 1}. Mídia Enviada:`);
        console.log(`   Tipo: ${msg.type}`);
        console.log(`   Content: ${msg.content}`);
        console.log(`   MediaURL: ${msg.mediaUrl}`);
        console.log(`   FileName: ${msg.fileName}`);
        console.log(`   Tem URL válida: ${msg.mediaUrl ? 'Sim' : 'Não'}`);
        console.log(`   Content é URL: ${msg.content?.startsWith('http') ? 'Sim' : 'Não'}`);
      });
    }
    
    if (receivedMediaMessages.length > 0) {
      console.log('\n📥 DETALHES DAS MENSAGENS DE MÍDIA RECEBIDAS:');
      receivedMediaMessages.forEach((msg, index) => {
        console.log(`\n${index + 1}. Mídia Recebida:`);
        console.log(`   Tipo: ${msg.type}`);
        console.log(`   Content: ${msg.content}`);
        console.log(`   MediaURL: ${msg.mediaUrl}`);
        console.log(`   FileName: ${msg.fileName}`);
        console.log(`   Tem URL válida: ${msg.mediaUrl ? 'Sim' : 'Não'}`);
        console.log(`   Content é URL: ${msg.content?.startsWith('http') ? 'Sim' : 'Não'}`);
      });
    }
    
    // Verificar diferenças estruturais
    console.log('\n🔍 ANÁLISE DE DIFERENÇAS:');
    
    if (sentMediaMessages.length > 0 && receivedMediaMessages.length > 0) {
      const sentSample = sentMediaMessages[0];
      const receivedSample = receivedMediaMessages[0];
      
      console.log('\n📊 Comparação de campos (primeira mensagem de cada tipo):');
      console.log('Campo\t\t\tEnviada\t\t\tRecebida');
      console.log('-----\t\t\t-------\t\t\t--------');
      console.log(`type\t\t\t${sentSample.type}\t\t\t${receivedSample.type}`);
      console.log(`sender\t\t\t${sentSample.sender}\t\t\t${receivedSample.sender}`);
      console.log(`isFromMe\t\t${sentSample.isFromMe}\t\t\t${receivedSample.isFromMe}`);
      console.log(`mediaUrl\t\t${sentSample.mediaUrl ? 'Presente' : 'Ausente'}\t\t${receivedSample.mediaUrl ? 'Presente' : 'Ausente'}`);
      console.log(`fileName\t\t${sentSample.fileName ? 'Presente' : 'Ausente'}\t\t${receivedSample.fileName ? 'Presente' : 'Ausente'}`);
    }
    
    // Verificar mensagens recentes (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = messages.filter(msg => msg.timestamp > oneDayAgo);
    
    console.log(`\n⏰ Mensagens das últimas 24 horas: ${recentMessages.length}`);
    
    if (recentMessages.length > 0) {
      console.log('\n📋 MENSAGENS RECENTES:');
      recentMessages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.isFromMe ? 'ENVIADA' : 'RECEBIDA'}] ${msg.type} - ${msg.content?.substring(0, 50)}${msg.content?.length > 50 ? '...' : ''}`);
      });
    }
    
    // Conclusões
    console.log('\n🎯 CONCLUSÕES:');
    
    if (sentMediaMessages.length === 0) {
      console.log('❌ Nenhuma mensagem de mídia enviada encontrada - problema na gravação');
    } else {
      console.log(`✅ ${sentMediaMessages.length} mensagem(s) de mídia enviada(s) encontrada(s)`);
    }
    
    if (receivedMediaMessages.length === 0) {
      console.log('❌ Nenhuma mensagem de mídia recebida encontrada');
    } else {
      console.log(`✅ ${receivedMediaMessages.length} mensagem(s) de mídia recebida(s) encontrada(s)`);
    }
    
    // Verificar se as mensagens enviadas têm todos os campos necessários
    if (sentMediaMessages.length > 0) {
      const missingFields = [];
      const sample = sentMediaMessages[0];
      
      if (!sample.mediaUrl && !sample.content?.startsWith('http')) {
        missingFields.push('mediaUrl ou content com URL');
      }
      if (!sample.type || sample.type === 'text') {
        missingFields.push('type correto');
      }
      
      if (missingFields.length > 0) {
        console.log(`⚠️  Mensagens enviadas estão faltando: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ Mensagens enviadas têm todos os campos necessários');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error);
  }
}

// Executar debug
debugSentMediaMessages().catch(console.error);