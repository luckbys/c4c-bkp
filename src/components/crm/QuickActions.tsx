'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  ArrowRight, 
  Calendar, 
  FileText
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Ticket } from './types';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  onClick: () => void;
}

interface QuickActionsProps {
  ticket?: Ticket;
  onAction?: (action: string) => void;
  onResolve?: (ticketId: string) => void;
  onTransfer?: (ticketId: string) => void;
  onSchedule?: (ticketId: string) => void;
  onTemplate?: (ticketId: string) => void;
  className?: string;
  defaultMinimized?: boolean;
}

export default function QuickActions({ 
  ticket, 
  onAction,
  onResolve, 
  onTransfer, 
  onSchedule, 
  onTemplate,
  className,
  defaultMinimized = false
}: QuickActionsProps) {
  const quickActions: QuickAction[] = [
    {
      id: 'resolve',
      label: 'Resolver Ticket',
      icon: <CheckCircle className="w-4 h-4" />,
      shortcut: 'Ctrl+R',
      variant: 'default',
      onClick: () => {
        if (onAction) onAction('resolve');
        else if (onResolve && ticket) onResolve(ticket.id);
      }
    },
    {
      id: 'transfer',
      label: 'Transferir',
      icon: <ArrowRight className="w-4 h-4" />,
      shortcut: 'Ctrl+T',
      variant: 'outline',
      onClick: () => {
        if (onAction) onAction('transfer');
        else if (onTransfer && ticket) onTransfer(ticket.id);
      }
    },
    {
      id: 'schedule',
      label: 'Agendar Follow-up',
      icon: <Calendar className="w-4 h-4" />,
      shortcut: 'Ctrl+S',
      variant: 'outline',
      onClick: () => {
        if (onAction) onAction('schedule');
        else if (onSchedule && ticket) onSchedule(ticket.id);
      }
    },
    {
      id: 'template',
      label: 'Usar Template',
      icon: <FileText className="w-4 h-4" />,
      shortcut: 'Ctrl+M',
      variant: 'secondary',
      onClick: () => {
        if (onAction) onAction('template');
        else if (onTemplate && ticket) onTemplate(ticket.id);
      }
    }
  ];

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            if (onAction) onAction('resolve');
            else if (onResolve && ticket) onResolve(ticket.id);
            break;
          case 't':
            e.preventDefault();
            if (onAction) onAction('transfer');
            else if (onTransfer && ticket) onTransfer(ticket.id);
            break;
          case 's':
            e.preventDefault();
            if (onAction) onAction('schedule');
            else if (onSchedule && ticket) onSchedule(ticket.id);
            break;
          case 'm':
            e.preventDefault();
            if (onAction) onAction('template');
            else if (onTemplate && ticket) onTemplate(ticket.id);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ticket?.id, onAction, onResolve, onTransfer, onSchedule, onTemplate]);

  return (
    <TooltipProvider>
      <div className={cn("border rounded-lg bg-background", className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-medium text-muted-foreground">Ações Rápidas</span>
        </div>
        
        {/* Conteúdo das ações */}
        <div className="flex items-center gap-2 p-2">
          {quickActions.map((action) => (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={action.variant}
                  onClick={action.onClick}
                  className="h-8"
                >
                  {action.icon}
                  <span className="hidden sm:inline ml-1">{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{action.label} ({action.shortcut})</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}