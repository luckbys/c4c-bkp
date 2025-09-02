const axios = require('axios');
const fs = require('fs');

// Configuração
const WEBHOOK_URL = 'http://localhost:9003/api/webhooks/evolution';
const MINIO_CONSOLE_URL = 'http://localhost:9001'; // Console do MinIO

// Simular uma mensagem de imagem real da Evolution API
const realImageMessage = {
  event: 'messages.upsert',
  instance: 'evolution_exchange',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'REAL_TEST_' + Date.now(),
      participant: undefined
    },
    pushName: 'Teste Real',
    status: 'SERVER_ACK',
    message: {
      imageMessage: {
        url: 'https://mmg.whatsapp.net/v/t62.7118-24/12345678_987654321_123456789_n.enc?ccb=11-4&oh=01_REAL_TEST_HASH&oe=676C5678&_nc_sid=5e03e0',
        mimetype: 'image/jpeg',
        caption: 'Teste de imagem real da Evolution API',
        fileLength: '54321',
        height: 1080,
        width: 1920,
        mediaKey: 'realtestmediakey123456789',
        fileEncSha256: 'realtestfileencsha256',
        fileSha256: 'realtestfilesha256',
        jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      }
    },
    contextInfo: undefined,
    messageType: 'imageMessage',
    messageTimestamp: Math.floor(Date.now() / 1000),
    instanceId: 'test-instance-id',
    source: 'web'
  }
};

// Simular uma mensagem de áudio real da Evolution API
const realAudioMessage = {
  event: 'messages.upsert',
  instance: 'evolution_exchange',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'REAL_AUDIO_TEST_' + Date.now(),
      participant: undefined
    },
    pushName: 'Teste Real Áudio',
    status: 'SERVER_ACK',
    message: {
      audioMessage: {
        url: 'https://mmg.whatsapp.net/v/t62.7117-24/98765432_123456789_987654321_n.enc?ccb=11-4&oh=01_REAL_AUDIO_TEST_HASH&oe=676C5678&_nc_sid=5e03e0',
        mimetype: 'audio/ogg; codecs=opus',
        fileLength: '12345',
        seconds: 15,
        ptt: true,
        mediaKey: 'realaudiotestmediakey123',
        fileEncSha256: 'realaudiotestfileencsha256',
        fileSha256: 'realaudiotestfilesha256',
        directPath: '/v/t62.7117-24/98765432_123456789_987654321_n.enc'
      }
    },
    contextInfo: undefined,
    messageType: 'audioMessage',
    messageTimestamp: Math.floor(Date.now() / 1000),
    instanceId: 'test-instance-id',
    source: 'web'
  }
};

async function testRealEvolutionMessage() {
  console.log('🧪 Testando processamento de mensagem real da Evolution API...');
  
  try {
    // 1. Enviar mensagem de imagem
    console.log('\n1️⃣ Enviando mensagem de imagem real...');
    
    try {
      const imageResponse = await axios.post(WEBHOOK_URL, realImageMessage, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-API/1.0'
        },
        timeout: 30000
      });
      
      console.log('✅ Webhook de imagem enviado:', {
        status: imageResponse.status,
        statusText: imageResponse.statusText
      });
      
    } catch (imageError) {
      console.log('❌ Erro no webhook de imagem:', imageError.message);
    }
    
    // Aguardar processamento
    console.log('⏳ Aguardando processamento da imagem...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 2. Enviar mensagem de áudio
    console.log('\n2️⃣ Enviando mensagem de áudio real...');
    
    try {
      const audioResponse = await axios.post(WEBHOOK_URL, realAudioMessage, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-API/1.0'
        },
        timeout: 30000
      });
      
      console.log('✅ Webhook de áudio enviado:', {
        status: audioResponse.status,
        statusText: audioResponse.statusText
      });
      
    } catch (audioError) {
      console.log('❌ Erro no webhook de áudio:', audioError.message);
    }
    
    // Aguardar processamento
    console.log('⏳ Aguardando processamento do áudio...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 3. Verificar mensagens no Firebase
    console.log('\n3️⃣ Verificando mensagens salvas no Firebase...');
    
    const checkScript = `
      const { initializeApp } = require('firebase/app');
      const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
      
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
      
      async function checkMessages() {
        try {
          const messagesRef = collection(db, 'messages');
          const q = query(
            messagesRef,
            orderBy('timestamp', 'desc'),
            limit(5)
          );
          
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            console.log('❌ Nenhuma mensagem encontrada');
            return;
          }
          
          console.log('✅ Mensagens recentes encontradas:');
          snapshot.forEach((doc, index) => {
            const data = doc.data();
            const isMinioUrl = data.content?.includes('localhost:9000');
            const isFirebaseUrl = data.content?.includes('firebasestorage.googleapis.com');
            const isEncUrl = data.content?.includes('.enc');
            
            console.log(\`📱 Mensagem \${index + 1}:\`, {
              id: doc.id,
              messageId: data.messageId,
              type: data.messageType || data.type,
              content: data.content?.substring(0, 80) + '...',
              isMinioUrl,
              isFirebaseUrl,
              isEncUrl,
              timestamp: data.timestamp?.toDate?.() || data.timestamp
            });
          });
        } catch (error) {
          console.error('❌ Erro ao verificar Firebase:', error.message);
        }
      }
      
      checkMessages();
    `;
    
    // Salvar e executar o script de verificação
    fs.writeFileSync('temp-check-messages.cjs', checkScript);
    
    const { exec } = require('child_process');
    exec('node temp-check-messages.cjs', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Erro ao verificar Firebase:', error.message);
      } else {
        console.log(stdout);
      }
      
      // Limpar arquivo temporário
      try {
        fs.unlinkSync('temp-check-messages.cjs');
      } catch (e) {}
    });
    
    // 4. Instruções para verificar MinIO
    console.log('\n4️⃣ Para verificar se os arquivos foram salvos no MinIO:');
    console.log('🔗 Acesse o console do MinIO em:', MINIO_CONSOLE_URL);
    console.log('📁 Verifique o bucket "crm-media-files"');
    console.log('📂 Procure por pastas com nomes de tickets (ex: ticket_123456)');
    console.log('🎯 Os arquivos devem estar organizados por tipo: images/, audios/, etc.');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar teste
testRealEvolutionMessage().then(() => {
  console.log('\n🏁 Teste de mensagem real da Evolution API concluído!');
  console.log('\n📋 Resumo do que verificar:');
  console.log('1. ✅ Webhooks enviados com sucesso');
  console.log('2. 🔍 Mensagens salvas no Firebase com URLs corretas');
  console.log('3. 📁 Arquivos reais salvos no MinIO (não apenas testes)');
  console.log('4. 🎯 URLs das mensagens apontam para MinIO (localhost:9000)');
}).catch(error => {
  console.error('❌ Erro fatal no teste:', error.message);
});