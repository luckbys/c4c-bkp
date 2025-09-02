// Script para debugar o carregamento de mensagens no frontend

const fetch = require('node-fetch');

console.log('🔍 [DEBUG] Testando carregamento de mensagens...');
console.log('');

// Configurações
const baseUrl = 'http://localhost:9004';
const testInstance = 'loja';
const testRemoteJids = [
  '5512981811755@s.whatsapp.net',
  '5512997748051@s.whatsapp.net'
];

async function testMessagesAPI() {
  console.log('📡 [API TEST] Testando endpoints de mensagens...');
  
  for (const remoteJid of testRemoteJids) {
    try {
      const url = `${baseUrl}/api/messages?instance=${testInstance}&remoteJid=${encodeURIComponent(remoteJid)}`;
      console.log(`\n🔗 [REQUEST] ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`✅ [RESPONSE] Status: ${response.status}`);
      console.log(`📊 [DATA] Mensagens encontradas: ${data.length || 0}`);
      
      if (data.length > 0) {
        console.log(`📝 [SAMPLE] Primeira mensagem:`);
        console.log(`   ID: ${data[0].id}`);
        console.log(`   Tipo: ${data[0].messageType}`);
        console.log(`   Remetente: ${data[0].key?.fromMe ? 'Agente' : 'Cliente'}`);
        console.log(`   Conteúdo: ${data[0].message?.conversation || data[0].message?.extendedTextMessage?.text || 'Mídia'}`);
        console.log(`   Data: ${new Date(data[0].messageTimestamp * 1000).toLocaleString()}`);
      } else {
        console.log(`⚠️ [WARNING] Nenhuma mensagem encontrada para ${remoteJid}`);
      }
      
    } catch (error) {
      console.error(`❌ [ERROR] Erro ao buscar mensagens para ${remoteJid}:`, error.message);
    }
  }
}

async function testTicketsAPI() {
  console.log('\n🎫 [TICKETS TEST] Testando endpoint de tickets...');
  
  try {
    const url = `${baseUrl}/api/tickets?instance=${testInstance}`;
    console.log(`🔗 [REQUEST] ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ [RESPONSE] Status: ${response.status}`);
    console.log(`📊 [DATA] Tickets encontrados: ${data.length || 0}`);
    
    if (data.length > 0) {
      console.log(`\n📋 [TICKETS] Lista de tickets:`);
      data.slice(0, 3).forEach((ticket, index) => {
        console.log(`   ${index + 1}. ID: ${ticket.id}`);
        console.log(`      Cliente: ${ticket.client?.name || 'N/A'}`);
        console.log(`      Telefone: ${ticket.client?.id || 'N/A'}`);
        console.log(`      Status: ${ticket.status}`);
        console.log(`      Mensagens: ${ticket.messages?.length || 0}`);
        console.log(`      Última atividade: ${ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'N/A'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error(`❌ [ERROR] Erro ao buscar tickets:`, error.message);
  }
}

async function testCacheStatus() {
  console.log('\n💾 [CACHE TEST] Verificando status do cache...');
  
  try {
    const url = `${baseUrl}/api/cache/status`;
    console.log(`🔗 [REQUEST] ${url}`);
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [CACHE] Status: OK`);
      console.log(`📊 [STATS] Chaves no cache: ${data.keys || 'N/A'}`);
      console.log(`💾 [MEMORY] Uso de memória: ${data.memory || 'N/A'}`);
    } else {
      console.log(`⚠️ [CACHE] Status: ${response.status} - ${response.statusText}`);
    }
    
  } catch (error) {
    console.error(`❌ [ERROR] Erro ao verificar cache:`, error.message);
  }
}

async function main() {
  console.log('🚀 [START] Iniciando diagnóstico de carregamento de mensagens...');
  console.log('');
  
  await testTicketsAPI();
  await testMessagesAPI();
  await testCacheStatus();
  
  console.log('');
  console.log('🔍 [DIAGNÓSTICO] Possíveis causas se mensagens não carregam:');
  console.log('   1. Frontend não está fazendo as requisições corretas');
  console.log('   2. Problema na sincronização do estado React');
  console.log('   3. Erro no componente ChatPanel após as modificações');
  console.log('   4. Problema no clientFirebaseService');
  console.log('   5. Cache inconsistente ou corrompido');
  console.log('');
  
  console.log('💡 [PRÓXIMOS PASSOS]:');
  console.log('   1. Verificar console do navegador para erros JavaScript');
  console.log('   2. Verificar Network tab para requisições HTTP');
  console.log('   3. Verificar se o ticket selecionado tem o remoteJid correto');
  console.log('   4. Testar com diferentes tickets/conversas');
  console.log('');
  
  console.log('✅ [DIAGNÓSTICO CONCLUÍDO]');
}

main().catch(console.error);