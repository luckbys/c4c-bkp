// Script para diagnosticar erros específicos do agente IA
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

async function diagnoseAgentErrors() {
  console.log('🔍 DIAGNÓSTICO DE ERROS DO AGENTE IA');
  console.log('=' .repeat(60));
  
  try {
    // 1. Analisar interações recentes com erro
    console.log('\n1. 📊 ANALISANDO ERROS RECENTES...');
    await analyzeRecentErrors();
    
    // 2. Testar Evolution API diretamente
    console.log('\n2. 📱 TESTANDO EVOLUTION API...');
    await testEvolutionAPI();
    
    // 3. Testar Gemini API
    console.log('\n3. 🤖 TESTANDO GEMINI API...');
    await testGeminiAPI();
    
    // 4. Verificar configuração de envio
    console.log('\n4. ⚙️ VERIFICANDO CONFIGURAÇÃO...');
    await checkSendConfiguration();
    
    // 5. Teste de envio direto
    console.log('\n5. 📤 TESTE DE ENVIO DIRETO...');
    await testDirectSend();
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  }
}

async function analyzeRecentErrors() {
  try {
    console.log('   📋 Buscando interações com erro...');
    
    const interactionsRef = collection(db, 'agent_interactions');
    const q = query(
      interactionsRef,
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const querySnapshot = await getDocs(q);
    const interactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const errorInteractions = interactions.filter(i => i.type === 'error');
    const successInteractions = interactions.filter(i => i.type === 'auto_response');
    
    console.log(`   📊 Total de interações: ${interactions.length}`);
    console.log(`   ❌ Interações com erro: ${errorInteractions.length}`);
    console.log(`   ✅ Interações bem-sucedidas: ${successInteractions.length}`);
    
    if (errorInteractions.length > 0) {
      console.log('\n   🔍 DETALHES DOS ERROS:');
      
      errorInteractions.slice(0, 5).forEach((interaction, index) => {
        console.log(`\n      Erro ${index + 1}:`);
        console.log(`         ⏰ Timestamp: ${new Date(interaction.timestamp).toLocaleString('pt-BR')}`);
        console.log(`         🎫 Ticket: ${interaction.ticketId}`);
        console.log(`         📱 Cliente: ${interaction.clientId || 'N/A'}`);
        console.log(`         ❌ Erro: ${interaction.error || 'Erro não especificado'}`);
        console.log(`         📝 Detalhes: ${interaction.details || 'N/A'}`);
        
        if (interaction.response) {
          console.log(`         💬 Resposta tentada: "${interaction.response.substring(0, 100)}..."`);
        }
      });
      
      // Analisar padrões de erro
      const errorTypes = {};
      errorInteractions.forEach(interaction => {
        const errorMsg = interaction.error || 'Erro desconhecido';
        const errorType = errorMsg.split(':')[0] || errorMsg.substring(0, 50);
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      });
      
      console.log('\n   📈 TIPOS DE ERRO MAIS COMUNS:');
      Object.entries(errorTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`      - ${type}: ${count} ocorrências`);
        });
    }
    
    if (successInteractions.length > 0) {
      console.log('\n   ✅ INTERAÇÕES BEM-SUCEDIDAS:');
      
      const avgConfidence = successInteractions
        .filter(i => i.confidence)
        .reduce((sum, i) => sum + i.confidence, 0) / successInteractions.filter(i => i.confidence).length;
      
      console.log(`      📊 Confiança média: ${avgConfidence.toFixed(2)}`);
      console.log(`      📈 Taxa de sucesso: ${(successInteractions.length / interactions.length * 100).toFixed(1)}%`);
      
      // Verificar se as respostas bem-sucedidas foram realmente enviadas
      const recentSuccess = successInteractions.slice(0, 3);
      console.log('\n      🔍 Últimas respostas bem-sucedidas:');
      recentSuccess.forEach((interaction, index) => {
        console.log(`         ${index + 1}. Confiança: ${interaction.confidence}, Ticket: ${interaction.ticketId}`);
        if (interaction.response) {
          console.log(`            Resposta: "${interaction.response.substring(0, 80)}..."`);
        }
      });
    }
    
  } catch (error) {
    console.log('   ❌ Erro ao analisar interações:', error.message);
  }
}

