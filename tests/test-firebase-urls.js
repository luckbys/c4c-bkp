// Teste para verificar URLs do Firebase Storage
const { firebaseService } = require('./src/services/firebase-service');

async function testFirebaseUrls() {
  console.log('🔍 [TEST] Verificando URLs do Firebase Storage...');
  
  try {
    // Buscar algumas mensagens recentes
    const messages = await firebaseService.getMessages('5512981022013@s.whatsapp.net', 'teste', 10);
    
    console.log(`📊 [TEST] Encontradas ${messages.length} mensagens`);
    
    // Filtrar mensagens de imagem
    const imageMessages = messages.filter(msg => 
      msg.type === 'image' || 
      msg.content.includes('firebasestorage.googleapis.com') ||
      msg.content.includes('📷') ||
      msg.content === '[Imagem]'
    );
    
    console.log(`🖼️ [TEST] Encontradas ${imageMessages.length} mensagens de imagem`);
    
    imageMessages.forEach((msg, index) => {
      console.log(`\n🖼️ [IMAGE ${index + 1}]`);
      console.log(`  ID: ${msg.id}`);
      console.log(`  Type: ${msg.type}`);
      console.log(`  Content length: ${msg.content.length}`);
      console.log(`  Content preview: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      console.log(`  Is Firebase URL: ${msg.content.includes('firebasestorage.googleapis.com')}`);
      console.log(`  Is placeholder: ${msg.content === '[Imagem]' || msg.content.includes('📷')}`);
      console.log(`  Is data URL: ${msg.content.startsWith('data:')}`);
      console.log(`  Timestamp: ${msg.timestamp?.toDate?.() || msg.timestamp}`);
      
      // Testar se a URL é válida
      if (msg.content.includes('firebasestorage.googleapis.com')) {
        try {
          const url = new URL(msg.content);
          console.log(`  ✅ URL válida: ${url.hostname}`);
        } catch (error) {
          console.log(`  ❌ URL inválida: ${error.message}`);
        }
      }
    });
    
    // Estatísticas
    const stats = {
      total: imageMessages.length,
      withFirebaseUrl: imageMessages.filter(m => m.content.includes('firebasestorage.googleapis.com')).length,
      withPlaceholder: imageMessages.filter(m => m.content === '[Imagem]' || m.content.includes('📷')).length,
      withDataUrl: imageMessages.filter(m => m.content.startsWith('data:')).length,
      withHttpUrl: imageMessages.filter(m => m.content.startsWith('http') && !m.content.includes('firebasestorage.googleapis.com')).length
    };
    
    console.log('\n📊 [ESTATÍSTICAS]');
    console.log(`  Total de imagens: ${stats.total}`);
    console.log(`  Com URL do Firebase: ${stats.withFirebaseUrl}`);
    console.log(`  Com placeholder: ${stats.withPlaceholder}`);
    console.log(`  Com data URL: ${stats.withDataUrl}`);
    console.log(`  Com HTTP URL: ${stats.withHttpUrl}`);
    
    // Recomendações
    console.log('\n💡 [RECOMENDAÇÕES]');
    if (stats.withPlaceholder > 0) {
      console.log(`  • ${stats.withPlaceholder} imagens ainda estão com placeholder - webhook pode não estar processando corretamente`);
    }
    if (stats.withFirebaseUrl === 0 && stats.total > 0) {
      console.log(`  • Nenhuma URL do Firebase Storage encontrada - upload pode não estar funcionando`);
    }
    if (stats.withDataUrl > 0) {
      console.log(`  • ${stats.withDataUrl} imagens com data URL - podem ser muito grandes para o navegador`);
    }
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao testar URLs:', error);
  }
}

// Executar teste
testFirebaseUrls().catch(console.error);
