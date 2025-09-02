// Script para verificar conexão Redis - CommonJS
const Redis = require('ioredis');
require('dotenv').config();

async function checkRedisConnection() {
  console.log('🔍 Verificando conexão Redis...\n');
  
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000
  };

  // Remove campos vazios
  if (!config.username) delete config.username;
  if (!config.password) delete config.password;

  console.log('📋 Configuração Redis:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Username: ${config.username || 'não definido'}`);
  console.log(`   Password: ${config.password ? '***' : 'não definido'}\n`);

  const redis = new Redis(config);
  let connected = false;

  try {
    // Teste 1: Conectar
    console.log('1️⃣ Testando conexão...');
    await redis.connect();
    console.log('✅ Conexão estabelecida com sucesso\n');
    connected = true;

    // Teste 2: Ping
    console.log('2️⃣ Testando ping...');
    const pingResult = await redis.ping();
    console.log(`✅ Ping: ${pingResult}\n`);

    // Teste 3: Info do servidor
    console.log('3️⃣ Informações do servidor Redis:');
    const info = await redis.info('server');
    const lines = info.split('\r\n');
    const serverInfo = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        serverInfo[key] = value;
      }
    });

    console.log(`   Versão: ${serverInfo.redis_version || 'N/A'}`);
    console.log(`   Modo: ${serverInfo.redis_mode || 'N/A'}`);
    console.log(`   Uptime: ${serverInfo.uptime_in_seconds || 'N/A'} segundos\n`);

    // Teste 4: Operações básicas
    console.log('4️⃣ Testando operações básicas...');
    await redis.set('test:connection', 'success', 'EX', 60);
    const value = await redis.get('test:connection');
    console.log(`✅ SET/GET: ${value === 'success' ? 'OK' : 'FALHOU'}\n`);

    // Teste 5: Limpeza
    await redis.del('test:connection');
    console.log('✅ Limpeza concluída\n');

    console.log('🎉 Todos os testes passaram! Redis está funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro na conexão Redis:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Soluções possíveis:');
      console.log('   1. Verifique se o Redis está rodando');
      console.log('   2. Instale o Redis se não estiver instalado');
      console.log('   3. Verifique o host e porta nas variáveis de ambiente');
      console.log('\n📖 Guia de instalação:');
      console.log('   Windows: https://redis.io/docs/getting-started/installation/install-redis-on-windows/');
      console.log('   Linux: sudo apt-get install redis-server');
      console.log('   macOS: brew install redis');
      console.log('\n🚀 Para iniciar o Redis:');
      console.log('   Windows: redis-server');
      console.log('   Linux/macOS: redis-server ou sudo systemctl start redis');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Host não encontrado. Verifique a variável REDIS_HOST no arquivo .env');
    } else if (error.message.includes('AUTH')) {
      console.log('\n💡 Erro de autenticação. Verifique REDIS_USERNAME e REDIS_PASSWORD no arquivo .env');
    }
    
  } finally {
    if (connected) {
      await redis.disconnect();
      console.log('\n🔌 Conexão Redis fechada');
    }
  }
}

// Executar verificação
checkRedisConnection().catch(console.error);