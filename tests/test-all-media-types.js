/**
 * Script de teste para verificar suporte completo a todos os tipos de mídia
 * da Evolution API no sistema CRM
 */

const { detectContentType } = require('./src/components/crm/MediaComponents');

// Simulação de diferentes tipos de mídia
const testCases = [
  // Imagens
  {
    type: 'image',
    content: 'https://firebasestorage.googleapis.com/images/test.jpg',
    expected: 'image'
  },
  {
    type: 'image',
    content: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
    expected: 'image'
  },
  {
    type: 'image',
    content: '[Imagem]',
    expected: 'image'
  },
  {
    type: 'image',
    content: '📷 Imagem',
    expected: 'image'
  },
  
  // Vídeos
  {
    type: 'video',
    content: 'https://firebasestorage.googleapis.com/videos/test.mp4',
    expected: 'video'
  },
  {
    type: 'video',
    content: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28y...',
    expected: 'video'
  },
  {
    type: 'video',
    content: '[Vídeo]',
    expected: 'video'
  },
  {
    type: 'video',
    content: '🎬 Vídeo',
    expected: 'video'
  },
  {
    type: 'video',
    content: 'https://example.com/video.webm',
    expected: 'video'
  },
  
  // Stickers
  {
    type: 'sticker',
    content: 'https://firebasestorage.googleapis.com/stickers/test.webp',
    expected: 'sticker'
  },
  {
    type: 'sticker',
    content: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAv...',
    expected: 'sticker'
  },
  {
    type: 'sticker',
    content: '[Sticker]',
    expected: 'sticker'
  },
  {
    type: 'sticker',
    content: '🎭 Sticker',
    expected: 'sticker'
  },
  {
    type: 'sticker',
    content: 'https://example.com/sticker.webp',
    expected: 'sticker'
  },
  
  // Áudios
  {
    type: 'audio',
    content: 'https://firebasestorage.googleapis.com/audios/test.mp3',
    expected: 'audio'
  },
  {
    type: 'audio',
    content: 'data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAA...',
    expected: 'audio'
  },
  {
    type: 'audio',
    content: '[Áudio]',
    expected: 'audio'
  },
  {
    type: 'audio',
    content: '🎵 Áudio',
    expected: 'audio'
  },
  {
    type: 'audio',
    content: 'https://example.com/audio.ogg',
    expected: 'audio'
  },
  
  // Documentos
  {
    type: 'document',
    content: 'https://firebasestorage.googleapis.com/documents/test.pdf',
    expected: 'document'
  },
  {
    type: 'document',
    content: '[Documento]',
    expected: 'document'
  },
  {
    type: 'document',
    content: '📄 Documento',
    expected: 'document'
  },
  {
    type: 'document',
    content: 'https://example.com/file.docx',
    expected: 'document'
  },
  
  // Texto
  {
    type: 'text',
    content: 'Olá, como você está?',
    expected: 'text'
  },
  {
    type: 'text',
    content: 'Esta é uma mensagem de texto simples.',
    expected: 'text'
  }
];

// Função para simular processamento de mídia
function simulateMediaProcessing(content, expectedType) {
  console.log(`\n🧪 Testando: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
  console.log(`📋 Tipo esperado: ${expectedType}`);
  
  try {
    // Simular detecção de tipo
    const detectedType = detectContentType(content);
    console.log(`🔍 Tipo detectado: ${detectedType}`);
    
    // Verificar se a detecção está correta
    const isCorrect = detectedType === expectedType;
    console.log(`✅ Status: ${isCorrect ? '✅ CORRETO' : '❌ INCORRETO'}`);
    
    return {
      content,
      expectedType,
      detectedType,
      isCorrect
    };
  } catch (error) {
    console.error(`❌ Erro na detecção:`, error.message);
    return {
      content,
      expectedType,
      detectedType: 'error',
      isCorrect: false,
      error: error.message
    };
  }
}

// Executar testes
console.log('🚀 Iniciando testes de suporte a todos os tipos de mídia...');
console.log('=' .repeat(80));

const results = [];
let correctCount = 0;
let totalCount = 0;

for (const testCase of testCases) {
  const result = simulateMediaProcessing(testCase.content, testCase.expected);
  results.push(result);
  
  if (result.isCorrect) {
    correctCount++;
  }
  totalCount++;
}

// Relatório final
console.log('\n' + '=' .repeat(80));
console.log('📊 RELATÓRIO FINAL - SUPORTE A TIPOS DE MÍDIA');
console.log('=' .repeat(80));

console.log(`\n📈 Estatísticas Gerais:`);
console.log(`  📋 Total de testes: ${totalCount}`);
console.log(`  ✅ Testes corretos: ${correctCount}`);
console.log(`  ❌ Testes incorretos: ${totalCount - correctCount}`);
console.log(`  📊 Taxa de sucesso: ${((correctCount / totalCount) * 100).toFixed(1)}%`);

// Estatísticas por tipo
const statsByType = {};
results.forEach(result => {
  if (!statsByType[result.expectedType]) {
    statsByType[result.expectedType] = { total: 0, correct: 0 };
  }
  statsByType[result.expectedType].total++;
  if (result.isCorrect) {
    statsByType[result.expectedType].correct++;
  }
});

console.log(`\n📊 Estatísticas por Tipo de Mídia:`);
Object.entries(statsByType).forEach(([type, stats]) => {
  const successRate = ((stats.correct / stats.total) * 100).toFixed(1);
  const icon = type === 'image' ? '🖼️' : 
               type === 'video' ? '🎬' :
               type === 'sticker' ? '🎭' :
               type === 'audio' ? '🎵' :
               type === 'document' ? '📄' : '📝';
  console.log(`  ${icon} ${type.toUpperCase()}: ${stats.correct}/${stats.total} (${successRate}%)`);
});

// Mostrar erros se houver
const errors = results.filter(r => !r.isCorrect);
if (errors.length > 0) {
  console.log(`\n❌ Testes com Falhas:`);
  errors.forEach((error, index) => {
    console.log(`  ${index + 1}. Esperado: ${error.expectedType}, Detectado: ${error.detectedType}`);
    console.log(`     Conteúdo: ${error.content.substring(0, 60)}${error.content.length > 60 ? '...' : ''}`);
    if (error.error) {
      console.log(`     Erro: ${error.error}`);
    }
  });
}

// Recomendações
console.log(`\n💡 RECOMENDAÇÕES:`);
if (correctCount === totalCount) {
  console.log('✅ Todos os tipos de mídia estão sendo detectados corretamente!');
  console.log('✅ O sistema está pronto para processar:');
  console.log('   - Imagens (JPG, PNG, GIF, etc.)');
  console.log('   - Vídeos (MP4, WebM, AVI, etc.)');
  console.log('   - Stickers (WebP)');
  console.log('   - Áudios (MP3, OGG, WAV, etc.)');
  console.log('   - Documentos (PDF, DOC, XLS, etc.)');
  console.log('   - Mensagens de texto');
} else {
  console.log('⚠️ Alguns tipos de mídia precisam de ajustes na detecção.');
  console.log('🔧 Verifique a função detectContentType em MediaComponents.tsx');
  console.log('🔧 Teste o processamento com mensagens reais da Evolution API');
}

console.log('\n🏁 Testes concluídos!');
console.log('=' .repeat(80));

// Retornar resultados para uso programático
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    results,
    stats: {
      total: totalCount,
      correct: correctCount,
      successRate: (correctCount / totalCount) * 100,
      byType: statsByType
    }
  };
}
