'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, FileText, Video, HelpCircle, Star, Clock, User, Tag, Filter, SortAsc, X, ArrowUp, List, ChevronRight, CheckCircle, AlertTriangle, Info, Lightbulb, Settings, Users, BarChart3, Zap, Search as SearchIcon, Shield, Clock as ClockIcon, ArrowRight, Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  rating: number;
  type: 'article' | 'video' | 'faq';
}

// Componentes customizados para melhor estruturação
interface TimelineStepProps {
  step: number;
  title: string;
  description: string;
  isCompleted?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ step, title, description, isCompleted = false, isActive = false, icon }) => {
  return (
    <div className="flex items-start space-x-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
          isCompleted ? "bg-green-500 border-green-500 text-white" :
          isActive ? "bg-blue-500 border-blue-500 text-white" :
          "bg-white border-gray-300 text-gray-500"
        )}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
           icon ? icon : <span className="text-sm font-semibold">{step}</span>}
        </div>
        <div className="w-0.5 h-8 bg-gray-200 mt-2 last:hidden" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "text-lg font-semibold mb-2",
          isCompleted ? "text-green-700" :
          isActive ? "text-blue-700" :
          "text-gray-700"
        )}>
          {title}
        </h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

interface CalloutProps {
  type: 'info' | 'warning' | 'error' | 'success' | 'tip';
  title?: string;
  children: React.ReactNode;
}

