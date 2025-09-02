import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugMessages() {
  try {
    console.log('🔍 Verificando mensagens no Firestore...');
    
    // Buscar todas as mensagens
    const messagesRef = collection(db, 'messages');
    const allMessages = await getDocs(messagesRef);
    
    console.log(`📊 Total de mensagens encontradas: ${allMessages.size}`);
    
    if (allMessages.size > 0) {
      console.log('\n📝 Primeiras 5 mensagens:');
      let count = 0;
      allMessages.forEach((doc) => {
        if (count < 5) {
          const data = doc.data();
          console.log(`\n--- Mensagem ${count + 1} ---`);
          console.log(`ID: ${doc.id}`);
          console.log(`RemoteJid: ${data.remoteJid}`);
          console.log(`InstanceName: ${data.instanceName}`);
          console.log(`Content: ${data.content}`);
          console.log(`Sender: ${data.sender}`);
          console.log(`Timestamp: ${data.timestamp?.toDate?.() || data.timestamp}`);
          count++;
        }
      });
    }
    
    // Buscar tickets
    console.log('\n🎫 Verificando tickets...');
    const ticketsRef = collection(db, 'tickets');
    const allTickets = await getDocs(ticketsRef);
    
    console.log(`📊 Total de tickets encontrados: ${allTickets.size}`);
    
    if (allTickets.size > 0) {
      console.log('\n🎫 Primeiros 3 tickets:');
      let count = 0;
      allTickets.forEach((doc) => {
        if (count < 3) {
          const data = doc.data();
          console.log(`\n--- Ticket ${count + 1} ---`);
          console.log(`ID: ${doc.id}`);
          console.log(`RemoteJid: ${data.remoteJid}`);
          console.log(`InstanceName: ${data.instanceName}`);
          console.log(`Client Name: ${data.client?.name}`);
          console.log(`Client Phone: ${data.client?.phone}`);
          console.log(`Status: ${data.status}`);
          count++;
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
  }
}

debugMessages();
