'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, BarChart3, Play, Pause, Trash2, Edit } from 'lucide-react';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { AgentMetricsDialog } from '@/components/agents/AgentMetricsDialog';
import { EditAgentDialog } from '@/components/agents/EditAgentDialog';
import { AgentMarketplace } from '@/components/agents/AgentMarketplace';
import { AgentAnalytics } from '@/components/agents/AgentAnalytics';
import { AgentVersioning } from '@/components/agents/AgentVersioning';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: 'active' | 'inactive' | 'error';
  totalInteractions: number;
  successRate: number;
  lastExecution?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agents');
      const data = await response.json();
      
      if (data.success) {
        setAgents(data.agents || []);
      } else {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar agentes',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar agentes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInstallAgent = (marketplaceAgent: any) => {
    const newAgent = {
      id: Date.now().toString(),
      name: marketplaceAgent.name,
      description: marketplaceAgent.description,
      model: marketplaceAgent.model || 'gpt-3.5-turbo',
      status: 'active' as const,
      totalInteractions: 0,
      successRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: marketplaceAgent.version,
      source: 'marketplace',
    };
    setAgents([...agents, newAgent]);
    toast({
      title: 'Sucesso',
      description: `Agente "${marketplaceAgent.name}" instalado do marketplace!`
    });
  };

  const handleVersionRestore = (agentId: string, version: any) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, version: version.version, updatedAt: new Date() }
        : agent
    ));
    toast({
      title: 'Sucesso',
      description: `Versão ${version.version} restaurada com sucesso!`
    });
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? { ...agent, status: newStatus as any } : agent
        ));
        
        toast({
          title: 'Sucesso',
          description: `Agente ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso`
        });
      } else {
        throw new Error('Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status do agente:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status do agente',
        variant: 'destructive'
      });
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este agente? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        toast({
          title: 'Sucesso',
          description: 'Agente deletado com sucesso'
        });
      } else {
        throw new Error('Erro ao deletar agente');
      }
    } catch (error) {
      console.error('Erro ao deletar agente:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar agente',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-2 text-gray-700 dark:text-gray-300">Carregando agentes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Agentes LLM</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie seus agentes de inteligência artificial</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Criar Agente
          </Button>
          <AgentMarketplace onInstallAgent={handleInstallAgent} />
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
            <Settings className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nenhum agente criado</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Crie seu primeiro agente LLM para começar a automatizar o atendimento</p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Agente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg dark:hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                  {agent.name}
                </CardTitle>
                <Badge className={getStatusColor(agent.status)}>
                  {getStatusText(agent.status)}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{agent.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Modelo:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{agent.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Interações:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{agent.totalInteractions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Taxa de Sucesso:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{agent.successRate}%</span>
                  </div>
                  {agent.lastExecution && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Última Execução:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(agent.lastExecution).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAgentStatus(agent.id, agent.status)}
                    className="flex-1 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                  >
                    {agent.status === 'active' ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingAgent(agent)}
                    className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedAgent(agent)}
                    className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  
                  <AgentAnalytics agentId={agent.id} agentName={agent.name} />
                  
                  <AgentVersioning 
                    agentId={agent.id} 
                    agentName={agent.name}
                    currentVersion={agent.version || '1.0.0'}
                    onVersionRestore={(version) => handleVersionRestore(agent.id, version)}
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteAgent(agent.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border-gray-200 dark:border-gray-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAgentDialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        onAgentCreated={loadAgents}
      />
      
      {selectedAgent && (
        <AgentMetricsDialog 
          agent={selectedAgent}
          open={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
      
      {editingAgent && (
        <EditAgentDialog 
          agent={editingAgent}
          open={!!editingAgent}
          onClose={() => setEditingAgent(null)}
          onAgentUpdated={loadAgents}
        />
      )}
    </div>
  );
}