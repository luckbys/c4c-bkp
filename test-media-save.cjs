const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } = require('firebase/firestore');
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

async function testMediaSave() {
  try {
    console.log('🧪 [TEST] Testando salvamento de mensagem de mídia...');
    
    const testData = {
      remoteJid: '5512981022013@s.whatsapp.net',
      messageId: `test_media_${Date.now()}`,
      content: '[Imagem]',
      sender: 'agent',
      status: 'sent',
      type: 'image',
      instanceName: 'loja',
      isFromMe: true,
      pushName: 'Agente',
      timestamp: serverTimestamp(),
      mediaUrl: 'https://example.com/test-image.jpg',
      fileName: 'test-image.jpg'
    };
    
    console.log('📝 Dados que serão salvos:');
    console.log(JSON.stringify({
      ...testData,
      timestamp: '[ServerTimestamp]'
    }, null, 2));
    
    // Salvar mensagem
    const docRef = await addDoc(collection(db, 'messages'), testData);
    console.log(`✅ Mensagem salva com ID: ${docRef.id}`);
    
    // Aguardar um pouco para o timestamp ser processado
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Buscar a mensagem salva para verificar
    const savedQuery = query(
      collection(db, 'messages'),
      where('messageId', '==', testData.messageId)
    );
    
    const savedSnapshot = await getDocs(savedQuery);
    
    if (savedSnapshot.empty) {
      console.log('❌ Mensagem não encontrada após salvamento');
      return;
    }
    
    const savedDoc = savedSnapshot.docs[0];
    const savedData = savedDoc.data();
    
    console.log('\n📋 Dados salvos no Firebase:');
    console.log(JSON.stringify({
      id: savedDoc.id,
      ...savedData,
      timestamp: savedData.timestamp?.toDate?.() || savedData.timestamp
    }, null, 2));
    
    // Verificar campos específicos
    console.log('\n🔍 Verificação de campos:');
    console.log(`✅ messageId: ${savedData.messageId}`);
    console.log(`✅ type: ${savedData.type}`);
    console.log(`✅ content: ${savedData.content}`);
    console.log(`${savedData.mediaUrl ? '✅' : '❌'} mediaUrl: ${savedData.mediaUrl || 'AUSENTE'}`);
    console.log(`${savedData.fileName ? '✅' : '❌'} fileName: ${savedData.fileName || 'AUSENTE'}`);
    console.log(`✅ sender: ${savedData.sender}`);
    console.log(`✅ isFromMe: ${savedData.isFromMe}`);
    
    // Verificar se todos os campos necessários estão presentes
    const requiredFields = ['messageId', 'type', 'content', 'mediaUrl', 'fileName', 'sender', 'isFromMe'];
    const missingFields = requiredFields.filter(field => !savedData[field]);
    
    if (missingFields.length === 0) {
      console.log('\n🎉 SUCESSO: Todos os campos necessários estão presentes!');
    } else {
      console.log(`\n⚠️  ATENÇÃO: Campos ausentes: ${missingFields.join(', ')}`);
    }
    
    // Simular como o convertFirebaseMessageToMessage processaria esta mensagem
    console.log('\n🔄 Simulando conversão para Message:');
    let convertedContent = savedData.content;
    if (savedData.mediaUrl && savedData.type !== 'text' && savedData.type !== 'note') {
      convertedContent = savedData.mediaUrl;
    }
    
    console.log(`📤 Content original: ${savedData.content}`);
    console.log(`📥 Content convertido: ${convertedContent}`);
    console.log(`🔗 MediaURL: ${savedData.mediaUrl}`);
    
    if (convertedContent === savedData.mediaUrl) {
      console.log('✅ Conversão correta: content será a mediaUrl');
    } else {
      console.log('❌ Problema na conversão: content não será a mediaUrl');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testMediaSave().catch(console.error);