'use client';

import { useState } from 'react';

export default function TestMediaPage() {
  const [formData, setFormData] = useState({
    instanceName: 'loja',
    remoteJid: '',
    mediaType: 'image' as 'image' | 'video' | 'audio' | 'document',
    mediaUrl: '',
    fileName: '',
    caption: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log('📤 Enviando dados:', formData);
      
      const response = await fetch('/api/send-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult(data);
        console.log('✅ Mídia enviada com sucesso:', data);
      } else {
        setError(`Erro ${response.status}: ${JSON.stringify(data, null, 2)}`);
        console.error('❌ Erro ao enviar mídia:', data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro de conexão: ${errorMessage}`);
      console.error('❌ Erro de conexão:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-detectar tipo de mídia baseado na extensão do arquivo
    if (name === 'fileName') {
      const fileName = value.toLowerCase();
      let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document';
      
      if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png') || fileName.includes('.gif') || fileName.includes('.webp')) {
        mediaType = 'image';
      } else if (fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.avi') || fileName.includes('.mov')) {
        mediaType = 'video';
      } else if (fileName.includes('.mp3') || fileName.includes('.ogg') || fileName.includes('.wav')) {
        mediaType = 'audio';
      }
      
      setFormData(prev => ({ ...prev, mediaType }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            🚀 Teste - Envio de Mídia Evolution API
          </h1>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Documentação:</strong>{' '}
              <a 
                href="https://doc.evolution-api.com/v2/api-reference/message-controller/send-media" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Evolution API - Send Media
              </a>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Esta página testa a implementação corrigida que usa os campos: <code>number</code>, <code>mediatype</code>, <code>mimetype</code>, <code>media</code>, <code>fileName</code>, <code>caption</code>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="instanceName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Instância
              </label>
              <input
                type="text"
                id="instanceName"
                name="instanceName"
                value={formData.instanceName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Nome da instância do WhatsApp configurada</p>
            </div>

            <div>
              <label htmlFor="remoteJid" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Destino
              </label>
              <input
                type="text"
                id="remoteJid"
                name="remoteJid"
                value={formData.remoteJid}
                onChange={handleInputChange}
                placeholder="5511999999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Número do WhatsApp (com código do país, sem +)</p>
            </div>

            <div>
              <label htmlFor="mediaType" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Mídia
              </label>
              <select
                id="mediaType"
                name="mediaType"
                value={formData.mediaType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
                <option value="document">Documento</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Tipo de mídia conforme documentação da Evolution API</p>
            </div>

            <div>
              <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 mb-2">
                URL da Mídia
              </label>
              <input
                type="url"
                id="mediaUrl"
                name="mediaUrl"
                value={formData.mediaUrl}
                onChange={handleInputChange}
                placeholder="https://exemplo.com/arquivo.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">URL pública do arquivo ou dados em base64</p>
            </div>

            <div>
              <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Arquivo
              </label>
              <input
                type="text"
                id="fileName"
                name="fileName"
                value={formData.fileName}
                onChange={handleInputChange}
                placeholder="imagem.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Nome do arquivo com extensão (auto-detecta tipo de mídia)</p>
            </div>

            <div>
              <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                Legenda (Opcional)
              </label>
              <textarea
                id="caption"
                name="caption"
                value={formData.caption}
                onChange={handleInputChange}
                rows={3}
                placeholder="Legenda da mídia..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Texto que acompanha a mídia (opcional)</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
              }`}
            >
              {isLoading ? '⏳ Enviando...' : '📤 Enviar Mídia'}
            </button>
          </form>

          {/* Resultado */}
          {result && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Mídia enviada com sucesso!</h3>
              <pre className="text-sm text-green-700 bg-green-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Erro ao enviar mídia</h3>
              <pre className="text-sm text-red-700 bg-red-100 p-3 rounded overflow-x-auto">
                {error}
              </pre>
            </div>
          )}

          {/* Dados que serão enviados */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Dados que serão enviados:</h3>
            <pre className="text-sm text-blue-700 bg-blue-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}