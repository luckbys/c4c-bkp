// Teste simples para verificar se o Firebase está funcionando
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔧 Testando configuração do Firebase...');
console.log('Config:', {
  apiKey: firebaseConfig.apiKey ? '✅ Definido' : '❌ Não definido',
  authDomain: firebaseConfig.authDomain ? '✅ Definido' : '❌ Não definido',
  projectId: firebaseConfig.projectId ? '✅ Definido' : '❌ Não definido',
  storageBucket: firebaseConfig.storageBucket ? '✅ Definido' : '❌ Não definido',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Definido' : '❌ Não definido',
  appId: firebaseConfig.appId ? '✅ Definido' : '❌ Não definido'
});

try {
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app inicializado com sucesso');
  
  const db = getFirestore(app);
  console.log('✅ Firestore inicializado com sucesso');
  
  console.log('🎯 Firebase está funcionando corretamente!');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error);
}