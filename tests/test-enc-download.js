// Script para testar download direto de URLs .enc do WhatsApp
import fetch from 'node-fetch';

// Simular uma URL .enc do WhatsApp (exemplo)
const testEncUrl = 'https://mmg.whatsapp.net/v/t62.7117-24/53564292_1659643958056252_6171524647738721546_n.enc?ccb=11-4&oh=01_Q5Ae2QGipV3oEHPTgVjmZKrLPLHgXbbd_LPVjb4nqBUVXxAaoe-6bDF3F308_nc_s&oe=66F3F308&_nc_sid=5e03e0';

async function testEncDownload() {
  console.log('🧪 [TEST] Testando download direto de URL .enc...');
  console.log('🔗 [TEST] URL:', testEncUrl.substring(0, 100) + '...');
  
  try {
    // Headers específicos para URLs do WhatsApp
    const headers = {
      'User-Agent': 'WhatsApp/2.23.24.76 A',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site'
    };
    
    console.log('📡 [TEST] Fazendo requisição com headers específicos...');
    const response = await fetch(testEncUrl, { headers });
    
    console.log('📊 [TEST] Resposta:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log('✅ [TEST] Download bem-sucedido!');
      console.log('📦 [TEST] Tamanho do arquivo:', buffer.byteLength, 'bytes');
      
      // Verificar se é um arquivo válido analisando os primeiros bytes
      const uint8Array = new Uint8Array(buffer.slice(0, 16));
      const header = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log('🔍 [TEST] Header do arquivo:', header);
      
      return { success: true, size: buffer.byteLength, header };
    } else {
      console.log('❌ [TEST] Download falhou:', response.status, response.statusText);
      return { success: false, error: `${response.status} ${response.statusText}` };
    }
  } catch (error) {
    console.error('❌ [TEST] Erro no download:', error.message);
    return { success: false, error: error.message };
  }
}

// Executar teste
testEncDownload()
  .then(result => {
    console.log('\n🏁 [TEST] Resultado final:', result);
    if (result.success) {
      console.log('✅ [TEST] A correção para download direto de URLs .enc está funcionando!');
    } else {
      console.log('❌ [TEST] A correção precisa de ajustes:', result.error);
    }
  })
  .catch(error => {
    console.error('💥 [TEST] Erro fatal:', error);
  });