const { exec } = require('child_process');
const path = require('path');

console.log('🔥 Aplicando índices do Firestore...');

// Verificar se o Firebase CLI está instalado
exec('firebase --version', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Firebase CLI não está instalado.');
    console.log('📦 Para instalar, execute: npm install -g firebase-tools');
    process.exit(1);
  }
  
  console.log('✅ Firebase CLI encontrado:', stdout.trim());
  
  // Aplicar os índices
  console.log('📋 Aplicando índices do firestore.indexes.json...');
  
  exec('firebase deploy --only firestore:indexes', {
    cwd: process.cwd()
  }, (deployError, deployStdout, deployStderr) => {
    if (deployError) {
      console.error('❌ Erro ao aplicar índices:', deployError.message);
      console.error('Stderr:', deployStderr);
      
      if (deployError.message.includes('not logged in')) {
        console.log('\n🔐 Você precisa fazer login no Firebase:');
        console.log('   firebase login');
      }
      
      if (deployError.message.includes('No project')) {
        console.log('\n🎯 Você precisa definir o projeto Firebase:');
        console.log('   firebase use --add');
        console.log('   ou');
        console.log('   firebase use <project-id>');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Índices aplicados com sucesso!');
    console.log('Stdout:', deployStdout);
    
    if (deployStderr) {
      console.log('Stderr:', deployStderr);
    }
    
    console.log('\n🎉 Processo concluído!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Aguarde alguns minutos para os índices serem criados');
    console.log('2. Teste novamente o carregamento de mensagens');
    console.log('3. Se necessário, ative os orderBy nos métodos getMessages e getTickets');
  });
});