
'use client';

import * as React from 'react';
import CrmLayout from '@/components/crm/CrmLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Wifi, WifiOff, RefreshCw, QrCode, Loader, Trash2 } from 'lucide-react';
import { InstanceDialog } from '@/components/crm/InstanceDialog';
import { ManageInstanceDialog } from '@/components/crm/ManageInstanceDialog';
import type { Instance } from '@/components/crm/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { connectInstanceAction, fetchAllInstancesAction } from './actions';
import { getInstanceCustomName } from '@/lib/instance-utils';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


// Removed mockInstances - now using real data from API

const statusConfig = {
    connected: { label: 'Conectado', icon: <Wifi className="h-4 w-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    disconnected: { label: 'Desconectado', icon: <WifiOff className="h-4 w-4" />, color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
    pending: { label: 'Pendente', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' }
};

export default function InstanciasPage() {
    const [instances, setInstances] = React.useState<Instance[]>([]);
    const [isLoadingInstances, setIsLoadingInstances] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [qrCode, setQrCode] = React.useState<string | null>(null);
    const [qrInstanceName, setQrInstanceName] = React.useState('');
    const [isQrLoading, setIsQrLoading] = React.useState(false);
    const [qrError, setQrError] = React.useState<string | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = React.useState(false);
    const [selectedInstance, setSelectedInstance] = React.useState<Instance | null>(null);
    const { toast } = useToast();

    // Load instances from API on component mount
    React.useEffect(() => {
        loadInstances();
    }, []);

    const loadInstances = async () => {
        setIsLoadingInstances(true);
        try {
            const result = await fetchAllInstancesAction();
            if (result.success && result.data) {
                setInstances(result.data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar instâncias',
                    description: result.error || 'Falha ao buscar instâncias da API.',
                });
            }
        } catch (error) {
            console.error('Error loading instances:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Falha ao carregar instâncias.',
            });
        } finally {
            setIsLoadingInstances(false);
        }
    };

    const refreshInstanceStatus = async () => {
        await loadInstances();
        toast({
            title: 'Status atualizado',
            description: 'Status das instâncias foi atualizado.',
        });
    };

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

    const handleAddInstance = async (newInstance: Instance) => {
        // Add the instance to local state immediately for better UX
        setInstances(prevInstances => {
            const existing = prevInstances.find(inst => inst.name === newInstance.name);
            if (existing) {
                return prevInstances.map(inst => inst.name === newInstance.name ? {...inst, ...newInstance} : inst);
            }
            return [...prevInstances, newInstance];
        });
        
        // Reload instances from API to get the real status
        setTimeout(() => {
            loadInstances();
        }, 2000); // Wait 2 seconds to allow the instance to be properly created
    };
    
    const handleManageInstance = (instance: Instance) => {
        setSelectedInstance(instance);
        setIsManageDialogOpen(true);
    };

    const handleInstanceUpdated = () => {
        loadInstances();
    };

    const handleConnectClick = async (instanceName: string) => {
        setQrInstanceName(instanceName);
        setIsQrLoading(true);
        setQrError(null);
        setQrCode(null);

        const result = await connectInstanceAction(instanceName);

        // Debug: Log the received data structure
        if (result.success && result.data) {
            console.log('Connect result data:', JSON.stringify(result.data, null, 2));
        }

        // Try multiple possible locations for the QR code
        let qrCodeBase64 = null;
        if (result.success && result.data) {
            const data = result.data;
            qrCodeBase64 = data.qrcode?.base64 || 
                          data.qrcode?.code || 
                          data.qr || 
                          data.base64 ||
                          data.qrCode ||
                          data.code;
                          
            // If still no QR code found, check nested structures
            if (!qrCodeBase64 && data.instance) {
                qrCodeBase64 = data.instance.qrcode?.base64 ||
                              data.instance.qrcode?.code ||
                              data.instance.qr ||
                              data.instance.base64;
            }
        }

        if (result.success && qrCodeBase64) {
            console.log('=== QR CODE FOUND (Connect) ===');
            console.log('Raw QR Code length:', qrCodeBase64.length);
            console.log('Raw QR Code starts with:', qrCodeBase64.substring(0, 50));
            
            const validatedQrCode = validateAndCleanBase64(qrCodeBase64);
            console.log('Validated QR Code:', validatedQrCode ? 'Valid' : 'Invalid');
            
            if (validatedQrCode) {
                setQrCode(validatedQrCode);
            } else {
                console.error('Failed to validate QR code');
                setQrError('QR Code inválido recebido.');
                toast({
                    variant: 'destructive',
                    title: 'Erro!',
                    description: 'QR Code inválido recebido.',
                });
            }
        } else {
            const errorMessage = result.error || 'Não foi possível obter o QR Code.';
            setQrError(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Falha ao Conectar',
                description: errorMessage,
            });
        }
        setIsQrLoading(false);
    };

    const closeQrDialog = () => {
        setQrCode(null);
        setQrInstanceName('');
        setQrError(null);
    }

  return (
    <>
        <CrmLayout>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Central de Conexões</h1>
                        <p className="text-muted-foreground">Gerencie suas instâncias da Evolution API para o WhatsApp.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={refreshInstanceStatus} disabled={isLoadingInstances}>
                            <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingInstances && "animate-spin")} />
                            Atualizar
                        </Button>
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Instância
                        </Button>
                    </div>
                </div>

                {isLoadingInstances ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="h-8 w-8 animate-spin mr-2" />
                        <span>Carregando instâncias...</span>
                    </div>
                ) : instances.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Nenhuma instância encontrada.</p>
                        <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Primeira Instância
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {instances.map(instance => (
                         <Card key={instance.id} className="overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between p-4 bg-card">
                                <div>
                                    <CardTitle className="text-lg">{getInstanceCustomName(instance.id, instance.name)}</CardTitle>
                                    <CardDescription>ID: {instance.name}</CardDescription>
                                </div>
                                <Badge className={cn("border-none", statusConfig[instance.status]?.color)}>
                                    {statusConfig[instance.status]?.icon}
                                    <span className="ml-2">{statusConfig[instance.status]?.label}</span>
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                               <div className="flex justify-end gap-2">
                                    {(instance.status === 'disconnected' || instance.status === 'pending') && (
                                        <Button variant="outline" size="sm" onClick={() => handleConnectClick(instance.name)}>
                                            <QrCode className="mr-2 h-4 w-4" />
                                            Conectar
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => handleManageInstance(instance)}>
                                        Gerenciar
                                    </Button>
                               </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                )}
            </div>
        </CrmLayout>
        <InstanceDialog 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen}
            onAddInstance={handleAddInstance}
            onInstanceConnected={loadInstances}
        />
        <ManageInstanceDialog
            open={isManageDialogOpen}
            onOpenChange={setIsManageDialogOpen}
            instance={selectedInstance}
            onInstanceUpdated={handleInstanceUpdated}
        />
        <AlertDialog open={!!qrCode || isQrLoading || !!qrError} onOpenChange={closeQrDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Conectar Instância "{qrInstanceName}"</AlertDialogTitle>
                    <AlertDialogDescription>
                        Abra o WhatsApp no seu celular e escaneie o código para conectar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-center items-center py-4 min-h-[282px]">
                    {isQrLoading && <Loader className="h-10 w-10 animate-spin" />}
                    {qrError && !isQrLoading && (
                        <Alert variant="destructive">
                            <AlertTitle>Erro!</AlertTitle>
                            <AlertDescription>{qrError}</AlertDescription>
                        </Alert>
                    )}
                    {qrCode && !isQrLoading && (
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
                    )}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeQrDialog}>Fechar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
