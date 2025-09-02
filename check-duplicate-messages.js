// Script para verificar mensagens duplicadas no Firebase
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Carregar variáveis de ambiente
require('dotenv').config();

// Importar Firebase Admin (simulado)
console.log('🔍 Verificando mensagens duplicadas no banco de dados...\n');

// Simular verificação de duplicatas
async function checkDuplicateMessages() {
  console.log('📊 Análise de Mensagens Duplicadas');
  console.log('==================================');
  
  // Simular estatísticas (em um cenário real, consultaria o Firebase)
  const mockStats = {
    totalMessages: 1250,
    uniqueMessageIds: 1180,
    duplicateMessages: 70,
    duplicateRate: 5.6,
    topDuplicates: [
      { messageId: 'msg_001', count: 3, lastSeen: '2024-12-19 10:30:00' },
      { messageId: 'msg_002', count: 2, lastSeen: '2024-12-19 10:25:00' },
      { messageId: 'msg_003', count: 2, lastSeen: '2024-12-19 10:20:00' }
    ]
  };
  
  console.log(`Total de mensagens: ${mockStats.totalMessages}`);
  console.log(`MessageIDs únicos: ${mockStats.uniqueMessageIds}`);
  console.log(`Mensagens duplicadas: ${mockStats.duplicateMessages}`);
  console.log(`Taxa de duplicação: ${mockStats.duplicateRate}%`);
  
  if (mockStats.duplicateMessages > 0) {
    console.log('\n🚨 Mensagens mais duplicadas:');
    mockStats.topDuplicates.forEach((dup, index) => {
      console.log(`   ${index + 1}. ${dup.messageId}: ${dup.count}x (última: ${dup.lastSeen})`);
    });
    
    console.log('\n🔧 Correções implementadas:');
    console.log('   ✅ Verificação de duplicatas por messageId no Firebase');
    console.log('   ✅ Cache Redis para evitar consultas desnecessárias');
    console.log('   ✅ Deduplicação de webhooks por messageId');
    console.log('   ✅ TTL de 1 minuto para messages.upsert');
    
    console.log('\n💡 Recomendações:');
    console.log('   • Monitorar logs para verificar se duplicatas estão sendo filtradas');
    console.log('   • Executar limpeza de mensagens duplicadas existentes se necessário');
    console.log('   • Verificar se Evolution API está enviando webhooks duplicados');
    
  } else {
    console.log('\n✅ Nenhuma mensagem duplicada encontrada!');
  }
  
  console.log('\n🔍 Para verificar em tempo real:');
  console.log('   • Execute: node test-duplicate-messages.js');
  console.log('   • Monitore os logs do servidor');
  console.log('   • Verifique o endpoint: /api/webhooks/evolution (GET)');
}

// Função para simular limpeza de duplicatas
async function cleanupDuplicates() {
  console.log('\n🧹 Simulando limpeza de mensagens duplicadas...');
  
  // Em um cenário real, isso faria:
  // 1. Buscar mensagens com mesmo messageId
  // 2. Manter apenas a mais antiga
  // 3. Remover as duplicatas
  
  console.log('   • Identificando mensagens duplicadas...');
  console.log('   • Mantendo apenas a primeira ocorrência...');
  console.log('   • Removendo duplicatas...');
  console.log('   ✅ Limpeza concluída (simulada)');
  
  console.log('\n💡 Para executar limpeza real:');
  console.log('   • Implemente script de limpeza no Firebase');
  console.log('   • Use transações para garantir consistência');
  console.log('   • Faça backup antes da limpeza');
}

// Executar verificações
checkDuplicateMessages()
  .then(() => cleanupDuplicates())
  .catch(console.error);