const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs, where } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para detectar tipo de conteúdo (mesma do frontend)
function detectContentType(content) {
  if (!content || typeof content !== 'string') {
    return 'text';
  }
  
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

async function analyzeMediaIssues() {
  console.log('🔍 [ANÁLISE] Iniciando análise de problemas com mídia...');
  console.log('=' .repeat(60));
  
  try {
    // Buscar mensagens recentes
    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    console.log(`📊 Total de mensagens analisadas: ${messagesSnapshot.size}`);
    
    const analysis = {
      total: 0,
      byOriginalType: {},
      byDetectedType: {},
      issues: {
        typeMismatch: [],
        invalidUrls: [],
        dataUrls: [],
        httpUrls: [],
        placeholders: []
      },
      examples: {
        audio: [],
        video: [],
        image: []
      }
    };
    
    for (const doc of messagesSnapshot.docs) {
      const data = doc.data();
      analysis.total++;
      
      const originalType = data.type || 'text';
      const detectedType = detectContentType(data.content);
      const content = data.content || '';
      
      // Contadores por tipo
      analysis.byOriginalType[originalType] = (analysis.byOriginalType[originalType] || 0) + 1;
      analysis.byDetectedType[detectedType] = (analysis.byDetectedType[detectedType] || 0) + 1;
      
      // Detectar problemas
      if (originalType !== detectedType) {
        analysis.issues.typeMismatch.push({
          messageId: data.messageId || doc.id,
          original: originalType,
          detected: detectedType,
          content: content.substring(0, 80) + '...',
          timestamp: data.timestamp
        });
      }
      
      // Categorizar URLs
      if (content.startsWith('data:')) {
        analysis.issues.dataUrls.push({
          type: detectedType,
          messageId: data.messageId || doc.id,
          preview: content.substring(0, 50) + '...'
        });
      } else if (content.startsWith('http')) {
        analysis.issues.httpUrls.push({
          type: detectedType,
          messageId: data.messageId || doc.id,
          url: content,
          isFirebase: content.includes('firebasestorage.googleapis.com'),
          isMinIO: content.includes('minio') || content.includes('localhost:9000'),
          isWhatsApp: content.includes('whatsapp.net')
        });
      } else if (content.startsWith('[') || content.includes('📷') || content.includes('🎵') || content.includes('🎬')) {
        analysis.issues.placeholders.push({
          type: detectedType,
          messageId: data.messageId || doc.id,
          content: content
        });
      } else if (!content.startsWith('http') && !content.startsWith('data:') && detectedType !== 'text') {
        analysis.issues.invalidUrls.push({
          type: detectedType,
          messageId: data.messageId || doc.id,
          content: content.substring(0, 50) + '...'
        });
      }
      
      // Coletar exemplos
      if (detectedType === 'audio' && analysis.examples.audio.length < 3) {
        analysis.examples.audio.push({
          messageId: data.messageId || doc.id,
          content: content,
          originalType: originalType,
          timestamp: data.timestamp
        });
      }
      
      if (detectedType === 'video' && analysis.examples.video.length < 3) {
        analysis.examples.video.push({
          messageId: data.messageId || doc.id,
          content: content,
          originalType: originalType,
          timestamp: data.timestamp
        });
      }
      
      if (detectedType === 'image' && analysis.examples.image.length < 3) {
        analysis.examples.image.push({
          messageId: data.messageId || doc.id,
          content: content.substring(0, 100) + '...',
          originalType: originalType,
          timestamp: data.timestamp
        });
      }
    }
    
    // Relatório detalhado
    console.log('\n📈 DISTRIBUIÇÃO POR TIPO ORIGINAL:');
    console.log('-'.repeat(40));
    Object.entries(analysis.byOriginalType).forEach(([type, count]) => {
      const percentage = ((count / analysis.total) * 100).toFixed(1);
      console.log(`  ${type.padEnd(10)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });
    
    console.log('\n🔍 DISTRIBUIÇÃO POR TIPO DETECTADO:');
    console.log('-'.repeat(40));
    Object.entries(analysis.byDetectedType).forEach(([type, count]) => {
      const percentage = ((count / analysis.total) * 100).toFixed(1);
      console.log(`  ${type.padEnd(10)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });
    
    // Problemas encontrados
    console.log('\n🚨 PROBLEMAS IDENTIFICADOS:');
    console.log('='.repeat(40));
    
    if (analysis.issues.typeMismatch.length > 0) {
      console.log(`\n❌ Discrepâncias de tipo: ${analysis.issues.typeMismatch.length}`);
      analysis.issues.typeMismatch.slice(0, 5).forEach((issue, i) => {
        console.log(`  ${i+1}. ${issue.original} → ${issue.detected}`);
        console.log(`     ID: ${issue.messageId}`);
        console.log(`     Content: ${issue.content}`);
      });
    }
    
    if (analysis.issues.placeholders.length > 0) {
      console.log(`\n📝 Placeholders encontrados: ${analysis.issues.placeholders.length}`);
      analysis.issues.placeholders.slice(0, 5).forEach((item, i) => {
        console.log(`  ${i+1}. [${item.type}] ${item.content}`);
      });
    }
    
    if (analysis.issues.invalidUrls.length > 0) {
      console.log(`\n🔗 URLs inválidas: ${analysis.issues.invalidUrls.length}`);
      analysis.issues.invalidUrls.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i+1}. [${item.type}] ${item.content}`);
      });
    }
    
    // Análise de URLs
    console.log('\n🌐 ANÁLISE DE URLs:');
    console.log('-'.repeat(30));
    console.log(`Data URLs: ${analysis.issues.dataUrls.length}`);
    console.log(`HTTP URLs: ${analysis.issues.httpUrls.length}`);
    
    const firebaseUrls = analysis.issues.httpUrls.filter(u => u.isFirebase).length;
    const minioUrls = analysis.issues.httpUrls.filter(u => u.isMinIO).length;
    const whatsappUrls = analysis.issues.httpUrls.filter(u => u.isWhatsApp).length;
    
    console.log(`  - Firebase Storage: ${firebaseUrls}`);
    console.log(`  - MinIO: ${minioUrls}`);
    console.log(`  - WhatsApp: ${whatsappUrls}`);
    console.log(`  - Outros: ${analysis.issues.httpUrls.length - firebaseUrls - minioUrls - whatsappUrls}`);
    
    // Exemplos por tipo
    console.log('\n🎵 EXEMPLOS DE ÁUDIO:');
    console.log('-'.repeat(25));
    if (analysis.examples.audio.length === 0) {
      console.log('❌ NENHUM ÁUDIO ENCONTRADO!');
    } else {
      analysis.examples.audio.forEach((example, i) => {
        console.log(`  ${i+1}. ID: ${example.messageId}`);
        console.log(`     Tipo original: ${example.originalType}`);
        console.log(`     URL: ${example.content.substring(0, 80)}...`);
        console.log(`     Formato: ${example.content.startsWith('data:') ? 'Data URL' : 'HTTP URL'}`);
      });
    }
    
    console.log('\n🎬 EXEMPLOS DE VÍDEO:');
    console.log('-'.repeat(25));
    if (analysis.examples.video.length === 0) {
      console.log('❌ NENHUM VÍDEO ENCONTRADO!');
    } else {
      analysis.examples.video.forEach((example, i) => {
        console.log(`  ${i+1}. ID: ${example.messageId}`);
        console.log(`     Tipo original: ${example.originalType}`);
        console.log(`     URL: ${example.content.substring(0, 80)}...`);
        console.log(`     Formato: ${example.content.startsWith('data:') ? 'Data URL' : 'HTTP URL'}`);
      });
    }
    
    // Diagnóstico e recomendações
    console.log('\n💡 DIAGNÓSTICO E RECOMENDAÇÕES:');
    console.log('='.repeat(50));
    
    if (analysis.examples.audio.length === 0 && analysis.examples.video.length === 0) {
      console.log('🔴 PROBLEMA PRINCIPAL: Não há mensagens de áudio/vídeo no banco!');
      console.log('   Possíveis causas:');
      console.log('   - Webhook não está processando esses tipos corretamente');
      console.log('   - Evolution API não está enviando dados de mídia');
      console.log('   - Filtros de tipo estão bloqueando áudio/vídeo');
    } else {
      console.log('🟢 Mensagens de mídia encontradas no banco de dados.');
    }
    
    if (analysis.issues.typeMismatch.length > 0) {
      console.log('\n🟡 Discrepâncias na detecção de tipos:');
      console.log('   - Revisar função detectContentType()');
      console.log('   - Verificar como tipos são salvos no webhook');
    }
    
    if (analysis.issues.dataUrls.length > 0) {
      console.log('\n🟢 Data URLs encontradas (formato correto):');
      console.log('   - Verificar se componentes suportam esses formatos');
      console.log('   - Testar renderização no navegador');
    }
    
    if (analysis.issues.placeholders.length > 0) {
      console.log('\n🟡 Placeholders encontrados:');
      console.log('   - Indicam que mídia não foi processada corretamente');
      console.log('   - Verificar processamento de mídia no webhook');
    }
    
    // Próximos passos
    console.log('\n🎯 PRÓXIMOS PASSOS RECOMENDADOS:');
    console.log('-'.repeat(35));
    
    if (analysis.examples.audio.length > 0) {
      console.log('1. ✅ Testar renderização de áudio no frontend');
      console.log('   - Verificar se componente AudioMessage funciona');
      console.log('   - Testar formatos OGG/Opus no navegador');
    }
    
    if (analysis.examples.video.length > 0) {
      console.log('2. ✅ Testar renderização de vídeo no frontend');
      console.log('   - Verificar se componente VideoMessage funciona');
      console.log('   - Testar formatos MP4/WebM no navegador');
    }
    
    if (analysis.examples.audio.length === 0 || analysis.examples.video.length === 0) {
      console.log('3. 🔧 Investigar processamento no webhook');
      console.log('   - Verificar logs do webhook para áudio/vídeo');
      console.log('   - Testar envio manual de mídia');
    }
    
    console.log('4. 🧪 Testar componentes isoladamente');
    console.log('   - Criar página de teste com dados reais');
    console.log('   - Verificar console do navegador para erros');
    
  } catch (error) {
    console.error('❌ Erro durante análise:', error);
  }
}

// Executar análise
analyzeMediaIssues().then(() => {
  console.log('\n✅ Análise concluída!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});