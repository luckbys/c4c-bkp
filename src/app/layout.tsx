import type {Metadata} from 'next';
import './globals.css';
import Providers from "@/components/Providers";

// Importar inicialização automática do servidor
import '@/lib/server-startup';

export const metadata: Metadata = {
  title: 'WhatsApp CRM',
  description: 'CRM para Atendimento no WhatsApp',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
