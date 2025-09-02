'use client';

import React, { useState } from 'react';
import { Copy, Check, MessageCircle, Sparkles } from 'lucide-react';
import { AnalysisResult } from './types';

interface ResponseSuggestionsProps {
  analysis: AnalysisResult | null;
  onSendResponse?: (response: string) => void;
}

const ResponseSuggestions: React.FC<ResponseSuggestionsProps> = ({ 
  analysis, 
  onSendResponse 
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!analysis?.suggestedResponse) {
    return null;
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  const handleSendResponse = (response: string) => {
    if (onSendResponse) {
      onSendResponse(response);
    }
  };

  // Gerar variações da resposta sugerida baseadas no contexto
  const generateResponseVariations = (baseResponse: string) => {
    const variations = [baseResponse];
    
    // Variação mais formal
    if (analysis.clientSentiment === 'negative') {
      variations.push(
        `Entendo sua preocupação. ${baseResponse} Estou aqui para ajudar a resolver qualquer questão.`
      );
    }
    
    // Variação mais casual
    if (analysis.clientSentiment === 'positive') {
      variations.push(
        `Ótimo! ${baseResponse} Vamos continuar com o próximo passo! 😊`
      );
    }
    
    // Variação urgente
    if (analysis.urgencyLevel === 'high') {
      variations.push(
        `${baseResponse} Posso agendar uma conversa ainda hoje para resolvermos isso rapidamente?`
      );
    }
    
    return variations.slice(0, 3); // Máximo 3 variações
  };

  const responseVariations = generateResponseVariations(analysis.suggestedResponse);

  const getSentimentColor = () => {
    switch (analysis.clientSentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getUrgencyColor = () => {
    switch (analysis.urgencyLevel) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Sugestões de Resposta
        </h3>
        <div className="flex gap-2 ml-auto">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor()}`}>
            {analysis.urgencyLevel === 'high' ? 'Alta Urgência' : 
             analysis.urgencyLevel === 'medium' ? 'Média Urgência' : 'Baixa Urgência'}
          </span>
          <span className={`text-xs font-medium ${getSentimentColor()}`}>
            {analysis.clientSentiment === 'positive' ? '😊 Positivo' :
             analysis.clientSentiment === 'negative' ? '😟 Negativo' : '😐 Neutro'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {responseVariations.map((response, index) => (
          <div 
            key={index}
            className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {index === 0 ? 'Resposta Principal' :
                     index === 1 ? 'Variação Contextual' : 'Variação Alternativa'}
                  </span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {response}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(response, index)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copiar resposta"
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                
                {onSendResponse && (
                  <button
                    onClick={() => handleSendResponse(response)}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Enviar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {analysis.confidence && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Confiança da Análise:</span>
            <span className="font-medium text-gray-900">{analysis.confidence}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysis.confidence}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseSuggestions;