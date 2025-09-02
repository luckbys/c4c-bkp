import { Client } from 'minio';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

class MinIOSetup {
  private client: Client;
  private bucketName: string;

  constructor() {
    const serverUrl = process.env.MINIO_SERVER_URL;
    if (!serverUrl) {
      throw new Error('MINIO_SERVER_URL não configurado');
    }

    // Extrair host e porta da URL
    const url = new URL(serverUrl);
    const useSSL = url.protocol === 'https:';
    const port = url.port ? parseInt(url.port) : (useSSL ? 443 : 80);

    this.client = new Client({
      endPoint: url.hostname,
      port: port,
      useSSL: useSSL,
      accessKey: process.env.MINIO_ROOT_USER || '',
      secretKey: process.env.MINIO_ROOT_PASSWORD || ''
    });

    this.bucketName = process.env.MINIO_BUCKET_NAME || 'crm-media-files';
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testando conexão com MinIO...');
      
      // Listar buckets para testar conexão
      const buckets = await this.client.listBuckets();
      console.log('✅ Conexão estabelecida com sucesso!');
      console.log(`📦 Buckets encontrados: ${buckets.map(b => b.name).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }
  }

  async createBucketIfNotExists(): Promise<boolean> {
    try {
      console.log(`🪣 Verificando bucket: ${this.bucketName}`);
      
      const exists = await this.client.bucketExists(this.bucketName);
      
      if (exists) {
        console.log('✅ Bucket já existe!');
        return true;
      }

      console.log('📦 Criando bucket...');
      await this.client.makeBucket(this.bucketName, process.env.MINIO_REGION || 'us-east-1');
      console.log('✅ Bucket criado com sucesso!');
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao criar bucket:', error);
      return false;
    }
  }

  async setBucketPolicy(): Promise<boolean> {
    try {
      console.log('🔐 Configurando política do bucket...');
      
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`]
          }
        ]
      };

      await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      console.log('✅ Política configurada com sucesso!');
      
      return true;
    } catch (error) {
      console.error('⚠️ Aviso: Não foi possível configurar política:', error);
      return false;
    }
  }

  async runSetup(): Promise<void> {
    console.log('🚀 Iniciando configuração do MinIO...\n');
    
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      throw new Error('Falha na conexão com MinIO');
    }

    const bucketOk = await this.createBucketIfNotExists();
    if (!bucketOk) {
      throw new Error('Falha ao criar/verificar bucket');
    }

    await this.setBucketPolicy();
    
    console.log('\n🎉 Configuração do MinIO concluída!');
  }
}

// Executar configuração
const setup = new MinIOSetup();

setup.runSetup()
  .then(() => {
    console.log('\n✅ Setup finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro no setup:', error);
    process.exit(1);
  });

export { MinIOSetup };