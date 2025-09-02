import { MinIOService } from '../src/services/minio-service';
import { AdvancedFileValidator } from '../src/services/advanced-file-validator';
import { MediaIntegrationService } from '../src/services/media-integration-service';
import * as fs from 'fs';
import * as path from 'path';

// Configurar variáveis de ambiente para teste
process.env.MINIO_SERVER_URL = 'https://n8n-minio.05pdov.easypanel.host';
process.env.MINIO_ROOT_USER = 'admin';
process.env.MINIO_ROOT_PASSWORD = 'Devs@0101';
process.env.MINIO_BUCKET_NAME = 'crm-media-files';
process.env.MINIO_REGION = 'us-east-1';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  duration: number;
  data?: any;
}

class MinIOIntegrationTest {
  private results: TestResult[] = [];

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🧪 [TEST] ${testName}`);
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        success: true,
        message: 'Teste passou com sucesso',
        duration,
        data: result
      });
      
      console.log(`✅ [TEST] ${testName} - PASSOU (${duration}ms)`);
      if (result) {
        console.log(`📊 [TEST] Resultado:`, result);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.results.push({
        test: testName,
        success: false,
        message: errorMessage,
        duration
      });
      
      console.error(`❌ [TEST] ${testName} - FALHOU (${duration}ms):`, errorMessage);
    }
  }

  async testMinIOConnection(): Promise<void> {
    await this.runTest('Conexão com MinIO', async () => {
      const minioService = new MinIOService();
      
      // Testar listagem de arquivos (isso verifica conectividade)
      const files = await minioService.listFiles();
      
      return {
        connected: true,
        filesCount: files.length,
        bucketExists: true
      };
    });
  }

  async testFileValidation(): Promise<void> {
    await this.runTest('Validação de Arquivos', async () => {
      // Criar um buffer de teste (imagem JPEG mínima)
      const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xD9
      ]);
      
      const validation = await AdvancedFileValidator.validateFile(
        jpegHeader,
        'test.jpg',
        'image/jpeg'
      );
      
      if (!validation.isValid) {
        throw new Error(`Validação falhou: ${validation.error}`);
      }
      
      return {
        isValid: validation.isValid,
        detectedMimeType: validation.detectedMimeType,
        normalizedName: validation.normalizedName,
        size: validation.size,
        checksum: validation.checksum
      };
    });
  }

  async testMinIOUpload(): Promise<void> {
    await this.runTest('Upload para MinIO', async () => {
      const minioService = new MinIOService();
      
      // Criar um arquivo de teste
      const testContent = 'Este é um arquivo de teste para MinIO';
      const buffer = Buffer.from(testContent, 'utf8');
      const fileName = `test_${Date.now()}.txt`;
      
      const result = await minioService.uploadFile(
        buffer,
        fileName,
        'text/plain',
        {
          'Test-Upload': 'true',
          'Upload-Time': new Date().toISOString()
        }
      );
      
      // Verificar se o arquivo foi criado
      const fileInfo = await minioService.getFileInfo(result.objectName);
      
      return {
        url: result.url,
        objectName: result.objectName,
        checksum: result.checksum,
        fileSize: fileInfo.size,
        contentType: fileInfo.metaData['content-type']
      };
    });
  }

  async testMediaIntegration(): Promise<void> {
    await this.runTest('Integração de Mídia Completa', async () => {
      const integrationService = new MediaIntegrationService();
      
      // Criar um arquivo JPEG válido (header básico)
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const buffer = Buffer.concat([jpegHeader, Buffer.alloc(1000, 0)]);
      
      const result = await integrationService.uploadAndSaveReference(
        buffer,
        'test-image.jpg',
        'image/jpeg',
        `test-message-${Date.now()}`,
        `test-ticket-${Date.now()}`,
        {
          uploadedBy: 'integration-test',
          testRun: true
        }
      );
      
      if (!result.success) {
        throw new Error(`Upload falhou: ${result.error}`);
      }
      
      return {
        success: result.success,
        url: result.url,
        fileName: result.fileName
      };
    });
  }

  async testBase64Processing(): Promise<void> {
    await this.runTest('Processamento de Base64', async () => {
      const integrationService = new MediaIntegrationService();
      
      // Criar dados base64 de um JPEG válido
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const jpegData = Buffer.concat([jpegHeader, Buffer.alloc(500, 0)]);
      const base64Data = jpegData.toString('base64');
      
      const result = await integrationService.uploadAndSaveReference(
        jpegData,
        'base64-image.jpg',
        'image/jpeg',
        `test-base64-${Date.now()}`,
        `test-ticket-base64-${Date.now()}`,
        {
          uploadedBy: 'base64-test',
          originalFormat: 'base64'
        }
      );
      
      if (!result.success) {
        throw new Error(`Upload de base64 falhou: ${result.error}`);
      }
      
      return {
        success: result.success,
        url: result.url,
        fileName: result.fileName,
        originalSize: base64Data.length,
        bufferSize: jpegData.length
      };
    });
  }

  async testFileFormats(): Promise<void> {
    await this.runTest('Formatos de Arquivo Suportados', async () => {
      const results = [];
      
      // Testar diferentes formatos
      const formats = [
        { name: 'test.pdf', mimeType: 'application/pdf', content: '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n' },
        { name: 'test.xml', mimeType: 'application/xml', content: '<?xml version="1.0"?><root><test>data</test></root>' },
        { name: 'test.ogg', mimeType: 'audio/ogg', content: 'OggS' + 'A'.repeat(100) }, // Simular OGG
      ];
      
      for (const format of formats) {
        try {
          const buffer = Buffer.from(format.content, 'utf8');
          const validation = await AdvancedFileValidator.validateFile(
            buffer,
            format.name,
            format.mimeType
          );
          
          results.push({
            format: format.name,
            mimeType: format.mimeType,
            isValid: validation.isValid,
            error: validation.error
          });
        } catch (error) {
          results.push({
            format: format.name,
            mimeType: format.mimeType,
            isValid: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
      
      return results;
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Iniciando testes de integração MinIO...');
    console.log('=' * 60);
    
    await this.testMinIOConnection();
    await this.testFileValidation();
    await this.testMinIOUpload();
    await this.testMediaIntegration();
    await this.testBase64Processing();
    await this.testFileFormats();
    
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '=' * 60);
    console.log('📊 RESUMO DOS TESTES');
    console.log('=' * 60);
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    
    console.log(`\n📈 Estatísticas:`);
    console.log(`   Total de testes: ${total}`);
    console.log(`   ✅ Passou: ${passed}`);
    console.log(`   ❌ Falhou: ${failed}`);
    console.log(`   🎯 Taxa de sucesso: ${((passed / total) * 100).toFixed(1)}%`);
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(`   ⏱️ Tempo médio: ${avgDuration.toFixed(0)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Testes que falharam:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   • ${r.test}: ${r.message}`);
        });
    }
    
    console.log('\n' + '=' * 60);
    
    if (failed === 0) {
      console.log('🎉 Todos os testes passaram! A integração MinIO está funcionando corretamente.');
    } else {
      console.log('⚠️ Alguns testes falharam. Verifique a configuração e tente novamente.');
    }
  }
}

// Executar testes automaticamente
const tester = new MinIOIntegrationTest();

tester.runAllTests()
  .then(() => {
    console.log('\n✅ Testes concluídos!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal nos testes:', error);
    process.exit(1);
  });

export { MinIOIntegrationTest };