/**
 * Script para diagnosticar o conflito de estado entre ChatPanel e page.tsx
 * que está causando mensagens aparecerem por 2 segundos e depois desaparecerem
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, onSnapshot, query, orderBy, where } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBOQ5kF8QJZ8X8X8X8X8X8X8X8X8X8X8X8",
  authDomain: "crm-c4c-dev.firebaseapp.com",
  projectId: "crm-c4c-dev",
  storageBucket: "crm-c4c-dev.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simular o comportamento do ChatPanel e page.tsx
class StateConflictSimulator {
  constructor() {
    this.parentState = { selectedTicket: null }; // Estado do page.tsx
    this.childState = { currentTicket: null };   // Estado do ChatPanel
    this.updateCount = 0;
    this.conflictDetected = false;
  }

  // Simular recebimento de prop do pai (page.tsx -> ChatPanel)
  receiveTicketProp(ticket) {
    console.log(`\n📥 [PROP] ChatPanel recebeu ticket do pai:`, {
      ticketId: ticket.id,
      messagesCount: ticket.messages?.length || 0,
      updateCount: this.updateCount
    });

    // Simular useEffect que sincroniza prop com estado local
    const previousTicket = this.childState.currentTicket;
    this.childState.currentTicket = ticket;

    if (previousTicket && previousTicket.id === ticket.id) {
      const prevMsgCount = previousTicket.messages?.length || 0;
      const newMsgCount = ticket.messages?.length || 0;
      
      if (prevMsgCount !== newMsgCount) {
        console.log(`⚠️  [CONFLICT] Possível conflito detectado:`, {
          previousMessages: prevMsgCount,
          newMessages: newMsgCount,
          timeDiff: Date.now() - (this.lastUpdate || 0)
        });
        this.conflictDetected = true;
      }
    }

    this.lastUpdate = Date.now();
  }

  // Simular atualização via Firebase (ChatPanel)
  simulateFirebaseUpdate(newMessages) {
    console.log(`\n🔥 [FIREBASE] ChatPanel recebeu mensagens do Firebase:`, {
      messagesCount: newMessages.length,
      updateCount: this.updateCount
    });

    // Simular handleTicketUpdate do ChatPanel
    const updatedTicket = {
      ...this.childState.currentTicket,
      messages: newMessages,
      lastUpdated: Date.now()
    };

    this.childState.currentTicket = updatedTicket;
    
    // Simular propagação para o pai
    this.propagateToParent(updatedTicket);
  }

  // Simular handleTicketUpdate do page.tsx
  propagateToParent(updatedTicket) {
    console.log(`\n📤 [PROPAGATE] ChatPanel propagando para pai:`, {
      ticketId: updatedTicket.id,
      messagesCount: updatedTicket.messages?.length || 0
    });

    // Simular handleTicketUpdate do page.tsx
    this.parentState.selectedTicket = {
      ...updatedTicket,
      messages: updatedTicket.messages || [],
      lastUpdated: Date.now()
    };

    this.updateCount++;

    // Simular re-render que passa nova prop para ChatPanel
    setTimeout(() => {
      this.receiveTicketProp(this.parentState.selectedTicket);
    }, 10); // Simular delay de re-render
  }

  // Simular cenário de conflito
  simulateConflictScenario() {
    console.log('🎬 [SIMULATION] Iniciando simulação de conflito de estado\n');

    // Estado inicial
    const initialTicket = {
      id: 'ticket-123',
      client: { id: '5511999999999@s.whatsapp.net', name: 'Cliente Teste' },
      messages: [
        { id: 'msg1', content: 'Mensagem 1', sender: 'client', timestamp: Date.now() - 1000 },
        { id: 'msg2', content: 'Mensagem 2', sender: 'agent', timestamp: Date.now() - 500 }
      ]
    };

    // 1. Ticket inicial passado como prop
    this.receiveTicketProp(initialTicket);

    // 2. Simular nova mensagem chegando via Firebase
    setTimeout(() => {
      const newMessages = [
        ...initialTicket.messages,
        { id: 'msg3', content: 'Nova mensagem', sender: 'agent', timestamp: Date.now(), isFromMe: true }
      ];
      this.simulateFirebaseUpdate(newMessages);
    }, 100);

    // 3. Simular outra atualização rápida (race condition)
    setTimeout(() => {
      const newerMessages = [
        ...initialTicket.messages,
        { id: 'msg3', content: 'Nova mensagem', sender: 'agent', timestamp: Date.now() - 50, isFromMe: true },
        { id: 'msg4', content: 'Mensagem mais nova', sender: 'agent', timestamp: Date.now(), isFromMe: true }
      ];
      this.simulateFirebaseUpdate(newerMessages);
    }, 200);

    // 4. Verificar resultado após todas as atualizações
    setTimeout(() => {
      this.analyzeResults();
    }, 500);
  }

  analyzeResults() {
    console.log('\n📊 [ANALYSIS] Análise dos resultados:');
    console.log('- Total de atualizações:', this.updateCount);
    console.log('- Conflito detectado:', this.conflictDetected);
    console.log('- Estado final do pai:', {
      messagesCount: this.parentState.selectedTicket?.messages?.length || 0
    });
    console.log('- Estado final do filho:', {
      messagesCount: this.childState.currentTicket?.messages?.length || 0
    });

    if (this.conflictDetected) {
      console.log('\n🚨 [PROBLEMA IDENTIFICADO]');
      console.log('O conflito de estado foi detectado! Isso explica por que:');
      console.log('1. A mensagem aparece inicialmente (Firebase update)');
      console.log('2. Depois desaparece (prop override do pai)');
      console.log('3. O ciclo se repete causando instabilidade');
      
      console.log('\n💡 [SOLUÇÕES RECOMENDADAS]');
      console.log('1. Usar apenas um estado (prop OU estado local, não ambos)');
      console.log('2. Implementar debounce mais robusto');
      console.log('3. Evitar propagação desnecessária para o pai');
      console.log('4. Usar useCallback com dependências corretas');
    } else {
      console.log('\n✅ [OK] Nenhum conflito detectado nesta simulação');
    }
  }
}

// Executar simulação
const simulator = new StateConflictSimulator();
simulator.simulateConflictScenario();

console.log('\n🔍 [INFO] Script de diagnóstico executado.');
console.log('Este script simula o comportamento do ChatPanel e page.tsx');
console.log('para identificar conflitos de estado que causam mensagens');
console.log('aparecerem por 2 segundos e depois desaparecerem.');