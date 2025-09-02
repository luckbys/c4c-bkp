'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  GitBranch,
  Clock,
  User,
  RotateCcw,
  Eye,
  Download,
  Tag,
  CheckCircle,
  AlertTriangle,
  GitCommit,
  History,
  GitCompare,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';

interface AgentVersion {
  id: string;
  version: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
  status: 'active' | 'archived' | 'draft';
  changes: {
    type: 'major' | 'minor' | 'patch';
    description: string;
    files: string[];
  };
  config: {
    systemPrompt: string;
    modelConfig: {
      provider: string;
      model: string;
      temperature: number;
      maxTokens: number;
    };
    flows?: Array<{
    id: string;
    name: string;
    description: string;
    trigger: string;
    actions: any[];
  }>;
  };
  metrics?: {
    interactions: number;
    successRate: number;
    avgResponseTime: number;
    satisfaction: number;
  };
  tags: string[];
  changelog: string;
}

interface AgentVersioningProps {
  agentId: string;
  agentName: string;
  currentVersion: string;
  onVersionRestore: (version: AgentVersion) => void;
}

const VERSION_TYPES = {
  major: { label: 'Major', color: 'bg-red-100 text-red-800', icon: '🚀' },
  minor: { label: 'Minor', color: 'bg-blue-100 text-blue-800', icon: '✨' },
  patch: { label: 'Patch', color: 'bg-green-100 text-green-800', icon: '🔧' },
};

const STATUS_CONFIG = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  archived: { label: 'Arquivado', color: 'bg-gray-100 text-gray-800', icon: Archive },
  draft: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
};

