import { v4 as uuidv4 } from 'uuid';

/**
 * Utilitário centralizado para geração de IDs únicos
 * Resolve inconsistências na geração de IDs em todo o sistema
 */
export class IdGenerator {
  /**
   * Gera um ID único para mensagens
   * Formato: msg_[timestamp]_[uuid-short]
   */
  static generateMessageId(): string {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    return `msg_${timestamp}_${shortUuid}`;
  }

  /**
   * Gera um ID único para mensagens enviadas
   * Formato: sent_[timestamp]_[uuid-short]
   */
  static generateSentMessageId(): string {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    return `sent_${timestamp}_${shortUuid}`;
  }

  /**
   * Gera um ID único para mensagens de mídia
   * Formato: media_[timestamp]_[uuid-short]
   */
  static generateMediaMessageId(): string {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    return `media_${timestamp}_${shortUuid}`;
  }

  /**
   * Gera um ID único para tickets
   * Formato: ticket_[timestamp]_[uuid-short]
   */
  static generateTicketId(): string {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    return `ticket_${timestamp}_${shortUuid}`;
  }

  /**
   * Gera um ID único para webhooks
   * Formato: webhook_[timestamp]_[uuid-short]
   */
  static generateWebhookId(): string {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    return `webhook_${timestamp}_${shortUuid}`;
  }

  /**
   * Gera um ID único para retry/DLQ
   * Formato: retry_[timestamp]_[uuid-short]
   */
  static generateRetryId(): string {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    return `retry_${timestamp}_${shortUuid}`;
  }

  /**
   * Gera um ID único genérico
   * Formato: [prefix]_[timestamp]_[uuid-short]
   */
  static generateId(prefix: string): string {
    const timestamp = Date.now();
    const shortUuid = uuidv4().split('-')[0];
    return `${prefix}_${timestamp}_${shortUuid}`;
  }

  /**
   * Gera um UUID completo
   */
  static generateUUID(): string {
    return uuidv4();
  }

  /**
   * Valida se um ID segue o padrão esperado
   */
  static isValidId(id: string, expectedPrefix?: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // Padrão: prefix_timestamp_uuid
    const parts = id.split('_');
    if (parts.length !== 3) {
      return false;
    }

    const [prefix, timestamp, uuid] = parts;

    // Verificar prefix se especificado
    if (expectedPrefix && prefix !== expectedPrefix) {
      return false;
    }

    // Verificar se timestamp é numérico
    if (!/^\d+$/.test(timestamp)) {
      return false;
    }

    // Verificar se uuid tem formato válido (8 caracteres alfanuméricos)
    if (!/^[a-f0-9]{8}$/.test(uuid)) {
      return false;
    }

    return true;
  }

  /**
   * Extrai o timestamp de um ID
   */
  static extractTimestamp(id: string): number | null {
    if (!this.isValidId(id)) {
      return null;
    }

    const parts = id.split('_');
    return parseInt(parts[1], 10);
  }

  /**
   * Extrai o prefixo de um ID
   */
  static extractPrefix(id: string): string | null {
    if (!this.isValidId(id)) {
      return null;
    }

    return id.split('_')[0];
  }
}

// Funções de conveniência para compatibilidade
export const generateMessageId = IdGenerator.generateMessageId;
export const generateSentMessageId = IdGenerator.generateSentMessageId;
export const generateMediaMessageId = IdGenerator.generateMediaMessageId;
export const generateTicketId = IdGenerator.generateTicketId;
export const generateWebhookId = IdGenerator.generateWebhookId;
export const generateRetryId = IdGenerator.generateRetryId;
export const generateId = IdGenerator.generateId;
export const generateUUID = IdGenerator.generateUUID;
export const isValidId = IdGenerator.isValidId;
export const extractTimestamp = IdGenerator.extractTimestamp;
export const extractPrefix = IdGenerator.extractPrefix;

export default IdGenerator;