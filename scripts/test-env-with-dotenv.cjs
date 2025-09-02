// Script para testar variáveis de ambiente carregando .env.local explicitamente
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Verificando variáveis de ambiente com dotenv...');
console.log('\n' + '='.repeat(60));

// Variáveis do Firebase
console.log('🔥 FIREBASE:');
console.log(`FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`FIREBASE_SERVICE_ACCOUNT_KEY: ${process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? '✅ Configurada' : '❌ Não configurada'}`);

// Variáveis da Evolution API
console.log('\n📱 EVOLUTION API:');
console.log(`EVOLUTION_API_URL: ${process.env.EVOLUTION_API_URL || '❌ Não configurada'}`);
console.log(`EVOLUTION_API_KEY: ${process.env.EVOLUTION_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`EVOLUTION_API_TOKEN: ${process.env.EVOLUTION_API_TOKEN ? '✅ Configurada' : '❌ Não configurada'}`);

// Outras variáveis importantes
console.log('\n⚙️ OUTRAS:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || '❌ Não configurada'}`);

console.log('\n' + '='.repeat(60));

// Verificar se consegue inicializar o Firebase
try {
  console.log('\n🔥 Testando inicialização do Firebase...');
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('✅ FIREBASE_SERVICE_ACCOUNT_KEY é um JSON válido');
      console.log(`📧 Client Email: ${serviceAccount.client_email}`);
      console.log(`🆔 Project ID: ${serviceAccount.project_id}`);
    } catch (e) {
      console.log('❌ FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido:', e.message);
    }
  } else {
    console.log('❌ FIREBASE_SERVICE_ACCOUNT_KEY não está definida');
  }
  
  // Verificar se as variáveis individuais estão definidas
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('✅ Variáveis individuais do Firebase estão definidas');
    console.log(`📧 Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
    console.log(`🆔 Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  } else {
    console.log('❌ Algumas variáveis individuais do Firebase estão faltando');
  }
  
} catch (error) {
  console.log('❌ Erro ao verificar Firebase:', error.message);
}

console.log('\n💡 Diagnóstico:');
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY)) {
  console.log('❌ Firebase não está configurado corretamente');
  console.log('   Você precisa definir FIREBASE_SERVICE_ACCOUNT_KEY ou');
  console.log('   as variáveis individuais (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)');
} else {
  console.log('✅ Firebase parece estar configurado');
}

if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
  console.log('❌ Evolution API não está configurada corretamente');
} else {
  console.log('✅ Evolution API está configurada');
}

// Mostrar todas as variáveis que começam com FIREBASE ou EVOLUTION
console.log('\n🔍 Todas as variáveis relacionadas:');
Object.keys(process.env)
  .filter(key => key.includes('FIREBASE') || key.includes('EVOLUTION'))
  .sort()
  .forEach(key => {
    const value = process.env[key];
    if (key.includes('KEY') || key.includes('PRIVATE')) {
      console.log(`${key}: ${value ? '***definida***' : '❌ não definida'}`);
    } else {
      console.log(`${key}: ${value || '❌ não definida'}`);
    }
  });