const amqp = require('amqplib');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Configurações
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:Devs@0101@212.85.0.57:5672/';
const FIREBASE_CONFIG = {
  projectId: 'crm-c4-main',
  // Adicione outras configurações do Firebase se necessário
};

console.log('🔍 [DIAGNÓSTICO] Iniciando diagnóstico do envio de mensagens...');
console.log('📡 RabbitMQ URL:', RABBITMQ_URL);

// Inicializar Firebase Admin (se não estiver inicializado)
if (!admin.apps.length) {
  try {
    admin.initializeApp(FIREBASE_CONFIG);
    console.log('✅ Firebase Admin inicializado');
  } catch (error) {
    console.log('⚠️ Erro ao inicializar Firebase Admin:', error.message);
    console.log('📝 Continuando sem Firebase para diagnóstico básico...');
  }
}

async function testMessageFlow() {
  console.log('\n🧪 [TESTE] Testando fluxo completo de mensagens...');
  
  try {
    // 1. Testar conexão com RabbitMQ
    console.log('\n📡 [TESTE 1] Testando conexão RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    console.log('✅ Conectado ao RabbitMQ');
    
    // 2. Verificar se as filas existem
    console.log('\n📋 [TESTE 2] Verificando filas...');
    try {
      const outboundQueue = await channel.checkQueue('crm.messages.outbound');
      console.log('✅ Fila outbound existe:', outboundQueue);
    } catch (error) {
      console.log('❌ Fila outbound não existe:', error.message);
    }
    
    // 3. Testar envio de mensagem via API
    console.log('\n📤 [TESTE 3] Testando envio via API...');
    const testMessage = {
      id: `test-${Date.now()}`,
      type: 'text',
      content: 'Mensagem de teste para diagnóstico',
      ticketId: 'test-ticket-123',
      contactId: 'test-contact-456',
      userId: 'test-user',
      timestamp: Date.now(),
      metadata: {
        test: true,
        diagnostic: true
      }
    };
    
    try {
      const response = await fetch('http://localhost:9003/api/rabbitmq/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      });
      
      const result = await response.json();
      console.log('📤 Resposta da API:', result);
      
      if (response.ok) {
        console.log('✅ Mensagem enviada para fila com sucesso');
      } else {
        console.log('❌ Erro ao enviar mensagem:', result.error);
      }
    } catch (error) {
      console.log('❌ Erro na requisição API:', error.message);
    }
    
    // 4. Verificar se a mensagem está na fila
    console.log('\n📋 [TESTE 4] Verificando mensagens na fila...');
    try {
      const queueInfo = await channel.checkQueue('crm.messages.outbound');
      console.log('📊 Estatísticas da fila outbound:', {
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount
      });
      
      if (queueInfo.messageCount > 0) {
        console.log('✅ Há mensagens na fila aguardando processamento');
      } else {
        console.log('⚠️ Nenhuma mensagem na fila (pode ter sido processada rapidamente)');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar fila:', error.message);
    }
    
    // 5. Testar status do processador
    console.log('\n🔧 [TESTE 5] Verificando status dos processadores...');
    try {
      const statusResponse = await fetch('http://localhost:9003/api/rabbitmq/init');
      const statusResult = await statusResponse.json();
      console.log('📊 Status dos processadores:', statusResult);
    } catch (error) {
      console.log('❌ Erro ao verificar status:', error.message);
    }
    
    // 6. Verificar Firebase (se disponível)
    if (admin.apps.length > 0) {
      console.log('\n🔥 [TESTE 6] Verificando Firebase...');
      try {
        const db = admin.firestore();
        
        // Verificar se existem mensagens recentes
        const messagesRef = db.collection('messages');
        const recentMessages = await messagesRef
          .orderBy('timestamp', 'desc')
          .limit(5)
          .get();
        
        console.log(`📝 Mensagens recentes no Firebase: ${recentMessages.size}`);
        
        recentMessages.forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. ID: ${doc.id}, Conteúdo: ${data.content?.substring(0, 50)}...`);
        });
        
      } catch (error) {
        console.log('❌ Erro ao verificar Firebase:', error.message);
      }
    }
    
    await connection.close();
    console.log('\n✅ [DIAGNÓSTICO] Diagnóstico concluído!');
    
  } catch (error) {
    console.error('❌ [DIAGNÓSTICO] Erro durante o diagnóstico:', error);
  }
}

async function checkProcessorStatus() {
  console.log('\n🔍 [PROCESSADOR] Verificando status do processador Evolution...');
  
  try {
    // Verificar se o processador está rodando
    const response = await fetch('http://localhost:9003/api/rabbitmq/status');
    
    if (response.ok) {
      const status = await response.json();
      console.log('📊 Status completo:', JSON.stringify(status, null, 2));
      
      if (status.status?.processorsRunning?.outbound) {
        console.log('✅ Processador outbound está rodando');
      } else {
        console.log('❌ Processador outbound NÃO está rodando');
        console.log('💡 Isso explica por que as mensagens não aparecem na conversa!');
      }
    } else {
      console.log('❌ Erro ao verificar status:', response.status);
    }
  } catch (error) {
    console.log('❌ Erro na verificação:', error.message);
  }
}

async function main() {
  console.log('🚀 [MAIN] Iniciando diagnóstico completo...');
  
  await checkProcessorStatus();
  await testMessageFlow();
  
  console.log('\n📋 [RESUMO] Possíveis causas do problema:');
  console.log('1. ❌ Processador outbound não está rodando');
  console.log('2. ❌ Mensagens ficam na fila mas não são processadas');
  console.log('3. ❌ Erro ao salvar mensagem no Firebase');
  console.log('4. ❌ Erro na Evolution API');
  console.log('\n💡 [SOLUÇÃO] Verifique os logs do servidor para mais detalhes!');
  
  process.exit(0);
}

main().catch(error => {
  console.error('💥 [FATAL] Erro fatal no diagnóstico:', error);
  process.exit(1);
});