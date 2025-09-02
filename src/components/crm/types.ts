export interface Message {
  id: string;
  messageId?: string;
  content: string;
  timestamp: Date;
  sender: 'client' | 'agent';
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'note';
  isFromMe: boolean;
  senderName?: string;
  pushName?: string;
  quotedMessageId?: string;
  quotedMessageContent?: string;
  quotedMessageSender?: 'client' | 'agent';
  quotedMessageType?: string;
  mediaUrl?: string;
  fileName?: string;
  isTemporary?: boolean; // Para mensagens temporárias de feedback visual
}

export interface FirebaseMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'client' | 'agent';
  type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'note';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  senderName?: string;
  isFromMe?: boolean;
  pushName?: string;
  // Reply/Quote metadata
  quotedMessageId?: string;
  quotedMessageContent?: string;
  quotedMessageSender?: 'client' | 'agent';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  company?: string;
  cnpj?: string;
  lastSeen?: Date;
  isOnline?: boolean;
  subject?: string;
}

export interface Ticket {
  id: string;
  client: Client;
  subject: string;
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channel: 'whatsapp' | 'whatsapp-group' | 'email' | 'phone' | 'telegram';
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  unreadCount: number;
  tags: string[];
  assignedTo?: string;
  instanceName?: string; // For Evolution API integration
  lastMessage?: string;
  lastMessageTime?: Date;
  
  // Novos campos para agentes IA
  assignedAgent?: {
    type: 'human' | 'ai';
    id: string;
    name: string;
    evoAiAgentId?: string;
  };
  
  aiConfig?: {
    activationMode: 'immediate' | 'manual' | 'keyword' | 'scheduled';
    activationTrigger?: {
      keywords?: string[];
      delay?: number; // em minutos
      conditions?: AgentActivationCondition[];
    };
    autoResponse: boolean;
    escalationRules?: {
      maxInteractions: number;
      escalateToHuman: boolean;
      escalationConditions: string[];
    };
  };
  
  agentInteractions?: AgentInteraction[];
}

export interface Instance {
  id: string; // Will be instanceData.instance.instanceName
  name: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'pending';
  instance?: any; // To store the full response from Evolution API
}

export interface CreateInstanceData {
  instanceName: string;
}

// Tipos para análise inteligente de mensagens
export interface MessageAnalysisInput {
  messages: Message[];
  clientInfo: Client;
  conversationContext: ConversationContext;
}

export interface ConversationContext {
  duration: number; // em minutos
  messageCount: number;
  lastClientMessage: Date;
  hasUnreadMessages: boolean;
  previousInteractions: number;
}

// Tipos para recomendações
export type RecommendationAction = 'call' | 'proposal' | 'demo' | 'follow_up' | 'email';

export interface SmartRecommendation {
  id: string;
  action: RecommendationAction;
  title: string;
  description: string;
  confidence: number; // 0-100
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
  suggestedTiming: 'immediate' | 'within_hour' | 'within_day';
  timing?: 'imediato' | 'hoje' | 'esta_semana' | 'proximo_mes'; // Novo campo do prompt melhorado
  script?: string; // Sugestão de abordagem/script específico
  createdAt: Date;
}

export interface AnalysisResult {
  conversationStage: ConversationStage;
  clientSentiment: 'positive' | 'neutral' | 'negative';
  urgencyLevel: 'low' | 'medium' | 'high';
  keyTopics: string[];
  buyingSignals?: string[]; // Sinais de compra identificados
  objections?: string[]; // Objeções ou preocupações do cliente
  recommendations: SmartRecommendation[];
  summary: string;
  confidence: number;
  suggestedResponse?: string; // Sugestão de resposta personalizada
}

export type ConversationStage = 
  | 'initial_contact'
  | 'information_gathering'
  | 'needs_assessment'
  | 'proposal_discussion'
  | 'negotiation'
  | 'closing'
  | 'post_sale'
  | 'support';

// Configuração do Gemini
export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface GeminiRequest {
  messages: GeminiMessage[];
  config: Partial<GeminiConfig>;
}

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Tipos para sistema de agentes IA
export interface AgentInteraction {
  id: string;
  agentId: string;
  timestamp: Date;
  type: 'activation' | 'response' | 'escalation' | 'handoff';
  content?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface AgentActivationCondition {
  type: 'time' | 'message_count' | 'sentiment' | 'priority' | 'keyword';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface AIAgentConfig {
  id: string;
  name: string;
  description: string;
  evoAiAgentId?: string;
  
  // Configurações de ativação (opcionais para compatibilidade)
  activationRules?: {
    priority?: number; // 1-10, maior = mais prioritário
    conditions?: AgentActivationCondition[];
    timeRestrictions?: {
      workingHours?: { start: string; end: string; };
      weekdays?: number[]; // 0-6, domingo = 0
      timezone?: string;
    };
  };
  
  // Configurações de comportamento (opcionais para compatibilidade)
  behavior?: {
    maxInteractionsPerTicket?: number;
    autoEscalation?: boolean;
    escalationThreshold?: number; // confiança mínima
    responseDelay?: number; // simular digitação humana
  };
  
  // Configurações do modelo (opcionais para compatibilidade)
  modelConfig?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: string[];
  };
  
  status: 'active' | 'inactive' | 'testing';
  createdAt?: Date;
  updatedAt?: Date;
  
  // Campos para compatibilidade com agentes existentes
  prompt?: string;
  config?: any;
  successRate?: number;
  totalInteractions?: number;
}

export interface TicketContext {
  messageType: string;
  content: string;
  timestamp: Date;
  priority: string;
  clientTags: string[];
  instanceId: string;
  conversationStage?: string;
  clientSentiment?: string;
  ticketId: string;
}

export interface RuleEvaluationResult {
  agentId: string;
  ruleId: string;
  priority: number;
  confidence: number;
  matchedConditions: string[];
  matches: boolean;
}

export interface AIResponse {
  content: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface EscalationReason {
  type: 'low_confidence' | 'max_interactions' | 'manual' | 'error';
  description: string;
  sendTransitionMessage: boolean;
}

export interface AgentMetrics {
  agentId: string;
  totalInteractions: number;
  successRate: number;
  escalations: number;
  lastActivity?: Date;
}
