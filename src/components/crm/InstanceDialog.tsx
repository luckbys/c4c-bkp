
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateInstanceData, Instance } from './types';
import { createInstanceAction, getInstanceStatusAction } from '@/app/instancias/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface InstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddInstance: (instance: Instance) => void;
  onInstanceConnected?: () => void;
}

export function InstanceDialog({ open, onOpenChange, onAddInstance, onInstanceConnected }: InstanceDialogProps) {
  const [name, setName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPolling, setIsPolling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const { toast } = useToast();
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  // Function to validate and clean base64 string
  const validateAndCleanBase64 = (base64String: string): string | null => {
    try {
      // Remove any whitespace and newlines
      const cleaned = base64String.replace(/\s/g, '');
      
      // Check if it's already a data URL
      if (cleaned.startsWith('data:')) {
        return cleaned;
      }
      
      // Remove any existing data URL prefix that might be incomplete
      const base64Only = cleaned.replace(/^data:image\/[^;]+;base64,/, '');
      
      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64Only)) {
        console.error('Invalid base64 format');
        return null;
      }
      
      // Try to decode to validate
      atob(base64Only);
      
      return `data:image/png;base64,${base64Only}`;
    } catch (error) {
      console.error('Error validating base64:', error);
      return null;
    }
  };

  const resetForm = () => {
    setName('');
    setIsLoading(false);
    setIsPolling(false);
    setQrCode(null);
    setError(null);
    // Clear any pending polling timeouts
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const pollForConnection = async (instanceName: string, attempts = 0) => {
    const maxAttempts = 60; // Poll for up to 3 minutes (3s intervals)
    
    if (attempts >= maxAttempts) {
       setIsLoading(false);
       setIsPolling(false);
       toast({
         title: "Timeout",
         description: "Tempo limite para conexão excedido. Tente novamente.",
         variant: "destructive"
       });
       return;
     }

    try {
      const statusResult = await getInstanceStatusAction(instanceName);
      
      if (statusResult.success && statusResult.data) {
        const statusData = statusResult.data;
        
        console.log(`Polling attempt ${attempts + 1}: Status data:`, JSON.stringify(statusData, null, 2));
        
        // Check multiple possible connection indicators
        const isConnected = statusData.instance?.state === 'open' || 
                           statusData.state === 'open' ||
                           statusData.instance?.status === 'connected' ||
                           statusData.status === 'connected' ||
                           statusData.instance?.connectionStatus === 'open' ||
                           statusData.connectionStatus === 'open';
        
        if (isConnected) {
          setIsLoading(false);
          setIsPolling(false);
          setQrCode(null);
          toast({
            title: "WhatsApp Conectado!",
            description: `Instância "${instanceName}" conectada com sucesso.`,
          });
          // Notify parent component to refresh instances
          if (onInstanceConnected) {
            onInstanceConnected();
          }
          handleOpenChange(false);
          return;
        }
      }
      
      // Wait 3 seconds before next attempt
       pollingTimeoutRef.current = setTimeout(() => {
         pollForConnection(instanceName, attempts + 1);
       }, 3000);
      
    } catch (error) {
       console.error('Error polling for connection:', error);
       // Continue polling even on errors, as the connection might still happen
        pollingTimeoutRef.current = setTimeout(() => {
          pollForConnection(instanceName, attempts + 1);
        }, 3000);
     }
  };

  const pollForQrCode = async (instanceName: string, instance: Instance, attempts = 0) => {
    const maxAttempts = 10; // Poll for up to 30 seconds (3s intervals)
    
    if (attempts >= maxAttempts) {
       setIsLoading(false);
       setIsPolling(false);
       toast({
         title: "Sucesso!",
         description: `Instância "${instanceName}" criada. QR Code não disponível no momento.`,
       });
       handleOpenChange(false);
       return;
     }

    try {
      const statusResult = await getInstanceStatusAction(instanceName);
      
      if (statusResult.success && statusResult.data) {
        const statusData = statusResult.data;
        
        // Try to find QR code in status response
        let qrCodeBase64 = statusData.qrcode?.base64 || 
                          statusData.qrcode?.code || 
                          statusData.qr || 
                          statusData.base64 ||
                          statusData.qrCode ||
                          statusData.code;
                          
        if (!qrCodeBase64 && statusData.instance) {
          qrCodeBase64 = statusData.instance.qrcode?.base64 ||
                        statusData.instance.qrcode?.code ||
                        statusData.instance.qr ||
                        statusData.instance.base64;
        }
        
        if (qrCodeBase64) {
           setQrCode(qrCodeBase64);
           setIsLoading(false);
           setIsPolling(false);
           toast({
             title: "QR Code Gerado!",
             description: "Escaneie o código com seu WhatsApp.",
           });
           // Start polling for connection after QR code is displayed
           pollForConnection(instanceName);
           return;
         }
      }
      
      // Wait 3 seconds before next attempt
      pollingTimeoutRef.current = setTimeout(() => {
        pollForQrCode(instanceName, instance, attempts + 1);
      }, 3000);
      
    } catch (error) {
       console.error('Error polling for QR code:', error);
       setIsLoading(false);
       setIsPolling(false);
       toast({
         title: "Sucesso!",
         description: `Instância "${instanceName}" criada. Erro ao obter QR Code.`,
       });
       handleOpenChange(false);
     }
  };

  const handleSubmit = async () => {
    if (name) {
        setIsLoading(true);
        setQrCode(null);
        setError(null);

        const result = await createInstanceAction({ instanceName: name });
        
        if (result.success && result.data) {
            const instanceData = result.data;
            
            // Debug: Log the received data structure
            console.log('Received instanceData:', JSON.stringify(instanceData, null, 2));
            
            const newInstance: Instance = {
                id: instanceData.instance?.instanceName || name,
                name: name,
                apiKey: '**********',
                status: 'pending',
                instance: instanceData,
            };

            // Try to extract QR code from various possible locations
            let extractedQrCode = null;
            
            console.log('=== QR CODE DEBUG ===');
            console.log('Full instanceData:', JSON.stringify(instanceData, null, 2));
            console.log('Checking instanceData.qrcode?.base64:', instanceData.qrcode?.base64);
            console.log('Checking instanceData.qrcode?.code:', instanceData.qrcode?.code);
            console.log('Checking instanceData.qr:', instanceData.qr);
            console.log('Checking instanceData.base64:', instanceData.base64);
            console.log('Checking instanceData.qrCode:', instanceData.qrCode);
            console.log('Checking instanceData.code:', instanceData.code);
            console.log('Checking instanceData.instance?.qrcode:', instanceData.instance?.qrcode);
            console.log('Checking instanceData.instance?.qr:', instanceData.instance?.qr);
            console.log('Checking instanceData.instance?.base64:', instanceData.instance?.base64);
            
            // Try multiple possible locations for the QR code
            let qrCodeBase64 = instanceData.qrcode?.base64 || 
                              instanceData.qrcode?.code || 
                              instanceData.qr || 
                              instanceData.base64 ||
                              instanceData.qrCode ||
                              instanceData.code;
                              
            // If still no QR code found, check nested structures
            if (!qrCodeBase64 && instanceData.instance) {
                qrCodeBase64 = instanceData.instance.qrcode?.base64 ||
                              instanceData.instance.qrcode?.code ||
                              instanceData.instance.qr ||
                              instanceData.instance.base64;
            }
            
            if (qrCodeBase64) {
              console.log('=== QR CODE FOUND ===');
              console.log('Raw QR Code length:', qrCodeBase64.length);
              console.log('Raw QR Code starts with:', qrCodeBase64.substring(0, 50));
              console.log('Raw QR Code ends with:', qrCodeBase64.substring(qrCodeBase64.length - 50));
              
              const validatedQrCode = validateAndCleanBase64(qrCodeBase64);
              console.log('Validated QR Code:', validatedQrCode ? 'Valid' : 'Invalid');
              
              if (validatedQrCode) {
                setQrCode(validatedQrCode);
                toast({
                    title: "Escaneie o QR Code",
                    description: "Abra o WhatsApp em seu celular para conectar.",
                });
                setIsLoading(false);
                setIsPolling(true);
                // Start polling for connection after QR code is displayed
                pollForConnection(name);
              } else {
                console.error('Failed to validate QR code');
                setIsLoading(false);
                toast({
                  title: "Erro!",
                  description: "QR Code inválido recebido.",
                  variant: "destructive"
                });
              }
            } else {
              // If no QR code found, try polling for it
              console.log('No QR code found immediately, starting polling...');
              setIsPolling(true);
              pollForQrCode(name, newInstance);
            }
            onAddInstance(newInstance);
            // Don't close the dialog if QR code is shown or we're polling
            if (!qrCodeBase64) {
                // Keep dialog open while polling
            }
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{qrCode ? 'Conectar Instância' : 'Adicionar Nova Instância'}</DialogTitle>
          <DialogDescription>
             {qrCode ? 'Escaneie o código com seu WhatsApp.' : 'Conecte uma nova instância da Evolution API.'}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading && (
            <div className="flex items-center justify-center p-8">
                <Loader className="h-8 w-8 animate-spin" />
                <p className="ml-2">{isPolling ? 'Aguardando QR Code...' : 'Criando instância...'}</p>
            </div>
        )}

        {error && !isLoading && (
           <Alert variant="destructive">
            <AlertTitle>Erro ao criar instância</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {qrCode && !isLoading && (
            <div className="flex flex-col items-center justify-center p-4">
                <img 
                    src={qrCode} 
                    alt="QR Code" 
                    width={250} 
                    height={250} 
                    className="rounded-lg border p-1" 
                    style={{ maxWidth: '250px', maxHeight: '250px' }}
                    onError={(e) => {
                      console.error('Error loading QR code image:', e);
                      console.log('QR code src:', qrCode);
                    }}
                />
                {isPolling && (
                     <div className="flex items-center mt-4 text-sm text-muted-foreground">
                         <Loader className="h-4 w-4 animate-spin mr-2" />
                         <span>Aguardando conexão...</span>
                     </div>
                 )}
            </div>
        )}

        {!qrCode && !isLoading && (
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Nome
                    </Label>
                    <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                    placeholder="Ex: Loja Principal"
                    />
                </div>
            </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            {qrCode ? 'Fechar' : 'Cancelar'}
          </Button>
          {!qrCode && (
            <Button type="submit" onClick={handleSubmit} disabled={!name || isLoading}>
              {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar e Conectar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
