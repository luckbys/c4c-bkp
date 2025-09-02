'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Settings, Play, Pause, Trash2, Edit, Clock, MessageSquare, Tag, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActivationRule {
  id: string;
  agentId: string;
  agentName?: string;
  name: string;
  description?: string;
  conditions: {
    messageTypes?: string[];
    keywords?: string[];
    timeRange?: {
      start: string;
      end: string;
    };
    weekdays?: number[];
    ticketPriority?: string[];
    clientTags?: string[];
    instanceIds?: string[];
  };
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

export default function AgentRulesPage() {
  const [rules, setRules] = useState<ActivationRule[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ActivationRule | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    agentId: '',
    name: '',
    description: '',
    conditions: {
      messageTypes: [] as string[],
      keywords: [] as string[],
      timeRange: { start: '09:00', end: '18:00' },
      weekdays: [] as number[],
      ticketPriority: [] as string[],
      instanceIds: [] as string[]
    },
    priority: 5,
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar agentes
      const agentsResponse = await fetch('/api/agents');
      const agentsData = await agentsResponse.json();
      if (agentsData.success) {
        setAgents(agentsData.agents || []);
      }
      
      // Carregar regras (simulado - implementar API)
      // const rulesResponse = await fetch('/api/agent-rules');
      // const rulesData = await rulesResponse.json();
      setRules([]); // Placeholder
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      agentId: '',
      name: '',
      description: '',
      conditions: {
        messageTypes: [],
        keywords: [],
        timeRange: { start: '09:00', end: '18:00' },
        weekdays: [],
        ticketPriority: [],
        instanceIds: []
      },
      priority: 5,
      active: true
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.agentId || !formData.name) {
        toast({
          title: 'Erro',
          description: 'Agente e nome são obrigatórios',
          variant: 'destructive'
        });
        return;
      }

      // Implementar criação/edição de regra
      toast({
        title: 'Sucesso',
        description: 'Regra salva com sucesso!'
      });
      
      setShowCreateForm(false);
      setEditingRule(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar regra',
        variant: 'destructive'
      });
    }
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      // Implementar toggle de status
      toast({
        title: 'Sucesso',
        description: `Regra ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`
      });
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status da regra:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status da regra',
        variant: 'destructive'
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta regra?')) {
      return;
    }
    
    try {
      // Implementar deleção
      toast({
        title: 'Sucesso',
        description: 'Regra deletada com sucesso'
      });
      loadData();
    } catch (error) {
      console.error('Erro ao deletar regra:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar regra',
        variant: 'destructive'
      });
    }
  };

  const toggleCondition = (type: string, value: string | number) => {
    setFormData(prev => {
      const conditions = { ...prev.conditions };
      
      if (type === 'messageTypes' || type === 'ticketPriority') {
        const array = conditions[type] as string[];
        const stringValue = value as string;
        conditions[type] = array.includes(stringValue)
          ? array.filter(item => item !== stringValue)
          : [...array, stringValue];
      } else if (type === 'weekdays') {
        const array = conditions[type] as number[];
        const numberValue = value as number;
        conditions[type] = array.includes(numberValue)
          ? array.filter(item => item !== numberValue)
          : [...array, numberValue];
      }
      
      return { ...prev, conditions };
    });
  };

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !formData.conditions.keywords.includes(keyword.trim())) {
      setFormData(prev => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          keywords: [...prev.conditions.keywords, keyword.trim()]
        }
      }));
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        keywords: prev.conditions.keywords.filter(k => k !== keyword)
      }
    }));
  };

  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const messageTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'image', label: 'Imagem' },
    { value: 'audio', label: 'Áudio' },
    { value: 'video', label: 'Vídeo' },
    { value: 'document', label: 'Documento' }
  ];
  const priorities = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' }
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Carregando regras...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Regras de Ativação</h1>
          <p className="text-gray-600 mt-1">Configure quando os agentes devem ser ativados automaticamente</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingRule) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingRule ? 'Editar Regra' : 'Nova Regra de Ativação'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agentId">Agente *</Label>
                <Select value={formData.agentId} onValueChange={(value) => setFormData(prev => ({ ...prev, agentId: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Prioridade *</Label>
                <Select value={formData.priority.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num <= 3 ? '(Baixa)' : num <= 6 ? '(Média)' : '(Alta)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="name">Nome da Regra *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Horário Comercial"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva quando esta regra deve ser aplicada"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Conditions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Condições de Ativação</h3>
              
              {/* Message Types */}
              <div>
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Tipos de Mensagem
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                  {messageTypes.map((type) => (
                    <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.conditions.messageTypes.includes(type.value)}
                        onChange={() => toggleCondition('messageTypes', type.value)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Keywords */}
              <div>
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Palavras-chave
                </Label>
                <div className="mt-2">
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Digite uma palavra-chave e pressione Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addKeyword(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.conditions.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Time Range */}
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horário de Funcionamento
                </Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="startTime" className="text-sm">Início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.conditions.timeRange.start}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        conditions: {
                          ...prev.conditions,
                          timeRange: { ...prev.conditions.timeRange, start: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime" className="text-sm">Fim</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.conditions.timeRange.end}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        conditions: {
                          ...prev.conditions,
                          timeRange: { ...prev.conditions.timeRange, end: e.target.value }
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              {/* Weekdays */}
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Dias da Semana
                </Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {weekdayNames.map((day, index) => (
                    <label key={index} className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.conditions.weekdays.includes(index)}
                        onChange={() => toggleCondition('weekdays', index)}
                        className="sr-only"
                      />
                      <span className={`text-sm font-medium ${
                        formData.conditions.weekdays.includes(index) ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {day}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Ticket Priority */}
              <div>
                <Label>Prioridade do Ticket</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {priorities.map((priority) => (
                    <label key={priority.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.conditions.ticketPriority.includes(priority.value)}
                        onChange={() => toggleCondition('ticketPriority', priority.value)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{priority.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRule(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Settings className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma regra criada</h3>
          <p className="text-gray-600 mb-4">Crie sua primeira regra de ativação para automatizar o comportamento dos agentes</p>
          <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Regra
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <p className="text-sm text-gray-600">{rule.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {rule.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  <Badge variant="outline">Prioridade {rule.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Agente: {rule.agentName || 'N/A'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRuleStatus(rule.id, rule.active)}
                    >
                      {rule.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingRule(rule);
                        // Populate form with rule data
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}