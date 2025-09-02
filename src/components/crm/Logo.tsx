
'use client';

import Image from "next/image";
import { useSidebar } from "@/components/ui/sidebar";

export default function Logo() {
    const { state } = useSidebar();
    
    return (
        <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
                <Image 
                    src="/img/logo.png" 
                    alt="Logo" 
                    width={48} 
                    height={48} 
                    className="w-full h-full object-contain"
                />
            </div>
            {state === 'expanded' && (
                <span className="text-lg font-bold text-sidebar-foreground">
                    CRM
                </span>
            )}
        </div>
    )
}
