'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Phone,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  MessageSquare,
  Target,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShoppingCart,
  AlertTriangle,
  MessageCircle,
  Mail,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AnalysisResult,
  SmartRecommendation,
  RecommendationAction
} from '@/components/crm/types';

interface AnalysisDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  onActionSelected: (action: RecommendationAction, recommendation: SmartRecommendation) => void;
  onRetryAnalysis: () => void;
}

const actionIcons = {
  call: Phone,
  proposal: FileText,
  demo: Calendar,
  follow_up: UserCheck,
  email: Mail
};

const actionLabels = {
  call: 'Ligar para Cliente',
  proposal: 'Enviar Proposta',
  demo: 'Agendar Demonstração',
  follow_up: 'Fazer Follow-up',
  email: 'Enviar Email'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
};

const sentimentColors = {
  positive: 'text-green-600 dark:text-green-400',
  neutral: 'text-gray-600 dark:text-gray-400',
  negative: 'text-red-600 dark:text-red-400'
};

const stageLabels = {
  initial_contact: 'Contato Inicial',
  information_gathering: 'Coleta de Informações',
  needs_assessment: 'Avaliação de Necessidades',
  proposal_discussion: 'Discussão de Proposta',
  negotiation: 'Negociação',
  closing: 'Fechamento',
  post_sale: 'Pós-Venda',
  support: 'Suporte'
};

export default function AnalysisDrawer({
  open,
  onOpenChange,
  analysis,
  isLoading,
  error,
  onActionSelected,
  onRetryAnalysis
}: AnalysisDrawerProps) {
  const handleActionClick = (recommendation: SmartRecommendation) => {
    onActionSelected(recommendation.action, recommendation);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Análise Inteligente da Conversa
          </SheetTitle>
          <SheetDescription>
            Insights e recomendações baseadas em IA para otimizar seu atendimento
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] px-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="text-center">
                <h3 className="font-medium text-lg">Analisando conversa...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Nossa IA está processando as mensagens para gerar insights valiosos
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div className="text-center">
                <h3 className="font-medium text-lg">Erro na análise</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
                <Button onClick={onRetryAnalysis} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}

          {analysis && !isLoading && !error && (
            <div className="space-y-6 pb-6">
              {/* Status da Conversa */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-lg">Status da Conversa</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Estágio</label>
                    <Badge variant="secondary" className="w-full justify-center">
                      {stageLabels[analysis.conversationStage] || analysis.conversationStage}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Sentimento</label>
                    <div className={cn('text-center font-medium', sentimentColors[analysis.clientSentiment])}>
                      {analysis.clientSentiment === 'positive' ? '😊 Positivo' :
                       analysis.clientSentiment === 'neutral' ? '😐 Neutro' : '😟 Negativo'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Urgência</label>
                    <Badge className={cn('w-full justify-center', priorityColors[analysis.urgencyLevel])}>
                      {analysis.urgencyLevel === 'low' ? 'Baixa' :
                       analysis.urgencyLevel === 'medium' ? 'Média' : 'Alta'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Confiança</label>
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{analysis.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Resumo da Análise */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-lg">Resumo da Análise</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">{analysis.summary}</p>
                </div>
              </div>

              <Separator />

              {/* Sinais de Compra */}
              {analysis.buyingSignals && analysis.buyingSignals.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold text-lg">Sinais de Compra Detectados</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.buyingSignals.map((signal, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-green-800 dark:text-green-200">{signal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Objeções Identificadas */}
              {analysis.objections && analysis.objections.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <h3 className="font-semibold text-lg">Objeções Identificadas</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.objections.map((objection, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-orange-800 dark:text-orange-200">{objection}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Resposta Sugerida */}
              {analysis.suggestedResponse && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold text-lg">Resposta Sugerida</h3>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <p className="text-sm leading-relaxed text-purple-800 dark:text-purple-200">
                        {analysis.suggestedResponse}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-3 border-purple-200 text-purple-700 hover:bg-purple-100"
                        onClick={() => navigator.clipboard.writeText(analysis.suggestedResponse!)}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Copiar Resposta
                      </Button>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Tópicos Principais */}
              {analysis.keyTopics.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold text-lg">Tópicos Principais</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keyTopics.map((topic, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Recomendações de Ação */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-lg">Próximas Ações Recomendadas</h3>
                </div>
                
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, index) => {
                    const Icon = actionIcons[rec.action];
                    return (
                      <div 
                        key={rec.id} 
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <Icon className="w-4 h-4 text-blue-600" />
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{rec.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge className={cn('text-xs', priorityColors[rec.priority])}>
                                  {rec.priority === 'low' ? 'Baixa' :
                                   rec.priority === 'medium' ? 'Média' : 'Alta'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {rec.confidence}%
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {rec.description}
                            </p>
                            
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {rec.timing || (rec.suggestedTiming === 'immediate' ? 'Imediato' :
                                 rec.suggestedTiming === 'within_hour' ? 'Em 1 hora' : 'Hoje')}
                              </div>
                              
                              <Button 
                                size="sm" 
                                onClick={() => handleActionClick(rec)}
                                className="h-8"
                              >
                                <Icon className="w-3 h-3 mr-1" />
                                {actionLabels[rec.action]}
                              </Button>
                            </div>
                            
                            {rec.script && (
                              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                <div className="flex items-center gap-1 mb-1">
                                  <MessageCircle className="w-3 h-3 text-blue-600" />
                                  <strong className="text-blue-800 dark:text-blue-200">Script Sugerido:</strong>
                                </div>
                                <p className="text-blue-700 dark:text-blue-300 leading-relaxed">{rec.script}</p>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="mt-2 h-6 px-2 text-xs text-blue-600 hover:bg-blue-100"
                                  onClick={() => navigator.clipboard.writeText(rec.script!)}
                                >
                                  Copiar Script
                                </Button>
                              </div>
                            )}
                            
                            {rec.reasoning && (
                              <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                                <strong>Justificativa:</strong> {rec.reasoning}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}