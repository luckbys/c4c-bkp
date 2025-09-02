// Script de diagnóstico completo para agente IA não respondendo
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

async function runDiagnostic() {
  console.log('🔍 DIAGNÓSTICO COMPLETO - AGENTE IA NÃO RESPONDENDO');
  console.log('=' .repeat(60));
  
  const results = {
    geminiConfig: false,
    evolutionApi: false,
    ticketsWithAI: false,
    webhookProcessing: false,
    confidenceThreshold: false,
    messageFlow: false
  };
  
  try {
    // 1. Verificar configuração do Gemini
    console.log('\n1. 🤖 VERIFICANDO CONFIGURAÇÃO DO GEMINI...');
    results.geminiConfig = await checkGeminiConfig();
    
    // 2. Verificar Evolution API
    console.log('\n2. 📱 VERIFICANDO EVOLUTION API...');
    results.evolutionApi = await checkEvolutionApi();
    
    // 3. Verificar tickets com agente IA
    console.log('\n3. 🎫 VERIFICANDO TICKETS COM AGENTE IA...');
    results.ticketsWithAI = await checkTicketsWithAI();
    
    // 4. Testar processamento de webhook
    console.log('\n4. 🔗 TESTANDO PROCESSAMENTO DE WEBHOOK...');
    results.webhookProcessing = await testWebhookProcessing();
    
    // 5. Verificar threshold de confiança
    console.log('\n5. 📊 VERIFICANDO THRESHOLD DE CONFIANÇA...');
    results.confidenceThreshold = await checkConfidenceThreshold();
    
    // 6. Testar fluxo completo de mensagem
    console.log('\n6. 🔄 TESTANDO FLUXO COMPLETO...');
    results.messageFlow = await testCompleteMessageFlow();
    
    // Relatório final
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RELATÓRIO FINAL DO DIAGNÓSTICO');
    console.log('=' .repeat(60));
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASSOU' : '❌ FALHOU';
      const testName = {
        geminiConfig: 'Configuração do Gemini',
        evolutionApi: 'Evolution API',
        ticketsWithAI: 'Tickets com Agente IA',
        webhookProcessing: 'Processamento de Webhook',
        confidenceThreshold: 'Threshold de Confiança',
        messageFlow: 'Fluxo Completo de Mensagem'
      }[test];
      console.log(`${status} - ${testName}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n📊 RESULTADO: ${passedTests}/${totalTests} testes passaram`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM!');
      console.log('O problema pode estar em:');
      console.log('- Delay no processamento');
      console.log('- Problemas de rede temporários');
      console.log('- Cache ou sincronização');
    } else {
      console.log('\n🚨 PROBLEMAS IDENTIFICADOS - VEJA OS DETALHES ACIMA');
    }
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  }
}

async function checkGeminiConfig() {
  try {
    console.log('   Verificando GEMINI_API_KEY...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('   ❌ GEMINI_API_KEY não configurada');
      console.log('   💡 SOLUÇÃO: Adicione GEMINI_API_KEY ao .env.local');
      return false;
    }
    
    if (process.env.GEMINI_API_KEY.startsWith('AIza')) {
      console.log('   ✅ GEMINI_API_KEY configurada e com formato válido');
    } else {
      console.log('   ⚠️ GEMINI_API_KEY pode ter formato inválido');
    }
    
    // Testar API do Gemini
    console.log('   Testando conexão com Gemini...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const result = await model.generateContent('Teste de conexão');
      const response = result.response.text();
      
      if (response && response.length > 0) {
        console.log('   ✅ Gemini API funcionando corretamente');
        console.log(`   📝 Resposta de teste: "${response.substring(0, 50)}..."`);
        return true;
      } else {
        console.log('   ❌ Gemini retornou resposta vazia');
        return false;
      }
    } catch (geminiError) {
      console.log('   ❌ Erro ao testar Gemini API:', geminiError.message);
      console.log('   💡 SOLUÇÃO: Verificar se a API key é válida e tem créditos');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Erro na verificação do Gemini:', error.message);
    return false;
  }
}

async function checkEvolutionApi() {
  try {
    console.log('   Verificando configuração da Evolution API...');
    
    const requiredVars = ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`   ❌ Variáveis faltando: ${missingVars.join(', ')}`);
      console.log('   💡 SOLUÇÃO: Configurar Evolution API no .env.local');
      return false;
    }
    
    console.log('   ✅ Variáveis da Evolution API configuradas');
    
    // Testar endpoint de envio de mensagem
    console.log('   Testando endpoint de envio...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: 'loja',
          remoteJid: '5512981022013@s.whatsapp.net',
          text: 'Teste de diagnóstico - ignore esta mensagem',
          test: true // Flag para indicar que é teste
        })
      });
      
      if (response.ok) {
        console.log('   ✅ Endpoint de envio funcionando');
        return true;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Erro no endpoint: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (fetchError) {
      console.log('   ❌ Erro ao testar endpoint:', fetchError.message);
      console.log('   💡 SOLUÇÃO: Verificar se o servidor está rodando');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Erro na verificação da Evolution API:', error.message);
    return false;
  }
}

