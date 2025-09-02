
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Client, Ticket } from '@/components/crm/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface ClientHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  tickets: Ticket[];
}

const statusStyles: { [key: string]: string } = {
  Pendente: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800',
  Aguardando: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'Em Atendimento': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
  Resolvido: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
  'Não Atribuído': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};


export function ClientHistoryDialog({ open, onOpenChange, client, tickets }: ClientHistoryDialogProps) {
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <div className="flex items-center gap-4">
             <Avatar className="w-12 h-12 border-2 border-slate-200 dark:border-slate-700">
                <AvatarImage src={client.avatar} alt={client.name} />
                <AvatarFallback className="text-xl">{client.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <DialogTitle>Histórico de {client.name}</DialogTitle>
                <DialogDescription>
                    {tickets.length} ticket(s) encontrados para este cliente.
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[400px] mt-4 pr-6">
            <div className="space-y-4">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="p-4 rounded-lg border bg-background">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold">Ticket #{ticket.id}</p>
                                <p className="text-sm text-muted-foreground">{ticket.timestamp}</p>
                            </div>
                            <Badge variant="outline" className={cn('text-xs', statusStyles[ticket.status])}>{ticket.status}</Badge>
                        </div>
                        <div className="mt-2 text-sm text-foreground">
                            <p className="font-medium">Última mensagem:</p>
                            <p className="italic">"{ticket.lastMessage}"</p>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
