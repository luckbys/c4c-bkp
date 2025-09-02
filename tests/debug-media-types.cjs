const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

// Configuração do Firebase (mesma do frontend)
const firebaseConfig = {
  apiKey: "AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para detectar tipo de conteúdo (mesma lógica do frontend)
function detectContentType(content) {
  if (!content || typeof content !== 'string') {
    return 'text';
  }
  
  console.log('🔍 [DETECT TYPE] Analyzing content:', {
    preview: content.substring(0, 100),
    length: content.length,
    startsWithHttp: content.startsWith('http'),
    startsWithData: content.startsWith('data:'),
    includesFirebase: content.includes('firebasestorage.googleapis.com')
  });
  
  // Data URLs
  if (content.startsWith('data:image/webp')) return 'sticker';
  if (content.startsWith('data:image/')) return 'image';
  if (content.startsWith('data:video/')) return 'video';
  if (content.startsWith('data:audio/')) return 'audio';
  
  // Firebase Storage URLs
  if (content.includes('firebasestorage.googleapis.com')) {
    if (content.includes('/videos/') || content.includes('.mp4') || content.includes('.webm') || content.includes('.mov')) {
      return 'video';
    }
    if (content.includes('/stickers/') || content.includes('.webp')) {
      return 'sticker';
    }
    if (content.includes('/audios/') || content.includes('.mp3') || content.includes('.ogg')) {
      return 'audio';
    }
    if (content.includes('/documents/') || content.includes('.pdf') || content.includes('.doc')) {
      return 'document';
    }
    return 'image';
  }
  
  // MinIO URLs
  if (content.includes('minio') || content.includes('localhost:9000') || content.includes('/api/minio-proxy')) {
    if (content.includes('/videos/') || content.includes('.mp4') || content.includes('.webm') || content.includes('.mov')) {
      return 'video';
    }
    if (content.includes('/stickers/') || content.includes('.webp')) {
      return 'sticker';
    }
    if (content.includes('/audios/') || content.includes('.mp3') || content.includes('.ogg') || content.includes('.m4a') || content.includes('.aac')) {
      return 'audio';
    }
    if (content.includes('/documents/') || content.includes('.pdf') || content.includes('.doc') || content.includes('.docx')) {
      return 'document';
    }
    return 'image';
  }
  
  // WhatsApp URLs
  if (content.includes('mmg.whatsapp.net') || content.includes('pps.whatsapp.net') || content.includes('media.whatsapp.net')) {
    return 'image';
  }
  
  // URLs HTTP/HTTPS
  if (content.startsWith('http')) {
    const extension = content.split('.').pop()?.toLowerCase().split('?')[0];
    
    if (extension === 'webp') return 'sticker';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tiff'].includes(extension || '')) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'].includes(extension || '')) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'].includes(extension || '')) return 'audio';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(extension || '')) return 'document';
    
    return 'document';
  }
  
  // Placeholders
  if (content === '[Imagem]' || content.includes('📷') || content.includes('Imagem')) return 'image';
  if (content === '[Vídeo]' || content.includes('🎬') || content.includes('Vídeo')) return 'video';
  if (content === '[Sticker]' || content.includes('🎭') || content.includes('Sticker')) return 'sticker';
  if (content === '[Áudio]' || content.includes('🎵') || content.includes('Áudio')) return 'audio';
  if (content.startsWith('[') && content.endsWith(']') && (content.includes('Documento') || content.includes('📄'))) return 'document';
  
  // Base64 sem prefixo
  if (content.length > 100 && !content.includes(' ') && !content.includes('\n')) {
    return 'image';
  }
  
  return 'text';
}

// Função para testar URL
async function testUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    };
  } catch (error) {
    return {
      error: error.message,
      ok: false
    };
  }
}

