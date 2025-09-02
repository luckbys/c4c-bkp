
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Ticket } from '@/components/crm/types';
import { getTicketInsightsAction } from '@/app/actions';
import { Loader, MessageCircle, Smile, ThumbsUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface TicketInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
}

interface Insights {
    summary: string;
    sentiment: 'Positivo' | 'Negativo' | 'Neutro';
    nextBestAction: string;
}

const sentimentConfig = {
    'Positivo': { icon: <Smile className="h-5 w-5 text-green-600" />, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    'Neutro': { icon: <MessageCircle className="h-5 w-5 text-slate-600" />, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
    'Negativo': { icon: <Smile className="h-5 w-5 text-red-600 rotate-180" />, color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' }
}

export function TicketInsightsDialog({ open, onOpenChange, ticket }: TicketInsightsDialogProps) {
  const [insights, setInsights] = React.useState<Insights | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      handleGetInsights();
    } else {
      // Reset state when dialog is closed
      setInsights(null);
      setIsLoading(false);
      setError(null);
    }
  }, [open, ticket.id]);

  const handleGetInsights = async () => {
    setIsLoading(true);
    setError(null);
    
    const chatHistory = ticket.messages
      .map(msg => `${msg.sender}: ${msg.content}`)
      .join('\n');
    
    const result = await getTicketInsightsAction({ chatHistory });

    if (result.success) {
      setInsights(result.data || null);
    } else {
      setError(result.error || null);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Insights do Ticket #{ticket.id}</DialogTitle>
          <DialogDescription>
            Análise e sugestões geradas por IA.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {isLoading && (
                <div className="flex flex-col items-center justify-center h-40">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Analisando conversa...</p>
                </div>
            )}

            {error && (
                 <Alert variant="destructive">
                    <AlertTitle>Erro na Análise</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {insights && (
                <div className="space-y-5">
                    <Alert>
                        <AlertTitle className="font-semibold">Resumo da Conversa</AlertTitle>
                        <AlertDescription className="pt-1">{insights.summary}</AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-background">
                            <h4 className="font-semibold text-sm mb-2">Sentimento do Cliente</h4>
                            <div className="flex items-center gap-2">
                                <div className={cn("p-2 rounded-full", sentimentConfig[insights.sentiment].color)}>
                                   {sentimentConfig[insights.sentiment].icon}
                                </div>
                                <Badge variant="outline" className={cn(sentimentConfig[insights.sentiment].color, "border-none")}>{insights.sentiment}</Badge>
                            </div>
                        </Card>
                         <Card className="p-4 bg-background">
                            <h4 className="font-semibold text-sm mb-2">Próxima Ação Sugerida</h4>
                             <div className="flex items-center gap-2">
                                <div className="p-2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                   <ThumbsUp className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-foreground">{insights.nextBestAction}</p>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add a simple Card component for styling consistency
const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
