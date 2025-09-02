import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  updateDoc, 
  doc,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { firestoreRetry } from './firestore-retry';
import { Message, Ticket, Client } from '../components/crm/types';
import { generateSentMessageId, generateMediaMessageId } from '@/utils/id-generator';

// Importação condicional do cache service
let cacheService: any;
if (typeof window === 'undefined') {
  // Lado do servidor - usar Redis diretamente
  import('./redis-service').then(module => {
    cacheService = module.redisService;
  });
} else {
  // Lado do cliente - usar API routes
  import('./client-cache-service').then(module => {
    cacheService = module.clientCacheService;
  });
}

export interface FirebaseMessage {
  id?: string;
  messageId: string;
  remoteJid: string;
  content: string;
  sender: 'client' | 'agent';
  timestamp: Timestamp;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'note';
  messageType?: string; // Campo messageType para compatibilidade
  instanceName: string;
  isFromMe: boolean;
  pushName?: string;
  // Media fields
  mediaUrl?: string;
  fileName?: string;
  // Reply/Quote metadata
  quotedMessageId?: string;
  quotedMessageContent?: string;
  quotedMessageSender?: 'client' | 'agent';
}

export interface FirebaseTicket {
  id?: string;
  remoteJid: string;
  instanceName: string;
  client: {
    name: string;
    phone: string;
    email?: string;
    subject?: string;
    avatar?: string;
  };
  status: 'open' | 'pending' | 'resolved' | 'closed';
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

class FirebaseService {
  // Salvar mensagem no Firestore com cache otimizado
  async saveMessage(messageData: Omit<FirebaseMessage, 'id'>): Promise<string> {
    try {
      // Verificar cache primeiro (se disponível)
      const cacheKey = `message:${messageData.instanceName}:${messageData.remoteJid}:${messageData.messageId}`;
      if (cacheService) {
        const cachedMessage = await cacheService.get<string>(cacheKey);
        if (cachedMessage) {
          console.log('📦 Mensagem já existe no cache, pulando duplicata...');
          return cachedMessage;
        }
      }
      
      // Verificar duplicatas por messageId no Firestore
      if (messageData.messageId) {
        const duplicateQuery = query(
          collection(db, 'messages'),
          where('messageId', '==', messageData.messageId),
          where('instanceName', '==', messageData.instanceName),
          limit(1)
        );
        
        const duplicateSnapshot = await getDocs(duplicateQuery);
        if (!duplicateSnapshot.empty) {
          const existingDoc = duplicateSnapshot.docs[0];
          console.log(`🚫 Mensagem duplicada detectada: ${messageData.messageId}, usando documento existente: ${existingDoc.id}`);
          
          // Armazenar no cache para evitar futuras consultas
          if (cacheService) {
            await cacheService.set(cacheKey, existingDoc.id, 300);
          }
          
          return existingDoc.id;
        }
      }
      
      // Log dos dados antes de salvar
      console.log('📝 Dados da mensagem antes de salvar:', {
        messageId: messageData.messageId,
        type: messageData.type,
        messageType: messageData.messageType,
        content: typeof messageData.content === 'string' ? messageData.content.substring(0, 100) : JSON.stringify(messageData.content).substring(0, 100)
      });
      
      const docId = await firestoreRetry.addDocument('messages', {
        ...messageData,
        timestamp: serverTimestamp()
      });
      
      console.log(`New message saved with ID: ${docId}`);
      
      // Armazenar no cache (TTL: 5 minutos)
      if (cacheService) {
        await cacheService.set(cacheKey, docId, 300);
      }
      
      // Atualizar o ticket com a última mensagem
      await this.updateTicketLastMessage(messageData.remoteJid, messageData.instanceName, messageData.content);
      
      return docId;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  // Buscar mensagens de uma conversa
  async getMessages(remoteJid: string, instanceName: string, limitCount = 50): Promise<Message[]> {
    try {
      // Normalizar o remoteJid para incluir o sufixo do WhatsApp se necessário
      const normalizedRemoteJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
      
      console.log(`🔍 Buscando mensagens para ${normalizedRemoteJid} na instância ${instanceName}`);
      
      // Verificar cache primeiro (se disponível)
      const cacheKey = `messages:${instanceName}:${normalizedRemoteJid}:${limitCount}`;
      if (cacheService) {
        const cachedMessages = await cacheService.get<Message[]>(cacheKey);
        if (cachedMessages) {
          console.log('📦 Mensagens encontradas no cache');
          return cachedMessages;
        }
      }
      
      // Consulta sem orderBy até que os índices sejam aplicados no Firebase
      const q = query(
        collection(db, 'messages'),
        where('remoteJid', '==', normalizedRemoteJid),
        where('instanceName', '==', instanceName),
        limit(limitCount)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      const messages: Message[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirebaseMessage;
        const message = this.convertFirebaseMessageToMessage(data, doc.id);
        messages.push(message);
      });
      
      // Ordenar manualmente até que os índices sejam aplicados
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      console.log(`📝 Carregadas ${messages.length} mensagens para ${normalizedRemoteJid}`);
      
      // Armazenar no cache (TTL: 30 minutos)
      if (cacheService) {
        await cacheService.set(cacheKey, messages, 1800);
      }
      
      return messages; // Retornar em ordem cronológica
    } catch (error) {
      console.error('Error getting messages:', error);
      console.error('Error details:', {
        remoteJid,
        instanceName,
        limitCount,
        errorCode: error.code,
        errorMessage: error.message
      });
      return [];
    }
  }

  // Escutar mensagens em tempo real
  subscribeToMessages(
    remoteJid: string, 
    instanceName: string, 
    callback: (messages: Message[]) => void
  ): () => void {
    const q = query(
      collection(db, 'messages'),
      where('remoteJid', '==', remoteJid),
      where('instanceName', '==', instanceName)
      // orderBy('timestamp', 'desc') // Temporarily disabled until Firestore index is created
    );

    return onSnapshot(q, 
      (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirebaseMessage;
          messages.push(this.convertFirebaseMessageToMessage(data, doc.id));
        });
        // Sort manually until index is available
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        callback(messages);
      }
    );
  }

