// Script para testar especificamente o erro 400 Bad Request
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, orderBy, limit } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Configuração do Firebase
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

const BASE_URL = 'http://localhost:9003';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const TARGET_PHONE = '5512981022013@s.whatsapp.net';

async function test400Error() {
  console.log('🔍 TESTE ESPECÍFICO DO ERRO 400 BAD REQUEST');
  console.log('=' .repeat(60));
  
  try {
    // 1. Testar endpoint direto (que funciona)
    console.log('\n1. 📤 TESTANDO ENDPOINT DIRETO (/api/send-message)...');
    await testDirectEndpoint();
    
    // 2. Testar Evolution API diretamente
    console.log('\n2. 🔗 TESTANDO EVOLUTION API DIRETAMENTE...');
    await testEvolutionApiDirect();
    
    // 3. Testar firebaseService.sendMessage
    console.log('\n3. 🔥 TESTANDO FIREBASE SERVICE...');
    await testFirebaseService();
    
    // 4. Simular exatamente o que o agente IA faz
    console.log('\n4. 🤖 SIMULANDO FLUXO DO AGENTE IA...');
    await simulateAgentFlow();
    
    // 5. Comparar payloads
    console.log('\n5. 📊 COMPARANDO PAYLOADS...');
    await comparePayloads();
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

async function testDirectEndpoint() {
  try {
    console.log('   📋 Testando endpoint /api/send-message...');
    
    const payload = {
      instanceName: 'loja',
      remoteJid: TARGET_PHONE,
      text: '[TESTE DIRETO] Mensagem de teste do endpoint direto'
    };
    
    console.log('   📤 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(`${BASE_URL}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`   📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ SUCESSO - Endpoint direto funcionou');
      console.log('   📄 Resposta:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('   ❌ FALHA - Endpoint direto falhou');
      console.log('   📄 Erro:', errorText);
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste direto:', error.message);
  }
}

async function testEvolutionApiDirect() {
  try {
    console.log('   🔗 Testando Evolution API diretamente...');
    
    const payload = {
      number: TARGET_PHONE,
      text: '[TESTE EVOLUTION] Mensagem de teste direto na Evolution API'
    };
    
    console.log('   📤 Payload:', JSON.stringify(payload, null, 2));
    console.log('   🔗 URL:', `${EVOLUTION_API_URL}/message/sendText/loja`);
    
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/loja`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`   📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ SUCESSO - Evolution API direta funcionou');
      console.log('   📄 Resposta:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('   ❌ FALHA - Evolution API direta falhou');
      console.log('   📄 Erro:', errorText);
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste Evolution direto:', error.message);
  }
}

async function testFirebaseService() {
  try {
    console.log('   🔥 Testando firebaseService.sendMessage...');
    
    // Simular o que o firebaseService faz
    const evolutionPayload = {
      number: TARGET_PHONE,
      text: '[TESTE FIREBASE] Mensagem de teste do Firebase Service'
    };
    
    console.log('   📤 Payload (como firebaseService):', JSON.stringify(evolutionPayload, null, 2));
    
    // Fazer a mesma requisição que o firebaseService faz
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/loja`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(evolutionPayload)
    });
    
    console.log(`   📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ SUCESSO - Firebase Service simulado funcionou');
      console.log('   📄 Resposta:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('   ❌ FALHA - Firebase Service simulado falhou');
      console.log('   📄 Erro:', errorText);
      
      // Tentar analisar o erro
      try {
        const errorJson = JSON.parse(errorText);
        console.log('   🔍 Análise do erro:', JSON.stringify(errorJson, null, 2));
      } catch (parseError) {
        console.log('   🔍 Erro não é JSON válido');
      }
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste Firebase Service:', error.message);
  }
}

async function simulateAgentFlow() {
  try {
    console.log('   🤖 Simulando exatamente o fluxo do agente IA...');
    
    // Buscar um ticket real
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('updatedAt', 'desc'), limit(10));
    
    const querySnapshot = await getDocs(q);
    const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const targetTicket = tickets.find(ticket => {
      const clientId = ticket.client?.id || ticket.remoteJid || '';
      return clientId.includes('5512981022013');
    });
    
    if (!targetTicket) {
      console.log('   ⚠️ Ticket alvo não encontrado');
      return;
    }
    
    console.log('   🎫 Ticket encontrado:', targetTicket.id);
    console.log('   📱 Cliente:', targetTicket.client?.id || targetTicket.remoteJid);
    
    // Simular o que o geminiAgentService faz
    const agentResponse = 'Olá! Esta é uma resposta simulada do agente IA para teste de diagnóstico.';
    
    console.log('   💬 Resposta do agente:', agentResponse);
    
    // Tentar enviar via firebaseService (simulado)
    const instanceName = targetTicket.instanceName || 'loja';
    const remoteJid = targetTicket.client?.id || targetTicket.remoteJid;
    
    console.log('   📤 Enviando via método do agente...');
    console.log('   📋 Parâmetros:', { instanceName, remoteJid, text: agentResponse });
    
    // Fazer exatamente o que o firebaseService.sendMessage faz
    const normalizedJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
    
    const evolutionPayload = {
      number: normalizedJid,
      text: agentResponse.trim()
    };
    
    console.log('   📤 Payload final:', JSON.stringify(evolutionPayload, null, 2));
    
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(evolutionPayload)
    });
    
    console.log(`   📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ SUCESSO - Fluxo do agente funcionou');
      console.log('   📄 Resposta:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('   ❌ FALHA - Fluxo do agente falhou');
      console.log('   📄 Erro completo:', errorText);
      
      // Analisar o erro em detalhes
      try {
        const errorJson = JSON.parse(errorText);
        console.log('   🔍 Erro estruturado:');
        console.log('      - Mensagem:', errorJson.message || 'N/A');
        console.log('      - Código:', errorJson.code || 'N/A');
        console.log('      - Detalhes:', errorJson.details || 'N/A');
        
        if (errorJson.response) {
          console.log('      - Response:', JSON.stringify(errorJson.response, null, 2));
        }
      } catch (parseError) {
        console.log('   🔍 Erro não é JSON, analisando como texto...');
        
        if (errorText.includes('400')) {
          console.log('   🚨 CONFIRMADO: Erro 400 Bad Request');
        }
        
        if (errorText.includes('number')) {
          console.log('   🔍 Erro relacionado ao campo "number"');
        }
        
        if (errorText.includes('text')) {
          console.log('   🔍 Erro relacionado ao campo "text"');
        }
      }
    }
    
  } catch (error) {
    console.log('   ❌ Erro na simulação do agente:', error.message);
  }
}

async function comparePayloads() {
  console.log('   📊 Comparando diferentes formatos de payload...');
  
  const payloads = [
    {
      name: 'Formato Endpoint Direto',
      payload: {
        instanceName: 'loja',
        remoteJid: TARGET_PHONE,
        text: 'Teste'
      }
    },
    {
      name: 'Formato Evolution API',
      payload: {
        number: TARGET_PHONE,
        text: 'Teste'
      }
    },
    {
      name: 'Formato com Options',
      payload: {
        number: TARGET_PHONE,
        text: 'Teste',
        options: {}
      }
    },
    {
      name: 'Formato Mínimo',
      payload: {
        number: TARGET_PHONE.replace('@s.whatsapp.net', ''),
        text: 'Teste'
      }
    }
  ];
  
  for (const { name, payload } of payloads) {
    console.log(`\n   🧪 Testando ${name}:`);
    console.log('      Payload:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/loja`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`      Status: ${response.status}`);
      
      if (response.ok) {
        console.log('      ✅ FUNCIONOU');
      } else {
        const errorText = await response.text();
        console.log('      ❌ FALHOU');
        console.log('      Erro:', errorText.substring(0, 200) + '...');
      }
    } catch (error) {
      console.log('      ❌ ERRO:', error.message);
    }
    
    // Aguardar um pouco entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Executar teste
console.log('🚀 Iniciando teste do erro 400...');
test400Error().catch(console.error);