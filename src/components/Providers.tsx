'use client';

import React from "react";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import RabbitMQProvider from "@/components/RabbitMQProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <RabbitMQProvider>
          {children}
          <Toaster />
        </RabbitMQProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}