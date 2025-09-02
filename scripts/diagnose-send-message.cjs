#!/usr/bin/env node

/**
 * Script para diagnosticar problemas de envio de mensagens
 * Testa todo o fluxo: frontend -> API -> Evolution API -> WhatsApp
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configurações
const PRODUCTION_URL = 'https://c4c.devsible.com.br';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evochat.devsible.com.br';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = 'loja';
const TEST_NUMBER = '5511999999999@s.whatsapp.net';

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

async function testEvolutionAPIDirectly() {
  log('\n🤖 Testando Evolution API Diretamente', 'bold');
  
  try {
    // 1. Testar se a API está respondendo
    log('🔍 Verificando se Evolution API está online...');
    const healthResponse = await makeRequest(`${EVOLUTION_API_URL}/manager/instances`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (healthResponse.status === 200) {
      log('✅ Evolution API está online', 'green');
      log(`📋 Instâncias encontradas: ${JSON.stringify(healthResponse.data)}`, 'blue');
    } else {
      log(`❌ Evolution API retornou status ${healthResponse.status}`, 'red');
      log(`📄 Resposta: ${JSON.stringify(healthResponse.data)}`, 'red');
      return false;
    }
    
    // 2. Verificar status da instância específica
    log(`🔍 Verificando status da instância '${INSTANCE_NAME}'...`);
    const instanceResponse = await makeRequest(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (instanceResponse.status === 200) {
      log('✅ Instância encontrada', 'green');
      log(`📋 Status: ${JSON.stringify(instanceResponse.data)}`, 'blue');
      
      if (instanceResponse.data.instance?.state !== 'open') {
        log('⚠️ PROBLEMA IDENTIFICADO: Instância não está conectada!', 'yellow');
        log(`📱 Estado atual: ${instanceResponse.data.instance?.state}`, 'yellow');
        log('💡 Solução: Conecte a instância no painel da Evolution API', 'yellow');
        return false;
      }
    } else {
      log(`❌ Erro ao verificar instância: ${instanceResponse.status}`, 'red');
      log(`📄 Resposta: ${JSON.stringify(instanceResponse.data)}`, 'red');
      return false;
    }
    
    // 3. Testar envio direto via Evolution API
    log('🔍 Testando envio direto via Evolution API...');
    const sendResponse = await makeRequest(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY
      },
      body: {
        number: TEST_NUMBER,
        text: `Teste direto Evolution API - ${new Date().toISOString()}`
      }
    });
    
    if (sendResponse.status === 200 || sendResponse.status === 201) {
      log('✅ Envio direto via Evolution API funcionando!', 'green');
      log(`📋 Resposta: ${JSON.stringify(sendResponse.data)}`, 'blue');
      return true;
    } else {
      log(`❌ Erro no envio direto: ${sendResponse.status}`, 'red');
      log(`📄 Resposta: ${JSON.stringify(sendResponse.data)}`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erro ao testar Evolution API: ${error.message}`, 'red');
    return false;
  }
}

async function testSendMessageEndpoint() {
  log('\n📨 Testando Endpoint /api/send-message', 'bold');
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/send-message`, {
      method: 'POST',
      body: {
        instanceName: INSTANCE_NAME,
        remoteJid: TEST_NUMBER,
        text: `Teste endpoint send-message - ${new Date().toISOString()}`
      }
    });
    
    if (response.status === 200) {
      log('✅ Endpoint /api/send-message funcionando!', 'green');
      log(`📋 Resposta: ${JSON.stringify(response.data)}`, 'blue');
      return true;
    } else {
      log(`❌ Endpoint /api/send-message falhou: ${response.status}`, 'red');
      log(`📄 Erro: ${JSON.stringify(response.data)}`, 'red');
      
      // Analisar tipo de erro
      if (response.data && response.data.error) {
        if (response.data.error.includes('EVOLUTION_API_UNAVAILABLE')) {
          log('🔍 Problema: Evolution API não está respondendo', 'yellow');
        } else if (response.data.error.includes('EVOLUTION_API_TIMEOUT')) {
          log('🔍 Problema: Timeout na Evolution API', 'yellow');
        } else if (response.data.error.includes('EVOLUTION_NETWORK_ERROR')) {
          log('🔍 Problema: Erro de rede com Evolution API', 'yellow');
        } else {
          log('🔍 Problema: Erro desconhecido', 'yellow');
        }
      }
      
      return false;
    }
    
  } catch (error) {
    log(`❌ Erro ao testar endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function testMessagesEndpoint() {
  log('\n📨 Testando Endpoint /api/messages (Firebase)', 'bold');
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/messages`, {
      method: 'POST',
      body: {
        instanceName: INSTANCE_NAME,
        remoteJid: TEST_NUMBER,
        messageText: `Teste endpoint messages - ${new Date().toISOString()}`
      }
    });
    
    if (response.status === 200) {
      log('✅ Endpoint /api/messages funcionando!', 'green');
      log(`📋 Resposta: ${JSON.stringify(response.data)}`, 'blue');
      return true;
    } else {
      log(`❌ Endpoint /api/messages falhou: ${response.status}`, 'red');
      log(`📄 Erro: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erro ao testar endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function checkEnvironmentVariables() {
  log('\n🔧 Verificando Variáveis de Ambiente', 'bold');
  
  const requiredVars = [
    'EVOLUTION_API_URL',
    'EVOLUTION_API_KEY'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log(`✅ ${varName}: ${value.substring(0, 20)}...`, 'green');
    } else {
      log(`❌ ${varName}: NÃO CONFIGURADA`, 'red');
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function generateDiagnosticReport() {
  log('\n📋 Relatório de Diagnóstico de Envio', 'bold');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      variablesConfigured: false
    },
    evolutionAPI: {
      online: false,
      instanceConnected: false,
      directSendWorking: false
    },
    endpoints: {
      sendMessageWorking: false,
      messagesWorking: false
    },
    overallStatus: 'FAILED',
    recommendations: []
  };
  
  // Verificar variáveis de ambiente
  report.environment.variablesConfigured = await checkEnvironmentVariables();
  
  // Testar Evolution API diretamente
  report.evolutionAPI.directSendWorking = await testEvolutionAPIDirectly();
  
  // Testar endpoints
  report.endpoints.sendMessageWorking = await testSendMessageEndpoint();
  report.endpoints.messagesWorking = await testMessagesEndpoint();
  
  // Determinar status geral e recomendações
  if (report.evolutionAPI.directSendWorking && 
      report.endpoints.sendMessageWorking && 
      report.endpoints.messagesWorking) {
    report.overallStatus = 'SUCCESS';
  } else if (!report.evolutionAPI.directSendWorking) {
    report.overallStatus = 'EVOLUTION_API_ISSUE';
    report.recommendations.push('Verificar se Evolution API está online e instância conectada');
    report.recommendations.push('Verificar credenciais da Evolution API');
  } else if (!report.endpoints.sendMessageWorking) {
    report.overallStatus = 'SEND_ENDPOINT_ISSUE';
    report.recommendations.push('Verificar conectividade entre aplicação e Evolution API');
    report.recommendations.push('Verificar logs do servidor para erros específicos');
  } else if (!report.endpoints.messagesWorking) {
    report.overallStatus = 'FIREBASE_ISSUE';
    report.recommendations.push('Verificar configuração do Firebase');
    report.recommendations.push('Verificar FIREBASE_SERVICE_ACCOUNT_KEY');
  }
  
  log('\n📊 Relatório Final:', 'bold');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

async function main() {
  log('🔍 Diagnóstico de Problemas de Envio de Mensagens', 'bold');
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
    
    const report = await generateDiagnosticReport();
    
    log('\n' + '=' .repeat(70), 'blue');
    
    if (report.overallStatus === 'SUCCESS') {
      log('🎉 TODOS OS TESTES PASSARAM!', 'green');
      log('✅ Sistema de envio funcionando corretamente', 'green');
    } else {
      log(`❌ PROBLEMA IDENTIFICADO: ${report.overallStatus}`, 'red');
      log('\n💡 Recomendações:', 'yellow');
      report.recommendations.forEach((rec, index) => {
        log(`${index + 1}. ${rec}`, 'yellow');
      });
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
  testEvolutionAPIDirectly,
  testSendMessageEndpoint,
  testMessagesEndpoint,
  generateDiagnosticReport
};