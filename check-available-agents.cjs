const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AlzaSyAcKjzOXHCNFrcEVmZBXvCBLS39G1w5Xzw",
  authDomain: "cerc-3m1uep.firebaseapp.com",
  projectId: "cerc-3m1uep",
  storageBucket: "cerc-3m1uep.appspot.com",
  messagingSenderId: "881065106062",
  appId: "1:881065106062:web:598a55c9ee155cfa7447df"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAvailableAgents() {
  try {
    console.log('🔍 Verificando agentes disponíveis na coleção "agents"...');
    
    const agentsRef = collection(db, 'agents');
    const snapshot = await getDocs(agentsRef);
    
    console.log(`\n📊 Total de agentes encontrados: ${snapshot.size}`);
    
    if (snapshot.size === 0) {
      console.log('❌ Nenhum agente encontrado na coleção "agents"!');
      console.log('\n💡 SOLUÇÃO:');
      console.log('   1. Verifique se os agentes foram criados corretamente');
      console.log('   2. Execute o script de criação de agentes se necessário');
      console.log('   3. Verifique se está conectado ao projeto Firebase correto');
      return;
    }
    
    console.log('\n=== AGENTES DISPONÍVEIS ===');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n🤖 Agente ID: ${doc.id}`);
      console.log(`   Nome: ${data.name || 'N/A'}`);
      console.log(`   Descrição: ${data.description || 'N/A'}`);
      console.log(`   Tipo: ${data.type || 'N/A'}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Modelo: ${data.model || 'N/A'}`);
      console.log(`   Evo AI ID: ${data.evoAiAgentId || 'N/A'}`);
      console.log(`   Criado em: ${data.createdAt?.toDate?.() || data.createdAt || 'N/A'}`);
    });
    
    // Encontrar o primeiro agente ativo
    const activeAgents = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active') {
        activeAgents.push({
          id: doc.id,
          name: data.name,
          evoAiAgentId: data.evoAiAgentId
        });
      }
    });
    
    console.log('\n=== AGENTES ATIVOS PARA USO ===');
    if (activeAgents.length > 0) {
      activeAgents.forEach(agent => {
        console.log(`✅ ${agent.name} (ID: ${agent.id})`);
        if (agent.evoAiAgentId) {
          console.log(`   Evo AI ID: ${agent.evoAiAgentId}`);
        }
      });
      
      console.log('\n💡 PRÓXIMO PASSO:');
      console.log(`   Use um destes agentes no script de atribuição.`);
      console.log(`   Agente recomendado: ${activeAgents[0].name} (${activeAgents[0].id})`);
    } else {
      console.log('❌ Nenhum agente ativo encontrado!');
      console.log('\n💡 SOLUÇÃO:');
      console.log('   1. Ative pelo menos um agente na interface do CRM');
      console.log('   2. Ou crie um novo agente ativo');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar agentes:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar verificação
console.log('🚀 Verificando agentes disponíveis...');
checkAvailableAgents()
  .then(() => {
    console.log('\n🎉 Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro na verificação:', error.message);
    process.exit(1);
  });