const http = require('http');
const https = require('https');
const { URL } = require('url');

// Função para testar o proxy
async function testProxy(testUrl) {
  console.log('\n🧪 Testando proxy com URL:', testUrl);
  
  const encodedUrl = encodeURIComponent(testUrl);
  const proxyUrl = `http://localhost:9003/api/image-proxy?url=${encodedUrl}`;
  
  console.log('📡 URL do proxy:', proxyUrl);
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = http.get(proxyUrl, (res) => {
      const duration = Date.now() - startTime;
      console.log(`✅ Resposta recebida em ${duration}ms`);
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.length + ' bytes, ';
      });
      
      res.on('end', () => {
        console.log(`📦 Dados recebidos: ${data}`);
        resolve({ status: res.statusCode, duration, headers: res.headers });
      });
    });
    
    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      console.log(`❌ Erro após ${duration}ms:`, err.message);
      reject(err);
    });
    
    req.setTimeout(15000, () => {
      console.log('⏰ Timeout após 15 segundos');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// URLs para testar
const testUrls = [
  // URL simples do Firebase (sem parâmetros complexos)
  'https://firebasestorage.googleapis.com/v0/b/crm-c4-default-rtdb.appspot.com/o/test.jpg?alt=media',
  
  // URL real do Firebase com encoding
  'https://firebasestorage.googleapis.com/v0/b/crm-c4-default-rtdb.appspot.com/o/media%2F5511999999999%2F1735570000000_image.jpg?alt=media'
];

async function runTests() {
  console.log('🚀 Iniciando testes do proxy de imagem...');
  
  for (const url of testUrls) {
    try {
      await testProxy(url);
    } catch (error) {
      console.log('❌ Teste falhou:', error.message);
    }
    
    // Aguardar um pouco entre os testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Testes concluídos!');
}

runTests().catch(console.error);
