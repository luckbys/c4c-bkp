
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, LogOut, Settings, User, Moon, Sun, Building2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export function UserMenu() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="pl-2 pr-3 h-9 rounded-md hover:bg-slate-100 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Avatar className="w-8 h-8">
            <AvatarImage src="https://i.pravatar.cc/32?img=12" alt="Avatar de Lucas" />
            <AvatarFallback>L</AvatarFallback>
          </Avatar>
          <span className='text-slate-700 dark:text-slate-300'>Lucas</span>
          <ChevronDown className="h-4 w-4 text-xs opacity-70 text-slate-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/configuracao-empresa">
            <Building2 className="mr-2 h-4 w-4" />
            <span>Configuração da Empresa</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
         <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
