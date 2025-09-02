
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
import type { Client } from '@/components/crm/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';

interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

interface QuoteItem {
  id: number;
  product: string;
  quantity: number;
  unitPrice: number;
}

export function QuoteDialog({ open, onOpenChange, client }: QuoteDialogProps) {
  const [items, setItems] = React.useState<QuoteItem[]>([
    { id: 1, product: '', quantity: 1, unitPrice: 0 },
  ]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), product: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleItemChange = (id: number, field: keyof Omit<QuoteItem, 'id'>, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const handleRemoveItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
          <DialogDescription>
            Crie um novo orçamento para {client.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="grid grid-cols-12 gap-x-2 gap-y-4 items-center">
                <div className="col-span-6">
                    <Label htmlFor="product">Produto / Serviço</Label>
                </div>
                <div className="col-span-2">
                    <Label htmlFor="quantity">Qtde.</Label>
                </div>
                <div className="col-span-3">
                    <Label htmlFor="unitPrice">Vl. Unitário</Label>
                </div>
                <div className="col-span-1"></div>

                {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                        <div className="col-span-6">
                            <Input id={`product-${item.id}`} value={item.product} onChange={(e) => handleItemChange(item.id, 'product', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-3">
                            <Input id={`unitPrice-${item.id}`} type="number" value={item.unitPrice} onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-1">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={items.length <= 1}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            <Button variant="outline" size="sm" onClick={handleAddItem}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
            </Button>

            <div className="flex justify-end items-center pt-4 border-t">
                <div className="text-right">
                    <p className="text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Orçamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
