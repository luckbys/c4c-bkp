const https = require('https');
const http = require('http');

async function testExecuteEndpoint() {
  const agentId = 'C8LgbejH133fJq8P8EZv';
  const url = `http://localhost:9004/api/v1/a2a/${agentId}/execute`;
  
  const postData = JSON.stringify({
    input: 'Olá! Preciso de ajuda com um teste da API.',
    context: {
      clientName: 'Usuário de Teste',
      clientPhone: '+5511999999999',
      ticketId: 'test-ticket-123'
    }
  });
  
  const options = {
    hostname: 'localhost',
    port: 9004,
    path: `/api/v1/a2a/${agentId}/execute`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '4d23585ee7d81f96523ccc6468efa703',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n=== RESPONSE BODY ===');
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('Raw response (not JSON):');
          console.log(data);
        }
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (e) => {
      console.error(`Erro na requisição: ${e.message}`);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

// Executar teste
testExecuteEndpoint()
  .then(result => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  });