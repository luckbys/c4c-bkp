
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/auth/UserMenu';
import { Bell, Headset, Plus, Filter, ListChecks, List } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

const viewModes = [
  { href: '/', label: 'Atendimentos', icon: ListChecks },
  { href: '/funil', label: 'Funil', icon: Filter },
  { href: '/lista', label: 'Lista', icon: List },
];

export default function Header() {
  const pathname = usePathname();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)' });
  const [previousIndex, setPreviousIndex] = useState(-1);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Atualizar posição do indicador quando a rota mudar
  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = viewModes.findIndex(mode => mode.href === pathname);
      if (activeIndex !== -1 && tabRefs.current[activeIndex] && containerRef.current) {
        const activeTab = tabRefs.current[activeIndex];
        const container = containerRef.current;
        
        if (activeTab && container) {
          const containerRect = container.getBoundingClientRect();
          const tabRect = activeTab.getBoundingClientRect();
          
          const newLeft = tabRect.left - containerRect.left;
          const newWidth = tabRect.width;
          
          // Determinar direção da animação
          const isMovingRight = previousIndex !== -1 && activeIndex > previousIndex;
          const isMovingLeft = previousIndex !== -1 && activeIndex < previousIndex;
          
          if (previousIndex === -1) {
            // Primeira vez - sem animação
            setIndicatorStyle({
              left: newLeft,
              width: newWidth,
              transition: 'none'
            });
          } else {
            // Animação fluida e suave
            setIndicatorStyle({
              left: newLeft,
              width: newWidth,
              transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)'
            });
          }
          
          // Atualizar índice anterior
          setPreviousIndex(activeIndex);
        }
      }
    };

    // Pequeno delay para garantir que o DOM foi atualizado
    const timer = setTimeout(updateIndicator, 50);
    
    // Também atualizar no resize da janela
    window.addEventListener('resize', updateIndicator);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [pathname, previousIndex]);

  return (
    <header className="sticky top-0 z-30 bg-card text-card-foreground shadow-sm border-b">
      <div className="max-w-[1600px] mx-auto">
        <div className="h-14 px-3 flex items-center gap-3">
          {/* Badge Atendimento */}
          <div className="hidden md:block">
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300">
              <Headset className="mr-2 h-4 w-4" /> Atendimento
            </Badge>
          </div>

          {/* Tabbar Central */}
          <div className="flex-1 flex justify-center">
            <div ref={containerRef} className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800 dark:to-blue-950/20 rounded-xl p-1 shadow-sm border border-slate-200/50 dark:border-slate-700/50 relative">
               {/* Indicador deslizante */}
                <div 
                   className="absolute top-1 bottom-1 bg-primary rounded-lg shadow-md z-0"
                   style={{
                     left: `${indicatorStyle.left}px`,
                     width: `${indicatorStyle.width}px`,
                     transition: indicatorStyle.transition,
                     transform: 'translate3d(0, 0, 0)', // Força aceleração de hardware
                     willChange: 'left, width', // Otimização para animações
                   }}
                 />
              
              <div className="flex items-center gap-1 relative z-10">
                {viewModes.map((mode, index) => {
                  const Icon = mode.icon;
                  const isActive = pathname === mode.href;
                  
                  return (
                    <Link 
                      key={mode.href} 
                      href={mode.href}
                      ref={(el) => {
                        tabRefs.current[index] = el;
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3 rounded-lg transition-all duration-200 hover:scale-105 relative",
                          isActive
                            ? "text-primary-foreground shadow-none bg-transparent hover:bg-transparent"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60"
                        )}
                      >
                        <Icon className="h-4 w-4 mr-1.5" />
                        <span className="text-xs font-medium hidden sm:inline">{mode.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Botões da Direita */}
          <div className="flex items-center gap-2">
            <Button variant="outline" className="relative bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900">
              <Bell className="mr-2 h-4 w-4" />
              <span className="font-semibold">0</span>
            </Button>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
