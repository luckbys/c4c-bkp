'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ExternalLink, Info, Loader, Network, ShoppingCart, User, Wand2, X } from 'lucide-react';
import { summarizeChatHistoryAction } from '@/app/actions';
import type { Ticket } from '@/components/crm/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClientDataDialog } from '@/components/crm/ClientDataDialog';
import { ClientHistoryDialog } from '@/components/crm/ClientHistoryDialog';
import { QuoteDialog } from '@/components/crm/QuoteDialog';
import { TicketInsightsDialog } from '@/components/crm/TicketInsightsDialog';

interface ClientDataProps {
  ticket: Ticket;
  clientTickets: Ticket[];
}

export default function ClientData({ ticket, clientTickets }: ClientDataProps) {
  const [summary, setSummary] = React.useState('');
  const [relevantInfo, setRelevantInfo] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isClientDataOpen, setIsClientDataOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = React.useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = React.useState(false);

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    setSummary('');
    setRelevantInfo('');

    const chatHistory = ticket.messages
      .map(msg => `${msg.sender}: ${msg.text}`)
      .join('\n');
    
    const result = await summarizeChatHistoryAction({ chatHistory });

    if (result.success) {
      setSummary(result.data.summary);
      setRelevantInfo(result.data.relevantInformation);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };
  
  React.useEffect(() => {
    setSummary('');
    setRelevantInfo('');
    setError(null);
    setIsLoading(false);
  }, [ticket.id]);

  const actions = [
    { label: 'Ver todos os dados do cliente', icon: <User className="mr-2 h-4 w-4" />, onClick: () => setIsClientDataOpen(true) },
    { label: 'Ver Histórico', icon: <Clock className="mr-2 h-4 w-4" />, onClick: () => setIsHistoryOpen(true) },
    { label: 'Ordem de Processo', icon: <Network className="mr-2 h-4 w-4" /> },
    { label: 'Orçamento', icon: <ShoppingCart className="mr-2 h-4 w-4" />, onClick: () => setIsQuoteOpen(true) },
    { label: 'Detalhes do Ticket com IA', icon: <Info className="mr-2 h-4 w-4" />, onClick: () => setIsInsightsOpen(true) },
    { label: 'Gestor', icon: <ExternalLink className="mr-2 h-4 w-4" /> },
  ];

  return (
    <>
      <Card className="p-3 bg-background">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Dados do Cliente</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <Button onClick={handleSummarize} disabled={isLoading} className="w-full mb-3 bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300">
          {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Obter Resumo com IA
        </Button>

        {isLoading && <p className="text-muted-foreground text-sm text-center">Analisando histórico...</p>}
        
        {error && <Alert variant="destructive"><AlertTitle>Erro</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        {summary && (
          <Alert className="mb-2">
            <AlertTitle className="font-semibold">Resumo da Conversa</AlertTitle>
            <AlertDescription>{summary}</AlertDescription>
          </Alert>
        )}

        {relevantInfo && (
          <Alert>
            <AlertTitle className="font-semibold">Informação Relevante</AlertTitle>
            <AlertDescription>{relevantInfo}</AlertDescription>
          </Alert>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          {actions.map(action => (
            <Button key={action.label} variant="outline" className="justify-start" onClick={action.onClick} disabled={!action.onClick}>
              {action.icon} {action.label}
            </Button>
          ))}
        </div>
      </Card>
      <ClientDataDialog open={isClientDataOpen} onOpenChange={setIsClientDataOpen} client={ticket.client} />
      <ClientHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} client={ticket.client} tickets={clientTickets} />
      <QuoteDialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen} client={ticket.client} />
      <TicketInsightsDialog open={isInsightsOpen} onOpenChange={setIsInsightsOpen} ticket={ticket} />
    </>
  );
}
