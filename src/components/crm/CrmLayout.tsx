
'use client';

import * as React from 'react';
import { useState } from 'react';
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarProvider } from '@/components/ui/sidebar';
import { Settings, Bot, Share2, BookOpen, Building2, Calendar, Plus } from 'lucide-react';
import Header from '@/components/crm/Header';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/crm/Logo';
import { Toaster } from '@/components/ui/toaster';
import { ConnectivityStatus } from '@/components/ui/connectivity-status';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import NewTicketModal from '@/components/crm/NewTicketModal';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

    const handleTicketCreated = (ticketId: string) => {
        console.log('New ticket created:', ticketId);
        // Aqui você pode adicionar lógica para atualizar a lista de tickets
        // ou navegar para o novo ticket
    };

    const navItems = [
        { href: '/agenda', label: 'Agenda', icon: <Calendar /> },
        { href: '/agentes', label: 'Agentes', icon: <Bot /> },
        { href: '/instancias', label: 'Conexões', icon: <Share2 /> },
        { href: '/knowledge-base', label: 'Knowledge Base', icon: <BookOpen /> },
        { href: '/configuracao-empresa', label: 'Configuração da Empresa', icon: <Building2 /> },
    ];
    
    return (
        <SidebarProvider defaultOpen={false}>
            <div className="flex h-screen w-full bg-background">
                <Sidebar collapsible="icon">
                    <SidebarHeader>
                        <div className="flex flex-col items-center gap-3">
                            <Logo />
                            <button 
                                onClick={() => setIsNewTicketModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors shadow-md group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
                                title="Adicionar Ticket"
                            >
                                <Plus className="h-5 w-5 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
                            </button>
                        </div>
                    </SidebarHeader>
                    <SidebarContent className="flex flex-col justify-between">
                        <SidebarMenu>
                            {navItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <Link href={item.href} className='w-full'>
                                    <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                        <div className="flex flex-col gap-2">
                            <div className="px-3 py-2 border-t border-sidebar-border">
                                <div className="flex justify-center">
                                    <ThemeToggle />
                                </div>
                            </div>
                        </div>
                    </SidebarContent>
                </Sidebar>
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    
                    {/* Status de conectividade */}
                    <div className="px-6 pt-2">
                        <ConnectivityStatus className="mb-0" />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
            <Toaster />
            
            <NewTicketModal
                isOpen={isNewTicketModalOpen}
                onClose={() => setIsNewTicketModalOpen(false)}
                onTicketCreated={handleTicketCreated}
            />
        </SidebarProvider>
    );
}