async function checkTicketsWithAI() {
  try {
    console.log('   Buscando tickets com agente IA atribuído...');
    
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('assignedAgent.type', '==', 'ai'),
      where('status', 'in', ['open', 'pending']),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`   📊 Encontrados ${tickets.length} tickets ativos com agente IA`);
    
    if (tickets.length === 0) {
      console.log('   ❌ Nenhum ticket ativo com agente IA encontrado');
      console.log('   💡 SOLUÇÃO: Atribuir agente IA a um ticket ativo');
      return false;
    }
    
    // Analisar configuração dos tickets
    let ticketsWithAutoResponse = 0;
    let ticketsWithValidConfig = 0;
    
    tickets.forEach((ticket, index) => {
      console.log(`   🎫 Ticket ${index + 1}: ${ticket.id}`);
      console.log(`      - Status: ${ticket.status}`);
      console.log(`      - Agente: ${ticket.assignedAgent?.name || 'N/A'}`);
      console.log(`      - Auto Response: ${ticket.aiConfig?.autoResponse || false}`);
      console.log(`      - Activation Mode: ${ticket.aiConfig?.activationMode || 'N/A'}`);
      
      if (ticket.aiConfig?.autoResponse) {
        ticketsWithAutoResponse++;
      }
      
      if (ticket.aiConfig?.autoResponse && ticket.assignedAgent?.id) {
        ticketsWithValidConfig++;
      }
    });
    
    console.log(`   📈 Tickets com auto response: ${ticketsWithAutoResponse}/${tickets.length}`);
    console.log(`   📈 Tickets com configuração válida: ${ticketsWithValidConfig}/${tickets.length}`);
    
    if (ticketsWithValidConfig === 0) {
      console.log('   ❌ Nenhum ticket tem configuração válida para resposta automática');
      console.log('   💡 SOLUÇÃO: Habilitar autoResponse=true nos tickets com agente IA');
      return false;
    }
    
    console.log('   ✅ Tickets com agente IA configurados corretamente');
    return true;
    
  } catch (error) {
    console.log('   ❌ Erro ao verificar tickets:', error.message);
    return false;
  }
}

async function testWebhookProcessing() {
  try {
    console.log('   Testando processamento de webhook...');
    
    // Buscar um ticket com agente IA para teste
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('assignedAgent.type', '==', 'ai'),
      where('aiConfig.autoResponse', '==', true),
      where('status', 'in', ['open', 'pending']),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('   ❌ Nenhum ticket válido para teste encontrado');
      return false;
    }
    
    const ticket = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    console.log(`   🎫 Usando ticket ${ticket.id} para teste`);
    
    // Simular webhook de mensagem
    const webhookPayload = {
      instance: ticket.instanceName || 'loja',
      data: {
        key: {
          remoteJid: ticket.client?.id || ticket.remoteJid,
          fromMe: false,
          id: `test_${Date.now()}`
        },
        message: {
          conversation: 'Mensagem de teste para diagnóstico - pode ignorar'
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: ticket.client?.name || 'Cliente Teste'
      }
    };
    
    console.log('   📤 Enviando webhook de teste...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/webhooks/evolution/messages-upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'webhook_secret_key_2024'
        },
        body: JSON.stringify(webhookPayload)
      });
      
      if (response.ok) {
        console.log('   ✅ Webhook processado com sucesso');
        console.log('   ⏳ Aguardando 3 segundos para processamento...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Erro no webhook: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (fetchError) {
      console.log('   ❌ Erro ao enviar webhook:', fetchError.message);
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste de webhook:', error.message);
    return false;
  }
}

