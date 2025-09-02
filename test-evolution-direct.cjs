const fetch = require('node-fetch');

// Teste direto da Evolution API para identificar o problema
async function testEvolutionDirect() {
  console.log('🔍 Testando Evolution API diretamente...');
  
  const EVOLUTION_API_URL = 'https://evochat.devsible.com.br';
  const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11'; // API key do .env
  
  try {
    // 1. Testar conectividade básica
    console.log('\n1. 🔗 Testando conectividade básica...');
    const healthResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    console.log('Status da conectividade:', healthResponse.status, healthResponse.statusText);
    
    if (!healthResponse.ok) {
      const errorText = await healthResponse.text();
      console.error('❌ Erro na conectividade:', errorText);
      return;
    }
    
    const instances = await healthResponse.json();
    console.log('✅ Instâncias disponíveis:', instances.map(i => ({ name: i.name, status: i.status })));
    
    if (instances.length === 0) {
      console.error('❌ Nenhuma instância disponível');
      return;
    }
    
    const instanceName = instances[0].name;
    console.log(`📱 Usando instância: ${instanceName}`);
    
    // 2. Testar diferentes formatos de payload
    const testPayloads = [
      {
        name: 'Formato Básico',
        payload: {
          number: '5511999999999@s.whatsapp.net',
          text: 'Teste básico'
        }
      },
      {
        name: 'Formato sem @s.whatsapp.net',
        payload: {
          number: '5511999999999',
          text: 'Teste sem sufixo'
        }
      },
      {
        name: 'Formato com textMessage',
        payload: {
          number: '5511999999999@s.whatsapp.net',
          textMessage: {
            text: 'Teste com textMessage'
          }
        }
      },
      {
        name: 'Formato alternativo',
        payload: {
          remoteJid: '5511999999999@s.whatsapp.net',
          message: {
            text: 'Teste formato alternativo'
          }
        }
      }
    ];
    
    for (const test of testPayloads) {
      console.log(`\n2.${testPayloads.indexOf(test) + 1} 📤 Testando: ${test.name}`);
      console.log('Payload:', JSON.stringify(test.payload, null, 2));
      
      try {
        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify(test.payload)
        });
        
        console.log('Status:', response.status, response.statusText);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ SUCESSO!', result);
          break; // Se funcionou, parar aqui
        } else {
          const errorText = await response.text();
          console.log('❌ Erro:', errorText);
        }
        
      } catch (error) {
        console.log('❌ Exceção:', error.message);
      }
    }
    
    // 3. Verificar documentação da API
    console.log('\n3. 📚 Verificando endpoints disponíveis...');
    try {
      const docsResponse = await fetch(`${EVOLUTION_API_URL}/`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      });
      
      if (docsResponse.ok) {
        const docs = await docsResponse.text();
        console.log('Documentação disponível:', docs.substring(0, 200) + '...');
      }
    } catch (error) {
      console.log('Documentação não disponível');
    }
    
    // 4. Testar endpoint alternativo
    console.log('\n4. 🔄 Testando endpoint alternativo...');
    try {
      const altResponse = await fetch(`${EVOLUTION_API_URL}/message/send/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: '5511999999999@s.whatsapp.net',
          text: 'Teste endpoint alternativo'
        })
      });
      
      console.log('Status endpoint alternativo:', altResponse.status, altResponse.statusText);
      
      if (altResponse.ok) {
        const result = await altResponse.json();
        console.log('✅ Endpoint alternativo funcionou!', result);
      } else {
        const errorText = await altResponse.text();
        console.log('❌ Endpoint alternativo falhou:', errorText);
      }
    } catch (error) {
      console.log('❌ Erro no endpoint alternativo:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testEvolutionDirect();