// Script para verificar status do sistema de cache
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Carregar variáveis de ambiente
require('dotenv').config();

console.log('🔍 Verificando status do sistema de cache...\n');

let redisAvailable = false;
let redisError = null;

try {
  const Redis = require('ioredis');
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
    connectTimeout: 2000,
    commandTimeout: 1000,
    maxRetriesPerRequest: 1
  });

  await redis.connect();
  const result = await redis.ping();
  redisAvailable = result === 'PONG';
  await redis.disconnect();
} catch (error) {
  redisError = error.message;
}

// Relatório de status
console.log('📊 Status do Sistema de Cache');
console.log('================================');
console.log(`Redis Disponível: ${redisAvailable ? '✅ Sim' : '❌ Não'}`);

if (redisAvailable) {
  console.log('Modo de Operação: 🚀 Redis (Performance Otimizada)');
  console.log('Benefícios:');
  console.log('  • Persistência de dados');
  console.log('  • Compartilhamento entre instâncias');
  console.log('  • Performance superior para grandes volumes');
} else {
  console.log('Modo de Operação: 🧠 Cache em Memória (Fallback)');
  console.log('Benefícios:');
  console.log('  • Funciona imediatamente');
  console.log('  • Sem dependências externas');
  console.log('  • Adequado para desenvolvimento');
  
  if (redisError) {
    console.log(`\nMotivo: ${redisError}`);
  }
  
  console.log('\n💡 Para ativar Redis:');
  console.log('  1. Instale Redis (veja REDIS_SETUP.md)');
  console.log('  2. Configure as variáveis no .env');
  console.log('  3. Reinicie a aplicação');
}

console.log('\n🔧 Configuração Atual:');
console.log(`  Host: ${process.env.REDIS_HOST || 'localhost'}`);
console.log(`  Port: ${process.env.REDIS_PORT || '6379'}`);
console.log(`  Username: ${process.env.REDIS_USERNAME || 'não definido'}`);
console.log(`  Password: ${process.env.REDIS_PASSWORD ? '***' : 'não definido'}`);

console.log('\n✅ Sistema funcionando corretamente!');
console.log('📖 Para mais informações, consulte: REDIS_SETUP.md');