async function checkConfidenceThreshold() {
  try {
    console.log('   Verificando configuração de threshold de confiança...');
    
    // Buscar interações de agente recentes
    const interactionsRef = collection(db, 'agent_interactions');
    const q = query(
      interactionsRef,
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    const interactions = querySnapshot.docs.map(doc => doc.data());
    
    console.log(`   📊 Encontradas ${interactions.length} interações recentes`);
    
    if (interactions.length === 0) {
      console.log('   ⚠️ Nenhuma interação de agente encontrada');
      console.log('   💡 Isso pode indicar que o agente não está sendo executado');
      return false;
    }
    
    // Analisar tipos de interação
    const interactionTypes = {};
    const lowConfidenceCount = interactions.filter(i => 
      i.type === 'low_confidence' || (i.confidence && i.confidence < 0.6)
    ).length;
    
    interactions.forEach(interaction => {
      const type = interaction.type || 'unknown';
      interactionTypes[type] = (interactionTypes[type] || 0) + 1;
    });
    
    console.log('   📈 Tipos de interação:');
    Object.entries(interactionTypes).forEach(([type, count]) => {
      console.log(`      - ${type}: ${count}`);
    });
    
    if (lowConfidenceCount > interactions.length * 0.5) {
      console.log(`   ⚠️ ${lowConfidenceCount}/${interactions.length} interações com baixa confiança`);
      console.log('   💡 SOLUÇÃO: Ajustar threshold de confiança ou melhorar prompts');
      return false;
    }
    
    console.log('   ✅ Threshold de confiança parece adequado');
    return true;
    
  } catch (error) {
    console.log('   ❌ Erro ao verificar threshold:', error.message);
    return false;
  }
}

async function testCompleteMessageFlow() {
  try {
    console.log('   Testando fluxo completo de mensagem...');
    
    // Buscar ticket para teste
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('assignedAgent.type', '==', 'ai'),
      where('aiConfig.autoResponse', '==', true),
      where('status', 'in', ['open', 'pending']),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('   ❌ Nenhum ticket válido para teste');
      return false;
    }
    
    const ticket = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    console.log(`   🎫 Testando com ticket ${ticket.id}`);
    
    // Testar geração de resposta diretamente
    console.log('   🤖 Testando geração de resposta...');
    
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const prompt = `Você é um assistente de atendimento ao cliente.
Cliente: Olá, preciso de ajuda
Responda de forma profissional:`;
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      if (response && response.length > 0) {
        console.log('   ✅ Geração de resposta funcionando');
        console.log(`   📝 Resposta gerada: "${response.substring(0, 100)}..."`);
        
        // Testar envio da resposta
        console.log('   📤 Testando envio da resposta...');
        
        const sendResponse = await fetch(`${BASE_URL}/api/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instanceName: ticket.instanceName || 'loja',
            remoteJid: ticket.client?.id || ticket.remoteJid,
            text: `[TESTE DIAGNÓSTICO] ${response.substring(0, 50)}...`,
            test: true
          })
        });
        
        if (sendResponse.ok) {
          console.log('   ✅ Fluxo completo funcionando');
          return true;
        } else {
          console.log('   ❌ Falha no envio da resposta');
          return false;
        }
      } else {
        console.log('   ❌ Falha na geração de resposta');
        return false;
      }
    } catch (flowError) {
      console.log('   ❌ Erro no fluxo:', flowError.message);
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste de fluxo completo:', error.message);
    return false;
  }
}

// Executar diagnóstico
runDiagnostic().catch(console.error);