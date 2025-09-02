'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Brain, Loader2, Plus, Sparkles } from 'lucide-react';

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onAgentCreated: () => void;
}

interface AgentFormData {
  name: string;
  description: string;
  role: string;
  goal: string;
  model: string;
  instructions: string;
}

const AVAILABLE_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Modelo mais avançado e recente do Google (2025)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Ultra rápido com alta qualidade (2025)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Versão otimizada para tarefas simples (2025)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Modelo multimodal avançado (2024)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', description: 'Versão leve e eficiente (2024)' },
];

export function CreateAgentDialog({ open, onClose, onAgentCreated }: CreateAgentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    role: '',
    goal: '',
    model: 'gemini-2.5-pro',
    instructions: ''
  });
  
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite o nome do agente',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Criar agente usando Gemini via API
      const response = await fetch('/api/agents/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          role: formData.role,
          goal: formData.goal,
          model: formData.model,
          instructions: formData.instructions,
          type: 'gemini'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Agente criado!',
          description: `O agente "${formData.name}" foi criado com sucesso usando Gemini`
        });
        
        onAgentCreated();
        onClose();
        resetForm();
      } else {
        throw new Error(data.error || 'Erro ao criar agente');
      }
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar agente',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite o nome do agente antes de gerar com IA',
        variant: 'destructive'
      });
      return;
    }

    try {
      setAiGenerating(true);
      
      // Gerar informações usando Gemini
      const response = await fetch('/api/agents/generate-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          provider: 'gemini'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          description: data.description,
          role: data.role,
          goal: data.goal,
          instructions: data.instructions
        }));
        
        toast({
          title: '✨ Gerado com Gemini!',
          description: 'As informações do agente foram geradas usando Google Gemini'
        });
      } else {
        throw new Error(data.error || 'Erro ao gerar informações');
      }
    } catch (error) {
      console.error('Erro ao gerar com IA:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar informações com Gemini',
        variant: 'destructive'
      });
    } finally {
      setAiGenerating(false);
    }
  };



  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      role: '',
      goal: '',
      model: 'gemini-2.5-pro',
      instructions: ''
    });
    setActiveTab('basic');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canSubmit = formData.name.trim() && formData.description.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Criar Agente de IA Personalizado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Nome do Agente *</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="name"
                placeholder="Ex: Assistente de Vendas"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateWithAI}
                disabled={!formData.name.trim() || aiGenerating}
                className="shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 dark:from-purple-600 dark:to-pink-600"
              >
                {aiGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito e funcionalidades do agente..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-gray-700 dark:text-gray-300">Papel/Função</Label>
            <Input
              id="role"
              placeholder="Ex: Especialista em Atendimento ao Cliente"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <Label htmlFor="goal" className="text-gray-700 dark:text-gray-300">Objetivo Principal</Label>
            <Input
              id="goal"
              placeholder="Ex: Resolver dúvidas e problemas dos clientes"
              value={formData.goal}
              onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
              className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <Label htmlFor="model" className="text-gray-700 dark:text-gray-300">Modelo de IA</Label>
            <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
              <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="instructions" className="text-gray-700 dark:text-gray-300">Instruções Personalizadas</Label>
            <Textarea
              id="instructions"
              placeholder="Instruções específicas sobre como o agente deve se comportar..."
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={4}
              className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use variáveis como &#123;&#123;user_message&#125;&#125;, &#123;&#123;context&#125;&#125;, &#123;&#123;history&#125;&#125;
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
           <Button variant="outline" onClick={handleClose} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
             Cancelar
           </Button>
           
           <Button
             onClick={handleSubmit}
             disabled={!canSubmit || loading}
             className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
           >
             {loading ? (
               <Loader2 className="w-4 h-4 mr-2 animate-spin" />
             ) : (
               <Plus className="w-4 h-4 mr-2" />
             )}
             Criar Agente
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }