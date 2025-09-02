'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Save, Plus } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  apiKey?: string;
  status: 'active' | 'inactive' | 'error';
  prompt: string;
  config: {
    temperature: number;
    maxTokens: number;
    tools: string[];
    systemPrompt?: string;
  };
}

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onClose: () => void;
  onAgentUpdated: () => void;
}

const API_KEYS = [
  { value: 'openai-key-1', label: 'OpenAI Key 1' },
  { value: 'anthropic-key-1', label: 'Anthropic Key 1' },
  { value: 'google-key-1', label: 'Google Key 1' },
  { value: 'groq-key-1', label: 'Groq Key 1' }
];

const AVAILABLE_MODELS = {
  OpenAI: [
    { value: 'gpt-4o', label: 'GPT-4o', description: 'Modelo mais avançado da OpenAI' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Versão otimizada do GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'GPT-4 com maior velocidade' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Modelo rápido e eficiente' }
  ],
  Anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Modelo mais avançado da Anthropic' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Modelo rápido e eficiente' }
  ],
  Google: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Modelo mais avançado e recente do Google (2025)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Ultra rápido com alta qualidade (2025)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Versão otimizada para tarefas simples (2025)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Modelo multimodal avançado (2024)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', description: 'Versão leve e eficiente (2024)' }
  ],
  Groq: [
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile', description: 'Modelo mais poderoso' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', description: 'Rápido e eficiente' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: 'Excelente para tarefas complexas' }
  ]
};

const AVAILABLE_TOOLS = [
  { value: 'web_search', label: 'Busca na Web', description: 'Permite buscar informações na internet' },
  { value: 'calculator', label: 'Calculadora', description: 'Realizar cálculos matemáticos' },
  { value: 'product_catalog', label: 'Catálogo de Produtos', description: 'Acessar informações de produtos' },
  { value: 'price_calculator', label: 'Calculadora de Preços', description: 'Calcular preços e orçamentos' },
  { value: 'appointment_scheduler', label: 'Agendamento', description: 'Agendar compromissos e reuniões' }
];

export function EditAgentDialog({ agent, open, onClose, onAgentUpdated }: EditAgentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: '',
    apiKey: '',
    prompt: '',
    config: {
      temperature: 0.7,
      maxTokens: 1000,
      tools: [] as string[],
      systemPrompt: ''
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    if (agent && open) {
      setFormData({
        name: agent.name || '',
        description: agent.description || '',
        model: agent.model || 'gpt-3.5-turbo',
        apiKey: agent.apiKey || '',
        prompt: agent.prompt || '',
        config: {
          temperature: agent.config?.temperature || 0.7,
          maxTokens: agent.config?.maxTokens || 1000,
          tools: agent.config?.tools || [],
          systemPrompt: agent.config?.systemPrompt || ''
        }
      });
    }
  }, [agent, open]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          apiKey: formData.apiKey
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Agente atualizado com sucesso!'
        });
        onAgentUpdated();
        onClose();
      } else {
        throw new Error(data.error || 'Erro ao atualizar agente');
      }
    } catch (error) {
      console.error('Erro ao atualizar agente:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar agente',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTool = (toolValue: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        tools: prev.config.tools.includes(toolValue)
          ? prev.config.tools.filter(t => t !== toolValue)
          : [...prev.config.tools, toolValue]
      }
    }));
  };

  const canSubmit = formData.name.trim() && formData.model && formData.apiKey && formData.prompt.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Agente: {agent?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nome do Agente *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Agente de Vendas"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-model">Modelo de IA *</Label>
                <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AVAILABLE_MODELS).map(([provider, models]) => (
                      <div key={provider}>
                        <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {provider}
                        </div>
                        {models.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.label}</span>
                              <span className="text-xs text-gray-500">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="edit-apiKey">Chave da API *</Label>
              <div className="flex gap-2">
                <Select value={formData.apiKey} onValueChange={(value) => setFormData(prev => ({ ...prev, apiKey: value }))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma chave da API" />
                  </SelectTrigger>
                  <SelectContent>
                    {API_KEYS.map((key) => (
                      <SelectItem key={key.value} value={key.value}>
                        {key.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito e função do agente"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Prompt Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Configuração do Prompt</h3>
            
            <div>
              <Label htmlFor="edit-prompt">Prompt Principal *</Label>
              <Textarea
                id="edit-prompt"
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Descreva como o agente deve se comportar, suas responsabilidades e estilo de comunicação..."
                className="mt-1 min-h-[150px]"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-systemPrompt">Prompt do Sistema (Opcional)</Label>
              <Textarea
                id="edit-systemPrompt"
                value={formData.config.systemPrompt}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  config: { ...prev.config, systemPrompt: e.target.value }
                }))}
                placeholder="Instruções adicionais para o sistema..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Advanced Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Configurações Avançadas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Temperatura: {formData.config.temperature}</Label>
                <p className="text-sm text-gray-500 mb-2">Controla a criatividade das respostas</p>
                <Slider
                  value={[formData.config.temperature]}
                  onValueChange={([value]) => setFormData(prev => ({ 
                    ...prev, 
                    config: { ...prev.config, temperature: value }
                  }))}
                  max={1}
                  min={0}
                  step={0.1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conservador</span>
                  <span>Criativo</span>
                </div>
              </div>
              
              <div>
                <Label>Máximo de Tokens: {formData.config.maxTokens}</Label>
                <p className="text-sm text-gray-500 mb-2">Limite de tokens para as respostas</p>
                <Slider
                  value={[formData.config.maxTokens]}
                  onValueChange={([value]) => setFormData(prev => ({ 
                    ...prev, 
                    config: { ...prev.config, maxTokens: value }
                  }))}
                  max={4000}
                  min={100}
                  step={100}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100</span>
                  <span>4000</span>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Ferramentas Disponíveis</Label>
              <p className="text-sm text-gray-500 mb-3">Selecione as ferramentas que o agente pode usar</p>
              <div className="grid grid-cols-1 gap-3">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div key={tool.value} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`edit-${tool.value}`}
                      checked={formData.config.tools.includes(tool.value)}
                      onChange={() => toggleTool(tool.value)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <label htmlFor={`edit-${tool.value}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-gray-900">{tool.label}</div>
                      <div className="text-sm text-gray-500">{tool.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}