const Callout: React.FC<CalloutProps> = ({ type, title, children }) => {
  const getCalloutStyles = () => {
    switch (type) {
      case 'info':
        return {
          container: 'border-blue-200 bg-blue-50',
          icon: <Info className="w-5 h-5 text-blue-600" />,
          title: 'text-blue-800',
          text: 'text-blue-700'
        };
      case 'warning':
        return {
          container: 'border-yellow-200 bg-yellow-50',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
          title: 'text-yellow-800',
          text: 'text-yellow-700'
        };
      case 'error':
        return {
          container: 'border-red-200 bg-red-50',
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          title: 'text-red-800',
          text: 'text-red-700'
        };
      case 'success':
        return {
          container: 'border-green-200 bg-green-50',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          title: 'text-green-800',
          text: 'text-green-700'
        };
      case 'tip':
        return {
          container: 'border-purple-200 bg-purple-50',
          icon: <Lightbulb className="w-5 h-5 text-purple-600" />,
          title: 'text-purple-800',
          text: 'text-purple-700'
        };
      default:
        return {
          container: 'border-gray-200 bg-gray-50',
          icon: <Info className="w-5 h-5 text-gray-600" />,
          title: 'text-gray-800',
          text: 'text-gray-700'
        };
    }
  };

  const styles = getCalloutStyles();

  return (
    <div className={cn("border rounded-lg p-4 my-4", styles.container)}>
      <div className="flex items-start space-x-3">
        {styles.icon}
        <div className="flex-1">
          {title && (
            <h5 className={cn("font-semibold mb-2", styles.title)}>
              {title}
            </h5>
          )}
          <div className={cn("text-sm", styles.text)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  items?: string[];
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, items }) => {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      {items && (
        <CardContent>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};

// Componente para renderizar conteúdo estruturado
interface StructuredArticleContentProps {
  content: string;
}

const StructuredArticleContent: React.FC<StructuredArticleContentProps> = ({ content }) => {
  // Função para processar e estruturar o conteúdo
  const processContent = (content: string) => {
    // Dividir o conteúdo em seções baseadas nos headings
    const sections = content.split(/(?=^#{1,3}\s)/gm).filter(section => section.trim());
    
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const firstLine = lines[0];
      
      // Detectar tipo de seção baseado no título
      const getSectionType = (title: string) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('passo') || lowerTitle.includes('step') || lowerTitle.includes('como')) {
          return 'steps';
        }
        if (lowerTitle.includes('problema') || lowerTitle.includes('erro') || lowerTitle.includes('troubleshooting')) {
          return 'troubleshooting';
        }
        if (lowerTitle.includes('funcionalidade') || lowerTitle.includes('recurso')) {
          return 'features';
        }
        if (lowerTitle.includes('fluxo') || lowerTitle.includes('processo')) {
          return 'workflow';
        }
        if (lowerTitle.includes('boas práticas') || lowerTitle.includes('dica')) {
          return 'tips';
        }
        if (lowerTitle.includes('configuração') || lowerTitle.includes('setup')) {
          return 'config';
        }
        return 'general';
      };
      
      const getSectionIcon = (type: string) => {
        switch (type) {
          case 'steps': return <Settings className="w-5 h-5 text-blue-600" />;
          case 'troubleshooting': return <Shield className="w-5 h-5 text-red-600" />;
          case 'features': return <Zap className="w-5 h-5 text-purple-600" />;
          case 'workflow': return <ArrowRight className="w-5 h-5 text-green-600" />;
          case 'tips': return <Lightbulb className="w-5 h-5 text-yellow-600" />;
          case 'config': return <Settings className="w-5 h-5 text-gray-600" />;
          default: return <Info className="w-5 h-5 text-blue-600" />;
        }
      };
      
      // Extrair título
      const titleMatch = firstLine.match(/^#{1,3}\s+(.+)$/);
      const title = titleMatch ? titleMatch[1] : 'Seção';
      const sectionType = getSectionType(title);
      const icon = getSectionIcon(sectionType);
      
      // Processar conteúdo da seção
      const sectionContent = lines.slice(1).join('\n').trim();
      
      // Se for uma seção de passos, renderizar como timeline
      if (sectionType === 'steps' && sectionContent.includes('###')) {
        return (
          <Card key={index} className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center space-x-3">
                {icon}
                <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {renderTimelineSteps(sectionContent)}
              </div>
            </CardContent>
          </Card>
        );
      }
      
      // Se for funcionalidades, renderizar como grid de cards
      if (sectionType === 'features') {
        return (
          <Card key={index} className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <div className="flex items-center space-x-3">
                {icon}
                <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6 md:grid-cols-2">
                {renderFeatureCards(sectionContent)}
              </div>
            </CardContent>
          </Card>
        );
      }
      
      // Renderização padrão para outras seções
      return (
        <Card key={index} className="border-0 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className={cn(
            "border-b",
            sectionType === 'troubleshooting' ? "bg-gradient-to-r from-red-50 to-orange-50" :
            sectionType === 'tips' ? "bg-gradient-to-r from-yellow-50 to-amber-50" :
            sectionType === 'config' ? "bg-gradient-to-r from-gray-50 to-slate-50" :
            "bg-gradient-to-r from-blue-50 to-indigo-50"
          )}>
            <div className="flex items-center space-x-3">
              {icon}
              <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-2xl prose-h1:mb-6 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-primary prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-primary prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-ul:space-y-2 prose-ol:space-y-2 prose-li:text-gray-700">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code: CodeBlock
                }}
              >
                {sectionContent}
              </ReactMarkdown>
            </div>
            {renderCallouts(sectionContent, sectionType)}
          </CardContent>
        </Card>
      );
    });
  };
  
  // Função para renderizar passos como timeline
  const renderTimelineSteps = (content: string) => {
    const steps = content.split(/(?=^###\s)/gm).filter(step => step.trim());
    
    return steps.map((step, index) => {
      const lines = step.trim().split('\n');
      const titleMatch = lines[0].match(/^###\s+(.+)$/);
      const title = titleMatch ? titleMatch[1] : `Passo ${index + 1}`;
      const description = lines.slice(1).join('\n').trim();
      
      return (
        <TimelineStep
          key={index}
          step={index + 1}
          title={title}
          description={description}
          isCompleted={false}
          isActive={index === 0}
        />
      );
    });
  };
  
  // Função para renderizar funcionalidades como cards
  const renderFeatureCards = (content: string) => {
    const features = content.split(/(?=^###\s)/gm).filter(feature => feature.trim());
    
    return features.map((feature, index) => {
      const lines = feature.trim().split('\n');
      const titleMatch = lines[0].match(/^###\s+(.+)$/);
      const title = titleMatch ? titleMatch[1] : `Funcionalidade ${index + 1}`;
      
      // Extrair itens de lista
      const items: string[] = [];
      let description = '';
      
      lines.slice(1).forEach(line => {
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          items.push(line.trim().substring(1).trim());
        } else if (line.trim() && !line.startsWith('#')) {
          description += line + ' ';
        }
      });
      
      const getFeatureIcon = (title: string) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('performance') || lowerTitle.includes('otimiz')) {
          return <Zap className="w-5 h-5 text-blue-600" />;
        }
        if (lowerTitle.includes('virtual') || lowerTitle.includes('lista')) {
          return <BarChart3 className="w-5 h-5 text-green-600" />;
        }
        if (lowerTitle.includes('status') || lowerTitle.includes('estado')) {
          return <Circle className="w-5 h-5 text-purple-600" />;
        }
        if (lowerTitle.includes('informação') || lowerTitle.includes('dados')) {
          return <Users className="w-5 h-5 text-orange-600" />;
        }
        return <Settings className="w-5 h-5 text-gray-600" />;
      };
      
      return (
        <FeatureCard
          key={index}
          icon={getFeatureIcon(title)}
          title={title}
          description={description.trim()}
          items={items.length > 0 ? items : undefined}
        />
      );
    });
  };
  
  // Função para renderizar callouts baseados no conteúdo
  const renderCallouts = (content: string, sectionType: string) => {
    const callouts: React.ReactNode[] = [];
    
    // Adicionar callouts baseados no tipo de seção
    if (sectionType === 'troubleshooting') {
      callouts.push(
        <Callout key="warning" type="warning" title="Atenção">
          Sempre faça backup antes de aplicar correções que possam afetar dados importantes.
        </Callout>
      );
    }
    
    if (sectionType === 'config') {
      callouts.push(
        <Callout key="tip" type="tip" title="Dica">
          Documente todas as configurações realizadas para facilitar futuras manutenções.
        </Callout>
      );
    }
    
    return callouts;
  };
  
  return (
    <div className="space-y-8">
      {processContent(content)}
    </div>
  );
};

const mockArticles: Article[] = [
  // Configuração e Setup
  {
    id: '1',
    title: 'Como configurar uma nova instância do WhatsApp',
    description: 'Guia completo para criar, conectar e configurar instâncias do WhatsApp Business API com a Evolution API',
    content: `
# Como configurar uma nova instância do WhatsApp

## Visão Geral
As instâncias do WhatsApp são conexões independentes que permitem múltiplas contas do WhatsApp Business funcionarem simultaneamente em seu sistema CRM.

## Passo a Passo

### 1. Acessar a Central de Conexões
- No menu lateral, clique em "Central de Conexões"
- Você verá todas as instâncias existentes e seus status

### 2. Criar Nova Instância
- Clique no botão "Adicionar Instância"
- Insira um nome único para a instância (ex: "vendas-loja-1")
- O nome deve conter apenas letras, números e hifens

### 3. Conectar via QR Code
- Após criar a instância, clique em "Conectar"
- Um QR Code será exibido
- Abra o WhatsApp no celular > Dispositivos conectados > Conectar dispositivo
- Escaneie o QR Code

### 4. Verificar Status
- Aguarde alguns segundos
- O status mudará de "Pendente" para "Conectado"
- A instância estará pronta para uso

## Estados da Instância

**Conectado** (Verde): Instância funcionando normalmente
**Desconectado** (Vermelho): Sem conexão ativa - necessário reconectar
**Pendente** (Amarelo): Aguardando conexão ou em processo de inicialização

## Solução de Problemas

### QR Code não aparece
- Verifique se a Evolution API está rodando
- Confirme as configurações de URL da API
- Tente atualizar a página

### Instância não conecta
- Certifique-se que o WhatsApp está atualizado
- Verifique a conexão com internet
- Tente desconectar outros dispositivos do WhatsApp

### Erro "Instância já existe"
- Cada nome deve ser único
- Use nomes descritivos (ex: vendas-1, suporte-2)
- Evite caracteres especiais

## Boas Práticas

1. **Nomenclatura**: Use nomes descritivos e organizados
2. **Monitoramento**: Verifique regularmente o status das instâncias
3. **Backup**: Mantenha uma instância de backup configurada
4. **Documentação**: Registre qual número está associado a cada instância
    `,
    category: 'Configuração',
    tags: ['whatsapp', 'configuração', 'evolution-api', 'instancia', 'qr-code'],
    author: 'Equipe Técnica',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    views: 245,
    rating: 4.8,
    type: 'article'
  },
  {
    id: '2',
    title: 'Gerenciamento eficiente de tickets e atendimentos',
    description: 'Estratégias e ferramentas para organizar, priorizar e resolver tickets de atendimento no sistema CRM',
    content: `
# Gerenciamento eficiente de tickets e atendimentos

## Introdução
O sistema de tickets é o coração do seu CRM, permitindo organizar e acompanhar cada interação com clientes de forma estruturada e eficiente.

## Funcionalidades Principais

### 1. Lista Virtualizada de Tickets
- **Performance otimizada**: Carregamento de milhares de tickets sem travamentos
- **Scroll infinito**: Navegação fluida mesmo com grandes volumes
- **Altura fixa**: Cada ticket ocupa 180px para consistência visual

### 2. Status dos Tickets

**Aberto** (Verde): Ticket novo, aguardando primeira resposta
**Pendente** (Amarelo): Aguardando resposta do cliente
**Resolvido** (Azul): Problema solucionado, aguardando confirmação
**Fechado** (Cinza): Ticket finalizado e arquivado

### 3. Informações do Ticket
- **Cliente**: Nome, telefone e avatar (quando disponível)
- **Canal**: Instagram, WhatsApp, etc.
- **Última mensagem**: Prévia do último contato
- **Timestamp**: Horário da última interação
- **Contador**: Mensagens não lidas

## Fluxo de Atendimento

### Recebimento Automático
1. Cliente envia mensagem via WhatsApp
2. Sistema cria ticket automaticamente
3. Webhook processa a mensagem
4. Ticket aparece na lista com status "Aberto"

### Resposta do Agente
1. Agente clica no ticket
2. Painel de chat é aberto
3. Histórico completo é carregado
4. Agente digita resposta e envia
5. Status pode ser alterado conforme necessário

### Finalização
1. Problema resolvido → Status "Resolvido"
2. Cliente confirma → Status "Fechado"
3. Ticket é arquivado automaticamente

## Dashboard de Produtividade

### Métricas Principais
- **Tickets Resolvidos**: Contagem diária/semanal/mensal
- **Tempo Médio de Resposta**: Performance do atendimento
- **Satisfação do Cliente**: Avaliações e feedback
- **Volume por Canal**: Distribuição Instagram/WhatsApp

### Gráficos e Insights
- **Atividade por Hora**: Identifica picos de demanda
- **Tendências**: Evolução das métricas ao longo do tempo
- **Comparações**: Performance entre diferentes períodos

## Boas Práticas

### Organização
1. **Priorização**: Atenda primeiro tickets mais antigos
2. **Categorização**: Use tags para classificar tipos de problema
3. **Notas internas**: Documente informações importantes
4. **Transferências**: Passe tickets para especialistas quando necessário

### Comunicação
1. **Tom profissional**: Mantenha sempre cortesia
2. **Respostas rápidas**: Primeira resposta em até 1 hora
3. **Clareza**: Explique soluções de forma simples
4. **Follow-up**: Acompanhe se o problema foi realmente resolvido

### Performance
1. **Metas diárias**: Estabeleça objetivos de tickets resolvidos
2. **Tempo de resposta**: Monitore e melhore continuamente
3. **Feedback**: Colete avaliações dos clientes
4. **Treinamento**: Capacite a equipe regularmente

## Solução de Problemas

### Tickets não aparecem
- Verifique se a instância está conectada
- Confirme configuração dos webhooks
- Teste envio de mensagem de teste

### Sobreposição de cards
- Problema conhecido da virtualização
- Atualize a página se necessário
- Relatório já foi feito para correção

### Performance lenta
- Liste apenas tickets necessários
- Use filtros para reduzir volume
- Considere arquivar tickets antigos
    `,
    category: 'Atendimento',
    tags: ['tickets', 'crm', 'atendimento', 'produtividade', 'dashboard'],
    author: 'Especialista em CRM',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
    views: 189,
    rating: 4.6,
    type: 'article'
  }
];

// Gerar categorias dinamicamente baseado nos artigos existentes
const categories = ['Todos', ...Array.from(new Set(mockArticles.map(article => article.category))).sort()];

// Componente de Skeleton Loading para os cards
const ArticleCardSkeleton = () => (
  <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="pt-0">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Componente customizado para blocos de código com syntax highlighting
const CodeBlock = ({ children, className, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (language) {
    return (
      <div className="relative group">
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {language}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {copied ? (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Copiado!</span>
            ) : (
              <span className="text-xs text-gray-600 dark:text-gray-400">Copiar</span>
            )}
          </Button>
        </div>
        <SyntaxHighlighter
          style={oneLight}
          language={language}
          PreTag="div"
          className="!mt-0 !rounded-t-none !border-t-0"
          customStyle={{
            margin: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
};
const authors = Array.from(new Set(mockArticles.map(article => article.author))).sort();

// Tipos de ordenação
type SortOption = 'relevance' | 'date' | 'rating' | 'views' | 'title';

// Interface para filtros avançados
interface AdvancedFilters {
  author: string;
  minRating: number;
  dateRange: string;
  sortBy: SortOption;
}

// Interface para itens do sumário
interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
  anchor: string;
}

// Função para extrair texto limpo do markdown
const extractTextFromMarkdown = (markdown: string): string => {
  return markdown
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

// Função para calcular relevância da busca
const calculateRelevance = (article: Article, searchTerm: string): number => {
  if (!searchTerm) return 0;
  
  const term = searchTerm.toLowerCase();
  let score = 0;
  
  // Título tem peso maior
  if (article.title.toLowerCase().includes(term)) score += 10;
  
  // Descrição tem peso médio
  if (article.description.toLowerCase().includes(term)) score += 5;
  
  // Tags têm peso médio
  article.tags.forEach(tag => {
    if (tag.toLowerCase().includes(term)) score += 3;
  });
  
  // Conteúdo tem peso menor mas ainda relevante
  const content = extractTextFromMarkdown(article.content).toLowerCase();
  const contentMatches = (content.match(new RegExp(term, 'g')) || []).length;
  score += contentMatches;
  
  return score;
};

// Função para destacar termos encontrados
const highlightText = (text: string, searchTerm: string): string => {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
};

// Função para extrair sumário do markdown
const extractTableOfContents = (markdown: string): TableOfContentsItem[] => {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TableOfContentsItem[] = [];
  let match;
  
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();
    const anchor = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    toc.push({
      id: `heading-${toc.length}`,
      title,
      level,
      anchor
    });
  }
  
  return toc;
};

// Componente para o sumário
const TableOfContents = ({ 
  items, 
  activeId, 
  onItemClick 
}: { 
  items: TableOfContentsItem[];
  activeId: string;
  onItemClick: (anchor: string) => void;
}) => {
  if (items.length === 0) return null;
  
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <List className="h-4 w-4" />
          Sumário
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick(item.anchor)}
                className={cn(
                  "w-full text-left text-sm py-1 px-2 rounded hover:bg-muted transition-colors",
                  "flex items-center gap-2",
                  activeId === item.anchor && "bg-muted font-medium"
                )}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
              >
                {item.level > 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="truncate">{item.title}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Componente para barra de progresso de leitura
const ReadingProgress = ({ progress }: { progress: number }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={progress} className="h-1 rounded-none" />
    </div>
  );
};

// Componente customizado para renderizar markdown com âncoras
const MarkdownWithAnchors = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }) => {
          const text = children?.toString() || '';
          const anchor = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return (
            <h1 id={anchor} className="scroll-mt-20" {...props}>
              {children}
            </h1>
          );
        },
        h2: ({ children, ...props }) => {
          const text = children?.toString() || '';
          const anchor = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return (
            <h2 id={anchor} className="scroll-mt-20" {...props}>
              {children}
            </h2>
          );
        },
        h3: ({ children, ...props }) => {
          const text = children?.toString() || '';
          const anchor = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return (
            <h3 id={anchor} className="scroll-mt-20" {...props}>
              {children}
            </h3>
          );
        },
        h4: ({ children, ...props }) => {
          const text = children?.toString() || '';
          const anchor = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return (
            <h4 id={anchor} className="scroll-mt-20" {...props}>
              {children}
            </h4>
          );
        },
        h5: ({ children, ...props }) => {
          const text = children?.toString() || '';
          const anchor = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return (
            <h5 id={anchor} className="scroll-mt-20" {...props}>
              {children}
            </h5>
          );
        },
        h6: ({ children, ...props }) => {
          const text = children?.toString() || '';
          const anchor = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return (
            <h6 id={anchor} className="scroll-mt-20" {...props}>
              {children}
            </h6>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Estados para navegação interna do artigo
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState('');
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Estados para filtros avançados
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    author: '',
    minRating: 0,
    dateRange: '',
    sortBy: 'relevance'
  });
  
  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Debounce search
  const debounceSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setDebouncedSearchTerm(value), 300);
      };
    })(),
    []
  );
  
  // Update debounced search when searchTerm changes
  useEffect(() => {
    debounceSearch(searchTerm);
  }, [searchTerm, debounceSearch]);

  // Simular loading ao mudar filtros
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCategory, advancedFilters]);

  // Filtros e ordenação com memoização para performance
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = mockArticles.filter(article => {
      // Busca expandida (título, descrição, tags e conteúdo)
      const searchMatches = !debouncedSearchTerm || 
        article.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        article.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        extractTextFromMarkdown(article.content).toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      // Filtro por categoria
      const categoryMatches = selectedCategory === 'Todos' || article.category === selectedCategory;
      
      // Filtro por autor
      const authorMatches = !advancedFilters.author || article.author === advancedFilters.author;
      
      // Filtro por rating
      const ratingMatches = article.rating >= advancedFilters.minRating;
      
      // Filtro por data (implementação básica)
      let dateMatches = true;
      if (advancedFilters.dateRange) {
        const articleDate = new Date(article.updatedAt);
        const now = new Date();
        
        switch (advancedFilters.dateRange) {
          case 'week':
            dateMatches = (now.getTime() - articleDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
            break;
          case 'month':
            dateMatches = (now.getTime() - articleDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
            break;
          case 'year':
            dateMatches = (now.getTime() - articleDate.getTime()) <= 365 * 24 * 60 * 60 * 1000;
            break;
        }
      }
      
      return searchMatches && categoryMatches && authorMatches && ratingMatches && dateMatches;
    });
    
    // Ordenação
    filtered.sort((a, b) => {
      switch (advancedFilters.sortBy) {
        case 'relevance':
          if (debouncedSearchTerm) {
            return calculateRelevance(b, debouncedSearchTerm) - calculateRelevance(a, debouncedSearchTerm);
          }
          return b.views - a.views; // Fallback para views se não há busca
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'views':
          return b.views - a.views;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [debouncedSearchTerm, selectedCategory, advancedFilters]);
  
  // Função para limpar todos os filtros
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('Todos');
    setAdvancedFilters({
      author: '',
      minRating: 0,
      dateRange: '',
      sortBy: 'relevance'
    });
  }, []);
  
  // Função para scroll to top
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Monitor scroll para mostrar botão "voltar ao topo" e calcular progresso de leitura
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      
      // Calcular progresso de leitura apenas se estiver visualizando um artigo
      if (selectedArticle && contentRef.current) {
        const element = contentRef.current;
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const elementHeight = element.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrollTop = window.scrollY;
        
        // Calcular progresso baseado na posição do scroll
        const progress = Math.min(
          Math.max(
            ((scrollTop + windowHeight - elementTop) / elementHeight) * 100,
            0
          ),
          100
        );
        
        setReadingProgress(progress);
        
        // Detectar heading ativo
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let activeId = '';
        
        headings.forEach((heading) => {
          const headingRect = heading.getBoundingClientRect();
          if (headingRect.top <= 100 && headingRect.top >= -100) {
            activeId = heading.id;
          }
        });
        
        setActiveHeading(activeId);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedArticle]);
  
  // Extrair sumário quando um artigo é selecionado
  useEffect(() => {
    if (selectedArticle) {
      const toc = extractTableOfContents(selectedArticle.content);
      setTableOfContents(toc);
      setReadingProgress(0);
      setActiveHeading('');
    }
  }, [selectedArticle]);
  
  // Função para navegar para uma seção específica
  const scrollToHeading = useCallback((anchor: string) => {
    const element = document.getElementById(anchor);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'faq':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'faq':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  if (selectedArticle) {
    return (
      <>
        {/* Barra de progresso de leitura */}
        <ReadingProgress progress={readingProgress} />
        
        <div className="container mx-auto p-6 max-w-7xl">
          {/* Breadcrumbs */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedArticle(null)}
                className="p-0 h-auto font-normal hover:underline"
              >
                Knowledge Base
              </Button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{selectedArticle.category}</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium truncate">{selectedArticle.title}</span>
            </div>
            
            <Button 
            variant="ghost" 
            onClick={() => setSelectedArticle(null)}
            className="mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <ChevronRight className="h-4 w-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform duration-200" />
            Voltar para Knowledge Base
          </Button>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getTypeColor(selectedArticle.type)}>
                  {getTypeIcon(selectedArticle.type)}
                  <span className="ml-1 capitalize">{selectedArticle.type}</span>
                </Badge>
                <Badge variant="secondary">{selectedArticle.category}</Badge>
              </div>
              
              <h1 className="text-3xl font-bold">{selectedArticle.title}</h1>
              <p className="text-lg text-muted-foreground">{selectedArticle.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {selectedArticle.author}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(selectedArticle.updatedAt).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {selectedArticle.rating}
                </div>
                <div className="flex items-center gap-1">
                  <span>{Math.round(readingProgress)}% lido</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {selectedArticle.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {/* Layout com sumário e conteúdo */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sumário - apenas em telas grandes */}
            <div className="hidden lg:block">
              <TableOfContents 
                items={tableOfContents}
                activeId={activeHeading}
                onItemClick={scrollToHeading}
              />
            </div>
            
            {/* Conteúdo principal */}
            <div className="lg:col-span-3">
              <div className="space-y-6">
                <StructuredArticleContent content={selectedArticle.content} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Encontre respostas, tutoriais e documentação para usar o sistema de forma eficiente.
        </p>
      </div>

      {/* Barra de busca aprimorada */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar em títulos, descrições, tags e conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-2 hover:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {(advancedFilters.author || advancedFilters.minRating > 0 || advancedFilters.dateRange) && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs animate-pulse">
                !
              </Badge>
            )}
          </Button>
        </div>
        
        {/* Filtros avançados */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Autor</label>
                <Select value={advancedFilters.author} onValueChange={(value) => 
                  setAdvancedFilters(prev => ({ ...prev, author: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os autores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os autores</SelectItem>
                    {authors.map(author => (
                      <SelectItem key={author} value={author}>{author}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating mínimo: {advancedFilters.minRating}</label>
                <Slider
                  value={[advancedFilters.minRating]}
                  onValueChange={([value]) => 
                    setAdvancedFilters(prev => ({ ...prev, minRating: value }))
                  }
                  max={5}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select value={advancedFilters.dateRange} onValueChange={(value) => 
                  setAdvancedFilters(prev => ({ ...prev, dateRange: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer período</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="year">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Ordenar por</label>
                <Select value={advancedFilters.sortBy} onValueChange={(value: SortOption) => 
                  setAdvancedFilters(prev => ({ ...prev, sortBy: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevância</SelectItem>
                    <SelectItem value="date">Mais recente</SelectItem>
                    <SelectItem value="rating">Melhor avaliado</SelectItem>
                    <SelectItem value="views">Mais visualizado</SelectItem>
                    <SelectItem value="title">Título (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedArticles.length} artigo(s) encontrado(s)
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllFilters}
                className="hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 border-2 hover:border-destructive focus:ring-2 focus:ring-destructive focus:ring-offset-2"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar filtros
              </Button>
            </div>
          </Card>
        )}
        
        {/* Contador de resultados e ordenação rápida */}
        {!showFilters && (
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{filteredAndSortedArticles.length} artigo(s) encontrado(s)</span>
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4" />
              <Select value={advancedFilters.sortBy} onValueChange={(value: SortOption) => 
                setAdvancedFilters(prev => ({ ...prev, sortBy: value }))
              }>
                <SelectTrigger className="w-auto h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevância</SelectItem>
                  <SelectItem value="date">Mais recente</SelectItem>
                  <SelectItem value="rating">Melhor avaliado</SelectItem>
                  <SelectItem value="views">Mais visualizado</SelectItem>
                  <SelectItem value="title">Título (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          // Skeleton loading
          Array.from({ length: 6 }).map((_, index) => (
            <ArticleCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          filteredAndSortedArticles.map(article => (
            <Card 
              key={article.id} 
              className="group cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 rounded-xl overflow-hidden"
              onClick={() => setSelectedArticle(article)}
            >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full border-2 transition-colors",
                    getTypeColor(article.type)
                  )}
                >
                  {getTypeIcon(article.type)}
                  <span className="ml-1.5 capitalize">{article.type}</span>
                </Badge>
                <Badge 
                  variant="secondary" 
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {article.category}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-2">
                <span dangerouslySetInnerHTML={{ 
                  __html: highlightText(article.title, debouncedSearchTerm) 
                }} />
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                <span dangerouslySetInnerHTML={{ 
                  __html: highlightText(article.description, debouncedSearchTerm) 
                }} />
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.slice(0, 3).map(tag => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {article.tags.length > 3 && (
                    <Badge 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                    >
                      +{article.tags.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{article.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span>{article.views} visualizações</span>
                    </div>
                  </div>
                  <span className="font-medium">{new Date(article.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
        )}
      </div>

      {filteredAndSortedArticles.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum artigo encontrado</h3>
          <p className="text-muted-foreground">
            Tente ajustar sua busca ou selecionar uma categoria diferente.
          </p>
        </div>
      )}
      
      {/* Botão voltar ao topo */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-out hover:scale-110 focus:ring-4 focus:ring-primary focus:ring-offset-2 z-50 animate-in slide-in-from-bottom-2 fade-in"
          size="icon"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
