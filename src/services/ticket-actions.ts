import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Ticket } from '../components/crm/types';
import { logger } from '../utils/logger';

export interface TicketAction {
  id: string;
  ticketId: string;
  action: 'finalize' | 'transfer' | 'cancel';
  performedBy: string;
  timestamp: Date;
  details: {
    reason?: string;
    transferTo?: string;
    department?: string;
    previousStatus?: string;
    newStatus?: string;
  };
}

export interface TransferData {
  destinatario: string;
  departamento?: string;
  motivo: string;
}

export interface CancelData {
  motivo: string;
}

// Validação de permissões do usuário
export function validateUserPermissions(userId: string, action: string): boolean {
  // TODO: Implementar validação real baseada em roles/permissões
  // Por enquanto, retorna true para todos os usuários
  logger.info('GENERAL', `Validando permissões para usuário ${userId} - ação: ${action}`);
  return true;
}

// Registrar ação no histórico do ticket
export async function logTicketAction(
  ticketId: string,
  action: 'finalize' | 'transfer' | 'cancel',
  performedBy: string,
  details: any
): Promise<void> {
  try {
    const actionData: Omit<TicketAction, 'id'> = {
      ticketId,
      action,
      performedBy,
      timestamp: new Date(),
      details
    };

    await addDoc(collection(db, 'ticketActions'), {
      ...actionData,
      timestamp: serverTimestamp()
    });

    logger.info('GENERAL', `Ação ${action} registrada para ticket ${ticketId}`);
  } catch (error) {
    logger.error('GENERAL', 'Erro ao registrar ação do ticket:', error);
    throw new Error('Falha ao registrar ação no histórico');
  }
}

// Função para finalizar ticket
export async function finalizeTicket(
  ticketId: string,
  performedBy: string
): Promise<void> {
  try {
    // Validar permissões
    if (!validateUserPermissions(performedBy, 'finalize')) {
      throw new Error('Usuário não possui permissão para finalizar tickets');
    }

    const ticketRef = doc(db, 'tickets', ticketId);
    const now = new Date();

    // Atualizar status do ticket
    await updateDoc(ticketRef, {
      status: 'resolved',
      updatedAt: serverTimestamp(),
      resolvedAt: serverTimestamp(),
      resolvedBy: performedBy
    });

    // Registrar ação no histórico
    await logTicketAction(ticketId, 'finalize', performedBy, {
      previousStatus: 'in_progress',
      newStatus: 'resolved',
      resolvedAt: now.toISOString()
    });

    logger.info('GENERAL', `Ticket ${ticketId} finalizado por ${performedBy}`);
  } catch (error) {
    logger.error('GENERAL', 'Erro ao finalizar ticket:', error);
    throw error;
  }
}

// Função para transferir ticket
export async function transferTicket(
  ticketId: string,
  transferData: TransferData,
  performedBy: string
): Promise<void> {
  try {
    // Validar permissões
    if (!validateUserPermissions(performedBy, 'transfer')) {
      throw new Error('Usuário não possui permissão para transferir tickets');
    }

    // Validar dados de transferência
    if (!transferData.destinatario || !transferData.motivo) {
      throw new Error('Destinatário e motivo são obrigatórios para transferência');
    }

    const ticketRef = doc(db, 'tickets', ticketId);

    // Atualizar ticket com nova atribuição
    await updateDoc(ticketRef, {
      assignedTo: transferData.destinatario,
      department: transferData.departamento || null,
      status: 'pending', // Ticket volta para pendente após transferência
      updatedAt: serverTimestamp(),
      transferredAt: serverTimestamp(),
      transferredBy: performedBy
    });

    // Registrar ação no histórico
    await logTicketAction(ticketId, 'transfer', performedBy, {
      transferTo: transferData.destinatario,
      department: transferData.departamento,
      reason: transferData.motivo,
      previousAssignee: performedBy,
      newStatus: 'pending'
    });

    logger.info('GENERAL', `Ticket ${ticketId} transferido para ${transferData.destinatario} por ${performedBy}`);
  } catch (error) {
    logger.error('GENERAL', 'Erro ao transferir ticket:', error);
    throw error;
  }
}

// Função para cancelar ticket
export async function cancelTicket(
  ticketId: string,
  cancelData: CancelData,
  performedBy: string
): Promise<void> {
  try {
    // Validar permissões
    if (!validateUserPermissions(performedBy, 'cancel')) {
      throw new Error('Usuário não possui permissão para cancelar tickets');
    }

    // Validar motivo do cancelamento
    if (!cancelData.motivo) {
      throw new Error('Motivo do cancelamento é obrigatório');
    }

    const ticketRef = doc(db, 'tickets', ticketId);

    // Atualizar status do ticket
    await updateDoc(ticketRef, {
      status: 'closed',
      updatedAt: serverTimestamp(),
      cancelledAt: serverTimestamp(),
      cancelledBy: performedBy,
      cancellationReason: cancelData.motivo
    });

    // Registrar ação no histórico
    await logTicketAction(ticketId, 'cancel', performedBy, {
      reason: cancelData.motivo,
      previousStatus: 'in_progress',
      newStatus: 'closed',
      cancelledAt: new Date().toISOString()
    });

    logger.info('GENERAL', `Ticket ${ticketId} cancelado por ${performedBy}`);
  } catch (error) {
    logger.error('GENERAL', 'Erro ao cancelar ticket:', error);
    throw error;
  }
}

// Função para obter histórico de ações do ticket
export async function getTicketActionHistory(ticketId: string): Promise<TicketAction[]> {
  try {
    // TODO: Implementar busca no Firestore
    // Por enquanto retorna array vazio
    logger.info('GENERAL', `Buscando histórico de ações para ticket ${ticketId}`);
    return [];
  } catch (error) {
    logger.error('GENERAL', 'Erro ao buscar histórico de ações:', error);
    return [];
  }
}

// Função para notificar usuário (placeholder)
export async function notifyUser(
  userId: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): Promise<void> {
  try {
    // TODO: Implementar sistema de notificações real
    logger.info('GENERAL', `Notificação para ${userId}: ${message} (${type})`);
  } catch (error) {
    logger.error('GENERAL', 'Erro ao enviar notificação', error);
  }
}