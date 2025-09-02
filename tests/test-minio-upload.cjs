const { Client } = require('minio');
const fs = require('fs');
const path = require('path');

// Configuração do MinIO
const minioClient = new Client({
  endPoint: process.env.MINIO_SERVER_URL?.replace(/^https?:\/\//, '') || 'n8n-minio.05pdov.easypanel.host',
  useSSL: true,
  accessKey: process.env.MINIO_ROOT_USER || 'admin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'Devs@0101',
  region: process.env.MINIO_REGION || 'us-east-1'
});

const bucketName = 'crm-media-files';

async function testMinIOConnection() {
  console.log('🔍 Testando conexão com MinIO...');
  
  try {
    // Verificar se o bucket existe
    const bucketExists = await minioClient.bucketExists(bucketName);
    console.log(`📦 Bucket '${bucketName}' existe:`, bucketExists);
    
    if (!bucketExists) {
      console.log('❌ Bucket não existe! Criando...');
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log('✅ Bucket criado com sucesso!');
    }
    
    // Testar upload de um arquivo simples
    const testContent = Buffer.from('Teste de upload para MinIO - ' + new Date().toISOString());
    const objectName = `test/test-upload-${Date.now()}.txt`;
    
    console.log('📤 Fazendo upload de teste...');
    await minioClient.putObject(
      bucketName,
      objectName,
      testContent,
      testContent.length,
      {
        'Content-Type': 'text/plain',
        'X-Test': 'true'
      }
    );
    
    console.log('✅ Upload realizado com sucesso!');
    console.log('📁 Objeto criado:', objectName);
    
    // Verificar se o arquivo foi criado
    const stat = await minioClient.statObject(bucketName, objectName);
    console.log('📊 Informações do arquivo:', {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified
    });
    
    // Gerar URL de acesso
    const url = `https://n8n-minio.05pdov.easypanel.host/${bucketName}/${objectName}`;
    console.log('🔗 URL do arquivo:', url);
    
    // Listar alguns arquivos do bucket
    console.log('\n📋 Listando arquivos recentes...');
    const objects = [];
    const stream = minioClient.listObjects(bucketName, '', true);
    
    let count = 0;
    for await (const obj of stream) {
      if (count >= 10) break; // Limitar a 10 arquivos
      objects.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified
      });
      count++;
    }
    
    console.log('📁 Arquivos encontrados:', objects.length);
    objects.forEach((obj, index) => {
      console.log(`  ${index + 1}. ${obj.name} (${obj.size} bytes) - ${obj.lastModified}`);
    });
    
    // Limpar arquivo de teste
    await minioClient.removeObject(bucketName, objectName);
    console.log('🗑️ Arquivo de teste removido');
    
    console.log('\n✅ Teste do MinIO concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste do MinIO:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
  }
}

// Executar teste
testMinIOConnection();