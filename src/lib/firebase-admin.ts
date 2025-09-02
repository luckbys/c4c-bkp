import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

// Configuração do Firebase Admin SDK
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "cerc-3m1uep",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "cerc-3m1uep.appspot.com",
};

// Função para criar credenciais mock para desenvolvimento
function createMockCredentials() {
  return {
    getAccessToken: () => Promise.resolve({
      access_token: 'mock-token',
      expires_in: 3600
    }),
    getCertificate: () => null,
    getProjectId: () => firebaseAdminConfig.projectId
  };
}

// Inicializar Firebase Admin apenas se não estiver já inicializado
let adminApp;
if (getApps().length === 0) {
  try {
    // Tentar usar service account se disponível
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        ...firebaseAdminConfig
      });
      console.log('✅ Firebase Admin inicializado com service account');
    } else {
      // Para desenvolvimento, tentar credenciais padrão
      try {
        adminApp = initializeApp({
          credential: applicationDefault(),
          ...firebaseAdminConfig
        });
        console.log('✅ Firebase Admin inicializado com credenciais padrão');
      } catch (credError) {
        console.warn('⚠️ Credenciais padrão não disponíveis, usando configuração básica');
        // Fallback: usar apenas configuração básica (sem credenciais)
        adminApp = initializeApp(firebaseAdminConfig);
        console.log('✅ Firebase Admin inicializado com configuração básica');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error);
    // Último fallback: configuração mínima
    adminApp = initializeApp(firebaseAdminConfig);
  }
} else {
  adminApp = getApps()[0];
}

// Exportar serviços do Firebase Admin
export const adminStorage = getStorage(adminApp);
export const adminDb = getFirestore(adminApp);
export { adminApp };

export default adminApp;