export function AgentVersioning({ 
  agentId, 
  agentName, 
  currentVersion, 
  onVersionRestore 
}: AgentVersioningProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<AgentVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[AgentVersion | null, AgentVersion | null]>([null, null]);

  useEffect(() => {
    if (isOpen) {
      loadVersionHistory();
    }
  }, [isOpen]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      // Simular carregamento do histórico de versões
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockVersions: AgentVersion[] = [
        {
          id: 'v1',
          version: '3.1.0',
          name: 'Melhoria na Personalização',
          description: 'Adicionado suporte para personalização avançada de respostas baseada no perfil do usuário.',
          author: 'João Silva',
          createdAt: '2024-01-22T10:30:00Z',
          status: 'active',
          changes: {
            type: 'minor',
            description: 'Implementação de sistema de personalização',
            files: ['systemPrompt', 'modelConfig', 'flows'],
          },
          config: {
            systemPrompt: 'Você é um assistente personalizado que adapta suas respostas...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-4',
              temperature: 0.8,
              maxTokens: 2000,
            },
            flows: [{ id: 'personalization', name: 'Personalização' }],
          },
          metrics: {
            interactions: 1250,
            successRate: 94.2,
            avgResponseTime: 1.2,
            satisfaction: 4.6,
          },
          tags: ['personalização', 'ux', 'melhoria'],
          changelog: '- Adicionado sistema de personalização\n- Melhorado tempo de resposta\n- Corrigidos bugs menores',
        },
        {
          id: 'v2',
          version: '3.0.2',
          name: 'Correção de Bugs Críticos',
          description: 'Corrigidos problemas de timeout e melhorada a estabilidade geral do agente.',
          author: 'Maria Santos',
          createdAt: '2024-01-20T14:15:00Z',
          status: 'archived',
          changes: {
            type: 'patch',
            description: 'Correções de estabilidade e performance',
            files: ['modelConfig'],
          },
          config: {
            systemPrompt: 'Você é um assistente útil e confiável...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-4',
              temperature: 0.7,
              maxTokens: 1500,
            },
          },
          metrics: {
            interactions: 890,
            successRate: 91.8,
            avgResponseTime: 1.5,
            satisfaction: 4.3,
          },
          tags: ['bugfix', 'estabilidade'],
          changelog: '- Corrigido timeout em respostas longas\n- Melhorada gestão de memória\n- Otimizada configuração do modelo',
        },
        {
          id: 'v3',
          version: '3.0.1',
          name: 'Otimização de Performance',
          description: 'Melhorias significativas na velocidade de resposta e redução do uso de tokens.',
          author: 'Carlos Lima',
          createdAt: '2024-01-18T09:45:00Z',
          status: 'archived',
          changes: {
            type: 'patch',
            description: 'Otimizações de performance',
            files: ['systemPrompt', 'modelConfig'],
          },
          config: {
            systemPrompt: 'Você é um assistente eficiente...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 0.7,
              maxTokens: 1000,
            },
          },
          metrics: {
            interactions: 650,
            successRate: 89.5,
            avgResponseTime: 0.8,
            satisfaction: 4.1,
          },
          tags: ['performance', 'otimização'],
          changelog: '- Reduzido tempo de resposta em 40%\n- Otimizado uso de tokens\n- Melhorada eficiência geral',
        },
        {
          id: 'v4',
          version: '3.0.0',
          name: 'Lançamento da Versão 3.0',
          description: 'Grande atualização com nova arquitetura, flows personalizados e integração com múltiplos modelos.',
          author: 'Ana Costa',
          createdAt: '2024-01-15T16:20:00Z',
          status: 'archived',
          changes: {
            type: 'major',
            description: 'Reescrita completa da arquitetura',
            files: ['systemPrompt', 'modelConfig', 'flows', 'integrations'],
          },
          config: {
            systemPrompt: 'Você é um assistente de nova geração...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 0.6,
              maxTokens: 800,
            },
            flows: [
              { id: 'greeting', name: 'Saudação' },
              { id: 'support', name: 'Suporte' },
            ],
          },
          metrics: {
            interactions: 450,
            successRate: 87.2,
            avgResponseTime: 1.1,
            satisfaction: 3.9,
          },
          tags: ['major-release', 'arquitetura', 'flows'],
          changelog: '- Nova arquitetura baseada em flows\n- Suporte a múltiplos modelos\n- Interface redesenhada\n- Melhor integração com APIs',
        },
        {
          id: 'v5',
          version: '2.5.1',
          name: 'Versão Legacy Estável',
          description: 'Última versão estável da série 2.x com correções de segurança.',
          author: 'Pedro Oliveira',
          createdAt: '2024-01-10T11:00:00Z',
          status: 'archived',
          changes: {
            type: 'patch',
            description: 'Correções de segurança',
            files: ['systemPrompt'],
          },
          config: {
            systemPrompt: 'Você é um assistente seguro e confiável...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 0.5,
              maxTokens: 600,
            },
          },
          metrics: {
            interactions: 320,
            successRate: 85.1,
            avgResponseTime: 1.3,
            satisfaction: 3.8,
          },
          tags: ['legacy', 'segurança'],
          changelog: '- Correções de segurança\n- Melhorada validação de entrada\n- Atualizada documentação',
        },
      ];
      
      setVersions(mockVersions);
    } catch (error) {
      toast.error('Erro ao carregar histórico de versões');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (version: AgentVersion) => {
    try {
      toast.loading('Restaurando versão...');
      
      // Simular restauração
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onVersionRestore(version);
      toast.success(`Versão ${version.version} restaurada com sucesso!`);
      setIsOpen(false);
    } catch (error) {
      toast.error('Erro ao restaurar versão');
    }
  };

  const handleArchiveVersion = async (versionId: string) => {
    try {
      setVersions(prev => prev.map(v => 
        v.id === versionId ? { ...v, status: 'archived' as const } : v
      ));
      toast.success('Versão arquivada com sucesso!');
    } catch (error) {
      toast.error('Erro ao arquivar versão');
    }
  };

  const handleCompareVersions = () => {
    if (compareVersions[0] && compareVersions[1]) {
      // Implementar comparação detalhada
      toast.info('Funcionalidade de comparação em desenvolvimento');
    } else {
      toast.error('Selecione duas versões para comparar');
    }
  };

  const toggleCompareSelection = (version: AgentVersion) => {
    if (!compareVersions[0]) {
      setCompareVersions([version, null]);
    } else if (!compareVersions[1] && compareVersions[0].id !== version.id) {
      setCompareVersions([compareVersions[0], version]);
    } else {
      setCompareVersions([null, null]);
    }
  };

  const exportVersion = async (version: AgentVersion) => {
    try {
      toast.loading('Exportando versão...');
      
      const exportData = {
        version: version.version,
        name: version.name,
        description: version.description,
        config: version.config,
        metadata: {
          author: version.author,
          createdAt: version.createdAt,
          tags: version.tags,
          changelog: version.changelog,
        },
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agentName}_v${version.version}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Versão exportada com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar versão');
    }
  };

  const renderVersionCard = (version: AgentVersion) => {
    const statusConfig = STATUS_CONFIG[version.status];
    const typeConfig = VERSION_TYPES[version.changes.type];
    const isSelected = compareVersions.some(v => v?.id === version.id);
    const isCurrent = version.version === currentVersion;
    
    return (
      <Card 
        key={version.id} 
        className={`transition-all ${
          isSelected ? 'ring-2 ring-primary' : ''
        } ${isCurrent ? 'border-primary' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitCommit className="h-4 w-4" />
                  v{version.version}
                  {isCurrent && (
                    <Badge variant="default" className="text-xs">
                      Atual
                    </Badge>
                  )}
                </CardTitle>
                <Badge className={typeConfig.color}>
                  {typeConfig.icon} {typeConfig.label}
                </Badge>
                <Badge className={statusConfig.color}>
                  <statusConfig.icon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <CardDescription className="font-medium text-foreground">
                {version.name}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-1">
                {version.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {version.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(version.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {version.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold">{version.metrics.interactions}</div>
                <div className="text-xs text-muted-foreground">Interações</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{version.metrics.successRate}%</div>
                <div className="text-xs text-muted-foreground">Sucesso</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{version.metrics.avgResponseTime}s</div>
                <div className="text-xs text-muted-foreground">Resposta</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{version.metrics.satisfaction}/5</div>
                <div className="text-xs text-muted-foreground">Satisfação</div>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1 mb-4">
            {version.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {!isCurrent && version.status !== 'archived' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restaurar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restaurar Versão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja restaurar a versão {version.version}? 
                      Esta ação irá substituir a configuração atual do agente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRestoreVersion(version)}>
                      Restaurar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSelectedVersion(version)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Detalhes
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => exportVersion(version)}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            
            {compareMode && (
              <Button 
                size="sm" 
                variant={isSelected ? "default" : "outline"}
                onClick={() => toggleCompareSelection(version)}
              >
                <GitCompare className="h-4 w-4 mr-1" />
                {isSelected ? 'Selecionado' : 'Comparar'}
              </Button>
            )}
            
            {version.status === 'active' && !isCurrent && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleArchiveVersion(version.id)}
              >
                <Archive className="h-4 w-4 mr-1" />
                Arquivar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Versões
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Versões - {agentName}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCompareMode(!compareMode);
                    setCompareVersions([null, null]);
                  }}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  {compareMode ? 'Sair da Comparação' : 'Comparar Versões'}
                </Button>
                {compareMode && compareVersions[0] && compareVersions[1] && (
                  <Button size="sm" onClick={handleCompareVersions}>
                    Comparar Selecionadas
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {compareMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Modo de Comparação</h4>
                    <p className="text-sm text-blue-700">
                      Selecione duas versões para comparar suas configurações e métricas.
                      {compareVersions[0] && (
                        <span className="block mt-1">
                          Selecionada: v{compareVersions[0].version}
                          {compareVersions[1] && ` e v${compareVersions[1].version}`}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                
                {versions.map(renderVersionCard)}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Detalhes da Versão */}
      {selectedVersion && (
        <Dialog open={!!selectedVersion} onOpenChange={() => setSelectedVersion(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitCommit className="h-5 w-5" />
                Detalhes da Versão {selectedVersion.version}
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Informações Gerais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Nome:</span> {selectedVersion.name}</div>
                    <div><span className="font-medium">Autor:</span> {selectedVersion.author}</div>
                    <div><span className="font-medium">Data:</span> {new Date(selectedVersion.createdAt).toLocaleString('pt-BR')}</div>
                    <div><span className="font-medium">Tipo:</span> {VERSION_TYPES[selectedVersion.changes.type].label}</div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Changelog</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{selectedVersion.changelog}</pre>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Configuração do Modelo</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Provedor:</span> {selectedVersion.config.modelConfig.provider}</div>
                      <div><span className="font-medium">Modelo:</span> {selectedVersion.config.modelConfig.model}</div>
                      <div><span className="font-medium">Temperatura:</span> {selectedVersion.config.modelConfig.temperature}</div>
                      <div><span className="font-medium">Max Tokens:</span> {selectedVersion.config.modelConfig.maxTokens}</div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">System Prompt</h4>
                  <div className="bg-muted p-4 rounded-lg max-h-40 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{selectedVersion.config.systemPrompt}</pre>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}