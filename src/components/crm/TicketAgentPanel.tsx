'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  User,
  MoreVertical,
  Settings,
  Play,
  Pause,
  AlertTriangle,
  Clock,
  MessageSquare,
  TrendingUp,
  Zap,
  Plus,
  Sparkles,
  Brain,
  Star
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Ticket, AIAgentConfig, AgentInteraction } from '@/components/crm/types';
import { useToast } from '@/hooks/use-toast';

interface TicketAgentPanelProps {
  ticket: Ticket;
  onTicketUpdate?: (ticket: Ticket) => void;
}

interface AgentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onAgentSelected: (agent: AIAgentConfig) => void;
}

interface AgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onConfigSaved: () => void;
}

const AgentSelectionModal: React.FC<AgentSelectionModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onAgentSelected
}) => {
  const [agents, setAgents] = useState<AIAgentConfig[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadAvailableAgents();
    }
  }, [isOpen]);

  const loadAvailableAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agents/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id })
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar agentes');
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar agentes disponíveis',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAgent = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (agent) {
      onAgentSelected(agent);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <DialogTitle className="text-xl">Selecionar Agente IA</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Escolha um agente IA especializado para atender este ticket. Cada agente possui características únicas e níveis de especialização diferentes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Carregando agentes...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <div className="animate-pulse">
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="font-medium text-lg mb-2">Nenhum agente disponível</h3>
              <p className="text-sm">Não há agentes IA configurados no momento. Entre em contato com o administrador.</p>
            </div>
          ) : (
            agents.map((agent, index) => (
              <div
                  key={agent.id}
                  className={`group relative border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in fade-in-0 slide-in-from-bottom-4 ${
                    selectedAgent === agent.id
                      ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                {/* Indicador de seleção */}
                {selectedAgent === agent.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Header do card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{agent.name}</h3>
                        <Badge 
                          variant={agent.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {agent.status === 'active' ? '🟢 Ativo' : '🔴 Inativo'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Rating visual */}
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${
                            i < (agent.activationRules?.priority || 3) 
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Descrição */}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                  
                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>Prioridade {agent.activationRules?.priority || 5}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      <span>Max {agent.behavior?.maxInteractionsPerTicket || 10}</span>
                    </div>
                  </div>
                  
                  {/* Indicador de hover */}
                  <div className={`h-1 rounded-full transition-all duration-300 ${
                    selectedAgent === agent.id 
                      ? 'bg-gradient-to-r from-primary to-primary/50' 
                      : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-primary/30 group-hover:to-transparent'
                  }`} />
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 transition-all duration-200 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSelectAgent}
            disabled={!selectedAgent || loading}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Atribuindo...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Atribuir Agente</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AgentConfigModal: React.FC<AgentConfigModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onConfigSaved
}) => {
  const [config, setConfig] = useState({
    activationMode: ticket.aiConfig?.activationMode || 'manual',
    autoResponse: ticket.aiConfig?.autoResponse || false,
    keywords: ticket.aiConfig?.activationTrigger?.keywords?.join(', ') || '',
    delay: ticket.aiConfig?.activationTrigger?.delay || 0
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const aiConfig = {
        activationMode: config.activationMode,
        autoResponse: config.autoResponse,
        activationTrigger: {
          keywords: config.keywords.split(',').map(k => k.trim()).filter(k => k),
          delay: config.delay,
          conditions: []
        },
        escalationRules: ticket.aiConfig?.escalationRules || {
          maxInteractions: 10,
          escalateToHuman: true,
          escalationConditions: []
        }
      };

      const response = await fetch(`/api/tickets/${ticket.id}/agent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiConfig })
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar configuração');
      }

      toast({
        title: 'Sucesso',
        description: 'Configuração do agente atualizada'
      });

      onConfigSaved();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configuração',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Agente IA</DialogTitle>
          <DialogDescription>
            Ajuste as configurações do agente para este ticket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Modo de Ativação</Label>
            <Select
              value={config.activationMode}
              onValueChange={(value: 'immediate' | 'manual' | 'keyword' | 'scheduled') => setConfig(prev => ({ ...prev, activationMode: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Imediato</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="keyword">Por Palavra-chave</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoResponse"
              checked={config.autoResponse}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoResponse: checked }))}
            />
            <Label htmlFor="autoResponse">Resposta Automática</Label>
          </div>

          {config.activationMode === 'keyword' && (
            <div>
              <Label>Palavras-chave (separadas por vírgula)</Label>
              <Input
                value={config.keywords}
                onChange={(e) => setConfig(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="suporte, ajuda, problema"
              />
            </div>
          )}

          {config.activationMode === 'scheduled' && (
            <div>
              <Label>Delay de Ativação (minutos)</Label>
              <Input
                type="number"
                value={config.delay}
                onChange={(e) => setConfig(prev => ({ ...prev, delay: Number(e.target.value) }))}
                min={0}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TicketAgentPanel: React.FC<TicketAgentPanelProps> = ({ ticket, onTicketUpdate }) => {
  const [agentInteractions, setAgentInteractions] = useState<AgentInteraction[]>([]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showAgentConfig, setShowAgentConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (ticket.assignedAgent?.type === 'ai') {
      loadAgentInteractions();
    }
  }, [ticket.assignedAgent]);

  const loadAgentInteractions = async () => {
    try {
      setAgentInteractions(ticket.agentInteractions || []);
    } catch (error) {
      console.error('Erro ao carregar interações:', error);
    }
  };

  const handleAgentAssignment = async (agent: AIAgentConfig) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets/${ticket.id}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          activationMode: 'immediate',
          autoResponse: true,
          model: 'gemini-2.5-flash'
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao atribuir agente');
      }

      toast({
        title: 'Sucesso',
        description: `🤖 Agente ${agent.name} atribuído com sucesso! Resposta automática ativada com Gemini.`
      });

      // Atualizar ticket localmente
      const updatedTicket = {
        ...ticket,
        assignedAgent: {
          type: 'ai' as const,
          id: agent.id,
          name: agent.name,
          evoAiAgentId: agent.evoAiAgentId
        },
        aiConfig: {
          activationMode: 'immediate',
          autoResponse: true,
          activationTrigger: {
            keywords: [],
            delay: 0,
            conditions: []
          },
          escalationRules: {
            maxInteractions: 10,
            escalateToHuman: true,
            escalationConditions: []
          }
        }
      };

      onTicketUpdate?.(updatedTicket);
    } catch (error) {
      console.error('Erro ao atribuir agente:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atribuir agente',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAgent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets/${ticket.id}/agent`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Falha ao remover agente');
      }

      toast({
        title: 'Sucesso',
        description: 'Agente removido com sucesso'
      });

      // Atualizar ticket localmente
      const updatedTicket = {
        ...ticket,
        assignedAgent: undefined,
        aiConfig: undefined
      };

      onTicketUpdate?.(updatedTicket);
    } catch (error) {
      console.error('Erro ao remover agente:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover agente',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'activation':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'response':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'escalation':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'handoff':
        return <User className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInteractionLabel = (type: string) => {
    switch (type) {
      case 'activation':
        return 'Ativado';
      case 'response':
        return 'Resposta';
      case 'escalation':
        return 'Escalado';
      case 'handoff':
        return 'Transferido';
      default:
        return 'Ação';
    }
  };

  return (
    <>
      <AgentSelectionModal
        isOpen={showAgentSelector}
        onClose={() => setShowAgentSelector(false)}
        ticket={ticket}
        onAgentSelected={handleAgentAssignment}
      />

      <AgentConfigModal
        isOpen={showAgentConfig}
        onClose={() => setShowAgentConfig(false)}
        ticket={ticket}
        onConfigSaved={loadAgentInteractions}
      />
    </>
  );
};

export default TicketAgentPanel;