#!/usr/bin/env node

/**
 * Script de diagnóstico para investigar erro 500 no endpoint /api/messages em produção
 * 
 * Este script verifica:
 * 1. Configuração do Firebase
 * 2. Conectividade com Evolution API
 * 3. Variáveis de ambiente necessárias
 * 4. Teste do endpoint /api/messages
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

function checkEnvVar(varName, required = false) {
  const value = process.env[varName];
  const status = value ? '✅' : (required ? '❌' : '⚠️');
  const statusText = value ? 'SET' : 'NOT SET';
  
  log(`${status} ${varName}: ${statusText}`, value ? 'green' : (required ? 'red' : 'yellow'));
  
  if (value && varName.includes('KEY') && value.length > 50) {
    log(`    Value: ${value.substring(0, 30)}...`, 'blue');
  } else if (value && !varName.includes('KEY')) {
    log(`    Value: ${value}`, 'blue');
  }
  
  return !!value;
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
      timeout: 10000
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

async function checkFirebaseConfig() {
  log('\n🔥 Verificando Configuração do Firebase', 'bold');
  
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  let allSet = true;
  requiredVars.forEach(varName => {
    if (!checkEnvVar(varName, true)) {
      allSet = false;
    }
  });
  
  // Verificar service account key
  const hasServiceAccount = checkEnvVar('FIREBASE_SERVICE_ACCOUNT_KEY', true);
  if (!hasServiceAccount) {
    allSet = false;
  }
  
  return allSet;
}

async function checkEvolutionAPI() {
  log('\n🤖 Verificando Evolution API', 'bold');
  
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  
  if (!apiUrl) {
    log('❌ EVOLUTION_API_URL não configurada', 'red');
    return false;
  }
  
  if (!apiKey) {
    log('❌ EVOLUTION_API_KEY não configurada', 'red');
    return false;
  }
  
  try {
    log(`🔍 Testando conectividade com ${apiUrl}`);
    
    const response = await makeRequest(`${apiUrl}/manager/instances`, {
      headers: {
        'apikey': apiKey
      }
    });
    
    if (response.status === 200) {
      log('✅ Evolution API respondendo corretamente', 'green');
      log(`📊 Instâncias encontradas: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`, 'blue');
      return true;
    } else {
      log(`❌ Evolution API retornou status ${response.status}`, 'red');
      log(`📄 Resposta: ${JSON.stringify(response.data)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Erro ao conectar com Evolution API: ${error.message}`, 'red');
    return false;
  }
}

async function testMessagesEndpoint(baseUrl) {
  log('\n📨 Testando Endpoint /api/messages', 'bold');
  
  try {
    // Teste GET
    log('🔍 Testando GET /api/messages');
    const getResponse = await makeRequest(`${baseUrl}/api/messages?instance=test&remoteJid=5511999999999@s.whatsapp.net&limit=1`);
    
    if (getResponse.status === 200) {
      log('✅ GET /api/messages funcionando', 'green');
    } else {
      log(`⚠️ GET /api/messages retornou status ${getResponse.status}`, 'yellow');
      log(`📄 Resposta: ${JSON.stringify(getResponse.data)}`, 'blue');
    }
    
    // Teste POST (simulado)
    log('🔍 Testando POST /api/messages (simulado)');
    const postResponse = await makeRequest(`${baseUrl}/api/messages`, {
      method: 'POST',
      body: {
        instanceName: 'test',
        remoteJid: '5511999999999@s.whatsapp.net',
        messageText: 'Teste de diagnóstico'
      }
    });
    
    if (postResponse.status === 200) {
      log('✅ POST /api/messages funcionando', 'green');
    } else if (postResponse.status === 400) {
      log('⚠️ POST /api/messages retornou 400 (esperado para teste)', 'yellow');
    } else if (postResponse.status === 500) {
      log('❌ POST /api/messages retornou 500 - PROBLEMA IDENTIFICADO!', 'red');
      log(`📄 Erro: ${JSON.stringify(postResponse.data)}`, 'red');
      return false;
    } else {
      log(`⚠️ POST /api/messages retornou status ${postResponse.status}`, 'yellow');
      log(`📄 Resposta: ${JSON.stringify(postResponse.data)}`, 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ Erro ao testar endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function checkProductionEnvironment() {
  log('\n🌐 Verificando Ambiente de Produção', 'bold');
  
  const nodeEnv = process.env.NODE_ENV;
  log(`📍 NODE_ENV: ${nodeEnv || 'não definido'}`, nodeEnv === 'production' ? 'green' : 'yellow');
  
  // Verificar se estamos em produção
  const productionUrl = 'https://c4c.devsible.com.br';
  
  try {
    log(`🔍 Testando conectividade com ${productionUrl}`);
    const response = await makeRequest(productionUrl);
    
    if (response.status === 200) {
      log('✅ Site em produção acessível', 'green');
      return await testMessagesEndpoint(productionUrl);
    } else {
      log(`⚠️ Site retornou status ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Erro ao acessar produção: ${error.message}`, 'red');
    return false;
  }
}

async function generateDiagnosticReport() {
  log('\n📋 Gerando Relatório de Diagnóstico', 'bold');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    firebase: {
      clientConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      adminConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    },
    evolutionApi: {
      urlConfigured: !!process.env.EVOLUTION_API_URL,
      keyConfigured: !!process.env.EVOLUTION_API_KEY,
      url: process.env.EVOLUTION_API_URL
    },
    recommendations: []
  };
  
  // Adicionar recomendações baseadas nos problemas encontrados
  if (!report.firebase.clientConfigured) {
    report.recommendations.push('Configure as variáveis NEXT_PUBLIC_FIREBASE_* no servidor de produção');
  }
  
  if (!report.firebase.adminConfigured) {
    report.recommendations.push('Configure FIREBASE_SERVICE_ACCOUNT_KEY com as credenciais do Firebase Admin SDK');
  }
  
  if (!report.evolutionApi.urlConfigured || !report.evolutionApi.keyConfigured) {
    report.recommendations.push('Configure EVOLUTION_API_URL e EVOLUTION_API_KEY para conectar com a Evolution API');
  }
  
  log('\n📊 Relatório Final:', 'bold');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

async function main() {
  log('🔍 Iniciando Diagnóstico do Erro 500 em Produção', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Carregar variáveis de ambiente se disponíveis
    try {
      require('dotenv').config({ path: '.env.local' });
      require('dotenv').config({ path: '.env.production' });
      require('dotenv').config({ path: '.env' });
    } catch (e) {
      // dotenv pode não estar disponível
    }
    
    const firebaseOk = await checkFirebaseConfig();
    const evolutionOk = await checkEvolutionAPI();
    const productionOk = await checkProductionEnvironment();
    
    await generateDiagnosticReport();
    
    log('\n' + '=' .repeat(60), 'blue');
    
    if (firebaseOk && evolutionOk && productionOk) {
      log('✅ Todos os testes passaram! O problema pode estar em outro lugar.', 'green');
    } else {
      log('❌ Problemas identificados. Verifique as recomendações acima.', 'red');
      
      log('\n💡 Próximos passos:', 'yellow');
      log('1. Configure as variáveis de ambiente em produção', 'yellow');
      log('2. Verifique os logs do servidor para mais detalhes', 'yellow');
      log('3. Teste a conectividade com Firebase e Evolution API', 'yellow');
      log('4. Considere implementar logs mais detalhados no endpoint', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Erro durante diagnóstico: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkFirebaseConfig,
  checkEvolutionAPI,
  testMessagesEndpoint,
  checkProductionEnvironment
};