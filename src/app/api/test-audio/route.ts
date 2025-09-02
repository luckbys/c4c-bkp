import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Dados de áudio reais do Firebase
  const realAudioData = 'data:audio/ogg; codecs=opus;base64,T2dnUwACAAAAAAAAAAAAAAAAAAAAACqCBoIBE09wdXNIZWFkAQEAAEgAAAAAAABOukAAAAAAAJAU';
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teste de Áudio - CRM C4</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
            line-height: 1.6;
        }
        .container {
            background: white;
            padding: 24px;
            margin: 20px 0;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .test-section {
            margin: 20px 0;
            padding: 20px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
        }
        .test-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .result {
            margin-top: 12px;
            padding: 12px;
            border-radius: 6px;
            font-weight: 500;
        }
        .success {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        .error {
            background-color: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }
        .warning {
            background-color: #fffbeb;
            color: #d97706;
            border: 1px solid #fed7aa;
        }
        .info {
            background-color: #eff6ff;
            color: #2563eb;
            border: 1px solid #dbeafe;
        }
        audio {
            width: 100%;
            margin: 12px 0;
        }
        .custom-player {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 20px;
            color: white;
            margin: 12px 0;
        }
        .play-btn {
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 16px;
        }
        .play-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.05);
        }
        .progress-container {
            flex: 1;
            margin-left: 16px;
        }
        .progress-bar {
            width: 100%;
            height: 6px;
            background: rgba(255,255,255,0.3);
            border-radius: 3px;
            cursor: pointer;
            margin: 8px 0;
        }
        .progress-fill {
            height: 100%;
            background: white;
            border-radius: 3px;
            width: 0%;
            transition: width 0.1s;
        }
        .time-info {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            opacity: 0.9;
        }
        .player-controls {
            display: flex;
            align-items: center;
        }
        .log {
            background: #1f2937;
            color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            max-height: 200px;
            overflow-y: auto;
            margin: 12px 0;
        }
        .btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            margin: 4px;
        }
        .btn:hover {
            background: #2563eb;
        }
        .btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 Teste de Renderização de Áudio - CRM C4</h1>
        <p>Este teste verifica se os componentes de áudio estão funcionando corretamente no sistema.</p>
        
        <div class="info result">
            <strong>Status:</strong> <span id="overall-status">Iniciando testes...</span>
        </div>
    </div>

    <div class="container">
        <h2>📊 Resultados dos Testes</h2>
        <div id="test-summary"></div>
    </div>

    <div class="container">
        <div class="test-section">
            <div class="test-title">
                🎵 Teste 1: Player HTML5 Nativo
            </div>
            <p>Teste básico com o elemento &lt;audio&gt; padrão do navegador.</p>
            <audio controls id="native-audio">
                Seu navegador não suporta o elemento de áudio.
            </audio>
            <div id="native-result"></div>
        </div>
    </div>

    <div class="container">
        <div class="test-section">
            <div class="test-title">
                🎨 Teste 2: Player Customizado (Como no Chat)
            </div>
            <p>Player customizado similar ao usado no sistema de chat.</p>
            <div class="custom-player">
                <div class="player-controls">
                    <div class="play-btn" id="custom-play">
                        <span id="play-icon">▶</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" id="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="time-info">
                            <span id="current-time">0:00</span>
                            <span id="total-time">0:00</span>
                        </div>
                    </div>
                </div>
            </div>
            <audio id="custom-audio" style="display: none;"></audio>
            <div id="custom-result"></div>
        </div>
    </div>

    <div class="container">
        <div class="test-section">
            <div class="test-title">
                🔍 Teste 3: Detecção de Formato
            </div>
            <p>Verificação se o navegador suporta o formato OGG/Opus.</p>
            <div id="format-result"></div>
            <button class="btn" onclick="testFormats()">Testar Formatos</button>
        </div>
    </div>

    <div class="container">
        <div class="test-section">
            <div class="test-title">
                🧪 Teste 4: Simulação do Componente AudioMessage
            </div>
            <p>Teste que simula exatamente como o áudio é renderizado no chat.</p>
            <div id="component-test"></div>
            <button class="btn" onclick="simulateAudioMessage()">Simular Componente</button>
        </div>
    </div>

    <div class="container">
        <div class="test-section">
            <div class="test-title">
                📝 Logs de Debug
            </div>
            <div class="log" id="debug-log"></div>
            <button class="btn" onclick="clearLog()">Limpar Log</button>
        </div>
    </div>

    <script>
        // Dados de áudio real do sistema
        const audioData = '${realAudioData}';
        let testResults = {};
        
        function log(message) {
            const logEl = document.getElementById('debug-log');
            const timestamp = new Date().toLocaleTimeString();
            logEl.innerHTML += \`[\${timestamp}] \${message}\n\`;
            logEl.scrollTop = logEl.scrollHeight;
            console.log(message);
        }
        
        function showResult(testId, success, message) {
            const element = document.getElementById(testId + '-result');
            element.className = \`result \${success ? 'success' : 'error'}\`;
            element.innerHTML = \`\${success ? '✅' : '❌'} \${message}\`;
            testResults[testId] = { success, message };
            updateSummary();
        }
        
        function showWarning(testId, message) {
            const element = document.getElementById(testId + '-result');
            element.className = 'result warning';
            element.innerHTML = \`⚠️ \${message}\`;
            testResults[testId] = { success: false, message, warning: true };
            updateSummary();
        }
        
        function updateSummary() {
            const summary = document.getElementById('test-summary');
            const total = Object.keys(testResults).length;
            const passed = Object.values(testResults).filter(r => r.success).length;
            const warnings = Object.values(testResults).filter(r => r.warning).length;
            
            summary.innerHTML = \`
                <div class="\${passed === total ? 'success' : warnings > 0 ? 'warning' : 'error'} result">
                    <strong>Resumo:</strong> \${passed}/\${total} testes passaram
                    \${warnings > 0 ? \`, \${warnings} avisos\` : ''}
                </div>
            \`;
            
            const status = document.getElementById('overall-status');
            if (passed === total) {
                status.textContent = 'Todos os testes passaram! ✅';
            } else if (warnings > 0) {
                status.textContent = 'Alguns problemas detectados ⚠️';
            } else {
                status.textContent = 'Falhas detectadas ❌';
            }
        }
        
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
        }
        
        // Teste 1: Player nativo
        function test1() {
            log('Iniciando Teste 1: Player HTML5 nativo');
            const audio = document.getElementById('native-audio');
            audio.src = audioData;
            
            const timeout = setTimeout(() => {
                if (audio.readyState === 0) {
                    showWarning('native', 'Timeout: Áudio não carregou em 5 segundos');
                    log('Teste 1: Timeout - áudio não carregou');
                }
            }, 5000);
            
            audio.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                showResult('native', true, \`Carregado! Duração: \${formatTime(audio.duration)}\`);
                log(\`Teste 1: Sucesso - duração: \${audio.duration}s\`);
            });
            
            audio.addEventListener('error', (e) => {
                clearTimeout(timeout);
                const error = e.target.error;
                showResult('native', false, \`Erro: \${error?.message || 'Erro desconhecido'}\`);
                log(\`Teste 1: Erro - \${error?.message || 'Erro desconhecido'}\`);
            });
        }
        
        // Teste 2: Player customizado
        function test2() {
            log('Iniciando Teste 2: Player customizado');
            const audio = document.getElementById('custom-audio');
            const playBtn = document.getElementById('custom-play');
            const playIcon = document.getElementById('play-icon');
            const progressBar = document.getElementById('progress-bar');
            const progressFill = document.getElementById('progress-fill');
            const currentTimeEl = document.getElementById('current-time');
            const totalTimeEl = document.getElementById('total-time');
            
            audio.src = audioData;
            let isPlaying = false;
            
            const timeout = setTimeout(() => {
                if (audio.readyState === 0) {
                    showWarning('custom', 'Timeout: Player customizado não carregou');
                    log('Teste 2: Timeout - player customizado não carregou');
                }
            }, 5000);
            
            audio.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                totalTimeEl.textContent = formatTime(audio.duration);
                showResult('custom', true, \`Player pronto! Duração: \${formatTime(audio.duration)}\`);
                log(\`Teste 2: Sucesso - player customizado pronto\`);
            });
            
            audio.addEventListener('error', (e) => {
                clearTimeout(timeout);
                const error = e.target.error;
                showResult('custom', false, \`Erro: \${error?.message || 'Erro desconhecido'}\`);
                log(\`Teste 2: Erro - \${error?.message || 'Erro desconhecido'}\`);
            });
            
            audio.addEventListener('timeupdate', () => {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressFill.style.width = \`\${progress}%\`;
                currentTimeEl.textContent = formatTime(audio.currentTime);
            });
            
            playBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    playIcon.textContent = '▶';
                    isPlaying = false;
                    log('Player customizado: pausado');
                } else {
                    audio.play().then(() => {
                        playIcon.textContent = '⏸';
                        isPlaying = true;
                        log('Player customizado: reproduzindo');
                    }).catch(e => {
                        log(\`Player customizado: erro ao reproduzir - \${e.message}\`);
                    });
                }
            });
            
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audio.currentTime = percent * audio.duration;
                log(\`Player customizado: seek para \${formatTime(audio.currentTime)}\`);
            });
        }
        
        function testFormats() {
            log('Iniciando Teste 3: Detecção de formatos');
            const audio = document.createElement('audio');
            const formats = [
                { type: 'audio/ogg; codecs="opus"', name: 'OGG/Opus' },
                { type: 'audio/mpeg', name: 'MP3' },
                { type: 'audio/wav', name: 'WAV' },
                { type: 'audio/mp4', name: 'MP4/AAC' }
            ];
            
            const results = formats.map(format => {
                const support = audio.canPlayType(format.type);
                log(\`Formato \${format.name}: \${support || 'não suportado'}\`);
                return \`\${format.name}: \${support || 'não suportado'}\`;
            });
            
            const oggSupport = audio.canPlayType('audio/ogg; codecs="opus"');
            if (oggSupport === 'probably' || oggSupport === 'maybe') {
                showResult('format', true, \`OGG/Opus suportado (\${oggSupport}). Outros: \${results.join(', ')}\`);
            } else {
                showResult('format', false, \`OGG/Opus não suportado. Formatos: \${results.join(', ')}\`);
            }
        }
        
        function simulateAudioMessage() {
            log('Iniciando Teste 4: Simulação do AudioMessage');
            const container = document.getElementById('component-test');
            
            // Simular exatamente o componente AudioMessage
            container.innerHTML = \`
                <div style="display: flex; flex-direction: column; gap: 8px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; max-width: 320px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="padding: 8px; background: rgba(255,255,255,0.1); border-radius: 50%;">
                                🎵
                            </div>
                            <span style="font-size: 14px; font-weight: 500;">Áudio</span>
                        </div>
                        <button style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer;" onclick="downloadAudio()">
                            ⬇️
                        </button>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button id="sim-play-btn" style="background: rgba(255,255,255,0.2); border: 2px solid white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white;">
                            ▶
                        </button>
                        
                        <div style="flex: 1;">
                            <div id="sim-progress" style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; cursor: pointer; margin-bottom: 4px;">
                                <div id="sim-progress-fill" style="height: 100%; background: white; border-radius: 2px; width: 0%; transition: width 0.1s;"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px;">
                                <span id="sim-current">0:00</span>
                                <span id="sim-total">0:00</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <audio id="sim-audio" style="display: none;"></audio>
            \`;
            
            // Configurar funcionalidade
            const audio = document.getElementById('sim-audio');
            const playBtn = document.getElementById('sim-play-btn');
            const progressBar = document.getElementById('sim-progress');
            const progressFill = document.getElementById('sim-progress-fill');
            const currentEl = document.getElementById('sim-current');
            const totalEl = document.getElementById('sim-total');
            
            audio.src = audioData;
            let isPlaying = false;
            
            audio.addEventListener('loadedmetadata', () => {
                totalEl.textContent = formatTime(audio.duration);
                showResult('component', true, 'Componente AudioMessage simulado com sucesso!');
                log('Teste 4: Componente AudioMessage funcionando');
            });
            
            audio.addEventListener('error', (e) => {
                showResult('component', false, \`Erro no componente: \${e.target.error?.message || 'Erro desconhecido'}\`);
                log(\`Teste 4: Erro no componente - \${e.target.error?.message}\`);
            });
            
            audio.addEventListener('timeupdate', () => {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressFill.style.width = \`\${progress}%\`;
                currentEl.textContent = formatTime(audio.currentTime);
            });
            
            playBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    playBtn.textContent = '▶';
                    isPlaying = false;
                } else {
                    audio.play().then(() => {
                        playBtn.textContent = '⏸';
                        isPlaying = true;
                    }).catch(e => {
                        log(\`Erro ao reproduzir no componente: \${e.message}\`);
                    });
                }
            });
        }
        
        function downloadAudio() {
            const link = document.createElement('a');
            link.href = audioData;
            link.download = 'audio-test.ogg';
            link.click();
            log('Download do áudio iniciado');
        }
        
        function clearLog() {
            document.getElementById('debug-log').innerHTML = '';
        }
        
        // Executar testes automaticamente
        document.addEventListener('DOMContentLoaded', () => {
            log('=== INICIANDO TESTES DE ÁUDIO ===');
            log(\`Dados de áudio: \${audioData.substring(0, 50)}...\`);
            log(\`Tamanho dos dados: \${audioData.length} caracteres\`);
            
            // Informações do navegador
            log(\`Navegador: \${navigator.userAgent}\`);
            log(\`Suporte a Audio: \${!!window.Audio}\`);
            log(\`Suporte a MediaSource: \${!!window.MediaSource}\`);
            
            // Executar testes
            setTimeout(() => test1(), 500);
            setTimeout(() => test2(), 1000);
            setTimeout(() => testFormats(), 1500);
            
            log('Testes automáticos iniciados. Use os botões para testes manuais.');
        });
    </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}