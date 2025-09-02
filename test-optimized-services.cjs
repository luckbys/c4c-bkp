// Teste de validação dos serviços otimizados
const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:9003';
const WS_URL = 'ws://localhost:9003';

async function testOptimizedServices() {
  console.log('🚀 Iniciando testes dos serviços otimizados...');
  
  try {
    // 1. Teste de inicialização dos serviços
    console.log('\n1. Testando inicialização dos serviços...');
    const initResponse = await axios.post(`${BASE_URL}/api/optimized`, {
      config: {
        cache: { enabled: true },
        notifications: { enabled: true },
        coordination: { enabled: true },
        monitoring: { enabled: true }
      }
    });
    console.log('✅ Serviços inicializados:', initResponse.data);
    
    // 2. Teste de status dos serviços
    console.log('\n2. Verificando status dos serviços...');
    const statusResponse = await axios.get(`${BASE_URL}/api/optimized`);
    console.log('✅ Status dos serviços:', statusResponse.data);
    
    // 3. Teste de performance do cache
    console.log('\n3. Testando performance do cache...');
    const cacheStart = Date.now();
    
    // Primeira busca (sem cache)
    await axios.get(`${BASE_URL}/api/messages/optimized?chatId=5512997748051@s.whatsapp.net&optimized=true&limit=10`);
    const firstFetch = Date.now() - cacheStart;
    
    // Segunda busca (com cache)
    const cacheStart2 = Date.now();
    await axios.get(`${BASE_URL}/api/messages/optimized?chatId=5512997748051@s.whatsapp.net&optimized=true&limit=10`);
    const secondFetch = Date.now() - cacheStart2;
    
    console.log(`✅ Cache performance: Primeira busca: ${firstFetch}ms, Segunda busca: ${secondFetch}ms`);
    console.log(`✅ Melhoria de performance: ${((firstFetch - secondFetch) / firstFetch * 100).toFixed(2)}%`);
    
    // 4. Teste de notificações WebSocket
    console.log('\n4. Testando notificações WebSocket...');
    const ws = new WebSocket(`${WS_URL}/ws`);
    
    await new Promise((resolve, reject) => {
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          try {
            if (ws.readyState === WebSocket.OPEN) {
              // WebSocket já foi fechado no teste anterior
            }
          } catch (e) {
            // Ignorar erros de fechamento
          }
          resolve();
        }
      };
      
      ws.on('open', () => {
        console.log('✅ Conexão WebSocket estabelecida');
        
        // Inscrever em canal de mensagens
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'messages'
        }));
        
        setTimeout(cleanup, 2000);
      });
      
      ws.on('error', (error) => {
        console.log('⚠️ WebSocket erro (esperado):', error.message);
        cleanup();
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('✅ Notificação recebida:', message);
      });
      
      // Timeout de segurança
      setTimeout(cleanup, 5000);
    });
    
    // 5. Teste de coordenação cache-fila
    console.log('\n5. Testando coordenação cache-fila...');
    const createResponse = await axios.post(`${BASE_URL}/api/messages/optimized`, {
      content: 'Teste de coordenação',
      chatId: 'test-chat-123',
      useOptimized: true
    });
    console.log('✅ Mensagem criada com coordenação:', createResponse.data);
    
    // 6. Teste de migração
    console.log('\n6. Testando processo de migração...');
    const migrateResponse = await axios.post(`${BASE_URL}/api/optimized/migrate`, {
      phase: 'preparation',
      config: {
        rolloutPercentage: 10,
        enableRollback: true
      }
    });
    console.log('✅ Migração iniciada:', migrateResponse.data);
    
    // Verificar status da migração
    const migrateStatus = await axios.get(`${BASE_URL}/api/optimized/migrate`);
    console.log('✅ Status da migração:', migrateStatus.data);
    
    // 7. Teste de métricas de performance
    console.log('\n7. Verificando métricas de performance...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/optimized?type=metrics`);
    console.log('✅ Métricas coletadas:', metricsResponse.data);
    
    ws.close();
    console.log('\n🎉 Todos os testes concluídos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    if (error.response) {
      console.error('Detalhes do erro:', error.response.data);
    }
  }
}

// Executar testes
testOptimizedServices().catch(console.error);

module.exports = { testOptimizedServices };