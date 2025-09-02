#!/usr/bin/env node

/**
 * Script para verificar se a correção do Firebase Service Account foi aplicada corretamente
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 15000
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testFirebaseServiceAccount() {
  log('\n🔥 Verificando Firebase Service Account', 'bold');
  
  const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (hasServiceAccount) {
    log('✅ FIREBASE_SERVICE_ACCOUNT_KEY está configurada', 'green');
    
    try {
      const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      log(`📋 Project ID: ${key.project_id}`, 'blue');
      log(`📧 Client Email: ${key.client_email}`, 'blue');
      log('✅ Formato da chave JSON válido', 'green');
      return true;
    } catch (error) {
      log('❌ Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY - formato inválido', 'red');
      log(`📄 Erro: ${error.message}`, 'red');
      return false;
    }
  } else {
    log('❌ FIREBASE_SERVICE_ACCOUNT_KEY não está configurada', 'red');
    return false;
  }
}

async function testMessagesEndpointFixed() {
  log('\n📨 Testando Endpoint /api/messages (Após Correção)', 'bold');
  
  const productionUrl = 'https://c4c.devsible.com.br';
  
  try {
    // Teste POST com dados válidos
    log('🔍 Testando POST /api/messages com dados válidos');
    const postResponse = await makeRequest(`${productionUrl}/api/messages`, {
      method: 'POST',
      body: {
        instanceName: 'loja',
        remoteJid: '5511999999999@s.whatsapp.net',
        messageText: 'Teste de verificação pós-correção'
      }
    });
    
    if (postResponse.status === 200) {
      log('✅ POST /api/messages funcionando corretamente!', 'green');
      log('🎉 PROBLEMA RESOLVIDO!', 'green');
      return true;
    } else if (postResponse.status === 500) {
      log('❌ POST /api/messages ainda retornando 500', 'red');
      log(`📄 Erro: ${JSON.stringify(postResponse.data)}`, 'red');
      
      // Analisar o tipo de erro
      if (postResponse.data && postResponse.data.error) {
        if (postResponse.data.error.includes('Firebase') || postResponse.data.error.includes('service account')) {
          log('🔍 Erro ainda relacionado ao Firebase Service Account', 'yellow');
        } else {
          log('🔍 Erro pode ser de outro tipo', 'yellow');
        }
      }
      
      return false;
    } else {
      log(`⚠️ POST /api/messages retornou status ${postResponse.status}`, 'yellow');
      log(`📄 Resposta: ${JSON.stringify(postResponse.data)}`, 'blue');
      return postResponse.status < 500; // Considerar sucesso se não for erro 5xx
    }
    
  } catch (error) {
    log(`❌ Erro ao testar endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function testEvolutionAPIConnectivity() {
  log('\n🤖 Verificando Evolution API', 'bold');
  
  const apiUrl = process.env.EVOLUTION_API_URL || 'https://evochat.devsible.com.br';
  const apiKey = process.env.EVOLUTION_API_KEY;
  
  if (!apiKey) {
    log('⚠️ EVOLUTION_API_KEY não configurada para teste local', 'yellow');
    return true; // Não é crítico para este teste
  }
  
  try {
    const response = await makeRequest(`${apiUrl}/manager/instances`, {
      headers: {
        'apikey': apiKey
      }
    });
    
    if (response.status === 200) {
      log('✅ Evolution API respondendo corretamente', 'green');
      return true;
    } else {
      log(`⚠️ Evolution API retornou status ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`⚠️ Erro ao conectar com Evolution API: ${error.message}`, 'yellow');
    return false;
  }
}

async function generateVerificationReport() {
  log('\n📋 Relatório de Verificação', 'bold');
  
  const report = {
    timestamp: new Date().toISOString(),
    firebaseServiceAccount: {
      configured: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      valid: false
    },
    messagesEndpoint: {
      working: false,
      status: null
    },
    evolutionApi: {
      accessible: false
    },
    overallStatus: 'FAILED'
  };
  
  // Testar Firebase Service Account
  report.firebaseServiceAccount.valid = await testFirebaseServiceAccount();
  
  // Testar endpoint de mensagens
  report.messagesEndpoint.working = await testMessagesEndpointFixed();
  
  // Testar Evolution API
  report.evolutionApi.accessible = await testEvolutionAPIConnectivity();
  
  // Determinar status geral
  if (report.firebaseServiceAccount.configured && 
      report.firebaseServiceAccount.valid && 
      report.messagesEndpoint.working) {
    report.overallStatus = 'SUCCESS';
  } else if (report.firebaseServiceAccount.configured && 
             report.firebaseServiceAccount.valid) {
    report.overallStatus = 'PARTIAL';
  } else {
    report.overallStatus = 'FAILED';
  }
  
  log('\n📊 Relatório Final:', 'bold');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

async function main() {
  log('🔍 Verificação da Correção do Firebase Service Account', 'bold');
  log('=' .repeat(70), 'blue');
  
  try {
    // Carregar variáveis de ambiente se disponíveis
    try {
      require('dotenv').config({ path: '.env.local' });
      require('dotenv').config({ path: '.env.production' });
      require('dotenv').config({ path: '.env' });
    } catch (e) {
      // dotenv pode não estar disponível
    }
    
    const report = await generateVerificationReport();
    
    log('\n' + '=' .repeat(70), 'blue');
    
    if (report.overallStatus === 'SUCCESS') {
      log('🎉 CORREÇÃO APLICADA COM SUCESSO!', 'green');
      log('✅ O erro 500 foi resolvido', 'green');
      log('✅ Firebase Service Account configurado corretamente', 'green');
      log('✅ Endpoint /api/messages funcionando', 'green');
    } else if (report.overallStatus === 'PARTIAL') {
      log('⚠️ CORREÇÃO PARCIALMENTE APLICADA', 'yellow');
      log('✅ Firebase Service Account configurado', 'green');
      log('❌ Endpoint ainda apresentando problemas', 'red');
      log('\n💡 Próximos passos:', 'yellow');
      log('1. Verificar logs do servidor para erros específicos', 'yellow');
      log('2. Reiniciar a aplicação se necessário', 'yellow');
      log('3. Verificar permissões da conta de serviço no Firebase', 'yellow');
    } else {
      log('❌ CORREÇÃO NÃO APLICADA', 'red');
      log('\n💡 Ações necessárias:', 'yellow');
      log('1. Configurar FIREBASE_SERVICE_ACCOUNT_KEY no servidor', 'yellow');
      log('2. Seguir o guia em PRODUCTION_ERROR_FIX.md', 'yellow');
      log('3. Reiniciar a aplicação após configurar', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Erro durante verificação: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testFirebaseServiceAccount,
  testMessagesEndpointFixed,
  testEvolutionAPIConnectivity,
  generateVerificationReport
};