
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
import type { Client } from '@/components/crm/types';
import { Building, Fingerprint, Phone, User } from 'lucide-react';

interface ClientDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function ClientDataDialog({ open, onOpenChange, client }: ClientDataDialogProps) {
  const clientInfo = [
    { icon: <User className="h-4 w-4 text-muted-foreground" />, label: 'Nome', value: client.name },
    { icon: <Building className="h-4 w-4 text-muted-foreground" />, label: 'Empresa', value: client.company || 'N/A' },
    { icon: <Fingerprint className="h-4 w-4 text-muted-foreground" />, label: 'CNPJ', value: client.cnpj },
    { icon: <Phone className="h-4 w-4 text-muted-foreground" />, label: 'Telefone', value: client.phone },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dados do Cliente</DialogTitle>
          <DialogDescription>
            Informações detalhadas sobre o cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center pt-4">
          <Avatar className="w-24 h-24 border-4 border-slate-200 dark:border-slate-700">
            <AvatarImage src={client.avatar} alt={client.name} />
            <AvatarFallback className="text-3xl">{client.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-3 py-4">
          {clientInfo.map(info => (
            <div key={info.label} className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0">{info.icon}</div>
              <div className="flex-grow">
                <p className="text-muted-foreground">{info.label}</p>
                <p className="font-semibold text-foreground">{info.value}</p>
              </div>
            </div>
          ))}
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