async function testEvolutionAPI() {
  try {
    console.log('   🔗 Testando conexão com Evolution API...');
    
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
      console.log('   ❌ Variáveis de ambiente da Evolution API não configuradas');
      return;
    }
    
    console.log(`   📡 URL: ${process.env.EVOLUTION_API_URL}`);
    console.log(`   🔑 API Key: ${process.env.EVOLUTION_API_KEY.substring(0, 10)}...`);
    
    // Testar endpoint de status da instância
    try {
      const statusResponse = await fetch(`${process.env.EVOLUTION_API_URL}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY
        }
      });
      
      if (statusResponse.ok) {
        const instances = await statusResponse.json();
        console.log('   ✅ Evolution API respondendo');
        console.log(`   📊 Instâncias encontradas: ${instances.length || 0}`);
        
        const lojaInstance = instances.find(i => i.instance?.instanceName === 'loja');
        if (lojaInstance) {
          console.log(`   ✅ Instância 'loja' encontrada`);
          console.log(`   📱 Status: ${lojaInstance.instance?.status || 'N/A'}`);
        } else {
          console.log('   ⚠️ Instância \'loja\' não encontrada');
        }
      } else {
        console.log(`   ❌ Erro na Evolution API: ${statusResponse.status}`);
      }
    } catch (fetchError) {
      console.log(`   ❌ Erro de conexão: ${fetchError.message}`);
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste da Evolution API:', error.message);
  }
}

async function testGeminiAPI() {
  try {
    console.log('   🤖 Testando Gemini API...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('   ❌ GEMINI_API_KEY não configurada');
      return;
    }
    
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = 'Responda apenas "OK" para confirmar que está funcionando.';
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    if (response) {
      console.log('   ✅ Gemini API funcionando');
      console.log(`   📝 Resposta: "${response.trim()}"`);
    } else {
      console.log('   ❌ Gemini retornou resposta vazia');
    }
    
  } catch (error) {
    console.log(`   ❌ Erro no Gemini: ${error.message}`);
  }
}

async function checkSendConfiguration() {
  try {
    console.log('   ⚙️ Verificando configuração de envio...');
    
    // Verificar variáveis de ambiente
    const requiredVars = [
      'EVOLUTION_API_URL',
      'EVOLUTION_API_KEY',
      'GEMINI_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`   ❌ Variáveis faltando: ${missingVars.join(', ')}`);
    } else {
      console.log('   ✅ Todas as variáveis de ambiente configuradas');
    }
    
    // Verificar endpoint de envio local
    try {
      const response = await fetch(`${BASE_URL}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          instanceName: 'loja',
          remoteJid: '5512999999999@s.whatsapp.net',
          text: 'Teste de configuração'
        })
      });
      
      console.log(`   📡 Endpoint local: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Erro no endpoint: ${errorText}`);
      }
    } catch (endpointError) {
      console.log(`   ❌ Erro no endpoint local: ${endpointError.message}`);
    }
    
  } catch (error) {
    console.log('   ❌ Erro na verificação:', error.message);
  }
}

async function testDirectSend() {
  try {
    console.log('   📤 Testando envio direto...');
    
    const testPayload = {
      instanceName: 'loja',
      remoteJid: '5512981022013@s.whatsapp.net',
      text: '[TESTE DIAGNÓSTICO] Esta é uma mensagem de teste para verificar se o envio está funcionando. Pode ignorar.',
      test: true
    };
    
    console.log('   📋 Enviando mensagem de teste...');
    
    const response = await fetch(`${BASE_URL}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      const responseData = await response.text();
      console.log('   ✅ Envio direto funcionando');
      console.log(`   📄 Resposta: ${responseData}`);
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Falha no envio: ${response.status} - ${errorText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro no teste de envio: ${error.message}`);
  }
}

// Executar diagnóstico
console.log('🚀 Iniciando diagnóstico de erros...');
diagnoseAgentErrors().catch(console.error);