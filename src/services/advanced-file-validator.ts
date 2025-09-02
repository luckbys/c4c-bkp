import { fileTypeFromBuffer } from 'file-type';
import { createHash } from 'crypto';

export interface ValidationResult {
  isValid: boolean;
  normalizedName?: string;
  detectedMimeType?: string;
  size?: number;
  checksum?: string;
  error?: string;
  category?: string;
}

export class AdvancedFileValidator {
  private static readonly ALLOWED_TYPES = {
    'application/pdf': { extensions: ['.pdf'], maxSize: 50 * 1024 * 1024 }, // 50MB
    'application/xml': { extensions: ['.xml'], maxSize: 10 * 1024 * 1024 }, // 10MB
    'text/xml': { extensions: ['.xml'], maxSize: 10 * 1024 * 1024 },
    'audio/ogg': { extensions: ['.ogg'], maxSize: 100 * 1024 * 1024 }, // 100MB
    'image/jpeg': { extensions: ['.jpg', '.jpeg'], maxSize: 20 * 1024 * 1024 }, // 20MB
    'video/mp4': { extensions: ['.mp4'], maxSize: 500 * 1024 * 1024 }, // 500MB
    'video/webm': { extensions: ['.webm'], maxSize: 500 * 1024 * 1024 },
    'video/avi': { extensions: ['.avi'], maxSize: 500 * 1024 * 1024 },
    'video/mov': { extensions: ['.mov'], maxSize: 500 * 1024 * 1024 }
  };

  static async validateFile(
    buffer: Buffer,
    fileName: string,
    declaredMimeType: string
  ): Promise<ValidationResult> {
    try {
      // Detectar tipo real do arquivo
      const detectedType = await fileTypeFromBuffer(buffer);
      const actualMimeType = detectedType?.mime || declaredMimeType;
      
      // Validar se o tipo é permitido
      if (!this.ALLOWED_TYPES[actualMimeType as keyof typeof this.ALLOWED_TYPES]) {
        return {
          isValid: false,
          error: `Tipo de arquivo não permitido: ${actualMimeType}`,
          detectedMimeType: actualMimeType
        };
      }

      // Validar extensão
      const extension = this.getFileExtension(fileName);
      const allowedExtensions = this.ALLOWED_TYPES[actualMimeType as keyof typeof this.ALLOWED_TYPES].extensions;
      
      if (!allowedExtensions.includes(extension)) {
        return {
          isValid: false,
          error: `Extensão não permitida para ${actualMimeType}. Permitidas: ${allowedExtensions.join(', ')}`,
          detectedMimeType: actualMimeType
        };
      }

      // Validar tamanho
      const maxSize = this.ALLOWED_TYPES[actualMimeType as keyof typeof this.ALLOWED_TYPES].maxSize;
      if (buffer.length > maxSize) {
        return {
          isValid: false,
          error: `Arquivo muito grande. Máximo: ${this.formatBytes(maxSize)}`,
          detectedMimeType: actualMimeType
        };
      }

      // Validações específicas por tipo
      const specificValidation = await this.validateSpecificType(buffer, actualMimeType);
      if (!specificValidation.isValid) {
        return specificValidation;
      }

      // Gerar nome normalizado
      const normalizedName = this.normalizeFileName(fileName);
      const checksum = this.generateChecksum(buffer);
      const category = this.getCategoryFromMimeType(actualMimeType);

      return {
        isValid: true,
        normalizedName,
        detectedMimeType: actualMimeType,
        size: buffer.length,
        checksum,
        category
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  private static async validateSpecificType(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ isValid: boolean; error?: string }> {
    switch (mimeType) {
      case 'application/pdf':
        return this.validatePDF(buffer);
      case 'image/jpeg':
        return this.validateJPEG(buffer);
      case 'audio/ogg':
        return this.validateOGG(buffer);
      case 'application/xml':
      case 'text/xml':
        return this.validateXML(buffer);
      case 'video/mp4':
        return this.validateMP4(buffer);
      default:
        return { isValid: true };
    }
  }

  private static validatePDF(buffer: Buffer): { isValid: boolean; error?: string } {
    // Verificar assinatura PDF
    const pdfSignature = buffer.slice(0, 4).toString();
    if (pdfSignature !== '%PDF') {
      return {
        isValid: false,
        error: 'Arquivo não é um PDF válido'
      };
    }
    return { isValid: true };
  }

  private static validateJPEG(buffer: Buffer): { isValid: boolean; error?: string } {
    // Verificar assinatura JPEG
    const jpegSignature = buffer.slice(0, 3);
    if (jpegSignature[0] !== 0xFF || jpegSignature[1] !== 0xD8 || jpegSignature[2] !== 0xFF) {
      return {
        isValid: false,
        error: 'Arquivo não é um JPEG válido'
      };
    }
    return { isValid: true };
  }

  private static validateOGG(buffer: Buffer): { isValid: boolean; error?: string } {
    // Verificar assinatura OGG
    const oggSignature = buffer.slice(0, 4).toString();
    if (oggSignature !== 'OggS') {
      return {
        isValid: false,
        error: 'Arquivo não é um OGG válido'
      };
    }
    return { isValid: true };
  }

  private static validateXML(buffer: Buffer): { isValid: boolean; error?: string } {
    // Verificar se começa com declaração XML ou elemento raiz
    const xmlStart = buffer.slice(0, 100).toString().trim();
    if (!xmlStart.startsWith('<?xml') && !xmlStart.startsWith('<')) {
      return {
        isValid: false,
        error: 'Arquivo não é um XML válido'
      };
    }
    return { isValid: true };
  }

  private static validateMP4(buffer: Buffer): { isValid: boolean; error?: string } {
    // Verificar assinatura MP4 (ftyp box)
    const mp4Signature = buffer.slice(4, 8).toString();
    if (mp4Signature !== 'ftyp') {
      return {
        isValid: false,
        error: 'Arquivo não é um MP4 válido'
      };
    }
    return { isValid: true };
  }

  private static getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  private static normalizeFileName(fileName: string): string {
    const timestamp = Date.now();
    const extension = this.getFileExtension(fileName);
    const baseName = fileName
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50); // Limitar tamanho
    
    return `${baseName}_${timestamp}${extension}`;
  }

  private static generateChecksum(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static getCategoryFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType === 'application/pdf') return 'documents/pdf';
    if (mimeType === 'application/xml' || mimeType === 'text/xml') return 'documents/xml';
    return 'documents';
  }

  static getAllowedTypes(): string[] {
    return Object.keys(this.ALLOWED_TYPES);
  }

  static getAllowedExtensions(): string[] {
    return Object.values(this.ALLOWED_TYPES)
      .flatMap(type => type.extensions)
      .sort();
  }

  static getMaxSizeForType(mimeType: string): number {
    return this.ALLOWED_TYPES[mimeType as keyof typeof this.ALLOWED_TYPES]?.maxSize || 0;
  }

  static isTypeAllowed(mimeType: string): boolean {
    return mimeType in this.ALLOWED_TYPES;
  }

  static validateFileSize(size: number, mimeType: string): { isValid: boolean; error?: string } {
    const maxSize = this.getMaxSizeForType(mimeType);
    if (maxSize === 0) {
      return {
        isValid: false,
        error: `Tipo de arquivo não permitido: ${mimeType}`
      };
    }

    if (size > maxSize) {
      return {
        isValid: false,
        error: `Arquivo muito grande. Máximo: ${this.formatBytes(maxSize)}`
      };
    }

    return { isValid: true };
  }
}