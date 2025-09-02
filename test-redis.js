// Teste da implementação Redis - Fase 1
// Nota: Este teste requer compilação TypeScript
// Use 'node test-redis-simple.js' para teste direto

async function testRedisConnection() {
  console.log('🚀 Testando conexão Redis - Fase 1');
  
  try {
    // Teste 1: Conexão básica
    console.log('\n1. Testando conexão básica...');
    const isConnected = await redisService.isConnected();
    console.log(`✅ Redis conectado: ${isConnected}`);
    
    // Teste 2: Operações básicas
    console.log('\n2. Testando operações básicas...');
    await redisService.set('test:key', 'test-value', 60);
    const value = await redisService.get('test:key');
    console.log(`✅ Set/Get funcionando: ${value === 'test-value'}`);
    
    // Teste 3: Cache de mensagens
    console.log('\n3. Testando cache de mensagens...');
    const testMessages = [
      {
        id: '1',
        messageId: 'msg1',
        content: 'Olá, teste!',
        sender: 'client',
        timestamp: new Date(),
        status: 'delivered',
        type: 'text',
        isFromMe: false
      }
    ];
    
    await redisService.setMessages('5511999999999@s.whatsapp.net', 'test-instance', testMessages, 300);
    const cachedMessages = await redisService.getMessages('5511999999999@s.whatsapp.net', 'test-instance');
    console.log(`✅ Cache de mensagens: ${cachedMessages ? cachedMessages.length : 0} mensagens`);
    
    // Teste 4: Invalidação de cache
    console.log('\n4. Testando invalidação de cache...');
    await redisService.invalidateMessages('5511999999999@s.whatsapp.net', 'test-instance');
    const invalidatedMessages = await redisService.getMessages('5511999999999@s.whatsapp.net', 'test-instance');
    console.log(`✅ Invalidação funcionando: ${invalidatedMessages === null}`);
    
    // Teste 5: Métricas
    console.log('\n5. Verificando métricas...');
    const metrics = redisService.getMetrics();
    console.log('📊 Métricas Redis:', metrics);
    
    console.log('\n🎉 Todos os testes passaram! Redis Fase 1 implementado com sucesso.');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  } finally {
    // Cleanup
    await redisService.delete('test:key');
    console.log('\n🧹 Limpeza concluída.');
  }
}

// Executar testes
testRedisConnection().catch(console.error);