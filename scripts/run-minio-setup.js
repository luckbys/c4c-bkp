const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Configuração e Teste da Integração MinIO');
console.log('=' * 50);

// Função para executar comandos
function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`💻 Executando: ${command}`);
  
  try {
    const output = execSync(command, { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      encoding: 'utf8'
    });
    console.log(`✅ ${description} - Concluído`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Falhou:`, error.message);
    return false;
  }
}

// Função principal
async function setupMinIO() {
  console.log('\n🔧 Iniciando configuração MinIO...');
  
  // 1. Compilar TypeScript
  console.log('\n📦 Compilando código TypeScript...');
  const compileSuccess = runCommand(
    'npx tsc --noEmit --skipLibCheck',
    'Verificação de tipos TypeScript'
  );
  
  if (!compileSuccess) {
    console.log('⚠️ Aviso: Verificação de tipos falhou, mas continuando...');
  }
  
  // 2. Testar conexão MinIO
  console.log('\n🧪 Testando integração MinIO...');
  const testSuccess = runCommand(
    'npx ts-node scripts/test-minio-integration.ts',
    'Testes de integração MinIO'
  );
  
  if (!testSuccess) {
    console.error('❌ Testes de integração falharam!');
    console.error('🔧 Verifique:');
    console.error('   • Credenciais do MinIO no .env.local');
    console.error('   • Conectividade com o servidor MinIO');
    console.error('   • Permissões de acesso');
    return false;
  }
  
  // 3. Perguntar sobre migração
  console.log('\n🔄 Migração de dados existentes');
  console.log('⚠️ ATENÇÃO: A migração irá transferir arquivos do Firebase Storage para MinIO');
  console.log('📋 Isso pode levar tempo dependendo da quantidade de arquivos');
  
  // Para ambiente de produção, você pode querer adicionar confirmação interativa
  const shouldMigrate = process.env.AUTO_MIGRATE === 'true' || process.argv.includes('--migrate');
  
  if (shouldMigrate) {
    console.log('\n🚚 Iniciando migração...');
    const migrateSuccess = runCommand(
      'npx ts-node scripts/migrate-to-minio.ts',
      'Migração de arquivos para MinIO'
    );
    
    if (!migrateSuccess) {
      console.error('❌ Migração falhou!');
      console.error('🔧 Verifique os logs acima para detalhes');
      return false;
    }
  } else {
    console.log('⏭️ Migração pulada');
    console.log('💡 Para executar a migração mais tarde, use:');
    console.log('   npm run migrate-to-minio');
  }
  
  // 4. Verificar configuração final
  console.log('\n✅ Configuração concluída!');
  console.log('\n📋 Próximos passos:');
  console.log('   1. ✅ MinIO configurado e testado');
  console.log('   2. ✅ Serviços de integração criados');
  console.log('   3. ✅ APIs de upload/download implementadas');
  console.log('   4. ✅ Componentes React criados');
  
  if (shouldMigrate) {
    console.log('   5. ✅ Migração de dados concluída');
  } else {
    console.log('   5. ⏳ Migração pendente (opcional)');
  }
  
  console.log('\n🎉 Sistema pronto para uso!');
  console.log('\n📚 Documentação:');
  console.log('   • Upload: POST /api/media/upload');
  console.log('   • Download: GET /api/media/download/:messageId');
  console.log('   • Validação: PUT /api/media/upload');
  
  console.log('\n🔧 Configurações importantes:');
  console.log('   • Formatos suportados: PDF, XML, OGG, JPEG, MP4, WebM, AVI, MOV');
  console.log('   • Tamanho máximo: 500MB por arquivo');
  console.log('   • Armazenamento: MinIO (arquivos) + Firebase (metadados)');
  
  return true;
}

// Executar configuração
setupMinIO()
  .then((success) => {
    if (success) {
      console.log('\n🎊 Configuração MinIO concluída com sucesso!');
      process.exit(0);
    } else {
      console.log('\n💥 Configuração falhou!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal na configuração:', error);
    process.exit(1);
  });