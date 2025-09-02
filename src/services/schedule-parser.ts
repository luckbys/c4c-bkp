import { addDays, addHours, addMinutes, startOfDay, setHours, setMinutes, format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ParsedScheduleData {
  title?: string;
  description?: string;
  date?: Date;
  time?: string;
  type?: 'meeting' | 'call' | 'presentation';
  duration?: number;
  isValid: boolean;
  confidence: number;
}

class ScheduleParser {
  // Palavras-chave para tipos de eventos
  private eventTypeKeywords = {
    meeting: ['reuniao', 'meeting', 'encontro', 'conversa', 'bate papo'],
    call: ['ligacao', 'call', 'chamada', 'telefonema', 'fone'],
    presentation: ['apresentacao', 'apresentar', 'demonstracao', 'demo', 'pitch']
  };

  // Palavras-chave para ações de agendamento
  private scheduleKeywords = [
    'agendar', 'marcar', 'criar', 'schedule', 'book', 'reservar',
    'combinar', 'definir', 'programar', 'planejar'
  ];

  // Palavras-chave para tempo
  private timeKeywords = {
    today: ['hoje', 'today'],
    tomorrow: ['amanha', 'tomorrow'],
    dayAfterTomorrow: ['depois de amanha', 'day after tomorrow'],
    thisWeek: ['esta semana', 'essa semana', 'this week'],
    nextWeek: ['proxima semana', 'next week'],
    monday: ['segunda', 'segunda feira', 'monday'],
    tuesday: ['terca', 'terca feira', 'tuesday'],
    wednesday: ['quarta', 'quarta feira', 'wednesday'],
    thursday: ['quinta', 'quinta feira', 'thursday'],
    friday: ['sexta', 'sexta feira', 'friday'],
    saturday: ['sabado', 'saturday'],
    sunday: ['domingo', 'sunday']
  };

  // Padrões de tempo
  private timePatterns = [
    /(?:às|as|at)\s*(\d{1,2})(?:h|:)(\d{2})?/gi, // às 14h30, às 14:30
    /(?:às|as|at)\s*(\d{1,2})\s*(?:horas?|h)/gi, // às 14 horas, às 14h
    /(\d{1,2})(?:h|:)(\d{2})/gi, // 14h30, 14:30
    /(\d{1,2})h/gi, // 14h
    /(?:meio-dia|meio dia|12h)/gi, // meio-dia
    /(?:meia-noite|meia noite|00h)/gi // meia-noite
  ];

  // Padrões de data
  private datePatterns = [
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g, // 15/03, 15/03/2024
    /(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?/g, // 15-03, 15-03-2024
    /(?:dia)\s*(\d{1,2})/gi // dia 15
  ];

  // Padrões de duração
  private durationPatterns = [
    /(?:por|durante)\s*(\d+)\s*(?:minutos?|min)/gi, // por 30 minutos
    /(?:por|durante)\s*(\d+)\s*(?:horas?|h)/gi, // por 2 horas
    /(\d+)\s*(?:minutos?|min)/gi, // 30 minutos
    /(\d+)\s*(?:horas?|h)/gi // 2 horas
  ];

  /**
   * Normaliza o texto removendo acentos e caracteres especiais
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  /**
   * Verifica se o texto contém comandos de agendamento
   */
  isScheduleCommand(text: string): boolean {
    const lowerText = this.normalizeText(text);
    
    // Verifica se contém palavras-chave de agendamento
    const hasScheduleKeyword = this.scheduleKeywords.some(keyword => 
      lowerText.includes(keyword)
    );
    
    // Verifica se contém palavras-chave de tipo de evento
    const hasEventType = Object.values(this.eventTypeKeywords)
      .flat()
      .some(keyword => lowerText.includes(keyword));
    
    // Verifica se contém indicadores de tempo
    const hasTimeIndicator = Object.values(this.timeKeywords)
      .flat()
      .some(keyword => lowerText.includes(keyword)) ||
      this.timePatterns.some(pattern => pattern.test(lowerText)) ||
      this.datePatterns.some(pattern => pattern.test(lowerText));
    
    return hasScheduleKeyword && (hasEventType || hasTimeIndicator);
  }

  /**
   * Extrai dados de agendamento do texto
   */
  parseScheduleCommand(text: string): ParsedScheduleData {
    const lowerText = this.normalizeText(text);
    let confidence = 0;
    
    // Verificar se é um comando de agendamento
    if (!this.isScheduleCommand(text)) {
      return { isValid: false, confidence: 0 };
    }
    
    confidence += 30; // Base para comando válido
    
    // Extrair tipo de evento
    const type = this.extractEventType(lowerText);
    if (type) confidence += 20;
    
    // Extrair data
    const date = this.extractDate(lowerText);
    if (date) confidence += 25;
    
    // Extrair hora
    const time = this.extractTime(lowerText);
    if (time) confidence += 20;
    
    // Extrair duração
    const duration = this.extractDuration(lowerText);
    if (duration) confidence += 5;
    
    // Gerar título baseado no contexto
    const title = this.generateTitle(text, type);
    
    // Gerar descrição
    const description = this.generateDescription(text, type);
    
    return {
      title,
      description,
      date,
      time,
      type,
      duration,
      isValid: confidence >= 50,
      confidence
    };
  }

  /**
   * Extrai o tipo de evento do texto
   */
  private extractEventType(text: string): 'meeting' | 'call' | 'presentation' | undefined {
    for (const [type, keywords] of Object.entries(this.eventTypeKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return type as 'meeting' | 'call' | 'presentation';
      }
    }
    return undefined;
  }

  /**
   * Extrai a data do texto
   */
  private extractDate(text: string): Date | undefined {
    const now = new Date();
    
    // Verificar palavras-chave de tempo relativo
    if (this.timeKeywords.today.some(keyword => text.includes(keyword))) {
      return now;
    }
    
    if (this.timeKeywords.tomorrow.some(keyword => text.includes(keyword))) {
      return addDays(now, 1);
    }
    
    if (this.timeKeywords.dayAfterTomorrow.some(keyword => text.includes(keyword))) {
      return addDays(now, 2);
    }
    
    // Verificar dias da semana
    const dayOfWeek = this.extractDayOfWeek(text);
    if (dayOfWeek !== undefined) {
      return this.getNextWeekday(dayOfWeek);
    }
    
    // Verificar padrões de data específica
    for (const pattern of this.datePatterns) {
      const match = pattern.exec(text);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : now.getFullYear();
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          const date = new Date(year, month - 1, day);
          if (isValid(date)) {
            return date;
          }
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extrai o horário do texto
   */
  private extractTime(text: string): string | undefined {
    for (const pattern of this.timePatterns) {
      const match = pattern.exec(text);
      if (match) {
        const hour = parseInt(match[1]);
        const minute = match[2] ? parseInt(match[2]) : 0;
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
      }
    }
    
    // Verificar horários especiais
    if (/meio-dia|meio dia|12h/i.test(text)) {
      return '12:00';
    }
    
    if (/meia-noite|meia noite|00h/i.test(text)) {
      return '00:00';
    }
    
    return undefined;
  }

  /**
   * Extrai a duração do texto
   */
  private extractDuration(text: string): number | undefined {
    for (const pattern of this.durationPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[0].toLowerCase();
        
        if (unit.includes('hora') || unit.includes('h')) {
          return value * 60; // Converter para minutos
        } else {
          return value; // Já em minutos
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extrai o dia da semana do texto
   */
  private extractDayOfWeek(text: string): number | undefined {
    const days = [
      { keywords: this.timeKeywords.sunday, value: 0 },
      { keywords: this.timeKeywords.monday, value: 1 },
      { keywords: this.timeKeywords.tuesday, value: 2 },
      { keywords: this.timeKeywords.wednesday, value: 3 },
      { keywords: this.timeKeywords.thursday, value: 4 },
      { keywords: this.timeKeywords.friday, value: 5 },
      { keywords: this.timeKeywords.saturday, value: 6 }
    ];
    
    for (const day of days) {
      if (day.keywords.some(keyword => text.includes(keyword))) {
        return day.value;
      }
    }
    
    return undefined;
  }

  /**
   * Obtém a próxima ocorrência de um dia da semana
   */
  private getNextWeekday(targetDay: number): Date {
    const now = new Date();
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Próxima semana
    }
    
    return addDays(now, daysToAdd);
  }

  /**
   * Gera um título para o evento baseado no contexto
   */
  private generateTitle(text: string, type?: string): string {
    const typeLabel = {
      meeting: 'Reunião',
      call: 'Ligação',
      presentation: 'Apresentação'
    }[type || 'meeting'] || 'Evento';
    
    // Tentar extrair assunto específico do texto
    const subjectPatterns = [
      /(?:sobre|para|discutir|tratar)\s+(.+?)(?:\s+(?:amanhã|hoje|na|às|dia|\d))/i,
      /(?:reunião|ligação|apresentação)\s+(?:sobre|para|de)\s+(.+?)(?:\s+(?:amanhã|hoje|na|às|dia|\d))/i
    ];
    
    for (const pattern of subjectPatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        return `${typeLabel} - ${match[1].trim()}`;
      }
    }
    
    return `${typeLabel} agendada via chat`;
  }

  /**
   * Gera uma descrição para o evento
   */
  private generateDescription(text: string, type?: string): string {
    const typeLabel = {
      meeting: 'reunião',
      call: 'ligação',
      presentation: 'apresentação'
    }[type || 'meeting'] || 'evento';
    
    return `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} agendada automaticamente via chat.\n\nTexto original: "${text}"`;
  }

  /**
   * Exemplos de comandos válidos para teste
   */
  getExampleCommands(): string[] {
    return [
      'agendar reunião amanhã às 14h',
      'marcar apresentação na sexta-feira às 10h30',
      'agendar call hoje às 16h por 30 minutos',
      'criar reunião dia 15/03 às 9h',
      'agendar ligação para segunda-feira',
      'marcar demonstração na próxima semana',
      'agendar reunião sobre proposta amanhã às 15h',
      'marcar call para discutir projeto quinta às 11h'
    ];
  }
}

export const scheduleParser = new ScheduleParser();