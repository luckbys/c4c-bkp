
import { Card } from '@/components/ui/card';
import { Inbox, Clock, User, PenSquare } from 'lucide-react';
import type { Ticket } from '@/components/crm/types';
import { cn } from '@/lib/utils';

interface StatusCardsProps {
  tickets: Ticket[];
}

const statusIcons: Record<string, React.ReactElement> = {
  Pendentes: <Inbox className="h-5 w-5" />,
  'Aguardando cliente': <Clock className="h-5 w-5" />,
  'Não Atribuídos': <User className="h-5 w-5" />,
  Responsável: <PenSquare className="h-5 w-5" />,
};

const statusColors: Record<string, string> = {
  Pendentes: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
  'Aguardando cliente': 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'Não Atribuídos': 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  Responsável: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400',
};

export default function StatusCards({ tickets }: StatusCardsProps) {
  const counts = {
    Pendentes: tickets.filter(t => t.status === 'Pendente').length,
    'Aguardando cliente': tickets.filter(t => t.status === 'Aguardando').length,
    'Não Atribuídos': tickets.filter(t => t.status === 'Não Atribuído').length,
  };

  const cardData = [
    { title: 'Pendentes', value: counts.Pendentes },
    { title: 'Aguardando cliente', value: counts['Aguardando cliente'] },
    { title: 'Não Atribuídos', value: counts['Não Atribuídos'] },
    { title: 'Responsável', value: 'Minhas Conversas', isText: true },
  ];

  return (
    <div className="max-w-[1600px] w-full mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cardData.map((card) => (
        <Card key={card.title} className="p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow bg-card">
          <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
              statusColors[card.title]
          )}>
            {statusIcons[card.title]}
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{card.title}</div>
            <div className={cn("font-bold", card.isText ? 'text-base' : 'text-2xl')}>{card.value}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
