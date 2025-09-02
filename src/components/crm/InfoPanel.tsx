
import { Card } from '@/components/ui/card';
import ClientData from '@/components/crm/ClientData';
import { UpcomingEvents } from '@/components/crm/UpcomingEvents';
import type { Ticket } from '@/components/crm/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InfoPanelProps {
  ticket: Ticket;
  clientTickets: Ticket[];
  onCreateEvent?: () => void;
}

const queues = [
  { name: 'NfeSistemas', open: 0, total: 0 },
  { name: 'Suporte Geral', open: 0, total: 0 },
  { name: 'Frenty', open: 0, total: 0 },
  { name: 'Whats4 / AceleraSoft', open: 0, total: 0 },
];

export default function InfoPanel({ ticket, clientTickets, onCreateEvent }: InfoPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4">
        <UpcomingEvents 
          ticket={ticket}
          onCreateEvent={onCreateEvent}
          maxEvents={3}
          showCreateButton={true}
        />
        
        <Card className="p-3 bg-background">
          <h3 className="font-semibold mb-2">Filas / Canais</h3>
          <ul className="text-sm divide-y divide-border">
            {queues.map((q) => (
              <li key={q.name} className="flex justify-between py-1">
                <span>{q.name}</span>
                <span className="text-muted-foreground">{q.open}/{q.total}</span>
              </li>
            ))}
          </ul>
        </Card>
        
        <ClientData ticket={ticket} clientTickets={clientTickets} />
      </div>
    </ScrollArea>
  );
}
