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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Store,
  Search,
  Download,
  Star,
  Heart,
  Eye,
  Filter,
  TrendingUp,
  Clock,
  User,
  Tag,
  CheckCircle,
  AlertCircle,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  rating: number;
  downloads: number;
  likes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  version: string;
  verified: boolean;
  featured: boolean;
  preview: {
    systemPrompt: string;
    modelConfig: {
      provider: string;
      model: string;
      temperature: number;
    };
  };
  screenshots?: string[];
  documentation?: string;
  changelog?: string;
}

interface AgentMarketplaceProps {
  onInstallAgent: (agent: MarketplaceAgent) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'Todas as Categorias' },
  { value: 'customer_support', label: 'Atendimento ao Cliente' },
  { value: 'sales', label: 'Vendas' },
  { value: 'technical', label: 'Suporte Técnico' },
  { value: 'content', label: 'Criação de Conteúdo' },
  { value: 'analytics', label: 'Análise de Dados' },
  { value: 'education', label: 'Educação' },
  { value: 'healthcare', label: 'Saúde' },
  { value: 'finance', label: 'Finanças' },
  { value: 'other', label: 'Outros' },
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Em Destaque' },
  { value: 'popular', label: 'Mais Populares' },
  { value: 'recent', label: 'Mais Recentes' },
  { value: 'rating', label: 'Melhor Avaliados' },
  { value: 'downloads', label: 'Mais Baixados' },
];

