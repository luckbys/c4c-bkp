const axios = require('axios');

async function checkInstances() {
  try {
    const response = await axios.get('https://evochat.devsible.com.br/instance/fetchInstances', {
      headers: {
        'apikey': '429683C4C977415CAAFCCE10F7D57E11'
      }
    });
    
    console.log('✅ Instâncias encontradas:', response.data.length);
    
    response.data.forEach((inst, i) => {
      console.log(`\n${i+1}. Instância:`);
      console.log('   Dados completos:', JSON.stringify(inst, null, 2));
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

checkInstances();