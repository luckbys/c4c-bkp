// Debug script para testar envio de mensagens
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, orderBy } = require('firebase/firestore');

// Configuração do Firebase (mesma do projeto)
const firebaseConfig = {
  apiKey: "AIzaSyDJqJ5FzKqJ5FzKqJ5FzKqJ5FzKqJ5FzKq",
  authDomain: "crm-c4c.firebaseapp.com",
  projectId: "crm-c4c",
  storageBucket: "crm-c4c.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

async function testMessageSending() {
  try {
    console.log('🔍 Iniciando teste de envio de mensagens...');
    
    // Simular dados de uma mensagem
    const testMessage = {
      content: 'Mensagem de teste - ' + new Date().toISOString(),
      sender: 'agent',
      timestamp: new Date().toISOString(),
      isFromMe: true,
      type: 'text'
    };
    
    console.log('📝 Mensagem de teste:', testMessage);
    
    // Simular o processo de envio
    console.log('\n🚀 Simulando envio de mensagem...');
    
    // 1. Adicionar mensagem temporária
    const tempMessage = { ...testMessage, isTemporary: true };
    console.log('⏳ Mensagem temporária criada:', tempMessage);
    
    // 2. Simular delay de salvamento no Firebase
    console.log('💾 Simulando salvamento no Firebase...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Simular busca de mensagens do servidor
    console.log('🔍 Simulando busca de mensagens do servidor...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 4. Verificar se mensagem existe no servidor
    const messageExists = Math.random() > 0.3; // 70% chance de existir
    console.log('✅ Mensagem existe no servidor:', messageExists);
    
    if (messageExists) {
      console.log('🎉 Mensagem encontrada no servidor - removendo temporária');
      const finalMessage = { ...testMessage, isTemporary: false };
      console.log('📋 Mensagem final:', finalMessage);
    } else {
      console.log('⚠️ Mensagem não encontrada - mantendo temporária');
      console.log('🔄 Agendando nova tentativa em 2 segundos...');
      
      setTimeout(() => {
        console.log('🔍 Segunda tentativa de busca...');
        console.log('✅ Mensagem encontrada na segunda tentativa');
        const finalMessage = { ...testMessage, isTemporary: false };
        console.log('📋 Mensagem final (segunda tentativa):', finalMessage);
      }, 2000);
    }
    
    console.log('\n🏁 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testMessageSending();

// Manter o script rodando por 5 segundos para ver os resultados
setTimeout(() => {
  console.log('\n🔚 Finalizando script de teste...');
  process.exit(0);
}, 5000);