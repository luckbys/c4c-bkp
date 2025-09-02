// Script para verificar e criar agentes de teste no Firestore
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, query, where } = require('firebase/firestore');

// Configuração do Firebase (usando as mesmas configurações do projeto)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔧 Configuração do Firebase:');
console.log('- Project ID:', firebaseConfig.projectId);
console.log('- Auth Domain:', firebaseConfig.authDomain);

// Verificar se as variáveis de ambiente estão definidas
if (!firebaseConfig.projectId) {
  console.error('❌ Variáveis de ambiente do Firebase não configuradas');
  console.log('Verifique se o arquivo .env.local contém:');
  console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  console.log('- NEXT_PUBLIC_FIREBASE_API_KEY');
  console.log('- etc.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Agentes de teste para criar
const testAgents = [
  {
    name: 'Assistente de Vendas',
    description: 'Agente especializado em vendas e conversão de leads',
    evoAiAgentId: 'sales-assistant-001',
    status: 'active',
    activationRules: {
      priority: 8,
      conditions: [
        {
          type: 'keyword',
          operator: 'contains',
          value: 'comprar'
        },
        {
          type: 'keyword',
          operator: 'contains',
          value: 'preço'
        },
        {
          type: 'priority',
          operator: 'equals',
          value: 'high'
        }
      ],
      timeRestrictions: {
        workingHours: { start: '08:00', end: '18:00' },
        weekdays: [1, 2, 3, 4, 5],
        timezone: 'America/Sao_Paulo'
      }
    },
    behavior: {
      maxInteractionsPerTicket: 10,
      autoEscalation: true,
      escalationThreshold: 0.7,
      responseDelay: 2000
    },
    modelConfig: {
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: 'Você é um assistente de vendas especializado em converter leads em clientes. Seja persuasivo mas respeitoso.',
      tools: ['web_search', 'calculator']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Suporte Técnico',
    description: 'Agente para resolver problemas técnicos e dúvidas',
    evoAiAgentId: 'tech-support-001',
    status: 'active',
    activationRules: {
      priority: 9,
      conditions: [
        {
          type: 'keyword',
          operator: 'contains',
          value: 'problema'
        },
        {
          type: 'keyword',
          operator: 'contains',
          value: 'erro'
        },
        {
          type: 'keyword',
          operator: 'contains',
          value: 'ajuda'
        }
      ],
      timeRestrictions: {
        workingHours: { start: '00:00', end: '23:59' },
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        timezone: 'America/Sao_Paulo'
      }
    },
    behavior: {
      maxInteractionsPerTicket: 15,
      autoEscalation: true,
      escalationThreshold: 0.6,
      responseDelay: 1500
    },
    modelConfig: {
      temperature: 0.3,
      maxTokens: 800,
      systemPrompt: 'Você é um especialista em suporte técnico. Forneça soluções claras e passo a passo para problemas técnicos.',
      tools: ['knowledge_base', 'troubleshooting']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Atendimento Geral',
    description: 'Agente para atendimento geral e informações básicas',
    evoAiAgentId: 'general-support-001',
    status: 'active',
    activationRules: {
      priority: 5,
      conditions: [
        {
          type: 'time',
          operator: 'greater_than',
          value: 0
        }
      ],
      timeRestrictions: {
        workingHours: { start: '06:00', end: '22:00' },
        weekdays: [1, 2, 3, 4, 5, 6],
        timezone: 'America/Sao_Paulo'
      }
    },
    behavior: {
      maxInteractionsPerTicket: 8,
      autoEscalation: true,
      escalationThreshold: 0.8,
      responseDelay: 3000
    },
    modelConfig: {
      temperature: 0.5,
      maxTokens: 400,
      systemPrompt: 'Você é um assistente de atendimento geral. Seja cordial e prestativo, fornecendo informações básicas sobre a empresa.',
      tools: ['faq', 'company_info']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function checkAndCreateAgents() {
  try {
    console.log('🔍 Verificando agentes no Firestore...');
    
    // Verificar se a coleção 'agents' existe e tem documentos
    const agentsRef = collection(db, 'agents');
    const agentsSnapshot = await getDocs(agentsRef);
    
    console.log(`📊 Encontrados ${agentsSnapshot.size} agentes na coleção 'agents'`);
    
    if (agentsSnapshot.size === 0) {
      console.log('📝 Nenhum agente encontrado. Criando agentes de teste...');
      
      for (const agent of testAgents) {
        try {
          const docRef = await addDoc(agentsRef, agent);
          console.log(`✅ Agente criado: ${agent.name} (ID: ${docRef.id})`);
        } catch (error) {
          console.error(`❌ Erro ao criar agente ${agent.name}:`, error.message);
        }
      }
      
      console.log('\n🎉 Agentes de teste criados com sucesso!');
    } else {
      console.log('\n📋 Agentes existentes:');
      agentsSnapshot.forEach((doc) => {
        const agent = doc.data();
        console.log(`- ${agent.name} (${agent.status}) - Prioridade: ${agent.activationRules?.priority || 'N/A'}`);
      });
    }
    
    // Verificar agentes ativos
    const activeAgentsQuery = query(agentsRef, where('status', '==', 'active'));
    const activeAgentsSnapshot = await getDocs(activeAgentsQuery);
    
    console.log(`\n🟢 Agentes ativos: ${activeAgentsSnapshot.size}`);
    
    if (activeAgentsSnapshot.size === 0) {
      console.log('⚠️ Nenhum agente ativo encontrado! Isso pode causar o erro "Nenhum agente disponível".');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar/criar agentes:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar verificação
checkAndCreateAgents()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });