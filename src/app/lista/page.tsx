
'use client';

import * as React from 'react';
import TicketList from '@/components/crm/TicketList';
import type { Ticket } from '@/components/crm/types';
import CrmLayout from '@/components/crm/CrmLayout';

const mockTickets: Ticket[] = [
  {
    id: '102226',
    client: {
      name: 'SANDRA REGINA LOPES 24864513821',
      company: 'Deposito Paulinho',
      cnpj: '01.879.762/0001-72',
      phone: '(12) 97408-1322',
      avatar: 'https://i.pravatar.cc/40?img=3',
    },
    status: 'Pendente',
    channel: 'WhatsApp',
    lastMessage: 'os orçamentos',
    timestamp: '11:20:34',
    unread: true,
    messages: [
      { id: '543708', sender: 'Cliente', text: 'Olá, poderia verificar a NFE 22417?\nPreciso do desdobramento no boleto conforme combinado.', timestamp: '12/08/2025 17:21:08' },
      { id: '544432', sender: 'Cliente', text: 'NFE 22417-VALOR R$1065,95\nDesdobramento no boleto: 22417A/22417B\nVencimentos 20/08 e 05/09.\nObrigada.', timestamp: '14/08/2025 10:10:29' },
      { id: '544435', sender: 'Lucas', text: 'Perfeito, vou providenciar e retorno aqui.', timestamp: '14/08/2025 10:12:00' },
      { id: '544445', sender: 'Cliente', text: 'NFE 22417-VALOR R$1065,95\nDesdobramento no boleto: 22417A/22417B\nVencimentos 20/08 e 05/09.\nObrigada.', timestamp: '14/08/2025 10:10:29' },
    ],
  },
  {
    id: '102203',
    client: {
      name: 'COMERCIAL SALU SJCAMPOS LTDA - ME',
      company: 'LUCIMARA DE PAULA FERREIRA LEITE',
      cnpj: 'N/A',
      phone: '(12) 98152-5194',
      avatar: 'https://i.pravatar.cc/40?img=5'
    },
    status: 'Pendente',
    channel: 'WhatsApp',
    lastMessage: 'NFe / NFC-e / NFS-e',
    timestamp: '10:51:27',
    unread: false,
    messages: [
       { id: '1', sender: 'Cliente', text: 'Bom dia, preciso de ajuda com a emissão de NFe.', timestamp: '14/08/2025 10:51:27' },
    ],
  },
  {
    id: '102166',
    client: {
      name: 'ELETROCODEX COMERCIO DE MATERIAL ELETRONICO LTDA EPP',
      company: '',
      cnpj: 'N/A',
      phone: '(12) 97401-2635',
      avatar: 'https://i.pravatar.cc/40?img=7'
    },
    status: 'Aguardando',
    channel: 'WhatsApp',
    lastMessage: 'Assunto longo da última mensagem com preview automático…',
    timestamp: 'Ontem',
    unread: false,
    messages: [
       { id: '1', sender: 'Cliente', text: 'Assunto longo da última mensagem com preview automático…', timestamp: '13/08/2025 15:30:00' },
       { id: '2', sender: 'Lucas', text: 'Recebido. Estamos verificando.', timestamp: '13/08/2025 15:32:10' },
    ],
  },
];


export default function ListaPage() {
    const [tickets] = React.useState<Ticket[]>(mockTickets);
    const [selectedTicketId, setSelectedTicketId] = React.useState<string>('');

    return (
        <CrmLayout>
            <div className="h-full bg-background text-foreground flex flex-col">
                <main className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 p-8">
                        <h1 className="text-2xl font-bold mb-4">Lista de Atendimentos</h1>
                        <div className="h-full overflow-hidden">
                            <TicketList tickets={tickets} selectedTicketId={selectedTicketId} onSelectTicket={setSelectedTicketId} />
                        </div>
                    </div>
                </main>
            </div>
        </CrmLayout>
    );
}
