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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader, Settings, LogOut, RotateCcw, Trash2, Edit } from 'lucide-react';
import { deleteInstanceAction, logoutInstanceAction, restartInstanceAction } from '@/app/instancias/actions';
import { renameInstanceAction } from '@/lib/instance-utils';
import { useToast } from '@/hooks/use-toast';
import type { Instance } from './types';

interface ManageInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance | null;
  onInstanceUpdated: () => void;
}

export function ManageInstanceDialog({ 
  open, 
  onOpenChange, 
  instance, 
  onInstanceUpdated 
}: ManageInstanceDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = React.useState('');
  const [isRenaming, setIsRenaming] = React.useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open && instance) {
      setNewInstanceName(instance.name);
      setIsRenaming(false);
      setError(null);
    }
  }, [open, instance]);

  const handleRename = () => {
    if (!instance || !newInstanceName.trim()) return;
    
    if (newInstanceName.trim() === instance.name) {
      setIsRenaming(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAction('rename');

    try {
      const result = renameInstanceAction(instance.id, newInstanceName.trim());
      
      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: `Nome da instância alterado para "${newInstanceName.trim()}" (apenas no frontend).`,
        });
        
        onInstanceUpdated();
        onOpenChange(false);
      } else {
        setError(result.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Error renaming instance:', error);
      setError('Erro ao renomear instância.');
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleAction = async (actionType: 'logout' | 'restart' | 'delete') => {
    if (!instance) return;
    
    setIsLoading(true);
    setError(null);
    setAction(actionType);

    try {
      let result;
      
      switch (actionType) {
        case 'logout':
          result = await logoutInstanceAction(instance.name);
          break;
        case 'restart':
          result = await restartInstanceAction(instance.name);
          break;
        case 'delete':
          result = await deleteInstanceAction(instance.name);
          break;
        default:
          throw new Error('Ação inválida');
      }

      if (result.success) {
        const actionMessages = {
          logout: 'desconectada',
          restart: 'reiniciada',
          delete: 'deletada'
        };
        
        toast({
          title: 'Sucesso!',
          description: `Instância "${instance.name}" foi ${actionMessages[actionType]} com sucesso.`,
        });
        
        onInstanceUpdated();
        onOpenChange(false);
      } else {
        setError(result.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error(`Error performing ${actionType}:`, error);
      setError(`Erro ao ${actionType === 'logout' ? 'desconectar' : actionType === 'restart' ? 'reiniciar' : 'deletar'} instância.`);
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setAction(null);
      setIsRenaming(false);
      setNewInstanceName('');
      onOpenChange(false);
    }
  };

  if (!instance) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciar Instância
          </DialogTitle>
          <DialogDescription>
            Gerencie a instância "{instance.name}". Escolha uma das ações abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">Renomear</h4>
                  <p className="text-sm text-muted-foreground">
                    Alterar o nome da instância
                  </p>
                  {isRenaming && (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="newName">Novo nome:</Label>
                      <div className="flex gap-2">
                        <Input
                          id="newName"
                          value={newInstanceName}
                          onChange={(e) => setNewInstanceName(e.target.value)}
                          placeholder="Digite o novo nome"
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRename();
                            } else if (e.key === 'Escape') {
                              setIsRenaming(false);
                              setNewInstanceName(instance?.name || '');
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={handleRename}
                          disabled={isLoading || !newInstanceName.trim() || newInstanceName.trim() === instance?.name}
                        >
                          {isLoading && action === 'rename' ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            'Salvar'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsRenaming(false);
                            setNewInstanceName(instance?.name || '');
                          }}
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {!isRenaming && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRenaming(true)}
                    disabled={isLoading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Desconectar</h4>
                  <p className="text-sm text-muted-foreground">
                    Desconecta a instância do WhatsApp sem deletá-la
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('logout')}
                  disabled={isLoading || instance.status === 'disconnected'}
                >
                  {isLoading && action === 'logout' ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Reiniciar</h4>
                  <p className="text-sm text-muted-foreground">
                    Reinicia a instância para resolver problemas de conexão
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('restart')}
                  disabled={isLoading}
                >
                  {isLoading && action === 'restart' ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg border-destructive/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-destructive">Deletar</h4>
                  <p className="text-sm text-muted-foreground">
                    Remove permanentemente a instância (ação irreversível)
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAction('delete')}
                  disabled={isLoading}
                >
                  {isLoading && action === 'delete' ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}