
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
            
            console.log(`📱 Mensagem ${index + 1}:`, {
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
    