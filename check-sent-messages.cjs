const axios = require('axios');

// Configurações da Evolution API
const EVOLUTION_API_URL = 'https://evochat.devsible.com.br';
const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = 'loja';
const CLIENT_NUMBER = '5512981022013@s.whatsapp.net';

async function checkSentMessages() {
  try {
    console.log('🔍 Verificando mensagens enviadas para o cliente...');
    console.log('📱 Cliente:', CLIENT_NUMBER);
    console.log('🏪 Instância:', INSTANCE_NAME);
    
    // Buscar mensagens recentes
    const response = await axios.get(
      `${EVOLUTION_API_URL}/message/findMany/${INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        },
        params: {
          where: {
            key: {
              remoteJid: CLIENT_NUMBER
            }
          },
          limit: 10
        }
      }
    );
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📝 Mensagens encontradas:', response.data?.length || 0);
    
    if (response.data && response.data.length > 0) {
      console.log('\n📋 Últimas mensagens:');
      response.data.forEach((msg, index) => {
        console.log(`\n${index + 1}. Mensagem:`);
        console.log('   📅 Data:', new Date(msg.messageTimestamp * 1000).toLocaleString('pt-BR'));
        console.log('   👤 De mim:', msg.key.fromMe);
        console.log('   💬 Conteúdo:', msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Mídia]');
        console.log('   🆔 ID:', msg.key.id);
      });
      
      // Verificar se há mensagens enviadas pelo bot (fromMe: true) recentes
      const botMessages = response.data.filter(msg => msg.key.fromMe);
      const recentBotMessages = botMessages.filter(msg => {
        const msgTime = new Date(msg.messageTimestamp * 1000);
        const now = new Date();
        const diffMinutes = (now - msgTime) / (1000 * 60);
        return diffMinutes <= 10; // Últimos 10 minutos
      });
      
      console.log('\n🤖 Mensagens do bot nos últimos 10 minutos:', recentBotMessages.length);
      
      if (recentBotMessages.length > 0) {
        console.log('✅ O bot ENVIOU mensagens recentemente!');
        recentBotMessages.forEach((msg, index) => {
          console.log(`   ${index + 1}. "${msg.message?.conversation || msg.message?.extendedTextMessage?.text}"`);
        });
      } else {
        console.log('❌ O bot NÃO enviou mensagens recentemente');
      }
      
    } else {
      console.log('❌ Nenhuma mensagem encontrada para este cliente');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error.response?.data || error.message);
  }
}

checkSentMessages();