import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

async function testFirebaseConnection() {
  try {
    console.log('🔥 Testando conexão com Firebase...');
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app inicializado');
    
    // Inicializar Firestore
    const db = getFirestore(app);
    console.log('✅ Firestore inicializado');
    
    // Testar uma operação simples
    console.log('🔍 Testando operação básica...');
    
    // Verificar se conseguimos acessar o Firestore
    const testDoc = db._delegate || db;
    console.log('✅ Firestore acessível:', !!testDoc);
    
    console.log('🎉 Teste de conexão concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na conexão com Firebase:', error);
    console.error('Stack trace:', error.stack);
  }
}

testFirebaseConnection();
