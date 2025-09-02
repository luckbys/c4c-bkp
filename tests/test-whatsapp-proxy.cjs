const axios = require('axios');
const fs = require('fs');

// Configuração
const WEBHOOK_URL = 'http://localhost:9003/api/webhook/evolution';
const PROXY_URL = 'http://localhost:9003/api/whatsapp-media-proxy';

// Simular uma mensagem de áudio real com URL .enc
const audioMessage = {
  event: 'messages.upsert',
  instance: 'evolution_exchange',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'WHATSAPP_PROXY_TEST_' + Date.now(),
      participant: undefined
    },
    pushName: 'Teste Proxy',
    status: 'SERVER_ACK',
    message: {
      audioMessage: {
        url: 'https://mmg.whatsapp.net/v/t62.7117-24/536882838_744707151667934_6790652857649873145_n.enc?ccb=11-4&oh=01_Q5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&oe=676C5678&_nc_sid=5e03e0',
        mimetype: 'audio/ogg; codecs=opus',
        fileLength: '12345',
        seconds: 10,
        ptt: true,
        mediaKey: 'testmediakey123456789',
        fileEncSha256: 'testfileencsha256',
        fileSha256: 'testfilesha256',
        directPath: '/v/t62.7117-24/536882838_744707151667934_6790652857649873145_n.enc'
      }
    },
    contextInfo: undefined,
    messageType: 'audioMessage',
    messageTimestamp: Math.floor(Date.now() / 1000),
    instanceId: 'test-instance-id',
    source: 'web'
  }
};

async function testWhatsAppProxy() {
  console.log('🧪 Testando o proxy do WhatsApp para URLs .enc...');
  
  try {
    // 1. Testar o proxy diretamente
    console.log('\n1️⃣ Testando proxy diretamente...');
    const encUrl = audioMessage.data.message.audioMessage.url;
    const proxyTestUrl = `${PROXY_URL}?url=${encodeURIComponent(encUrl)}&instance=evolution_exchange`;
    
    console.log('🔗 URL do proxy:', proxyTestUrl);
    
    try {
      const proxyResponse = await axios.get(proxyTestUrl, {
        timeout: 15000,
        validateStatus: () => true // Aceitar qualquer status
      });
      
      console.log('📊 Resposta do proxy:', {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        contentType: proxyResponse.headers['content-type'],
        contentLength: proxyResponse.headers['content-length'],
        hasData: !!proxyResponse.data
      });
      
      if (proxyResponse.status === 200) {
        console.log('✅ Proxy funcionou! Áudio baixado com sucesso.');
      } else if (proxyResponse.status === 403) {
        console.log('⚠️ URL .enc expirada (403 Forbidden) - isso é esperado para URLs antigas.');
      } else {
        console.log('❌ Proxy retornou erro:', proxyResponse.status);
      }
    } catch (proxyError) {
      console.log('❌ Erro no teste do proxy:', proxyError.message);
    }
    
    // 2. Enviar webhook para testar o fluxo completo
    console.log('\n2️⃣ Enviando webhook para testar fluxo completo...');
    
    try {
      const webhookResponse = await axios.post(WEBHOOK_URL, audioMessage, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-API/1.0'
        },
        timeout: 30000
      });
      
      console.log('✅ Webhook enviado com sucesso:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText
      });
      
      // Aguardar um pouco para o processamento
      console.log('⏳ Aguardando processamento...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (webhookError) {
      console.log('❌ Erro no webhook:', webhookError.message);
    }
    
    // 3. Verificar se a mensagem foi salva no Firebase
    console.log('\n3️⃣ Verificando mensagem no Firebase...');
    
    try {
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
        
        async function checkMessage() {
          try {
            const messagesRef = collection(db, 'messages');
            const q = query(
              messagesRef,
              where('messageType', '==', 'audio'),
              orderBy('timestamp', 'desc'),
              limit(3)
            );
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
              console.log('❌ Nenhuma mensagem de áudio encontrada');
              return;
            }
            
            console.log('✅ Mensagens de áudio encontradas:');
            snapshot.forEach((doc, index) => {
              const data = doc.data();
              console.log(\`📱 Áudio \${index + 1}:\`, {
                id: doc.id,
                messageId: data.messageId,
                content: data.content?.substring(0, 100) + '...',
                isEncUrl: data.content?.includes('.enc'),
                timestamp: data.timestamp?.toDate?.() || data.timestamp
              });
            });
          } catch (error) {
            console.error('❌ Erro ao verificar Firebase:', error.message);
          }
        }
        
        checkMessage();
      `;
      
      // Salvar e executar o script de verificação
      fs.writeFileSync('temp-check-firebase.cjs', checkScript);
      
      const { exec } = require('child_process');
      exec('node temp-check-firebase.cjs', (error, stdout, stderr) => {
        if (error) {
          console.log('❌ Erro ao verificar Firebase:', error.message);
        } else {
          console.log(stdout);
        }
        
        // Limpar arquivo temporário
        try {
          fs.unlinkSync('temp-check-firebase.cjs');
        } catch (e) {}
      });
      
    } catch (firebaseError) {
      console.log('❌ Erro na verificação do Firebase:', firebaseError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar teste
testWhatsAppProxy().then(() => {
  console.log('\n🏁 Teste do proxy do WhatsApp concluído!');
}).catch(error => {
  console.error('❌ Erro fatal no teste:', error.message);
});