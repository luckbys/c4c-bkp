'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { AnalysisResult } from './types';

interface QuickResponseButtonsProps {
  analysis: AnalysisResult | null;
  onSelectResponse: (response: string) => void;
}

const QuickResponseButtons: React.FC<QuickResponseButtonsProps> = ({ 
  analysis, 
  onSelectResponse 
}) => {
  if (!analysis) {
    return null;
  }

  // Gerar respostas rápidas baseadas no contexto da análise
  const generateQuickResponses = () => {
    const responses = [];
    
    // Respostas baseadas no sentimento
    if (analysis.clientSentiment === 'positive') {
      responses.push({
        text: "Ótimo! Vamos prosseguir então! 😊",
        icon: CheckCircle,
        variant: 'default' as const,
        color: 'text-green-600'
      });
    } else if (analysis.clientSentiment === 'negative') {
      responses.push({
        text: "Entendo sua preocupação. Vamos resolver isso juntos.",
        icon: AlertTriangle,
        variant: 'outline' as const,
        color: 'text-orange-600'
      });
    }
    
    // Respostas baseadas na urgência
    if (analysis.urgencyLevel === 'high') {
      responses.push({
        text: "Vou priorizar seu atendimento. Posso te ligar agora?",
        icon: Clock,
        variant: 'destructive' as const,
        color: 'text-red-600'
      });
    } else if (analysis.urgencyLevel === 'medium') {
      responses.push({
        text: "Vou verificar isso para você ainda hoje.",
        icon: Clock,
        variant: 'secondary' as const,
        color: 'text-yellow-600'
      });
    }
    
    // Respostas baseadas no estágio da conversa
    if (analysis.conversationStage === 'initial_contact') {
      responses.push({
        text: "Olá! Como posso ajudar você hoje?",
        icon: MessageCircle,
        variant: 'outline' as const,
        color: 'text-blue-600'
      });
    } else if (analysis.conversationStage === 'closing') {
      responses.push({
        text: "Perfeito! Vou preparar a proposta para você.",
        icon: CheckCircle,
        variant: 'default' as const,
        color: 'text-green-600'
      });
    }
    
    // Respostas baseadas em sinais de compra
    if (analysis.buyingSignals && analysis.buyingSignals.length > 0) {
      responses.push({
        text: "Vejo que você está interessado! Posso enviar mais detalhes?",
        icon: MessageCircle,
        variant: 'default' as const,
        color: 'text-blue-600'
      });
    }
    
    // Respostas baseadas em objeções
    if (analysis.objections && analysis.objections.length > 0) {
      responses.push({
        text: "Entendo suas dúvidas. Vamos esclarecê-las juntos.",
        icon: AlertTriangle,
        variant: 'outline' as const,
        color: 'text-orange-600'
      });
    }
    
    return responses.slice(0, 4); // Máximo 4 respostas rápidas
  };

  const quickResponses = generateQuickResponses();

  if (quickResponses.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border-t">
      <div className="w-full">
        <span className="text-xs text-gray-500 font-medium mb-2 block">
          Respostas Rápidas Sugeridas:
        </span>
      </div>
      {quickResponses.map((response, index) => {
        const IconComponent = response.icon;
        return (
          <Button
            key={index}
            variant={response.variant}
            size="sm"
            onClick={() => onSelectResponse(response.text)}
            className="text-xs h-8 flex items-center gap-1 max-w-fit"
          >
            <IconComponent className={`h-3 w-3 ${response.color}`} />
            <span className="truncate max-w-[200px]">
              {response.text}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default QuickResponseButtons;