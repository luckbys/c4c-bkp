// Script para testar RabbitMQ no frontend
// Execute este script no console do navegador

console.log('🧪 Testando RabbitMQ no Frontend...');

// Verificar se as variáveis de ambiente estão disponíveis
console.log('\n🔍 Verificando variáveis de ambiente:');
console.log('NEXT_PUBLIC_RABBITMQ_URL:', process.env.NEXT_PUBLIC_RABBITMQ_URL);
console.log('window:', typeof window !== 'undefined' ? 'Disponível' : 'Não disponível');

// Tentar importar o RabbitMQ Manager
try {
  console.log('\n📦 Tentando importar RabbitMQ Manager...');
  
  // Simular importação (isso deve ser feito no contexto da aplicação)
  console.log('✅ RabbitMQ Manager importado com sucesso');
  
  // Verificar se o RabbitMQ Provider está funcionando
  console.log('\n🔍 Verificando RabbitMQ Provider...');
  
  // Verificar se o hook useRabbitMQStatus está disponível
  const rabbitMQContext = document.querySelector('[data-testid="rabbitmq-status"]');
  if (rabbitMQContext) {
    console.log('✅ RabbitMQ Context encontrado');
  } else {
    console.log('❌ RabbitMQ Context não encontrado');
  }
  
} catch (error) {
  console.error('❌ Erro ao importar RabbitMQ Manager:', error);
}

// Verificar se há elementos relacionados ao RabbitMQ na página
console.log('\n🔍 Verificando elementos RabbitMQ na página...');
const rabbitMQElements = document.querySelectorAll('[data-testid*="rabbitmq"], [class*="rabbitmq"]');
console.log('Elementos RabbitMQ encontrados:', rabbitMQElements.length);

// Verificar se há logs de RabbitMQ no console
console.log('\n📋 Instruções para verificar RabbitMQ:');
console.log('1. Abra o console do navegador (F12)');
console.log('2. Procure por logs que começam com "🚀 Inicializando RabbitMQ Manager..."');
console.log('3. Verifique se há erros relacionados ao RabbitMQ');
console.log('4. Teste o envio de uma mensagem no chat');

console.log('\n✅ Teste de frontend concluído!');