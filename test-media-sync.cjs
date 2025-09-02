const fetch = require('node-fetch');

async function testMediaSync() {
  console.log('🧪 Testando envio de mídia via API...');
  
  const testData = {
    instanceName: 'c4c',
    remoteJid: '5511999999999@s.whatsapp.net',
    mediaUrl: 'https://picsum.photos/400/300',
    mediaType: 'image',
    fileName: 'test-image.jpg'
  };
  
  try {
    console.log('📤 Enviando mensagem de mídia...');
    console.log('Dados:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:9004/api/send-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro no envio:', errorText);
      return;
    }
    
    const responseData = await response.json();
    console.log('✅ Resposta da API:', responseData);
    
    console.log('\n⏳ Aguardando 3 segundos para sincronização...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Testar busca de mensagens via API
    console.log('🔍 Buscando mensagens via API...');
    const messagesResponse = await fetch(`http://localhost:9004/api/messages?instanceName=${testData.instanceName}&remoteJid=${encodeURIComponent(testData.remoteJid)}&limit=10`);
    
    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      console.log(`📋 Total de mensagens encontradas: ${messages.length}`);
      
      // Procurar pela mensagem de mídia enviada
      const mediaMessage = messages.find(msg => 
        msg.type === 'image' && 
        msg.sender === 'agent' && 
        msg.mediaUrl === testData.mediaUrl
      );
      
      if (mediaMessage) {
        console.log('✅ Mensagem de mídia encontrada:');
        console.log('  - ID:', mediaMessage.id);
        console.log('  - Tipo:', mediaMessage.type);
        console.log('  - Conteúdo:', mediaMessage.content);
        console.log('  - Media URL:', mediaMessage.mediaUrl);
        console.log('  - Sender:', mediaMessage.sender);
        console.log('  - Timestamp:', mediaMessage.timestamp);
      } else {
        console.log('❌ Mensagem de mídia NÃO encontrada');
        console.log('📋 Últimas mensagens:');
        messages.slice(0, 5).forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg.sender}: ${msg.content} (${msg.type}) - ${msg.mediaUrl || 'sem mídia'}`);
        });
      }
    } else {
      console.error('❌ Erro ao buscar mensagens:', await messagesResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testMediaSync().then(() => {
  console.log('🏁 Teste concluído');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});