export function AgentMarketplace({ onInstallAgent }: AgentMarketplaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const [activeTab, setActiveTab] = useState('browse');

  useEffect(() => {
    if (isOpen) {
      loadMarketplaceAgents();
    }
  }, [isOpen]);

  useEffect(() => {
    filterAndSortAgents();
  }, [agents, searchQuery, selectedCategory, sortBy]);

  const loadMarketplaceAgents = async () => {
    setLoading(true);
    try {
      // Simular carregamento de agentes do marketplace
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAgents: MarketplaceAgent[] = [
        {
          id: 'agent_1',
          name: 'Assistente de Vendas Pro',
          description: 'Agente especializado em qualificação de leads e fechamento de vendas com técnicas avançadas de persuasão.',
          author: 'SalesTeam',
          category: 'sales',
          tags: ['vendas', 'leads', 'crm', 'conversão'],
          rating: 4.8,
          downloads: 1250,
          likes: 89,
          views: 3420,
          createdAt: '2024-01-15',
          updatedAt: '2024-01-20',
          version: '2.1.0',
          verified: true,
          featured: true,
          preview: {
            systemPrompt: 'Você é um consultor de vendas experiente...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-4',
              temperature: 0.7,
            },
          },
        },
        {
          id: 'agent_2',
          name: 'Suporte Técnico Expert',
          description: 'Agente para diagnóstico e resolução de problemas técnicos complexos com metodologia estruturada.',
          author: 'TechSupport',
          category: 'technical',
          tags: ['suporte', 'técnico', 'troubleshooting', 'ti'],
          rating: 4.9,
          downloads: 890,
          likes: 67,
          views: 2180,
          createdAt: '2024-01-10',
          updatedAt: '2024-01-18',
          version: '1.5.2',
          verified: true,
          featured: true,
          preview: {
            systemPrompt: 'Você é um especialista em suporte técnico...',
            modelConfig: {
              provider: 'anthropic',
              model: 'claude-3-sonnet',
              temperature: 0.3,
            },
          },
        },
        {
          id: 'agent_3',
          name: 'Criador de Conteúdo',
          description: 'Agente criativo para geração de conteúdo envolvente para redes sociais e marketing digital.',
          author: 'ContentCreator',
          category: 'content',
          tags: ['conteúdo', 'marketing', 'social-media', 'criativo'],
          rating: 4.6,
          downloads: 2100,
          likes: 156,
          views: 5670,
          createdAt: '2024-01-05',
          updatedAt: '2024-01-22',
          version: '3.0.1',
          verified: false,
          featured: false,
          preview: {
            systemPrompt: 'Você é um criador de conteúdo criativo...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 1.2,
            },
          },
        },
        {
          id: 'agent_4',
          name: 'Analista de Dados',
          description: 'Agente especializado em análise de dados e geração de insights estratégicos para negócios.',
          author: 'DataScience',
          category: 'analytics',
          tags: ['dados', 'análise', 'insights', 'business'],
          rating: 4.7,
          downloads: 650,
          likes: 45,
          views: 1890,
          createdAt: '2024-01-12',
          updatedAt: '2024-01-19',
          version: '1.8.0',
          verified: true,
          featured: false,
          preview: {
            systemPrompt: 'Você é um analista de dados experiente...',
            modelConfig: {
              provider: 'google',
              model: 'gemini-pro',
              temperature: 0.4,
            },
          },
        },
        {
          id: 'agent_5',
          name: 'Atendimento Humanizado',
          description: 'Agente focado em atendimento empático e personalizado para melhorar a experiência do cliente.',
          author: 'CustomerCare',
          category: 'customer_support',
          tags: ['atendimento', 'empatia', 'cliente', 'suporte'],
          rating: 4.9,
          downloads: 1800,
          likes: 134,
          views: 4250,
          createdAt: '2024-01-08',
          updatedAt: '2024-01-21',
          version: '2.3.1',
          verified: true,
          featured: true,
          preview: {
            systemPrompt: 'Você é um assistente de atendimento empático...',
            modelConfig: {
              provider: 'openai',
              model: 'gpt-4',
              temperature: 0.8,
            },
          },
        },
      ];
      
      setAgents(mockAgents);
    } catch (error) {
      toast.error('Erro ao carregar agentes do marketplace');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortAgents = () => {
    let filtered = [...agents];

    // Filtrar por busca
    if (searchQuery) {
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filtrar por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(agent => agent.category === selectedCategory);
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'featured':
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.rating - a.rating;
        case 'popular':
          return b.downloads - a.downloads;
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'downloads':
          return b.downloads - a.downloads;
        default:
          return 0;
      }
    });

    setFilteredAgents(filtered);
  };

  const handleInstallAgent = async (agent: MarketplaceAgent) => {
    try {
      toast.loading('Instalando agente...');
      
      // Simular instalação
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onInstallAgent(agent);
      toast.success(`Agente "${agent.name}" instalado com sucesso!`);
      setIsOpen(false);
    } catch (error) {
      toast.error('Erro ao instalar agente');
    }
  };

  const handleLikeAgent = async (agentId: string) => {
    // Simular like
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, likes: agent.likes + 1 }
        : agent
    ));
    toast.success('Agente curtido!');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderAgentCard = (agent: MarketplaceAgent) => (
    <Card key={agent.id} className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              {agent.verified && (
                <CheckCircle className="h-4 w-4 text-blue-500" />
              )}
              {agent.featured && (
                <Badge variant="secondary" className="text-xs">
                  Destaque
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {agent.author}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                v{agent.version}
              </span>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {renderStars(agent.rating)}
              <span className="text-sm text-muted-foreground ml-1">
                ({agent.rating})
              </span>
            </div>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {agent.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {agent.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.tags.length - 3}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {agent.downloads.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {agent.likes}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {agent.views.toLocaleString()}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => handleInstallAgent(agent)}
          >
            <Download className="h-4 w-4 mr-1" />
            Instalar
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setSelectedAgent(agent)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleLikeAgent(agent.id)}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
            <Store className="h-4 w-4" />
            Marketplace
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Marketplace de Agentes
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger value="browse" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300">Explorar</TabsTrigger>
                <TabsTrigger value="trending" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300">Em Alta</TabsTrigger>
                <TabsTrigger value="my-agents" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300">Meus Agentes</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="browse" className="flex-1 px-6 pb-6">
              <div className="space-y-4">
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        placeholder="Buscar agentes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      {CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      {SORT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Lista de Agentes */}
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                      {filteredAgents.map(renderAgentCard)}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="trending" className="flex-1 px-6 pb-6">
              <div className="text-center py-20">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Agentes em Alta</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Descubra os agentes mais populares da semana
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="my-agents" className="flex-1 px-6 pb-6">
              <div className="text-center py-20">
                <User className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Meus Agentes</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Gerencie os agentes que você criou e compartilhou
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Preview do Agente */}
      {selectedAgent && (
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                {selectedAgent.name}
                {selectedAgent.verified && (
                  <CheckCircle className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                )}
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Descrição</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedAgent.description}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Configuração do Modelo</h4>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Provedor:</span> <span className="text-gray-700 dark:text-gray-300">{selectedAgent.preview.modelConfig.provider}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Modelo:</span> <span className="text-gray-700 dark:text-gray-300">{selectedAgent.preview.modelConfig.model}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Temperatura:</span> <span className="text-gray-700 dark:text-gray-300">{selectedAgent.preview.modelConfig.temperature}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Versão:</span> <span className="text-gray-700 dark:text-gray-300">{selectedAgent.version}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">System Prompt (Preview)</h4>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200">
                    {selectedAgent.preview.systemPrompt.substring(0, 200)}...
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleInstallAgent(selectedAgent)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Instalar Agente
                  </Button>
                  <Button variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}