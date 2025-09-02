// Teste específico para Firebase Storage URLs
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function testFirebaseStorage() {
  console.log('🔥 [FIREBASE TEST] Testando Firebase Storage...');
  
  try {
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    
    console.log('✅ [FIREBASE TEST] Firebase inicializado com sucesso');
    console.log('📦 [FIREBASE TEST] Storage bucket:', firebaseConfig.storageBucket);
    
    // Criar uma imagem de teste pequena
    const testImageData = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 'base64');
    
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `test-image-${timestamp}.jpg`;
    const storagePath = `images/teste/2024/08/${fileName}`;
    
    console.log('📤 [FIREBASE TEST] Fazendo upload de teste...');
    console.log('📁 [FIREBASE TEST] Caminho:', storagePath);
    
    // Criar referência e fazer upload
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        testFile: 'true'
      }
    };
    
    const snapshot = await uploadBytes(storageRef, testImageData, metadata);
    console.log('✅ [FIREBASE TEST] Upload concluído');
    console.log('📊 [FIREBASE TEST] Tamanho:', snapshot.metadata.size, 'bytes');
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('🔗 [FIREBASE TEST] URL gerada:', downloadURL);
    
    // Analisar a URL
    const urlAnalysis = {
      isComplete: downloadURL.includes('alt=media') && downloadURL.includes('token='),
      hasToken: downloadURL.includes('token='),
      hasAltMedia: downloadURL.includes('alt=media'),
      length: downloadURL.length,
      domain: new URL(downloadURL).hostname,
      pathname: new URL(downloadURL).pathname
    };
    
    console.log('🔍 [FIREBASE TEST] Análise da URL:');
    console.log('  ✅ URL completa:', urlAnalysis.isComplete);
    console.log('  🔑 Tem token:', urlAnalysis.hasToken);
    console.log('  📄 Tem alt=media:', urlAnalysis.hasAltMedia);
    console.log('  📏 Comprimento:', urlAnalysis.length);
    console.log('  🌐 Domínio:', urlAnalysis.domain);
    console.log('  📁 Caminho:', urlAnalysis.pathname);
    
    // Testar se a URL funciona
    console.log('🧪 [FIREBASE TEST] Testando acesso à URL...');
    try {
      const response = await fetch(downloadURL);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        console.log('✅ [FIREBASE TEST] URL acessível');
        console.log('  📄 Content-Type:', contentType);
        console.log('  📏 Content-Length:', contentLength);
      } else {
        console.log('❌ [FIREBASE TEST] URL não acessível:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ [FIREBASE TEST] Erro ao acessar URL:', error.message);
    }
    
    // Resumo
    console.log('\n📋 [RESUMO]');
    if (urlAnalysis.isComplete) {
      console.log('✅ Firebase Storage está funcionando corretamente');
      console.log('✅ URLs estão sendo geradas com todos os parâmetros necessários');
    } else {
      console.log('❌ Problema detectado na geração de URLs');
      if (!urlAnalysis.hasToken) {
        console.log('  - Falta token de autenticação');
      }
      if (!urlAnalysis.hasAltMedia) {
        console.log('  - Falta parâmetro alt=media');
      }
    }
    
    return {
      success: true,
      url: downloadURL,
      analysis: urlAnalysis
    };
    
  } catch (error) {
    console.error('❌ [FIREBASE TEST] Erro no teste:', error);
    
    // Diagnóstico do erro
    if (error.code === 'storage/unauthorized') {
      console.log('🔧 [DIAGNÓSTICO] Problema de autorização - verifique as regras do Storage');
    } else if (error.code === 'storage/invalid-project-id') {
      console.log('🔧 [DIAGNÓSTICO] Project ID inválido - verifique a configuração');
    } else if (error.code === 'storage/invalid-bucket') {
      console.log('🔧 [DIAGNÓSTICO] Bucket inválido - verifique o storage bucket');
    } else {
      console.log('🔧 [DIAGNÓSTICO] Erro desconhecido:', error.code || error.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  // Carregar variáveis de ambiente
  require('dotenv').config({ path: '.env.local' });
  
  testFirebaseStorage()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Teste concluído com sucesso!');
      } else {
        console.log('\n💥 Teste falhou:', result.error);
      }
    })
    .catch(console.error);
}

module.exports = { testFirebaseStorage };
