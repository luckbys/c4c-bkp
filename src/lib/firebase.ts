import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Debug: Log Firebase config to check if env vars are loaded
console.log('🔧 [FIREBASE-CONFIG] Configuração carregada:', {
  apiKey: firebaseConfig.apiKey ? '✅ Definida' : '❌ Não definida',
  authDomain: firebaseConfig.authDomain ? '✅ Definida' : '❌ Não definida',
  projectId: firebaseConfig.projectId ? '✅ Definida' : '❌ Não definida',
  storageBucket: firebaseConfig.storageBucket ? '✅ Definida' : '❌ Não definida',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Definida' : '❌ Não definida',
  appId: firebaseConfig.appId ? '✅ Definida' : '❌ Não definida'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };

export default app;