// Script para testar o endpoint corrigido
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:9003';
const TARGET_PHONE = '5512981022013@s.whatsapp.net';

async function testCorrectedEndpoint() {
  console.log('🔧 TESTANDO ENDPOINT CORRIGIDO');
  console.log('=' .repeat(50));
  
  try {
    // 1. Testar com formato original (que antes falhava)
    console.log('\n1. 📤 TESTANDO FORMATO ORIGINAL...');
    await testOriginalFormat();
    
    // 2. Testar com diferentes formatos de número
    console.log('\n2. 📱 TESTANDO DIFERENTES FORMATOS...');
    await testDifferentFormats();
    
    // 3. Testar mensagem do agente IA
    console.log('\n3. 🤖 TESTANDO MENSAGEM DE AGENTE IA...');
    await testAgentMessage();
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

async function testOriginalFormat() {
  try {
    const payload = {
      instanceName: 'loja',
      remoteJid: TARGET_PHONE,
      text: '[TESTE CORREÇÃO] Testando endpoint corrigido com formato original'
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
      console.log('   ✅ SUCESSO - Formato original agora funciona!');
      console.log('   📄 Resposta:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('   ❌ AINDA FALHANDO - Formato original');
      console.log('   📄 Erro:', errorText);
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste:', error.message);
  }
}

async function testDifferentFormats() {
  const formats = [
    {
      name: 'Com @s.whatsapp.net',
      remoteJid: '5512981022013@s.whatsapp.net'
    },
    {
      name: 'Sem @s.whatsapp.net',
      remoteJid: '5512981022013'
    },
    {
      name: 'Com +55',
      remoteJid: '+5512981022013'
    }
  ];
  
  for (const format of formats) {
    console.log(`\n   🧪 Testando ${format.name}:`);
    
    try {
      const payload = {
        instanceName: 'loja',
        remoteJid: format.remoteJid,
        text: `[TESTE ${format.name.toUpperCase()}] Mensagem de teste`
      };
      
      console.log('      Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${BASE_URL}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`      Status: ${response.status}`);
      
      if (response.ok) {
        console.log('      ✅ FUNCIONOU');
      } else {
        const errorText = await response.text();
        console.log('      ❌ FALHOU');
        console.log('      Erro:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('      ❌ ERRO:', error.message);
    }
    
    // Aguardar entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function testAgentMessage() {
  try {
    console.log('   🤖 Simulando mensagem de agente IA...');
    
    const agentResponse = `Olá! Obrigado por entrar em contato conosco. \n\nEste é um teste da correção do sistema de resposta automática. O agente IA agora deve conseguir enviar mensagens corretamente.\n\nComo posso ajudá-lo hoje?`;
    
    const payload = {
      instanceName: 'loja',
      remoteJid: TARGET_PHONE,
      text: agentResponse
    };
    
    console.log('   📤 Enviando resposta do agente...');
    console.log('   💬 Texto:', agentResponse.substring(0, 100) + '...');
    
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
      console.log('   ✅ SUCESSO - Agente IA pode enviar mensagens!');
      console.log('   📄 ID da mensagem:', data.data?.key?.id);
      console.log('   📄 Status:', data.data?.status);
    } else {
      const errorText = await response.text();
      console.log('   ❌ FALHA - Agente IA ainda não consegue enviar');
      console.log('   📄 Erro:', errorText);
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste do agente:', error.message);
  }
}

// Executar teste
console.log('🚀 Testando correção do endpoint...');
console.log('📱 Número alvo: +5512981022013');
console.log('⏰ Timestamp:', new Date().toLocaleString('pt-BR'));
console.log('');

testCorrectedEndpoint().catch(console.error);