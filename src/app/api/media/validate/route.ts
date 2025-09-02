import { NextRequest, NextResponse } from 'next/server';
import { AdvancedFileValidator } from '@/services/advanced-file-validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, mimeType, size } = body;
    
    // Validar parâmetros obrigatórios
    if (!fileName || !mimeType || size === undefined) {
      return NextResponse.json(
        { 
          isValid: false, 
          error: 'Parâmetros obrigatórios ausentes: fileName, mimeType, size' 
        },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!AdvancedFileValidator.isTypeAllowed(mimeType)) {
      return NextResponse.json({
        isValid: false,
        error: `Tipo de arquivo não permitido: ${mimeType}`,
        allowedTypes: AdvancedFileValidator.getAllowedTypes(),
        allowedExtensions: AdvancedFileValidator.getAllowedExtensions()
      });
    }

    // Validar tamanho do arquivo
    const sizeValidation = AdvancedFileValidator.validateFileSize(size, mimeType);
    if (!sizeValidation.isValid) {
      return NextResponse.json({
        isValid: false,
        error: sizeValidation.error,
        maxSize: AdvancedFileValidator.getMaxSizeForType(mimeType)
      });
    }

    // Gerar nome normalizado
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const timestamp = Date.now();
    const baseName = fileName
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    const normalizedName = `${baseName}_${timestamp}${extension}`;

    // Determinar categoria
    let category = 'documents';
    if (mimeType.startsWith('image/')) category = 'images';
    else if (mimeType.startsWith('audio/')) category = 'audio';
    else if (mimeType.startsWith('video/')) category = 'videos';
    else if (mimeType === 'application/pdf') category = 'documents/pdf';
    else if (mimeType === 'application/xml' || mimeType === 'text/xml') category = 'documents/xml';

    return NextResponse.json({
      isValid: true,
      normalizedName,
      category,
      detectedMimeType: mimeType,
      maxSize: AdvancedFileValidator.getMaxSizeForType(mimeType),
      message: 'Arquivo válido'
    });
    
  } catch (error) {
    console.error('Erro na validação de arquivo:', error);
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      allowedTypes: AdvancedFileValidator.getAllowedTypes(),
      allowedExtensions: AdvancedFileValidator.getAllowedExtensions(),
      maxSizes: {
        'application/pdf': '50MB',
        'application/xml': '10MB',
        'text/xml': '10MB',
        'audio/ogg': '100MB',
        'image/jpeg': '20MB',
        'video/mp4': '500MB',
        'video/webm': '500MB',
        'video/avi': '500MB',
        'video/mov': '500MB'
      },
      categories: {
        'images': ['image/jpeg'],
        'audio': ['audio/ogg'],
        'videos': ['video/mp4', 'video/webm', 'video/avi', 'video/mov'],
        'documents/pdf': ['application/pdf'],
        'documents/xml': ['application/xml', 'text/xml']
      }
    });
  } catch (error) {
    console.error('Erro ao obter configurações de validação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}