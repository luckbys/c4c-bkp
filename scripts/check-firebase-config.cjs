#!/usr/bin/env node

/**
 * Script para verificar a configuração do Firebase
 * Uso: node scripts/check-firebase-config.js
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvVar(varName, required = true) {
  const value = process.env[varName];
  const exists = !!value;
  const status = exists ? '✅' : (required ? '❌' : '⚠️');
  const statusText = exists ? 'OK' : (required ? 'MISSING' : 'OPTIONAL');
  
  log(`${status} ${varName}: ${statusText}`, exists ? 'green' : (required ? 'red' : 'yellow'));
  
  if (exists && varName.includes('API_KEY')) {
    log(`   Valor: ${value.substring(0, 10)}...`, 'blue');
  } else if (exists && varName === 'FIREBASE_SERVICE_ACCOUNT_KEY') {
    try {
      const parsed = JSON.parse(value);
      log(`   Project ID: ${parsed.project_id}`, 'blue');
      log(`   Client Email: ${parsed.client_email}`, 'blue');
    } catch (e) {
      log(`   ❌ JSON inválido: ${e.message}`, 'red');
    }
  } else if (exists) {
    log(`   Valor: ${value}`, 'blue');
  }
  
  return exists;
}

function checkFirebaseConfig() {
  log('\n🔥 Verificando Configuração do Firebase\n', 'bold');
  
  // Verificar variáveis do Client SDK
  log('📱 Client SDK (Frontend):', 'bold');
  const clientVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  let clientConfigOk = true;
  clientVars.forEach(varName => {
    if (!checkEnvVar(varName, true)) {
      clientConfigOk = false;
    }
  });
  
  // Verificar variáveis do Admin SDK
  log('\n🔧 Admin SDK (Backend):', 'bold');
  const adminConfigOk = checkEnvVar('FIREBASE_SERVICE_ACCOUNT_KEY', true);
  
  // Verificar outras variáveis
  log('\n⚙️ Outras Configurações:', 'bold');
  checkEnvVar('EVOLUTION_API_URL', false);
  checkEnvVar('EVOLUTION_API_KEY', false);
  checkEnvVar('EVOLUTION_WEBHOOK_SECRET', false);
  checkEnvVar('NODE_ENV', false);
  
  // Verificar arquivos de configuração
  log('\n📁 Arquivos de Configuração:', 'bold');
  const configFiles = [
    '.env.local',
    '.env.production',
    '.env'
  ];
  
  configFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    const status = exists ? '✅' : '❌';
    log(`${status} ${file}: ${exists ? 'EXISTS' : 'NOT FOUND'}`, exists ? 'green' : 'red');
  });
  
  // Resumo
  log('\n📊 Resumo:', 'bold');
  
  if (clientConfigOk && adminConfigOk) {
    log('✅ Configuração completa! Firebase deve funcionar corretamente.', 'green');
  } else {
    log('❌ Configuração incompleta. Verifique as variáveis em falta.', 'red');
    
    if (!clientConfigOk) {
      log('   - Client SDK: Configure as variáveis NEXT_PUBLIC_FIREBASE_*', 'yellow');
    }
    
    if (!adminConfigOk) {
      log('   - Admin SDK: Configure FIREBASE_SERVICE_ACCOUNT_KEY', 'yellow');
    }
    
    log('\n💡 Dicas:', 'blue');
    log('   1. Copie .env.example para .env.local', 'blue');
    log('   2. Preencha com suas credenciais do Firebase Console', 'blue');
    log('   3. Para produção, configure as variáveis no servidor', 'blue');
    log('   4. Leia FIREBASE_PRODUCTION_SETUP.md para mais detalhes', 'blue');
  }
}

function testFirebaseConnection() {
  log('\n🧪 Testando Conexão com Firebase...', 'bold');
  
  try {
    // Tentar importar e inicializar Firebase
    const { initializeApp } = require('firebase/app');
    
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
    
    // Verificar se todas as configurações estão presentes
    const missingConfigs = Object.entries(firebaseConfig)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingConfigs.length > 0) {
      log(`❌ Configurações em falta: ${missingConfigs.join(', ')}`, 'red');
      return;
    }
    
    const app = initializeApp(firebaseConfig);
    log('✅ Firebase Client SDK inicializado com sucesso!', 'green');
    
    // Testar Admin SDK se disponível
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const admin = require('firebase-admin');
        
        if (admin.apps.length === 0) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
          });
        }
        
        log('✅ Firebase Admin SDK inicializado com sucesso!', 'green');
      } catch (adminError) {
        log(`❌ Erro no Admin SDK: ${adminError.message}`, 'red');
      }
    }
    
  } catch (error) {
    log(`❌ Erro ao testar Firebase: ${error.message}`, 'red');
  }
}

// Executar verificações
if (require.main === module) {
  // Carregar variáveis de ambiente
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
  
  checkFirebaseConfig();
  testFirebaseConnection();
  
  log('\n📚 Para mais informações, consulte:', 'blue');
  log('   - FIREBASE_PRODUCTION_SETUP.md', 'blue');
  log('   - .env.example', 'blue');
}

module.exports = {
  checkFirebaseConfig,
  testFirebaseConnection,
  checkEnvVar
};