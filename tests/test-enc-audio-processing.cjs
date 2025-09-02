// Script para testar o processamento de arquivos .enc de áudio do WhatsApp
const axios = require('axios');
const https = require('https');

// Simular webhook de áudio com arquivo .enc (criptografado)
const encAudioWebhookData = {
  event: 'messages.upsert',
  instance: 'loja',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_ENC_AUDIO_' + Date.now()
    },
    messageType: 'audioMessage',
    message: {
      audioMessage: {
        url: 'https://mmg.whatsapp.net/v/t62.7117-24/536882838_744707151667934_6790652857649873145_n.enc?ccb=11-4&oh=01_Q5Aa2QECQmNjsixZg_eT_Z_Z-KAccjJy1UeRVoa4w4FhDpOgxg&oe=68CE884C&_nc_sid=5e03e0&mms3=true',
        mimetype: 'audio/ogg; codecs=opus',
        seconds: 5,
        ptt: true,
        fileLength: 12345,
        mediaKey: 'abcdefghijklmnopqrstuvwxyz1234567890',
        fileEncSha256: 'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12',
        fileSha256: 'abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12'
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: 'Teste ENC Audio'
  }
};

// Função para testar download direto do arquivo .enc
async function testEncFileDownload(url) {
  console.log('\n🔍 === TESTE DE DOWNLOAD DIRETO DO ARQUIVO .ENC === 🔍');
  console.log(`📥 URL: ${url}`);
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'WhatsApp/2.23.20.0'
      }
    });
    
    console.log('✅ Download bem-sucedido:');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Tamanho: ${response.data.byteLength} bytes`);
    
    // Analisar os primeiros bytes para verificar se é um arquivo válido
    const buffer = Buffer.from(response.data);
    const firstBytes = buffer.slice(0, 16);
    const hexHeader = firstBytes.toString('hex');
    
    console.log(`🔍 Primeiros 16 bytes (hex): ${hexHeader}`);
    console.log(`🔍 Primeiros 16 bytes (decimal): [${Array.from(firstBytes).join(', ')}]`);
    
    // Verificar se parece ser um arquivo OGG válido
    const isOggFile = buffer.slice(0, 4).toString() === 'OggS';
    console.log(`🎵 É arquivo OGG válido: ${isOggFile ? '✅ SIM' : '❌ NÃO (provavelmente criptografado)'}`);
    
    // Verificar se parece ser um arquivo MP3 válido
    const isMp3File = (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) || 
                     (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33);
    console.log(`🎵 É arquivo MP3 válido: ${isMp3File ? '✅ SIM' : '❌ NÃO'}`);
    
    if (!isOggFile && !isMp3File) {
      console.log('⚠️ PROBLEMA IDENTIFICADO: O arquivo baixado não é um áudio válido!');
      console.log('💡 EXPLICAÇÃO: Arquivos .enc do WhatsApp são criptografados e precisam ser descriptografados');
      console.log('🔧 SOLUÇÃO: A Evolution API deve descriptografar o arquivo usando a mediaKey antes de fornecer a URL');
    }
    
    return {
      success: true,
      size: response.data.byteLength,
      contentType: response.headers['content-type'],
      isValidAudio: isOggFile || isMp3File,
      hexHeader
    };
    
  } catch (error) {
    console.log('❌ Erro no download:');
    console.log(`📄 Erro: ${error.message}`);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Status Text: ${error.response.statusText}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para enviar webhook e verificar processamento
async function testEncAudioWebhook() {
  console.log('\n🚀 === TESTE DE WEBHOOK COM ÁUDIO .ENC === 🚀');
  
  try {
    console.log('📤 Enviando webhook de áudio .enc...');
    const response = await axios.post('http://localhost:9003/api/webhooks/evolution', encAudioWebhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Webhook enviado com sucesso:');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Resposta: ${JSON.stringify(response.data, null, 2)}`);
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
    
  } catch (error) {
    console.log('❌ Erro ao enviar webhook:');
    console.log(`📄 Erro: ${error.message}`);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Resposta: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Função principal
async function main() {
  console.log('🔍 === DIAGNÓSTICO DE PROCESSAMENTO DE ÁUDIO .ENC === 🔍\n');
  
  console.log('📋 PROBLEMA RELATADO:');
  console.log('- Áudio está sendo salvo com link .enc em vez de arquivo .ogg');
  console.log('- Arquivo .enc é criptografado e não pode ser reproduzido diretamente');
  console.log('- Sistema deveria descriptografar e converter para .ogg\n');
  
  // 1. Testar download direto do arquivo .enc
  const encUrl = encAudioWebhookData.data.message.audioMessage.url;
  const downloadResult = await testEncFileDownload(encUrl);
  
  // 2. Testar webhook com áudio .enc
  const webhookResult = await testEncAudioWebhook();
  
  // 3. Análise e recomendações
  console.log('\n📊 === ANÁLISE E RECOMENDAÇÕES === 📊');
  
  if (downloadResult.success && !downloadResult.isValidAudio) {
    console.log('\n❌ PROBLEMA CONFIRMADO:');
    console.log('- O arquivo .enc foi baixado mas não é um áudio válido');
    console.log('- Arquivo está criptografado e precisa ser descriptografado');
    
    console.log('\n🔧 SOLUÇÕES NECESSÁRIAS:');
    console.log('1. A Evolution API deve descriptografar arquivos .enc usando a mediaKey');
    console.log('2. Implementar verificação se URL é .enc antes de fazer upload para Storage');
    console.log('3. Usar Evolution API para obter versão descriptografada do áudio');
    console.log('4. Adicionar fallback para buscar áudio via Evolution API quando URL é .enc');
  }
  
  if (webhookResult.success) {
    console.log('\n✅ Webhook processado com sucesso');
    console.log('- Verificar logs do servidor para ver como o áudio .enc foi processado');
  }
  
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('1. Verificar logs do servidor após envio do webhook');
  console.log('2. Implementar detecção de URLs .enc no sistema');
  console.log('3. Usar Evolution API para descriptografar áudios .enc');
  console.log('4. Testar com áudio real da Evolution API');
}

// Executar teste
main().catch(console.error);