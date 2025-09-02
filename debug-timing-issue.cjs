/**
 * Script para diagnosticar o problema específico de timing
 * onde mensagens aparecem por exatamente 2 segundos e depois desaparecem
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

// Simular o problema específico de timing
class TimingIssueSimulator {
  constructor() {
    this.messageStates = [];
    this.debounceTimeout = null;
    this.currentTicket = null;
    this.selectedTicket = null;
    this.updateHistory = [];
  }

  log(message, data = {}) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${message}`, data);
    this.updateHistory.push({ timestamp: Date.now(), message, data });
  }

  // Simular envio de mensagem do agente
  simulateAgentMessageSend() {
    this.log('🚀 [SEND] Agente enviando mensagem...');
    
    // 1. Mensagem temporária aparece imediatamente (feedback visual)
    const tempMessage = {
      id: 'temp-' + Date.now(),
      content: 'Mensagem do agente',
      sender: 'agent',
      isFromMe: true,
      timestamp: Date.now(),
      isTemporary: true
    };

    this.addMessageToUI(tempMessage);
    this.log('✨ [UI] Mensagem temporária adicionada', { messageId: tempMessage.id });

    // 2. Simular salvamento no Firebase (demora ~500ms)
    setTimeout(() => {
      this.simulateFirebaseSave(tempMessage);
    }, 500);
  }

  // Simular salvamento no Firebase
  simulateFirebaseSave(tempMessage) {
    this.log('💾 [FIREBASE] Salvando mensagem no Firebase...');
    
    // Simular mensagem salva no Firebase (com ID real)
    const savedMessage = {
      ...tempMessage,
      id: 'firebase-' + Date.now(),
      isTemporary: false,
      firebaseTimestamp: Date.now()
    };

    // 3. Firebase listener detecta nova mensagem
    setTimeout(() => {
      this.simulateFirebaseListener([savedMessage]);
    }, 200);
  }

  // Simular Firebase listener
  simulateFirebaseListener(newMessages) {
    this.log('🔥 [LISTENER] Firebase listener detectou mudanças', { 
      messagesCount: newMessages.length 
    });

    // 4. Debounce de 150ms
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.log('⏱️  [DEBOUNCE] Timeout anterior cancelado');
    }

    this.debounceTimeout = setTimeout(() => {
      this.applyFirebaseUpdate(newMessages);
    }, 150);

    this.log('⏱️  [DEBOUNCE] Novo timeout de 150ms iniciado');
  }

  // Aplicar atualização do Firebase
  applyFirebaseUpdate(newMessages) {
    this.log('📝 [UPDATE] Aplicando atualização do Firebase');
    
    // 5. Atualizar currentTicket
    this.currentTicket = {
      ...this.currentTicket,
      messages: newMessages,
      lastUpdated: Date.now()
    };

    // 6. Propagar para o pai (handleTicketUpdate)
    this.propagateToParent();
  }

  // Propagar para o componente pai
  propagateToParent() {
    this.log('📤 [PROPAGATE] Propagando para componente pai');
    
    // 7. Pai atualiza selectedTicket
    this.selectedTicket = {
      ...this.currentTicket,
      parentUpdated: Date.now()
    };

    // 8. Re-render causa nova prop para ChatPanel
    setTimeout(() => {
      this.receiveNewProp();
    }, 10);
  }

  // Receber nova prop do pai
  receiveNewProp() {
    this.log('📥 [PROP] ChatPanel recebeu nova prop do pai');
    
    // 9. useEffect sincroniza prop com estado local
    const previousMessages = this.currentTicket?.messages || [];
    this.currentTicket = this.selectedTicket;
    
    // 10. Verificar se há conflito
    const currentMessages = this.currentTicket?.messages || [];
    
    if (previousMessages.length !== currentMessages.length) {
      this.log('⚠️  [CONFLICT] Conflito de mensagens detectado!', {
        previousCount: previousMessages.length,
        currentCount: currentMessages.length
      });
    }

    // 11. Re-render da UI
    this.updateUI();
  }

  // Adicionar mensagem à UI
  addMessageToUI(message) {
    this.messageStates.push({
      message,
      addedAt: Date.now(),
      visible: true
    });
  }

  // Atualizar UI
  updateUI() {
    this.log('🎨 [UI] Atualizando interface');
    
    // Simular re-render que pode remover mensagens temporárias
    this.messageStates = this.messageStates.filter(state => {
      if (state.message.isTemporary) {
        const age = Date.now() - state.addedAt;
        if (age > 2000) { // 2 segundos
          this.log('🗑️  [UI] Removendo mensagem temporária expirada', {
            messageId: state.message.id,
            age: age + 'ms'
          });
          return false;
        }
      }
      return true;
    });

    this.log('📊 [UI] Estado atual da UI', {
      visibleMessages: this.messageStates.length,
      messages: this.messageStates.map(s => ({
        id: s.message.id,
        isTemporary: s.message.isTemporary,
        age: Date.now() - s.addedAt + 'ms'
      }))
    });
  }

  // Simular cenário completo
  simulateCompleteScenario() {
    this.log('🎬 [START] Iniciando simulação completa do problema');
    
    // Estado inicial
    this.currentTicket = {
      id: 'ticket-123',
      messages: [
        { id: 'msg1', content: 'Mensagem anterior', sender: 'client', timestamp: Date.now() - 5000 }
      ]
    };
    this.selectedTicket = { ...this.currentTicket };

    // Simular envio de mensagem
    this.simulateAgentMessageSend();

    // Verificar estado após 3 segundos
    setTimeout(() => {
      this.analyzeResults();
    }, 3000);
  }

  // Analisar resultados
  analyzeResults() {
    this.log('\n📊 [ANALYSIS] Análise final dos resultados:');
    
    console.log('\n📈 Histórico de atualizações:');
    this.updateHistory.forEach((entry, index) => {
      const relativeTime = index === 0 ? '0ms' : (entry.timestamp - this.updateHistory[0].timestamp) + 'ms';
      console.log(`  ${index + 1}. [+${relativeTime}] ${entry.message}`);
    });

    console.log('\n🎯 Estado final da UI:');
    console.log('  - Mensagens visíveis:', this.messageStates.length);
    this.messageStates.forEach(state => {
      const age = Date.now() - state.addedAt;
      console.log(`    • ${state.message.id} (${state.message.isTemporary ? 'temp' : 'real'}) - ${age}ms`);
    });

    // Detectar o problema específico
    const hasTemporaryMessages = this.messageStates.some(s => s.message.isTemporary);
    const hasExpiredMessages = this.updateHistory.some(entry => 
      entry.message.includes('Removendo mensagem temporária')
    );

    if (hasExpiredMessages) {
      console.log('\n🚨 [PROBLEMA IDENTIFICADO] Mensagem temporária expirou!');
      console.log('Isso explica por que a mensagem aparece por ~2 segundos e depois some.');
      console.log('\n💡 [CAUSA RAIZ]:');
      console.log('1. Mensagem temporária é adicionada para feedback imediato');
      console.log('2. Firebase demora para salvar e sincronizar');
      console.log('3. Mensagem temporária expira antes da real chegar');
      console.log('4. Usuário vê mensagem "desaparecer"');
      
      console.log('\n🔧 [SOLUÇÕES]:');
      console.log('1. Aumentar tempo de vida da mensagem temporária');
      console.log('2. Melhorar sincronização Firebase -> UI');
      console.log('3. Substituir mensagem temporária pela real sem piscar');
      console.log('4. Adicionar loading state mais claro');
    } else if (hasTemporaryMessages) {
      console.log('\n⚠️  [ATENÇÃO] Mensagem temporária ainda visível');
      console.log('Pode indicar problema na sincronização com Firebase');
    } else {
      console.log('\n✅ [OK] Nenhum problema de timing detectado');
    }
  }
}

// Executar simulação
const simulator = new TimingIssueSimulator();
simulator.simulateCompleteScenario();

console.log('\n🔍 [INFO] Script de diagnóstico de timing executado.');
console.log('Este script simula o problema específico de mensagens');
console.log('aparecerem por 2 segundos e depois desaparecerem.');