async function debugMediaTypes() {
  console.log('🔍 [DEBUG] Iniciando análise de tipos de mídia...');
  
  try {
    // Buscar mensagens recentes (últimas 50)
    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    console.log(`📊 [DEBUG] Encontradas ${messagesSnapshot.size} mensagens recentes`);
    
    const stats = {
      total: 0,
      byType: {
        text: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        sticker: 0
      },
      byDetectedType: {
        text: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        sticker: 0
      },
      typeMismatches: [],
      urlTests: {
        working: 0,
        broken: 0,
        cors: 0
      },
      examples: {
        video: [],
        audio: []
      }
    };
    
    for (const doc of messagesSnapshot.docs) {
      const data = doc.data();
      stats.total++;
      
      const originalType = data.type || 'text';
      const detectedType = detectContentType(data.content);
      
      stats.byType[originalType]++;
      stats.byDetectedType[detectedType]++;
      
      // Verificar se há discrepância entre tipo original e detectado
      if (originalType !== detectedType) {
        stats.typeMismatches.push({
          messageId: data.messageId || doc.id,
          originalType,
          detectedType,
          content: data.content?.substring(0, 100) + '...',
          timestamp: data.timestamp
        });
      }
      
      // Coletar exemplos de vídeo e áudio
      if (detectedType === 'video' && stats.examples.video.length < 5) {
        stats.examples.video.push({
          messageId: data.messageId || doc.id,
          content: data.content,
          originalType,
          timestamp: data.timestamp
        });
      }
      
      if (detectedType === 'audio' && stats.examples.audio.length < 5) {
        stats.examples.audio.push({
          messageId: data.messageId || doc.id,
          content: data.content,
          originalType,
          timestamp: data.timestamp
        });
      }
      
      // Testar URLs de mídia
      if (['video', 'audio', 'image'].includes(detectedType) && data.content?.startsWith('http')) {
        console.log(`🔗 [URL TEST] Testando ${detectedType}: ${data.content.substring(0, 50)}...`);
        const urlTest = await testUrl(data.content);
        
        if (urlTest.ok) {
          stats.urlTests.working++;
          console.log(`✅ [URL TEST] OK - Status: ${urlTest.status}, Type: ${urlTest.contentType}`);
        } else if (urlTest.error?.includes('CORS')) {
          stats.urlTests.cors++;
          console.log(`🚫 [URL TEST] CORS Error: ${urlTest.error}`);
        } else {
          stats.urlTests.broken++;
          console.log(`❌ [URL TEST] Failed: ${urlTest.error || urlTest.status}`);
        }
      }
    }
    
    // Relatório final
    console.log('\n📊 [RELATÓRIO] Estatísticas de Tipos de Mídia:');
    console.log('===============================================');
    console.log(`Total de mensagens analisadas: ${stats.total}`);
    console.log('\n📈 Tipos originais (do banco):');
    Object.entries(stats.byType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`  ${type}: ${count} (${((count/stats.total)*100).toFixed(1)}%)`);
      }
    });
    
    console.log('\n🔍 Tipos detectados (pela função):');
    Object.entries(stats.byDetectedType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`  ${type}: ${count} (${((count/stats.total)*100).toFixed(1)}%)`);
      }
    });
    
    if (stats.typeMismatches.length > 0) {
      console.log(`\n⚠️  Discrepâncias encontradas: ${stats.typeMismatches.length}`);
      stats.typeMismatches.slice(0, 5).forEach((mismatch, i) => {
        console.log(`  ${i+1}. ${mismatch.originalType} → ${mismatch.detectedType}`);
        console.log(`     Content: ${mismatch.content}`);
      });
    }
    
    console.log('\n🔗 Testes de URL:');
    console.log(`  Funcionando: ${stats.urlTests.working}`);
    console.log(`  Quebradas: ${stats.urlTests.broken}`);
    console.log(`  Problemas CORS: ${stats.urlTests.cors}`);
    
    // Exemplos de vídeo
    if (stats.examples.video.length > 0) {
      console.log('\n🎬 Exemplos de VÍDEO encontrados:');
      stats.examples.video.forEach((example, i) => {
        console.log(`  ${i+1}. ${example.messageId}`);
        console.log(`     Tipo original: ${example.originalType}`);
        console.log(`     URL: ${example.content?.substring(0, 80)}...`);
        console.log(`     Timestamp: ${example.timestamp?.toDate?.() || example.timestamp}`);
      });
    } else {
      console.log('\n🎬 ❌ NENHUM VÍDEO encontrado nas mensagens recentes!');
    }
    
    // Exemplos de áudio
    if (stats.examples.audio.length > 0) {
      console.log('\n🎵 Exemplos de ÁUDIO encontrados:');
      stats.examples.audio.forEach((example, i) => {
        console.log(`  ${i+1}. ${example.messageId}`);
        console.log(`     Tipo original: ${example.originalType}`);
        console.log(`     URL: ${example.content?.substring(0, 80)}...`);
        console.log(`     Timestamp: ${example.timestamp?.toDate?.() || example.timestamp}`);
      });
    } else {
      console.log('\n🎵 ❌ NENHUM ÁUDIO encontrado nas mensagens recentes!');
    }
    
    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    console.log('==================');
    
    if (stats.examples.video.length === 0 && stats.examples.audio.length === 0) {
      console.log('❗ Problema principal: Não há mensagens de vídeo/áudio no banco de dados!');
      console.log('   - Verificar se o webhook está processando corretamente esses tipos');
      console.log('   - Verificar se a Evolution API está enviando os dados corretos');
    }
    
    if (stats.typeMismatches.length > 0) {
      console.log('❗ Há discrepâncias na detecção de tipos');
      console.log('   - Revisar a função detectContentType()');
      console.log('   - Verificar se os tipos estão sendo salvos corretamente no webhook');
    }
    
    if (stats.urlTests.cors > 0) {
      console.log('❗ Problemas de CORS detectados');
      console.log('   - Verificar configuração do proxy de mídia');
      console.log('   - Implementar fallback para URLs com CORS');
    }
    
    if (stats.urlTests.broken > 0) {
      console.log('❗ URLs quebradas detectadas');
      console.log('   - Verificar se as URLs estão sendo processadas corretamente');
      console.log('   - Implementar validação de URL antes de salvar');
    }
    
  } catch (error) {
    console.error('❌ [ERROR] Erro durante análise:', error);
  }
}

// Executar análise
debugMediaTypes().then(() => {
  console.log('\n✅ [DEBUG] Análise concluída!');
  process.exit(0);
}).catch(error => {
  console.error('❌ [ERROR] Erro fatal:', error);
  process.exit(1);
});