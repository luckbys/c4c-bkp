const fetch = require('node-fetch');
const { AbortController } = require('abort-controller');

// Polyfill para AbortSignal.timeout se não estiver disponível
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

// Configurações do Evo AI
const EVO_AI_URL = 'https://n8n-evo-ai-frontend.05pdov.easypanel.host';
const EVO_AI_EMAIL = 'lucas.hborges42@gmail.com';
const EVO_AI_PASSWORD = 'admin123';

// Classe para gerenciar cookies
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setCookies(response) {
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      cookies.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
          this.cookies.set(name.trim(), value.trim());
        }
      });
    }
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

async function testEvoAIWeb() {
  console.log('🔧 Teste de Conectividade Web com Evo AI');
  console.log('=========================================');
  console.log(`URL: ${EVO_AI_URL}`);
  console.log(`Email: ${EVO_AI_EMAIL}`);
  console.log('');

  const cookieJar = new CookieJar();

  try {
    // 1. Testar se a página principal carrega
    console.log('🔍 Testando acesso à página principal...');
    const homeResponse = await fetch(EVO_AI_URL, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    console.log(`   Status: ${homeResponse.status} ${homeResponse.statusText}`);
    console.log(`   Content-Type: ${homeResponse.headers.get('content-type')}`);
    
    if (homeResponse.ok) {
      console.log('   ✅ Página principal acessível');
      cookieJar.setCookies(homeResponse);
    } else {
      console.log('   ❌ Falha ao acessar página principal');
      return;
    }

    // 2. Testar página de login
    console.log('\n🔍 Testando página de login...');
    const loginPageResponse = await fetch(`${EVO_AI_URL}/login`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookieJar.getCookieHeader()
      },
      signal: AbortSignal.timeout(10000)
    });

    console.log(`   Status: ${loginPageResponse.status} ${loginPageResponse.statusText}`);
    if (loginPageResponse.ok) {
      console.log('   ✅ Página de login acessível');
      cookieJar.setCookies(loginPageResponse);
    } else {
      console.log('   ❌ Falha ao acessar página de login');
    }

    // 3. Tentar login
    console.log('\n🔐 Tentando fazer login...');
    const loginResponse = await fetch(`${EVO_AI_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookieJar.getCookieHeader()
      },
      body: JSON.stringify({
        email: EVO_AI_EMAIL,
        password: EVO_AI_PASSWORD
      }),
      signal: AbortSignal.timeout(15000)
    });

    console.log(`   Status: ${loginResponse.status} ${loginResponse.statusText}`);
    console.log(`   Content-Type: ${loginResponse.headers.get('content-type')}`);
    
    if (loginResponse.ok) {
      cookieJar.setCookies(loginResponse);
      
      const contentType = loginResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const loginData = await loginResponse.json();
          console.log('   ✅ Login bem-sucedido (JSON response)');
          console.log('   Dados:', loginData);
        } catch (jsonError) {
          console.log('   ⚠️ Erro ao parsear JSON do login');
        }
      } else {
        const responseText = await loginResponse.text();
        console.log('   ⚠️ Login retornou HTML (possível redirecionamento)');
        console.log('   Resposta:', responseText.substring(0, 200) + '...');
      }
    } else {
      console.log('   ❌ Falha no login');
      try {
        const errorText = await loginResponse.text();
        console.log('   Erro:', errorText.substring(0, 200) + '...');
      } catch (textError) {
        console.log('   Erro ao ler resposta de erro');
      }
    }

    // 4. Testar acesso a páginas autenticadas
    console.log('\n🔍 Testando acesso a páginas autenticadas...');
    const dashboardPaths = ['/dashboard', '/agents', '/api/agents', '/api/v1/agents'];
    
    for (const path of dashboardPaths) {
      try {
        console.log(`\n   Testando: ${EVO_AI_URL}${path}`);
        const authResponse = await fetch(`${EVO_AI_URL}${path}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookieJar.getCookieHeader()
          },
          signal: AbortSignal.timeout(10000)
        });

        console.log(`   Status: ${authResponse.status} ${authResponse.statusText}`);
        console.log(`   Content-Type: ${authResponse.headers.get('content-type')}`);
        
        if (authResponse.ok) {
          const contentType = authResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const data = await authResponse.json();
              console.log(`   ✅ API ${path} respondeu com JSON:`, data);
            } catch (jsonError) {
              console.log(`   ⚠️ API ${path} respondeu mas não é JSON válido`);
            }
          } else {
            console.log(`   ✅ Página ${path} acessível (HTML)`);
          }
        } else {
          console.log(`   ❌ Falha ao acessar ${path}`);
        }
      } catch (error) {
        console.log(`   ❌ Erro ao testar ${path}:`, error.message);
      }
    }

    // 5. Resumo dos cookies
    console.log('\n🍪 Cookies coletados:');
    if (cookieJar.cookies.size > 0) {
      cookieJar.cookies.forEach((value, name) => {
        console.log(`   ${name}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      });
    } else {
      console.log('   Nenhum cookie coletado');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar o teste
testEvoAIWeb().catch(console.error);