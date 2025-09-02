const https = require('https');
const http = require('http');

// URLs possíveis da Evolution API
const POSSIBLE_URLS = [
  'https://api.evolution.devsible.com.br',
  'https://evolution.devsible.com.br',
  'https://c4c.devsible.com.br/evolution',
  'http://localhost:8080',
  'https://localhost:8080'
];

const API_KEY = 'B6D711FCDE4D4FD5936544120E713976';

console.log('🔍 Testando URLs da Evolution API...');
console.log('🔑 API Key:', API_KEY ? '***configurada***' : '❌ não configurada');
console.log('\n' + '='.repeat(60));

function testUrl(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    console.log(`\n📍 Testando: ${url}`);
    
    // Teste 1: Verificar se a URL responde
    const req = client.request(`${url}/manager/findInstances`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log('   ✅ URL funcionando!');
          try {
            const parsed = JSON.parse(data);
            console.log(`   📊 Instâncias encontradas: ${parsed.length || 0}`);
            if (parsed.length > 0) {
              const lojaInstance = parsed.find(inst => inst.instanceName === 'loja');
              if (lojaInstance) {
                console.log(`   📱 Instância 'loja' encontrada - Status: ${lojaInstance.connectionStatus}`);
              } else {
                console.log('   ⚠️ Instância \'loja\' não encontrada');
              }
            }
          } catch (e) {
            console.log('   📄 Resposta:', data.substring(0, 100));
          }
          resolve({ url, working: true, status: res.statusCode, data });
        } else {
          console.log('   ❌ Erro HTTP');
          console.log('   📄 Resposta:', data.substring(0, 100));
          resolve({ url, working: false, status: res.statusCode, error: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Erro de conexão: ${error.message}`);
      resolve({ url, working: false, error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('   ⏱️ Timeout (10s)');
      resolve({ url, working: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

async function testAllUrls() {
  const results = [];
  
  for (const url of POSSIBLE_URLS) {
    const result = await testUrl(url);
    results.push(result);
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(60));
  
  const workingUrls = results.filter(r => r.working);
  
  if (workingUrls.length > 0) {
    console.log('\n✅ URLs funcionando:');
    workingUrls.forEach(result => {
      console.log(`   ${result.url} (Status: ${result.status})`);
    });
    
    console.log('\n💡 Recomendação:');
    console.log(`   Use esta URL no .env.local: EVOLUTION_API_URL=${workingUrls[0].url}`);
  } else {
    console.log('\n❌ Nenhuma URL da Evolution API está funcionando!');
    console.log('\n💡 Possíveis soluções:');
    console.log('   1. Verificar se a Evolution API está rodando');
    console.log('   2. Verificar se a API Key está correta');
    console.log('   3. Verificar configurações de firewall/rede');
    console.log('   4. Entrar em contato com o provedor da Evolution API');
  }
  
  console.log('\n📄 Resultado JSON:');
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    apiKey: API_KEY ? 'configured' : 'missing',
    results: results,
    workingUrls: workingUrls.map(r => r.url),
    recommendation: workingUrls.length > 0 ? workingUrls[0].url : null
  }, null, 2));
}

// Executar testes
testAllUrls().catch(console.error);