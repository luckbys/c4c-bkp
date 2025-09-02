const { spawn } = require('child_process');

// Monitorar logs específicos de processamento de áudio
const patterns = [
  /📎 \[MEDIA PROCESSING\]/,
  /🔍 \[DEBUG UPLOAD\]/,
  /⚠️ \[STORAGE UPLOAD\]/,
  /📤 \[STORAGE UPLOAD\]/,
  /TEST_ENC_AUDIO/,
  /audioMessage/,
  /processMediaWithCache/
];

console.log('🎧 Monitorando logs de processamento de áudio...');
console.log('📋 Padrões monitorados:');
patterns.forEach((pattern, index) => {
  console.log(`   ${index + 1}. ${pattern}`);
});
console.log('\n' + '='.repeat(80) + '\n');

// Função para verificar se uma linha contém algum dos padrões
function matchesPattern(line) {
  return patterns.some(pattern => pattern.test(line));
}

// Ler logs do terminal do servidor (assumindo que está rodando)
process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
  let chunk;
  while (null !== (chunk = process.stdin.read())) {
    const lines = chunk.split('\n');
    lines.forEach(line => {
      if (line.trim() && matchesPattern(line)) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${line}`);
      }
    });
  }
});

process.stdin.on('end', () => {
  console.log('\n🔚 Monitoramento finalizado.');
});

console.log('💡 Para usar: cole os logs do servidor aqui ou redirecione a saída do servidor para este script.');
console.log('💡 Exemplo: npm run dev 2>&1 | node monitor-audio-logs.js');
console.log('\n⏳ Aguardando logs...');