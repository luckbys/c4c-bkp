import { Client, BucketItem } from 'minio';
import { createHash } from 'crypto';

export class MinIOService {
  private client: Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'crm-media-files';
    
    const serverUrl = process.env.MINIO_SERVER_URL!;
    const endPoint = serverUrl.replace(/^https?:\/\//, '');
    
    this.client = new Client({
      endPoint,
      useSSL: serverUrl.startsWith('https'),
      accessKey: process.env.MINIO_ROOT_USER!,
      secretKey: process.env.MINIO_ROOT_PASSWORD!,
      region: process.env.MINIO_REGION || 'us-east-1'
    });
    
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, process.env.MINIO_REGION);
        console.log(`Bucket ${this.bucketName} criado com sucesso`);
      }
    } catch (error) {
      console.error('Erro ao inicializar bucket:', error);
    }
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; objectName: string; checksum: string }> {
    const objectName = this.generateObjectPath(fileName, contentType);
    const checksum = this.generateChecksum(buffer);
    
    const metaData = {
      'Content-Type': contentType,
      'X-Checksum': checksum,
      ...metadata
    };

    await this.client.putObject(
      this.bucketName,
      objectName,
      buffer,
      buffer.length,
      metaData
    );

    const url = this.getFileUrl(objectName);
    return { url, objectName, checksum };
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucketName, objectName);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucketName, objectName);
  }

  async getFileInfo(objectName: string): Promise<any> {
    return await this.client.statObject(this.bucketName, objectName);
  }

  async listFiles(prefix?: string): Promise<BucketItem[]> {
    const objects: BucketItem[] = [];
    const stream = this.client.listObjects(this.bucketName, prefix, true);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        // Converter ObjectInfo para BucketItem
        if (obj.name) {
          const bucketItem: BucketItem = {
            name: obj.name,
            size: obj.size || 0,
            etag: obj.etag || '',
            lastModified: obj.lastModified || new Date()
          };
          objects.push(bucketItem);
        }
      });
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }

  private generateObjectPath(fileName: string, contentType: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const category = this.getCategoryFromContentType(contentType);
    const timestamp = Date.now();
    const extension = this.getFileExtension(fileName);
    const baseName = fileName.replace(extension, '').replace(/[^a-zA-Z0-9]/g, '_');
    
    return `${category}/${year}/${month}/${baseName}_${timestamp}${extension}`;
  }

  private getCategoryFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'images',
      'audio/ogg': 'audio/ogg',
      'application/pdf': 'documents/pdf',
      'application/xml': 'documents/xml',
      'text/xml': 'documents/xml',
      'video/mp4': 'videos/mp4',
      'video/webm': 'videos/webm',
      'video/avi': 'videos/avi',
      'video/mov': 'videos/mov'
    };
    
    return typeMap[contentType] || 'documents';
  }

  private getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  private getFileUrl(objectName: string): string {
    return `${process.env.MINIO_SERVER_URL}/${this.bucketName}/${objectName}`;
  }

  private generateChecksum(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  async generatePresignedUrl(objectName: string, expiry: number = 3600): Promise<string> {
    return await this.client.presignedGetObject(this.bucketName, objectName, expiry);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucketName);
      return true;
    } catch (error) {
      console.error('Erro na conexão MinIO:', error);
      return false;
    }
  }

  async getBucketStats(): Promise<{
    totalObjects: number;
    totalSize: number;
    categories: Record<string, { count: number; size: number }>;
  }> {
    try {
      const objects = await this.listFiles();
      const stats = {
        totalObjects: objects.length,
        totalSize: 0,
        categories: {} as Record<string, { count: number; size: number }>
      };

      for (const obj of objects) {
        const size = obj.size || 0;
        stats.totalSize += size;

        // Extrair categoria do path
        const category = obj.name?.split('/')[0] || 'unknown';
        if (!stats.categories[category]) {
          stats.categories[category] = { count: 0, size: 0 };
        }
        stats.categories[category].count++;
        stats.categories[category].size += size;
      }

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas do bucket:', error);
      return {
        totalObjects: 0,
        totalSize: 0,
        categories: {}
      };
    }
  }
}

// Singleton instance
let minioServiceInstance: MinIOService | null = null;

export function getMinIOService(): MinIOService {
  if (!minioServiceInstance) {
    minioServiceInstance = new MinIOService();
  }
  return minioServiceInstance;
}