  // Salvar/atualizar ticket com cache
  async saveOrUpdateTicket(ticketData: Omit<FirebaseTicket, 'id'>): Promise<string> {
    try {
      // Verificar cache primeiro (se disponível)
      const cacheKey = `ticket:${ticketData.instanceName}:${ticketData.remoteJid}`;
      let cachedTicket = null;
      if (cacheService) {
        cachedTicket = await cacheService.get<string>(cacheKey);
      }
      
      // Verificar se já existe um ticket para este remoteJid e instância
      const q = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', ticketData.remoteJid),
        where('instanceName', '==', ticketData.instanceName)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        // Atualizar ticket existente
        const existingDoc = querySnapshot.docs[0];
        const updatedTicket = {
          ...ticketData,
          updatedAt: serverTimestamp()
        };
        
        await firestoreRetry.updateDocument('tickets', existingDoc.id, updatedTicket);
        
        // Atualizar cache Redis (TTL: 15 minutos)
        if (cacheService) {
          await cacheService.set(cacheKey, existingDoc.id, 900);
        }
        
        return existingDoc.id;
      } else {
        // Criar novo ticket
        const newTicket = {
          ...ticketData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docId = await firestoreRetry.addDocument('tickets', newTicket);
        
        // Armazenar no cache Redis (TTL: 15 minutos)
        if (cacheService) {
          await cacheService.set(cacheKey, docId, 900);
        }
        
        // Invalidar cache em cascata após criar ticket
        await this.invalidateTicketCache(
          ticketData.instanceName,
          docId,
          ticketData.remoteJid
        );
        
        return docId;
      }
    } catch (error) {
      console.error('Error saving ticket:', error);
      throw error;
    }
  }

  // Buscar tickets
  async getTickets(instanceName: string): Promise<Ticket[]> {
    try {
      // Validar se instanceName tem um valor válido
      if (!instanceName || instanceName.trim() === '') {
        console.error('getTickets called with invalid instanceName:', instanceName);
        return [];
      }
      
      console.log(`🎫 Buscando tickets para instância: ${instanceName}`);
      
      // Verificar cache primeiro (se disponível)
      const cacheKey = `tickets:${instanceName}:list`;
      if (cacheService) {
        const cachedTickets = await cacheService.get<Ticket[]>(cacheKey);
        if (cachedTickets) {
          console.log('📦 Tickets encontrados no cache');
          return cachedTickets;
        }
      }
      
      // Consulta sem orderBy até que os índices sejam aplicados no Firebase
      const q = query(
        collection(db, 'tickets'),
        where('instanceName', '==', instanceName)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      const tickets: Ticket[] = [];
      
      console.log(`📋 Encontrados ${querySnapshot.size} tickets para instância ${instanceName}`);
      
      // Carregar tickets e suas mensagens
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as FirebaseTicket;
        const ticket = this.convertFirebaseTicketToTicket(data, doc.id);
        
        // Carregar mensagens do ticket
        try {
          const messages = await this.getMessages(data.remoteJid, instanceName, 50);
          ticket.messages = messages;
          console.log(`📝 Carregadas ${messages.length} mensagens para ticket ${doc.id}`);
        } catch (error) {
          console.error(`Erro ao carregar mensagens do ticket ${doc.id}:`, error);
          ticket.messages = [];
        }
        
        tickets.push(ticket);
      }
      
      // Ordenar manualmente até que os índices sejam aplicados
      tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      // Armazenar no cache (TTL: 5 minutos para incluir mensagens)
      if (cacheService) {
        await cacheService.set(cacheKey, tickets, 300);
      }
      
      console.log(`✅ Carregados ${tickets.length} tickets com mensagens para instância ${instanceName}`);
      
      return tickets;
    } catch (error) {
      console.error('Error getting tickets:', error);
      console.error('Error details:', {
        instanceName,
        errorCode: error.code,
        errorMessage: error.message
      });
      return [];
    }
  }

