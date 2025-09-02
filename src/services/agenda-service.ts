import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  location?: string;
  category: 'meeting' | 'call' | 'task' | 'other' | 'presentation';
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  contactId?: string;
  projectId?: string;
  participants?: string[];
  reminders?: {
    type: 'email' | 'notification' | 'sms';
    minutes: number;
  }[];
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    count?: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  isPrivate?: boolean;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface EventFilter {
  category?: string[];
  priority?: string[];
  status?: string[];
  contactId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  createdBy?: string;
}

class AgendaService {
  private collectionName = 'events';

  // Convert Firestore document to AgendaEvent
  private convertFirestoreDoc(doc: any): AgendaEvent {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      start: data.start instanceof Timestamp ? data.start.toDate() : new Date(data.start),
      end: data.end instanceof Timestamp ? data.end.toDate() : new Date(data.end),
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
      recurrence: data.recurrence ? {
        ...data.recurrence,
        endDate: data.recurrence.endDate instanceof Timestamp ? 
          data.recurrence.endDate.toDate() : 
          data.recurrence.endDate ? new Date(data.recurrence.endDate) : undefined
      } : undefined
    };
  }

  // Get all events
  async getEvents(filter?: EventFilter): Promise<AgendaEvent[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('start', 'asc')
      );

      // Apply filters
      if (filter) {
        if (filter.category && filter.category.length > 0) {
          q = query(q, where('category', 'in', filter.category));
        }
        if (filter.priority && filter.priority.length > 0) {
          q = query(q, where('priority', 'in', filter.priority));
        }
        if (filter.status && filter.status.length > 0) {
          q = query(q, where('status', 'in', filter.status));
        }
        if (filter.contactId) {
          q = query(q, where('contactId', '==', filter.contactId));
        }
        if (filter.projectId) {
          q = query(q, where('projectId', '==', filter.projectId));
        }
        if (filter.createdBy) {
          q = query(q, where('createdBy', '==', filter.createdBy));
        }
        if (filter.startDate) {
          q = query(q, where('start', '>=', filter.startDate));
        }
        if (filter.endDate) {
          q = query(q, where('start', '<=', filter.endDate));
        }
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      throw new Error('Falha ao carregar eventos');
    }
  }

  // Get event by ID
  async getEventById(eventId: string): Promise<AgendaEvent | null> {
    try {
      const docRef = doc(db, this.collectionName, eventId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.convertFirestoreDoc(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar evento:', error);
      throw new Error('Falha ao carregar evento');
    }
  }

  // Create new event
  async createEvent(eventData: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgendaEvent> {
    try {
      console.log('🔍 [AgendaService] Received eventData:', eventData);
      
      const now = serverTimestamp();
      
      // Clean the recurrence data more carefully
      let cleanRecurrence = undefined;
      if (eventData.recurrence && typeof eventData.recurrence === 'object') {
        cleanRecurrence = {
          ...eventData.recurrence,
          endDate: eventData.recurrence.endDate ? new Date(eventData.recurrence.endDate) : undefined
        };
        // Remove undefined endDate if it exists
        if (cleanRecurrence.endDate === undefined) {
          delete cleanRecurrence.endDate;
        }
      }
      
      const docData = {
        ...eventData,
        start: new Date(eventData.start),
        end: new Date(eventData.end),
        createdAt: now,
        updatedAt: now,
        ...(cleanRecurrence && { recurrence: cleanRecurrence })
      };
      
      // Remove any undefined values from docData
      Object.keys(docData).forEach(key => {
        if (docData[key] === undefined) {
          delete docData[key];
        }
      });
      
      console.log('🔍 [AgendaService] Final docData to be saved:', docData);
      console.log('🔍 [AgendaService] DocData keys:', Object.keys(docData));
      console.log('🔍 [AgendaService] DocData values types:', Object.entries(docData).map(([k, v]) => [k, typeof v, v]));

      const docRef = await addDoc(collection(db, this.collectionName), docData);
      const newDoc = await getDoc(docRef);
      
      if (newDoc.exists()) {
        console.log('🔍 [AgendaService] Event created successfully with ID:', docRef.id);
        return this.convertFirestoreDoc(newDoc);
      }
      
      throw new Error('Falha ao criar evento');
    } catch (error) {
      console.error('🔍 [AgendaService] Detailed error in createEvent:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        eventData
      });
      throw new Error('Falha ao criar evento');
    }
  }

  // Update event
  async updateEvent(eventData: AgendaEvent): Promise<AgendaEvent> {
    try {
      const docRef = doc(db, this.collectionName, eventData.id);
      
      // Prepare update data with proper handling of optional fields
      let updateData: any = {
        ...eventData,
        start: new Date(eventData.start),
        end: new Date(eventData.end),
        updatedAt: serverTimestamp()
      };
      
      // Handle recurrence field properly
      if (eventData.recurrence && typeof eventData.recurrence === 'object') {
        const cleanRecurrence: any = {
          ...eventData.recurrence
        };
        
        // Only include endDate if it has a valid value
        if (eventData.recurrence.endDate) {
          cleanRecurrence.endDate = new Date(eventData.recurrence.endDate);
        }
        
        updateData.recurrence = cleanRecurrence;
      }
      
      // Remove id from update data
      delete updateData.id;
      
      // Remove all undefined values to prevent Firebase errors
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );
      
      console.log('🔍 [AgendaService] Update data before sending to Firebase:', cleanUpdateData);
      
      await updateDoc(docRef, cleanUpdateData);
      
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        return this.convertFirestoreDoc(updatedDoc);
      }
      
      throw new Error('Falha ao atualizar evento');
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      throw new Error('Falha ao atualizar evento');
    }
  }

  // Delete event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, eventId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      throw new Error('Falha ao excluir evento');
    }
  }

  // Get events by date range
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<AgendaEvent[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('start', '>=', startDate),
        where('start', '<=', endDate),
        orderBy('start', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
    } catch (error) {
      console.error('Erro ao buscar eventos por período:', error);
      throw new Error('Falha ao carregar eventos do período');
    }
  }

  // Get upcoming events
  async getUpcomingEvents(limitCount = 10): Promise<AgendaEvent[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collectionName),
        where('start', '>=', now),
        orderBy('start', 'asc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
    } catch (error) {
      console.error('Erro ao buscar próximos eventos:', error);
      throw new Error('Falha ao carregar próximos eventos');
    }
  }

  // Get events by contact
  async getEventsByContact(contactId: string): Promise<AgendaEvent[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('contactId', '==', contactId),
        orderBy('start', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
    } catch (error) {
      console.error('Erro ao buscar eventos do contato:', error);
      throw new Error('Falha ao carregar eventos do contato');
    }
  }

  // Get events by project
  async getEventsByProject(projectId: string): Promise<AgendaEvent[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('projectId', '==', projectId),
        orderBy('start', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
    } catch (error) {
      console.error('Erro ao buscar eventos do projeto:', error);
      throw new Error('Falha ao carregar eventos do projeto');
    }
  }

  // Search events
  async searchEvents(searchTerm: string): Promise<AgendaEvent[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation that searches in title
      // For better search, consider using Algolia or similar service
      const q = query(
        collection(db, this.collectionName),
        orderBy('start', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const allEvents = querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
      
      const searchTermLower = searchTerm.toLowerCase();
      return allEvents.filter(event => 
        event.title.toLowerCase().includes(searchTermLower) ||
        event.description?.toLowerCase().includes(searchTermLower) ||
        event.location?.toLowerCase().includes(searchTermLower)
      );
    } catch (error) {
      console.error('Erro ao pesquisar eventos:', error);
      throw new Error('Falha ao pesquisar eventos');
    }
  }

  // Export events to iCal format
  exportToICal(events: AgendaEvent[]): string {
    const icalHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CRM System//Agenda//PT'
    ].join('\r\n');

    const icalFooter = 'END:VCALENDAR';

    const icalEvents = events.map(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      return [
        'BEGIN:VEVENT',
        `UID:${event.id}@crm-system.com`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description}` : '',
        event.location ? `LOCATION:${event.location}` : '',
        `STATUS:${event.status.toUpperCase()}`,
        `PRIORITY:${event.priority === 'high' ? '1' : event.priority === 'medium' ? '5' : '9'}`,
        'END:VEVENT'
      ].filter(line => line).join('\r\n');
    }).join('\r\n');

    return [icalHeader, icalEvents, icalFooter].join('\r\n');
  }

  // Export events to CSV format
  exportToCSV(events: AgendaEvent[]): string {
    const headers = [
      'ID',
      'Título',
      'Descrição',
      'Data Início',
      'Data Fim',
      'Dia Inteiro',
      'Local',
      'Categoria',
      'Prioridade',
      'Status',
      'Contato ID',
      'Projeto ID'
    ];

    const csvRows = events.map(event => [
      event.id,
      `"${event.title}"`,
      `"${event.description || ''}"`,
      new Date(event.start).toLocaleString('pt-BR'),
      new Date(event.end).toLocaleString('pt-BR'),
      event.allDay ? 'Sim' : 'Não',
      `"${event.location || ''}"`,
      event.category,
      event.priority,
      event.status,
      event.contactId || '',
      event.projectId || ''
    ]);

    return [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
  }

  // Seed events for demonstration
  async seedEvents(): Promise<void> {
    try {
      console.log('🌱 Iniciando seed de eventos...');
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const sampleEvents = [
        {
          title: 'Reunião com Cliente - Projeto Alpha',
          description: 'Discussão sobre os requisitos do projeto e cronograma de entrega',
          start: new Date(today.getTime() + 14 * 60 * 60 * 1000), // Hoje às 14:00
          end: new Date(today.getTime() + 15.5 * 60 * 60 * 1000), // Hoje às 15:30
          allDay: false,
          category: 'meeting' as const,
          priority: 'high' as const,
          status: 'scheduled' as const,
          location: 'Sala de Reuniões 1',
          contactId: '1',
          projectId: '1',
          createdBy: 'system'
        },
        {
          title: 'Apresentação Projeto Beta',
          description: 'Apresentação dos resultados do projeto para stakeholders',
          start: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Amanhã às 10:00
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // Amanhã às 12:00
          allDay: false,
          category: 'meeting' as const,
          priority: 'high' as const,
          status: 'scheduled' as const,
          location: 'Auditório Principal',
          projectId: '2',
          createdBy: 'system'
        },
        {
          title: 'Ligação Follow-up - Maria Santos',
          description: 'Acompanhamento do projeto e próximos passos',
          start: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // Em 3 dias às 09:00
          end: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 9.5 * 60 * 60 * 1000), // Em 3 dias às 09:30
          allDay: false,
          category: 'call' as const,
          priority: 'medium' as const,
          status: 'scheduled' as const,
          contactId: '2',
          createdBy: 'system'
        },
        {
          title: 'Tarefa: Revisar Proposta Comercial',
          description: 'Análise detalhada da proposta antes do envio ao cliente',
          start: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Em 2 dias
          end: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Em 2 dias
          allDay: true,
          category: 'task' as const,
          priority: 'medium' as const,
          status: 'scheduled' as const,
          createdBy: 'system'
        },
        {
          title: 'Workshop de Treinamento',
          description: 'Treinamento da equipe em novas tecnologias',
          start: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Em 1 semana às 14:00
          end: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000), // Em 1 semana às 17:00
          allDay: false,
          category: 'other' as const,
          priority: 'low' as const,
          status: 'scheduled' as const,
          location: 'Sala de Treinamento',
          createdBy: 'system'
        },
        {
          title: 'Reunião de Planejamento Mensal',
          description: 'Revisão de metas e planejamento para o próximo mês',
          start: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Em 10 dias às 10:00
          end: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // Em 10 dias às 12:00
          allDay: false,
          category: 'meeting' as const,
          priority: 'high' as const,
          status: 'scheduled' as const,
          location: 'Sala de Reuniões 2',
          createdBy: 'system'
        },
        {
          title: 'Ligação - Pedro Costa',
          description: 'Discussão sobre parceria estratégica',
          start: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // Em 5 dias às 15:00
          end: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // Em 5 dias às 16:00
          allDay: false,
          category: 'call' as const,
          priority: 'medium' as const,
          status: 'scheduled' as const,
          contactId: '3',
          createdBy: 'system'
        },
        {
          title: 'Entrega do Projeto Gamma',
          description: 'Entrega final do projeto para o cliente',
          start: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // Em 2 semanas
          end: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // Em 2 semanas
          allDay: true,
          category: 'task' as const,
          priority: 'high' as const,
          status: 'scheduled' as const,
          projectId: '3',
          createdBy: 'system'
        }
      ];

      // Criar eventos no Firebase
      for (const eventData of sampleEvents) {
        await this.createEvent(eventData);
        console.log(`✅ Evento criado: ${eventData.title}`);
      }

      console.log('🎉 Seed de eventos concluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao fazer seed de eventos:', error);
      throw new Error('Falha ao popular eventos de exemplo');
    }
  }
}

export const agendaService = new AgendaService();