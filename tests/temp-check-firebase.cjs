
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
              console.log(`📱 Áudio ${index + 1}:`, {
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
      