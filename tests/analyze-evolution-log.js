// Análise do log da Evolution API para identificar problema de corrupção de imagens

// Log da Evolution API fornecido pelo usuário
const evolutionLog = {
  event: 'messages.upsert',
  instance: 'loja',
  data: {
    key: {
      remoteJid: '5512981022013@s.whatsapp.net',
      fromMe: true,
      id: 'D5AEE934492996F8623016FD441DC9EF',
      participant: undefined
    },
    pushName: 'Lucas Borges',
    status: 'SERVER_ACK',
    message: {
      imageMessage: {
        interactiveAnnotations: [],
        scanLengths: [],
        annotations: [],
        url: 'https://mmg.whatsapp.net/v/t62.7118-24/535218483_735008819310152_8890935410692841454_n.enc?ccb=11-4&oh=01_Q5Aa2QGq-gl-Q3tzi6CTdQ1dNaqi1ADYrdKS5DJZXdmd-mUdnQ&oe=68CBDF7A&_nc_sid=5e03e0&mms3=true',
        mimetype: 'image/jpeg',
        fileSha256: '[Uint8Array]',
        fileLength: '[Long]',
        height: 1599,
        width: 899,
        mediaKey: '[Uint8Array]',
        fileEncSha256: '[Uint8Array]',
        directPath: '/v/t62.7118-24/535218483_735008819310152_8890935410692841454_n.enc?ccb=11-4&oh=01_Q5Aa2QGq-gl-Q3tzi6CTdQ1dNaqi1ADYrdKS5DJZXdmd-mUdnQ&oe=68CBDF7A&_nc_sid=5e03e0',
        mediaKeyTimestamp: '[Long]',
        jpegThumbnail: '[Uint8Array]',
        contextInfo: '[ContextInfo]',
        scansSidecar: '[Uint8Array]',
        midQualityFileSha256: '[Uint8Array]'
      },
      base64: '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'
    }
  }
};

console.log('🔍 ANÁLISE DO LOG DA EVOLUTION API');
console.log('=' .repeat(50));

// 1. Analisar estrutura da mensagem
console.log('\n📋 ESTRUTURA DA MENSAGEM:');
console.log('- Event:', evolutionLog.event);
console.log('- Instance:', evolutionLog.instance);
console.log('- Message ID:', evolutionLog.data.key.id);
console.log('- From Me:', evolutionLog.data.key.fromMe);
console.log('- Status:', evolutionLog.data.status);

// 2. Analisar dados da imagem
const imageMessage = evolutionLog.data.message.imageMessage;
console.log('\n🖼️ DADOS DA IMAGEM:');
console.log('- URL:', imageMessage.url);
console.log('- MIME Type:', imageMessage.mimetype);
console.log('- Dimensões:', `${imageMessage.width}x${imageMessage.height}`);
console.log('- Tem jpegThumbnail:', imageMessage.jpegThumbnail !== undefined);
console.log('- Direct Path:', imageMessage.directPath);

// 3. Analisar URL da imagem
console.log('\n🔗 ANÁLISE DA URL:');
const url = imageMessage.url;
console.log('- URL completa:', url);
console.log('- É URL criptografada (.enc):', url.includes('.enc'));
console.log('- Domínio WhatsApp:', url.includes('mmg.whatsapp.net'));
console.log('- Tem parâmetros de criptografia:', url.includes('ccb=') && url.includes('oh='));
console.log('- Tem mms3=true:', url.includes('mms3=true'));

// 4. Analisar dados base64
const base64Data = evolutionLog.data.message.base64;
console.log('\n📊 ANÁLISE DOS DADOS BASE64:');
console.log('- Tem dados base64:', !!base64Data);
console.log('- Tamanho dos dados base64:', base64Data ? base64Data.length : 0);
console.log('- Começa com assinatura JPEG:', base64Data ? base64Data.startsWith('/9j/') : false);
console.log('- Primeiros 50 caracteres:', base64Data ? base64Data.substring(0, 50) : 'N/A');

// 5. Verificar se é thumbnail ou imagem completa
console.log('\n🔍 TIPO DE DADOS:');
if (base64Data && base64Data.startsWith('/9j/')) {
  console.log('✅ Dados base64 parecem ser JPEG válido');
  
  // Tentar decodificar para verificar tamanho
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('- Tamanho decodificado:', bytes.length, 'bytes');
    console.log('- Assinatura JPEG:', bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF ? '✅ Válida' : '❌ Inválida');
    
    // Verificar se é thumbnail (geralmente < 50KB) ou imagem completa
    if (bytes.length < 50000) {
      console.log('📸 Provavelmente é um THUMBNAIL (< 50KB)');
    } else {
      console.log('🖼️ Provavelmente é a IMAGEM COMPLETA (> 50KB)');
    }
  } catch (error) {
    console.log('❌ Erro ao decodificar base64:', error.message);
  }
} else {
  console.log('❌ Dados base64 não parecem ser JPEG válido');
}

// 6. Identificar o problema
console.log('\n🚨 DIAGNÓSTICO DO PROBLEMA:');
console.log('=' .repeat(50));

if (url.includes('.enc')) {
  console.log('❌ PROBLEMA IDENTIFICADO: URL CRIPTOGRAFADA');
  console.log('\n📝 EXPLICAÇÃO:');
  console.log('- A URL da imagem aponta para um arquivo .enc (criptografado)');
  console.log('- WhatsApp usa criptografia end-to-end para mídias');
  console.log('- A Evolution API precisa descriptografar usando mediaKey');
  console.log('- Se a descriptografia falhar, o arquivo fica corrompido');
  
  console.log('\n🔧 SOLUÇÕES POSSÍVEIS:');
  console.log('1. Usar apenas o campo "base64" que já contém dados descriptografados');
  console.log('2. Verificar se Evolution API está descriptografando corretamente');
  console.log('3. Implementar fallback para usar thumbnail quando URL principal falha');
  console.log('4. Adicionar validação antes de fazer download da URL .enc');
}

if (base64Data && base64Data.startsWith('/9j/')) {
  console.log('\n✅ SOLUÇÃO RECOMENDADA:');
  console.log('- O campo "base64" contém dados JPEG válidos');
  console.log('- Usar este campo diretamente em vez da URL criptografada');
  console.log('- Isso evita problemas de descriptografia');
}

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('1. Modificar webhook-handlers.ts para priorizar campo "base64"');
console.log('2. Usar URL .enc apenas como fallback');
console.log('3. Adicionar validação de dados antes do upload');
console.log('4. Implementar retry inteligente para URLs criptografadas');
