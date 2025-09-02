// Script para testar o processo de upload de mídia
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, getMetadata } = require('firebase/storage');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Função para simular download de arquivo da Evolution API
async function simulateEvolutionDownload(url) {
  console.log('📥 Simulando download da Evolution API:', url.substring(0, 100) + '...');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📊 Resposta do download:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });
    
    if (!response.ok) {
      throw new Error(`Erro no download: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    console.log('✅ Download concluído:', {
      size: buffer.byteLength,
      contentType
    });
    
    // Verificar se é uma imagem válida analisando os primeiros bytes
    const uint8Array = new Uint8Array(buffer.slice(0, 10));
    const header = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log('🔍 Header do arquivo:', header);
    
    // Verificar assinaturas de arquivo conhecidas
    const signatures = {
      'ff d8 ff': 'JPEG',
      '89 50 4e 47': 'PNG',
      '47 49 46 38': 'GIF',
      '52 49 46 46': 'WEBP (RIFF)',
      '57 45 42 50': 'WEBP'
    };
    
    let detectedType = 'Desconhecido';
    for (const [sig, type] of Object.entries(signatures)) {
      if (header.startsWith(sig)) {
        detectedType = type;
        break;
      }
    }
    
    console.log('🔍 Tipo de arquivo detectado:', detectedType);
    
    return { buffer, contentType, detectedType };
    
  } catch (error) {
    console.error('❌ Erro no download:', error.message);
    throw error;
  }
}

// Função para determinar extensão baseada no Content-Type
function getExtensionFromContentType(contentType, mediaType) {
  const imageExtensions = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff'
  };
  
  const audioExtensions = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a'
  };
  
  const videoExtensions = {
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm'
  };
  
  const documentExtensions = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar'
  };
  
  let extensions;
  switch (mediaType) {
    case 'image':
      extensions = imageExtensions;
      break;
    case 'audio':
      extensions = audioExtensions;
      break;
    case 'video':
      extensions = videoExtensions;
      break;
    case 'document':
      extensions = documentExtensions;
      break;
    default:
      extensions = { ...imageExtensions, ...audioExtensions, ...videoExtensions, ...documentExtensions };
  }
  
  return extensions[contentType.toLowerCase()] || 'bin';
}

// Função para gerar caminho no Storage
function generateStoragePath(mediaInfo, contentType) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  let extension = 'bin';
  
  // 1. Tentar extrair extensão da URL
  const urlParts = mediaInfo.url.split('.');
  if (urlParts.length > 1) {
    const urlExtension = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
    if (urlExtension.length <= 4 && /^[a-z0-9]+$/.test(urlExtension)) {
      extension = urlExtension;
    }
  }
  
  // 2. Se não conseguiu da URL, usar Content-Type
  if (extension === 'bin' && contentType) {
    extension = getExtensionFromContentType(contentType, mediaInfo.type);
  }
  
  const fileName = mediaInfo.fileName || `${mediaInfo.messageId}.${extension}`;
  
  return `${mediaInfo.type}s/${mediaInfo.instanceName}/${year}/${month}/${fileName}`;
}

// Função para testar upload completo
async function testMediaUpload(testUrl) {
  console.log('🧪 Iniciando teste de upload de mídia...');
  console.log('🔗 URL de teste:', testUrl);
  
  try {
    // 1. Simular download
    const { buffer, contentType, detectedType } = await simulateEvolutionDownload(testUrl);
    
    // 2. Criar informações de mídia
    const mediaInfo = {
      url: testUrl,
      type: 'image',
      messageId: `test-${Date.now()}`,
      instanceName: 'teste',
      fileName: undefined
    };
    
    // 3. Gerar caminho no Storage
    const storagePath = generateStoragePath(mediaInfo, contentType);
    console.log('📁 Caminho no Storage:', storagePath);
    
    // 4. Fazer upload para o Storage
    console.log('📤 Fazendo upload para o Firebase Storage...');
    const storageRef = ref(storage, storagePath);
    
    const metadata = {
      contentType: contentType,
      customMetadata: {
        originalUrl: testUrl,
        detectedType: detectedType,
        uploadedAt: new Date().toISOString(),
        messageId: mediaInfo.messageId,
        instanceName: mediaInfo.instanceName
      }
    };
    
    const snapshot = await uploadBytes(storageRef, buffer, metadata);
    console.log('✅ Upload concluído:', {
      path: snapshot.ref.fullPath,
      size: snapshot.metadata.size,
      contentType: snapshot.metadata.contentType
    });
    
    // 5. Obter URL de download
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 URL de download gerada:', downloadURL);
    
    // 6. Testar acesso à URL
    console.log('🧪 Testando acesso à URL gerada...');
    const testResponse = await fetch(downloadURL, { method: 'HEAD' });
    console.log('📊 Teste de acesso:', {
      status: testResponse.status,
      statusText: testResponse.statusText,
      contentType: testResponse.headers.get('content-type'),
      contentLength: testResponse.headers.get('content-length')
    });
    
    if (testResponse.ok) {
      console.log('✅ Arquivo acessível e visualizável!');
      
      // 7. Verificar metadados do arquivo salvo
      const savedMetadata = await getMetadata(storageRef);
      console.log('📋 Metadados salvos:', {
        size: savedMetadata.size,
        contentType: savedMetadata.contentType,
        timeCreated: savedMetadata.timeCreated,
        customMetadata: savedMetadata.customMetadata
      });
      
      return {
        success: true,
        downloadURL,
        storagePath,
        metadata: savedMetadata
      };
    } else {
      console.log('❌ Arquivo não acessível:', testResponse.statusText);
      return {
        success: false,
        error: `Arquivo não acessível: ${testResponse.status} ${testResponse.statusText}`
      };
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// URLs de teste (imagens públicas)
const testUrls = [
  'https://picsum.photos/200/300.jpg',
  'https://via.placeholder.com/150.png',
  'https://httpbin.org/image/jpeg'
];

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes de upload de mídia...');
  
  for (let i = 0; i < testUrls.length; i++) {
    console.log(`\n📋 Teste ${i + 1}/${testUrls.length}:`);
    console.log('=' .repeat(50));
    
    const result = await testMediaUpload(testUrls[i]);
    
    if (result.success) {
      console.log('✅ Teste bem-sucedido!');
    } else {
      console.log('❌ Teste falhou:', result.error);
    }
    
    // Aguardar um pouco entre os testes
    if (i < testUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🏁 Todos os testes concluídos!');
}

// Executar testes
runTests().catch(error => {
  console.error('❌ Erro nos testes:', error);
});

module.exports = {
  testMediaUpload,
  simulateEvolutionDownload,
  generateStoragePath,
  getExtensionFromContentType
};