  // Escutar tickets em tempo real
  subscribeToTickets(
    instanceName: string,
    callback: (tickets: Ticket[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Validar se instanceName tem um valor válido
    if (!instanceName || instanceName.trim() === '') {
      console.error('subscribeToTickets called with invalid instanceName:', instanceName);
      const error = new Error('instanceName cannot be undefined or empty');
      if (errorCallback) {
        errorCallback(error);
      }
      // Retornar função vazia para evitar erros
      return () => {};
    }
    
    const q = query(
      collection(db, 'tickets'),
      where('instanceName', '==', instanceName)
      // orderBy('updatedAt', 'desc') // Temporarily disabled until Firestore index is created
    );

    return firestoreRetry.subscribeToCollection(
      q,
      (querySnapshot) => {
        const tickets: Ticket[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirebaseTicket;
          tickets.push(this.convertFirebaseTicketToTicket(data, doc.id));
        });
        // Sort manually until index is available
        tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        callback(tickets);
      },
      errorCallback
    );
  }

  // Enviar mensagem via Evolution API e salvar no Firebase
  async sendMessage(instanceName: string, remoteJid: string, text: string, quoted?: { id: string; content: string; sender: 'client' | 'agent' } | null): Promise<void> {
    try {
      // Importar evolutionApi dinamicamente para evitar problemas de importação circular
      const { evolutionApi } = await import('./evolution-api');
      
      // Enviar via Evolution API diretamente
      const quotedData = quoted ? { id: quoted.id } : undefined;
      await evolutionApi.sendMessage(instanceName, remoteJid, text, quotedData);

      // Salvar no Firebase - usar formato completo do remoteJid
      const fullRemoteJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
      console.log(`Saving sent message to Firebase: ${text} for ${fullRemoteJid}`);
      await this.saveMessage({
        remoteJid: fullRemoteJid,
        messageId: generateSentMessageId(),
        content: text,
        sender: 'agent',
        status: 'sent',
        type: 'text',
        instanceName,
        isFromMe: true,
        pushName: 'Agente',
        timestamp: serverTimestamp() as any,
        ...(quoted ? {
          quotedMessageId: quoted.id,
          quotedMessageContent: quoted.content,
          quotedMessageSender: quoted.sender
        } : {})
      });
      console.log(`Message saved to Firebase successfully`);

      // Atualizar ticket
      await this.updateTicketLastMessage(fullRemoteJid, instanceName, text);
      console.log(`Ticket updated with last message`);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Enviar mensagem de mídia via Evolution API e salvar no Firebase
  async sendMediaMessage(
    instanceName: string, 
    remoteJid: string, 
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'audio' | 'document', 
    fileName?: string,
    quoted?: { id: string; content: string; sender: 'client' | 'agent' } | null
  ): Promise<void> {
    try {
      // Enviar via Evolution API
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9004';
      const response = await fetch(`${baseUrl}/api/send-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName,
          remoteJid,
          mediaUrl,
          mediaType,
          fileName,
          quoted
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || 'Failed to send media via Evolution API';
        
        // Verificar se é erro de conexão
        if (errorMessage.includes('Connection Closed')) {
          throw new Error('A instância WhatsApp não está conectada. Verifique a conexão na página de instâncias.');
        }
        
        throw new Error(errorMessage);
      }

      // Salvar no Firebase - usar formato completo do remoteJid
      const fullRemoteJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
      console.log(`Saving sent media message to Firebase: ${mediaType} for ${fullRemoteJid}`);
      
      // Usar a mediaUrl como content para consistência com mensagens recebidas
      // Isso permite que os componentes de mídia renderizem corretamente
      const messageContent = mediaUrl;
      
      await this.saveMessage({
        remoteJid: fullRemoteJid,
        messageId: generateMediaMessageId(),
        content: messageContent,
        sender: 'agent',
        status: 'sent',
        type: mediaType,
        instanceName,
        isFromMe: true,
        pushName: 'Agente',
        timestamp: serverTimestamp() as any,
        mediaUrl: mediaUrl,
        fileName: fileName,
        ...(quoted ? {
          quotedMessageId: quoted.id,
          quotedMessageContent: quoted.content,
          quotedMessageSender: quoted.sender
        } : {})
      });
      console.log(`Media message saved to Firebase successfully`);

      // Atualizar ticket com placeholder da mídia
      await this.updateTicketLastMessage(fullRemoteJid, instanceName, messageContent);
      console.log(`Ticket updated with last media message`);
    } catch (error) {
      console.error('Error sending media message:', error);
      throw error;
    }
  }

  // Atualizar status do ticket
  async updateTicketStatus(
    instanceName: string, 
    remoteJid: string, 
    status: 'open' | 'pending' | 'resolved' | 'closed'
  ): Promise<void> {
    try {
      // Validar parâmetros antes de usar na query
      if (!instanceName || instanceName.trim() === '') {
        console.error('updateTicketStatus called with invalid instanceName:', instanceName);
        throw new Error('instanceName cannot be undefined or empty');
      }
      if (!remoteJid || remoteJid.trim() === '') {
        console.error('updateTicketStatus called with invalid remoteJid:', remoteJid);
        throw new Error('remoteJid cannot be undefined or empty');
      }
      
      const q = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', remoteJid),
        where('instanceName', '==', instanceName)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        const ticketDoc = querySnapshot.docs[0];
        await firestoreRetry.updateDocument('tickets', ticketDoc.id, {
          status,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  // Atualizar informações do chat
  async updateChatInfo(chatData: {
    remoteJid: string;
    instanceName: string;
    unreadCount?: number;
    lastMessageTime?: number;
    chatData?: any;
  }): Promise<void> {
    try {
      const q = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', chatData.remoteJid),
        where('instanceName', '==', chatData.instanceName)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        const ticketDoc = querySnapshot.docs[0];
        const updateData: any = {
          updatedAt: serverTimestamp()
        };
        
        if (chatData.unreadCount !== undefined) {
          updateData.unreadCount = chatData.unreadCount;
        }
        
        if (chatData.lastMessageTime) {
          updateData.lastMessageTime = Timestamp.fromMillis(chatData.lastMessageTime * 1000);
        }
        
        await firestoreRetry.updateDocument('tickets', ticketDoc.id, updateData);
        console.log(`Chat info updated for ${chatData.remoteJid}`);
      }
    } catch (error) {
      console.error('Error updating chat info:', error);
      throw error;
    }
  }

  // Criar dados de teste para instâncias (função temporária)
  async createTestInstance(): Promise<void> {
    try {
      const testInstanceData = {
        instanceName: 'test-instance', // Corrigido: era 'name', agora é 'instanceName'
        connectionState: 'open',
        statusReason: 0,
        wuid: 'test@s.whatsapp.net',
        profileName: 'Test Instance',
        profilePictureUrl: '',
        lastUpdate: new Date()
      };
      
      await this.updateInstanceConnection(testInstanceData);
      
      // Criar tickets de teste com diferentes status
      await this.createTestTickets();
    } catch (error) {
      console.error('Error creating test instance:', error);
    }
  }

  async createTestTickets(): Promise<void> {
    try {
      const testTickets = [
        {
          remoteJid: '5511999999001@s.whatsapp.net',
          pushName: 'Cliente Teste 1',
          instanceName: 'test-instance',
          status: 'open' as const,
          subject: 'Dúvida sobre produto',
          lastMessage: 'Olá, gostaria de saber mais sobre seus produtos'
        },
        {
          remoteJid: '5511999999002@s.whatsapp.net',
          pushName: 'Cliente Teste 2',
          instanceName: 'test-instance',
          status: 'pending' as const,
          subject: 'Aguardando resposta',
          lastMessage: 'Aguardando retorno sobre o orçamento'
        },
        {
          remoteJid: '5511999999003@s.whatsapp.net',
          pushName: 'Cliente Teste 3',
          instanceName: 'test-instance',
          status: 'pending' as const,
          subject: 'Em atendimento',
          lastMessage: 'Estou analisando sua solicitação'
        },
        {
          remoteJid: '5511999999004@s.whatsapp.net',
          pushName: 'Cliente Teste 4',
          instanceName: 'test-instance',
          status: 'resolved' as const,
          subject: 'Problema resolvido',
          lastMessage: 'Obrigado, problema foi resolvido!'
        }
      ];
      
      for (const ticketData of testTickets) {
        await this.updateChatInfo({
          remoteJid: ticketData.remoteJid,
          instanceName: ticketData.instanceName,
          lastMessageTime: Date.now(),
          unreadCount: Math.floor(Math.random() * 5)
        });
        
        await this.updateTicketStatus(
          ticketData.instanceName,
          ticketData.remoteJid,
          ticketData.status
        );
      }
    } catch (error) {
      console.error('Error creating test tickets:', error);
    }
  }

  // Sincronizar instâncias da API externa com Firebase
  async syncInstancesFromAPI(): Promise<void> {
    try {
      // Importar evolutionApi aqui para evitar dependência circular
      const { evolutionApi } = await import('./evolution-api');
      
      // Buscar instâncias da API externa
      const apiInstances = await evolutionApi.getInstances();
      
      // Sincronizar cada instância conectada
      for (const apiInstance of apiInstances) {
        if (apiInstance.status === 'connected' && apiInstance.instance?.connectionStatus === 'open') {
          await this.updateInstanceConnection({
            instanceName: apiInstance.name,
            connectionState: 'open',
            statusReason: 0,
            wuid: apiInstance.instance?.ownerJid,
            profileName: apiInstance.instance?.profileName,
            profilePictureUrl: apiInstance.instance?.profilePicUrl,
            lastUpdate: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error syncing instances from API:', error);
    }
  }

  // Função de debug temporária para listar todas as instâncias
  async debugAllInstances(): Promise<void> {
    try {
      const allInstancesQuery = query(collection(db, 'instances'));
      const allInstancesSnapshot = await getDocs(allInstancesQuery);
      
      if (allInstancesSnapshot.empty) {
        return;
      }
      
      // Verificar diferentes estados de conexão
      const connectionStates = new Map<string, number>();
      allInstancesSnapshot.forEach((doc) => {
        const state = doc.data().connectionState || 'undefined';
        connectionStates.set(state, (connectionStates.get(state) || 0) + 1);
      });
      
    } catch (error) {
      console.error('Error in debugAllInstances:', error);
    }
  }

  // Buscar instâncias disponíveis
  async getAvailableInstances(): Promise<string[]> {
    try {
      // Primeiro, vamos verificar se a coleção 'instances' existe e tem documentos
      const allInstancesQuery = query(collection(db, 'instances'));
      const allInstancesSnapshot = await firestoreRetry.getDocuments(allInstancesQuery);
      
      if (allInstancesSnapshot.empty) {
        return [];
      }
      
      // Agora fazer a query específica para instâncias conectadas
      const q = query(
        collection(db, 'instances'),
        where('connectionState', '==', 'open')
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      const instances: string[] = [];
      const instancesSet = new Set<string>(); // Para evitar duplicatas
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.name && typeof data.name === 'string' && data.name.trim() !== '') {
          // Verificar se já foi adicionado para evitar duplicatas
          if (!instancesSet.has(data.name)) {
            instances.push(data.name);
            instancesSet.add(data.name);
          }
        }
      });
      
      // Ordenar instâncias para consistência
      instances.sort();
      
      return instances;
    } catch (error) {
      console.error('Error getting available instances:', error);
      return [];
    }
  }

  // Buscar tickets de todas as instâncias
  async getAllTickets(): Promise<Ticket[]> {
    try {
      const instances = await this.getAvailableInstances();
      
      if (instances.length === 0) {
        console.log('No connected instances found');
        return [];
      }
      
      const allTickets: Ticket[] = [];
      
      // Buscar tickets de cada instância
      for (const instanceName of instances) {
        try {
          const instanceTickets = await this.getTickets(instanceName);
          allTickets.push(...instanceTickets);
        } catch (error) {
          console.error(`Error getting tickets for instance ${instanceName}:`, error);
        }
      }
      
      // Ordenar por data de atualização
      allTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      console.log(`Found ${allTickets.length} total tickets across all instances`);
      return allTickets;
    } catch (error) {
      console.error('Error getting all tickets:', error);
      return [];
    }
  }

  // Escutar tickets de todas as instâncias em tempo real
  subscribeToAllTickets(
    callback: (tickets: Ticket[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    let unsubscribeFunctions: (() => void)[] = [];
    let allTickets: Map<string, Ticket> = new Map();
    
    const updateCallback = () => {
      const tickets = Array.from(allTickets.values());
      tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      callback(tickets);
    };
    
    // Função para configurar subscriptions para todas as instâncias
    const setupSubscriptions = async () => {
      try {
        const instances = await this.getAvailableInstances();
        
        // Limpar subscriptions anteriores
        unsubscribeFunctions.forEach(unsub => unsub());
        unsubscribeFunctions = [];
        allTickets.clear();
        
        if (instances.length === 0) {
          console.log('No connected instances found for subscription');
          callback([]);
          return;
        }
        
        // Criar subscription para cada instância
        instances.forEach(instanceName => {
          const unsubscribe = this.subscribeToTickets(
            instanceName,
            (instanceTickets) => {
              // Atualizar tickets desta instância no Map
              instanceTickets.forEach(ticket => {
                allTickets.set(`${ticket.instanceName}-${ticket.id}`, ticket);
              });
              
              // Remover tickets antigos desta instância que não estão mais na lista
              const currentInstanceTicketIds = new Set(
                instanceTickets.map(t => `${t.instanceName}-${t.id}`)
              );
              
              const ticketEntries = Array.from(allTickets.entries());
              for (const [key, ticket] of ticketEntries) {
                if (ticket.instanceName === instanceName && !currentInstanceTicketIds.has(key)) {
                  allTickets.delete(key);
                }
              }
              
              updateCallback();
            },
            errorCallback
          );
          
          unsubscribeFunctions.push(unsubscribe);
        });
        
        console.log(`Set up subscriptions for ${instances.length} instances`);
      } catch (error) {
        console.error('Error setting up all tickets subscription:', error);
        if (errorCallback) errorCallback(error instanceof Error ? error : new Error(String(error)));
      }
    };
    
    // Configurar subscriptions iniciais
    setupSubscriptions();
    
    // Retornar função de cleanup
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
      unsubscribeFunctions = [];
      allTickets.clear();
    };
  }

  // Atualizar informações de conexão da instância
  async updateInstanceConnection(connectionData: {
    instanceName: string;
    connectionState: string;
    statusReason?: number;
    wuid?: string;
    profileName?: string;
    profilePictureUrl?: string;
    lastUpdate: Date;
  }): Promise<void> {
    try {
      // Validar se instanceName tem um valor válido
      if (!connectionData.instanceName || connectionData.instanceName.trim() === '') {
        console.error('updateInstanceConnection called with invalid instanceName:', connectionData.instanceName);
        throw new Error('instanceName cannot be undefined or empty');
      }
      
      const q = query(
        collection(db, 'instances'),
        where('name', '==', connectionData.instanceName)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      // Filtrar campos undefined para evitar erro do Firebase
      const updateData: any = {
        connectionState: connectionData.connectionState,
        lastConnectionUpdate: Timestamp.fromDate(connectionData.lastUpdate),
        updatedAt: serverTimestamp()
      };
      
      // Adicionar apenas campos que não são undefined
      if (connectionData.statusReason !== undefined) {
        updateData.statusReason = connectionData.statusReason;
      }
      if (connectionData.wuid !== undefined) {
        updateData.wuid = connectionData.wuid;
      }
      if (connectionData.profileName !== undefined) {
        updateData.profileName = connectionData.profileName;
      }
      if (connectionData.profilePictureUrl !== undefined) {
        updateData.profilePictureUrl = connectionData.profilePictureUrl;
      }
      
      if (!querySnapshot.empty) {
        // Atualizar instância existente
        const instanceDoc = querySnapshot.docs[0];
        await firestoreRetry.updateDocument('instances', instanceDoc.id, updateData);
      } else {
        // Criar nova entrada de instância se não existir
        await firestoreRetry.addDocument('instances', {
          name: connectionData.instanceName,
          ...updateData,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating instance connection:', error);
      throw error;
    }
  }

  // Atualizar última mensagem do ticket
  private async updateTicketLastMessage(
    remoteJid: string, 
    instanceName: string, 
    lastMessage: string
  ): Promise<void> {
    try {
      // Validar parâmetros antes de usar na query
      if (!remoteJid || remoteJid.trim() === '') {
        console.error('updateTicketLastMessage called with invalid remoteJid:', remoteJid);
        return;
      }
      if (!instanceName || instanceName.trim() === '') {
        console.error('updateTicketLastMessage called with invalid instanceName:', instanceName);
        return;
      }
      
      const q = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', remoteJid),
        where('instanceName', '==', instanceName)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        const ticketDoc = querySnapshot.docs[0];
        await firestoreRetry.updateDocument('tickets', ticketDoc.id, {
          lastMessage,
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating ticket last message:', error);
    }
  }

  // Atualizar status de mensagem
  async updateMessageStatus(messageId: string, updateData: any): Promise<void> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('messageId', '==', messageId)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        const messageDoc = querySnapshot.docs[0];
        await firestoreRetry.updateDocument('messages', messageDoc.id, {
          ...updateData,
          updatedAt: serverTimestamp()
        });
        console.log(`Message ${messageId} status updated`);
      } else {
        throw new Error(`Message ${messageId} not found`);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  // Buscar tickets por chat
  async getTicketsByChat(remoteJid: string, instanceName: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', remoteJid),
        where('instanceName', '==', instanceName)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      const tickets: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tickets.push({
          id: doc.id,
          ...data
        });
      });
      
      return tickets;
    } catch (error) {
      console.error('Error getting tickets by chat:', error);
      return [];
    }
  }

  // Salvar ticket com invalidação de cache
  async saveTicket(ticketData: any): Promise<string> {
    try {
      const docId = await firestoreRetry.addDocument('tickets', {
        ...ticketData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`New ticket saved with ID: ${docId}`);
      
      // Invalidar cache em cascata após criar ticket
      await this.invalidateTicketCache(
        ticketData.instanceName,
        docId,
        ticketData.remoteJid
      );
      
      return docId;
    } catch (error) {
      console.error('Error saving ticket:', error);
      throw error;
    }
  }

  // Atualizar ticket com invalidação de cache
  async updateTicket(ticketId: string, updateData: any): Promise<void> {
    try {
      await firestoreRetry.updateDocument('tickets', ticketId, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Ticket ${ticketId} updated`);
      
      // Invalidar cache em cascata após atualizar ticket
      if (updateData.instanceName || updateData.remoteJid) {
        await this.invalidateTicketCache(
          updateData.instanceName,
          ticketId,
          updateData.remoteJid
        );
      } else {
        // Se não temos instanceName/remoteJid no updateData, buscar do ticket existente
        try {
          const ticketDoc = await this.getDocument('tickets', ticketId);
          if (ticketDoc) {
            await this.invalidateTicketCache(
              ticketDoc.instanceName,
              ticketId,
              ticketDoc.remoteJid
            );
          }
        } catch (fetchError) {
          console.warn('⚠️ Não foi possível buscar dados do ticket para invalidação:', fetchError);
        }
      }
      
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  }

  // Cache warming - pré-carregar dados frequentes
  async warmCache(instanceName: string): Promise<void> {
    try {
      console.log('🔥 Iniciando cache warming para instância:', instanceName);
      
      // Pré-carregar tickets mais recentes
      const tickets = await this.getTickets(instanceName);
      console.log(`🔥 Cache warming: ${tickets.length} tickets carregados`);
      
      // Pré-carregar contatos dos tickets
      const contacts = tickets.map(ticket => ticket.client).filter(client => client.phone);
      if (contacts.length > 0 && cacheService && 'setContactBatch' in cacheService) {
        await (cacheService as any).setContactBatch(contacts, 1800); // TTL de 30 minutos
        console.log(`🔥 Cache warming: ${contacts.length} contatos carregados`);
      }
      
      // Pré-carregar mensagens dos 5 tickets mais ativos
      const activeTickets = tickets.slice(0, 5);
      for (const ticket of activeTickets) {
        await this.getMessages(ticket.client.id, instanceName, 20);
      }
      console.log(`🔥 Cache warming: mensagens dos ${activeTickets.length} tickets mais ativos carregadas`);
      
      console.log('🔥 Cache warming concluído com sucesso');
    } catch (error) {
      console.error('❌ Erro durante cache warming:', error);
    }
  }
  
  // Invalidação inteligente em cascata do cache Redis
  async invalidateRelatedCache(instanceName: string, remoteJid?: string, ticketId?: string): Promise<void> {
    try {
      console.log('🧹 Iniciando invalidação em cascata do cache...', { instanceName, remoteJid, ticketId });
      
      if (!cacheService) {
        console.warn('⚠️ Cache service não disponível para invalidação');
        return;
      }

      // 1. Invalidação em cascata hierárquica
      const invalidationPromises: Promise<any>[] = [];
      
      // Cache principal de tickets
      invalidationPromises.push(
        (cacheService as any).delete(`tickets:${instanceName}:list`)
      );
      
      // Cache por status (invalidar todos os status)
      invalidationPromises.push(
        (cacheService as any).invalidatePattern(`tickets:${instanceName}:status:*`)
      );
      
      // Cache de contadores e métricas
      invalidationPromises.push(
        (cacheService as any).delete(`tickets:${instanceName}:counters`),
        (cacheService as any).delete(`tickets:${instanceName}:metrics`)
      );
      
      // Cache de estatísticas da API
      invalidationPromises.push(
        (cacheService as any).delete(`api:tickets:${instanceName}:stats`)
      );
      
      if (ticketId) {
        // Cache de ticket individual
        invalidationPromises.push(
          (cacheService as any).delete(`ticket:${instanceName}:${ticketId}`)
        );
      }
      
      if (remoteJid) {
        // Cache de mensagens específicas
        const messagePatterns = [
          `messages:${instanceName}:${remoteJid}:*`,
          `message:${instanceName}:${remoteJid}:*`
        ];
        
        for (const pattern of messagePatterns) {
          invalidationPromises.push(
            (cacheService as any).invalidatePattern(pattern)
          );
        }
        
        // Cache de ticket por remoteJid
        invalidationPromises.push(
          (cacheService as any).delete(`ticket:${instanceName}:${remoteJid}`)
        );
        
        // Cache de contato
        const phoneNumber = remoteJid.split('@')[0];
        invalidationPromises.push(
          (cacheService as any).invalidateContact(phoneNumber)
        );
      }
      
      // 2. Executar todas as invalidações em paralelo
      await Promise.allSettled(invalidationPromises);
      
      // 3. Log detalhado da invalidação
      console.log('🧹 Cache invalidado em cascata:', {
        instanceName,
        remoteJid,
        ticketId,
        invalidatedCaches: [
          'tickets:list',
          'tickets:status:*',
          'tickets:counters',
          'tickets:metrics',
          'api:stats',
          ...(ticketId ? ['ticket:individual'] : []),
          ...(remoteJid ? ['messages:*', 'ticket:remoteJid', 'contact'] : [])
        ]
      });
      
    } catch (error) {
      console.error('❌ Erro durante invalidação em cascata:', error);
    }
  }

  // Invalidação específica para operações de ticket
  async invalidateTicketCache(instanceName: string, ticketId: string, remoteJid: string): Promise<void> {
    await this.invalidateRelatedCache(instanceName, remoteJid, ticketId);
  }

  // Invalidação para operações de mensagem
  async invalidateMessageCache(instanceName: string, remoteJid: string): Promise<void> {
    try {
      if (!cacheService) return;
      
      // Invalidar apenas caches relacionados a mensagens
      const promises = [
        (cacheService as any).invalidatePattern(`messages:${instanceName}:${remoteJid}:*`),
        (cacheService as any).invalidatePattern(`message:${instanceName}:${remoteJid}:*`)
      ];
      
      await Promise.allSettled(promises);
      console.log('🧹 Cache de mensagens invalidado:', { instanceName, remoteJid });
    } catch (error) {
      console.error('❌ Erro ao invalidar cache de mensagens:', error);
    }
  }
  
  // Buscar contato com cache
  async getContact(phone: string): Promise<Client | null> {
    try {
      // Verificar cache primeiro
      if (cacheService && 'getContact' in cacheService) {
        const cachedContact = await (cacheService as any).getContact(phone);
        if (cachedContact) {
          console.log('📦 Contato encontrado no cache');
          return cachedContact;
        }
      }
      
      // Buscar contato nos tickets (já que não há coleção separada de contatos)
      const normalizedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
      const q = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', normalizedPhone)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        const ticketDoc = querySnapshot.docs[0];
        const ticketData = ticketDoc.data() as FirebaseTicket;
        const contact = ticketData.client;
        
        // Armazenar no cache (TTL: 30 minutos)
        if (cacheService && 'setContact' in cacheService) {
          await (cacheService as any).setContact(phone, { id: phone, ...contact }, 1800);
        }
        
        return {
          id: contact.phone, // Use phone as ID since it's unique
          ...contact
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting contact:', error);
      return null;
    }
  }
  
  // Atualizar contato com cache
  async updateContact(phone: string, contactData: Partial<Client>): Promise<void> {
    try {
      const normalizedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
      
      // Buscar tickets do contato
      const q = query(
        collection(db, 'tickets'),
        where('remoteJid', '==', normalizedPhone)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      // Atualizar todos os tickets do contato
      const updatePromises = querySnapshot.docs.map(async (ticketDoc) => {
        const currentData = ticketDoc.data() as FirebaseTicket;
        const updatedClient = { ...currentData.client, ...contactData };
        
        return firestoreRetry.updateDocument('tickets', ticketDoc.id, {
          client: updatedClient,
          updatedAt: serverTimestamp()
        });
      });
      
      await Promise.all(updatePromises);
      
      // Atualizar cache
      const existingContact = await this.getContact(phone);
      if (existingContact && cacheService && 'setContact' in cacheService) {
        const updatedContact = { ...existingContact, ...contactData };
        await (cacheService as any).setContact(phone, updatedContact, 1800);
      }
      
      console.log(`Contato ${phone} atualizado com sucesso`);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  // Converter FirebaseMessage para Message
  private convertFirebaseMessageToMessage(firebaseMessage: any, id: string): Message {
    // Para mensagens de mídia, usar mediaUrl como content se disponível
    let content = firebaseMessage.content || firebaseMessage.body || '';
    if (firebaseMessage.mediaUrl && firebaseMessage.type !== 'text' && firebaseMessage.type !== 'note') {
      content = firebaseMessage.mediaUrl;
    }
    
    // Determinar o sender baseado nos dados disponíveis
    let sender: 'client' | 'agent' = 'client';
    if (firebaseMessage.sender) {
      sender = firebaseMessage.sender;
    } else if (firebaseMessage.isFromMe !== undefined) {
      sender = firebaseMessage.isFromMe ? 'agent' : 'client';
    } else if (firebaseMessage.key?.fromMe !== undefined) {
      sender = firebaseMessage.key.fromMe ? 'agent' : 'client';
    }
    
    return {
      id,
      messageId: firebaseMessage.messageId || firebaseMessage.key?.id || id,
      content,
      sender,
      timestamp: firebaseMessage.timestamp?.toDate() || new Date(firebaseMessage.messageTimestamp * 1000) || new Date(),
      status: firebaseMessage.status || 'delivered',
      type: firebaseMessage.type || firebaseMessage.messageType || 'text',
      isFromMe: firebaseMessage.isFromMe || firebaseMessage.key?.fromMe || sender === 'agent',
      pushName: firebaseMessage.pushName || firebaseMessage.senderName,
      senderName: firebaseMessage.pushName || firebaseMessage.senderName,
      // Media fields
      mediaUrl: firebaseMessage.mediaUrl,
      fileName: firebaseMessage.fileName,
      // Reply/Quote metadata mapping
      quotedMessageId: firebaseMessage.quotedMessageId,
      quotedMessageContent: firebaseMessage.quotedMessageContent,
      quotedMessageSender: firebaseMessage.quotedMessageSender,
    };
  }

  // Métodos genéricos para integração com outros serviços
  async addDocument(collectionPath: string, data: any): Promise<string> {
    try {
      // Se o path contém subcoleções (ex: tickets/123/messages), usar addDoc diretamente
      if (collectionPath.includes('/')) {
        const collectionRef = collection(db, collectionPath);
        const docRef = await addDoc(collectionRef, {
          ...data,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      } else {
        // Path simples, usar firestoreRetry
        return await firestoreRetry.addDocument(collectionPath, {
          ...data,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      throw error;
    }
  }

  async updateDocument(collectionPath: string, docId: string, data: any): Promise<void> {
    try {
      // Se o path contém subcoleções (ex: tickets/123/messages), usar doc() diretamente
      if (collectionPath.includes('/')) {
        const docRef = doc(db, collectionPath, docId);
        await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        // Path simples, usar firestoreRetry
        await firestoreRetry.updateDocument(collectionPath, docId, {
          ...data,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Error updating document ${docId} in ${collectionPath}:`, error);
      throw error;
    }
  }

  async getDocument(collectionPath: string, docId: string): Promise<any | null> {
    try {
      const docRef = doc(db, collectionPath, docId);
      const docSnap = await firestoreRetry.getDocument(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error(`Error getting document ${docId} from ${collectionPath}:`, error);
      return null;
    }
  }

  async queryDocuments(collectionName: string, filters: any): Promise<any[]> {
    try {
      const q = query(collection(db, collectionName));
      const querySnapshot = await firestoreRetry.getDocuments(q);
      const documents: any[] = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return documents;
    } catch (error) {
      console.error(`Error querying documents from ${collectionName}:`, error);
      return [];
    }
  }

  // Converter FirebaseTicket para Ticket
  private convertFirebaseTicketToTicket(firebaseTicket: FirebaseTicket, id: string): Ticket {
    return {
      id,
      client: {
        id: firebaseTicket.remoteJid,
        name: firebaseTicket.client.name,
        phone: firebaseTicket.client.phone,
        email: firebaseTicket.client.email,
        subject: firebaseTicket.client.subject,
        avatar: firebaseTicket.client.avatar,
        isOnline: false // Será atualizado via presence
      },
      subject: firebaseTicket.client.subject || 'Conversa',
      status: firebaseTicket.status,
      priority: 'medium' as const,
      channel: 'whatsapp' as const,
      createdAt: firebaseTicket.createdAt?.toDate() || new Date(),
      updatedAt: firebaseTicket.updatedAt?.toDate() || new Date(),
      lastMessage: firebaseTicket.lastMessage || '',
      lastMessageTime: firebaseTicket.lastMessageTime?.toDate() || new Date(),
      unreadCount: firebaseTicket.unreadCount,
      messages: [], // Será carregado separadamente
      tags: [],
      assignedTo: undefined,
      instanceName: firebaseTicket.instanceName
    };
  }
  
  // Buscar mensagem por ID
  async getMessageById(messageId: string): Promise<any | null> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('messageId', '==', messageId)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting message by ID:', error);
      return null;
    }
  }
  
  // Atualizar status da mensagem
  async updateMessageStatusById(messageId: string, status: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('messageId', '==', messageId)
      );
      
      const querySnapshot = await firestoreRetry.getDocuments(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        await firestoreRetry.updateDocument('messages', doc.id, {
          status,
          updatedAt: serverTimestamp()
        });
        console.log(`Message ${messageId} status updated to ${status}`);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();