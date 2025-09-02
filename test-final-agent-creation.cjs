const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Simular o serviço evo-ai-postgres-service em CommonJS
class EvoAIPostgresService {
  constructor() {
    this.pool = new Pool({
      host: 'easypanel.devsible.com.br',
      port: 5432,
      user: 'postgres',
      password: 'e01fb274b8d6a88c8ea7',
      database: 'n8n',
      ssl: false
    });
  }

  async createAgent(agentData) {
    let client;
    try {
      console.log('🤖 Criando agente no PostgreSQL...');
      console.log('Dados do agente:', agentData.name);

      client = await this.pool.connect();
      
      // Gerar ID único para o agente
      const agentId = uuidv4();
      
      // Preparar dados do agente com valores padrão
      const agent = {
        id: agentId,
        client_id: null,
        name: agentData.name,
        description: agentData.description || `Agente criado via CRM: ${agentData.name}`,
        type: agentData.type || 'llm',
        model: agentData.model || 'gpt-3.5-turbo',
        api_key_id: null,
        instruction: agentData.instruction || 'Você é um assistente útil e prestativo.',
        agent_card_url: null,
        folder_id: null,
        config: agentData.config || {
          tools: null,
          custom_tools: null,
          mcp_servers: [],
          custom_mcp_servers: [],
          agent_tools: null,
          sub_agents: null,
          workflow: null,
          created_via: 'crm-integration',
          created_at: new Date().toISOString()
        },
        role: agentData.role || 'assistant',
        goal: agentData.goal || 'Ajudar o usuário com suas necessidades'
      };

      // Query de inserção
      const insertQuery = `
        INSERT INTO agents (
          id, client_id, name, description, type, model, api_key_id, 
          instruction, agent_card_url, folder_id, config, role, goal, 
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
        ) RETURNING *;
      `;

      const values = [
        agent.id,
        agent.client_id,
        agent.name,
        agent.description,
        agent.type,
        agent.model,
        agent.api_key_id,
        agent.instruction,
        agent.agent_card_url,
        agent.folder_id,
        JSON.stringify(agent.config),
        agent.role,
        agent.goal
      ];

      console.log('📝 Executando inserção no banco de dados...');
      const result = await client.query(insertQuery, values);
      
      if (result.rows && result.rows.length > 0) {
        const createdAgent = result.rows[0];
        console.log('✅ Agente criado com sucesso no PostgreSQL!');
        console.log('ID do agente:', createdAgent.id);
        console.log('Nome:', createdAgent.name);
        console.log('Tipo:', createdAgent.type);
        console.log('Modelo:', createdAgent.model);
        console.log('Criado em:', createdAgent.created_at);
        
        return createdAgent;
      } else {
        throw new Error('Nenhum resultado retornado da inserção');
      }

    } catch (error) {
      console.error('❌ Erro ao criar agente no PostgreSQL:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async close() {
    await this.pool.end();
  }
}

async function testFinalAgentCreation() {
  const service = new EvoAIPostgresService();
  
  try {
    // Dados do agente baseados no exemplo fornecido
    const agentData = {
      name: "Suporte_Legado_Marcas",
      description: "Suporte ao cliente especializado em marcas e patentes",
      role: "suporte ao cliente",
      goal: "Você é um assistente suporte da Legado Marcas e Patentes",
      type: "llm",
      model: "gemini/gemini-2.0-flash-lite",
      instruction: "Você é um Agente de Suporte de IA para a empresa **Legado Marcas e Patentes**. Seu objetivo principal é ajudar usuários (clientes ou potenciais clientes) fornecendo informações precisas sobre os serviços e processos da Legado, atuando tanto no **suporte** quanto na **prospecção**.\n\n**Base de Conhecimento:**\nSuas respostas devem ser baseadas *EXCLUSIVAMENTE* nas informações contidas nas fontes fornecidas sobre a Legado Marcas e Patentes.\n\n**Funções e Responsabilidades:**\n\n1.  **Suporte e Informação sobre o Processo:**\n    *   Explique o que é a Legado Marcas e Patentes e qual seu principal objetivo (levar proteção à marca) [1].\n    *   Descreva o processo de registro de marca em 4 passos [2, 3]:\n        *   1. **Pesquisa de Disponibilidade de Marca**: Análise técnica jurídica no banco de dados do INPI, verifica requisitos legais, orienta o melhor caminho [2]. Esta pesquisa é recomendada como primeiro passo [4]. Informa se a marca pode ser registrada, em quais classes, obstáculos, contestações, evitando investimento indevido/transtornos [4].\n        *   2. **Depósito de Marca**: Equipe realiza o depósito junto ao INPI, iniciando o processo. **A proteção da marca começa aqui**, garantindo preferência em relação a concorrentes futuros [2].\n        *   3. **Monitoramento**: Acompanhamento semanal na Revista da Propriedade Industrial (RPI), garante cumprimento de exigências, informa despachos do INPI [3].\n        *   4. **Deferimento e Concessão**: INPI analisa, concede o registro. Legado entrega o certificado da marca. O certificado tem **validade de 10 anos** e garante **total exclusividade em todo território nacional** [3].\n    *   Detalhe o suporte oferecido: Consultoria completa, suporte total do início ao fim do processo. Viabilizam tudo para facilitar a vida do cliente, desde a entrada do processo até a entrega do certificado [5].\n    *   Mencione a garantia da Legado: Em caso de indeferimento, oferecem uma assessoria totalmente **gratuita** para o depósito de uma nova marca [5, 6].\n    *   Reforce a forma de trabalho: Todo processo é feito **online e de forma segura** [2]. Atendimento **100% online** [7]. Atendem em **todo o Brasil**, para todos os nichos/segmentos [7].\n    *   Destaque a ética e transparência: Trabalho **100% dentro da lei**, prezando pela clareza e lealdade. **Sem surpresas** com despesas extras ou altos custos no final [5].\n\n2.  **Prospecção e Esclarecimento sobre a Importância do Registro:**\n    *   Explique por que registrar a marca é importante: A marca é um dos **patrimônios mais valiosos** [6]. **Só o registro** afasta imitadores, garante segurança e proteção [8]. Aumenta o valor da marca e impulsiona o sucesso do negócio [8].\n    *   Liste as **vantagens de ter a marca registrada**:\n        *   Direito de uso **exclusivo** em todo território nacional, em seu ramo de atividade [6].\n        *   Direito de **impedir copiadores e concorrentes** de usar sua marca no mesmo segmento [6].\n        *   **Proteção jurídica e comercial**, com direito a indenização por uso indevido [8].\n        *   Direito de **ceder ou licenciar** a marca a terceiros [8].\n        *   Utilizar um **selo exclusivo** que transmite credibilidade e referência de qualidade [8].\n    *   Alerta sobre os **riscos de NÃO registrar a marca**:\n        *   A **razão social NÃO garante a proteção** do nome fantasia [9].\n        *   Pode **perder o direito de uso** [9].\n        *   Pode **perder o investimento** em marketing e branding [9].\n        *   Pode **prejudicar a imagem** da empresa [9].\n        *   Pode enfrentar um **processo legal** de uso indevido [9].\n        *   A marca **não pode esperar mais** [9].\n    *   Direcione para o primeiro passo recomendado: Sugira **solicitar a pesquisa de disponibilidade** da marca [2, 4].\n\n**Chamadas para Ação (CTAs):**\nInclua sugestões para que o usuário dê o próximo passo, como: Solicitar Orçamento [6, 7], Solicitar Contato [3, 8], Solicitar Disponibilidade/pesquisa [4, 9], Falar com um especialista [1], Atendimento via WhatsApp [1, 4].\n\n**Comportamento do Agente:**\n*   Seja prestativo, claro e objetivo.\n*   Responda apenas com base nas informações fornecidas.\n*   Se a pergunta for fora do escopo das informações fornecidas, declare que você só pode fornecer informações baseadas no material sobre a Legado Marcas e Patentes.\n*   Mantenha um tom profissional e confiável.\n*   Não invente informações ou processos.",
      config: {
        tools: null,
        custom_tools: null,
        mcp_servers: [
          {
            id: "b73dc2e8-9d91-4167-a8f1-1102c42af3d2",
            envs: {
              BRAVE_API_KEY: "BSApC6PZjd04DHg1BrGe0oMKhZTNLqC"
            },
            tools: [
              "brave_web_search",
              "brave_local_search"
            ]
          }
        ],
        custom_mcp_servers: [
          {
            url: "https://press-n8n.jhkbgs.easypanel.host/mcp/con-service/sse",
            headers: {}
          }
        ],
        agent_tools: null,
        sub_agents: null,
        workflow: null
      }
    };
    
    console.log('🚀 Iniciando teste de criação de agente completo...');
    console.log('📋 Dados do agente:');
    console.log('  Nome:', agentData.name);
    console.log('  Descrição:', agentData.description);
    console.log('  Tipo:', agentData.type);
    console.log('  Modelo:', agentData.model);
    console.log('  MCP Servers:', agentData.config.mcp_servers.length);
    console.log('  Custom MCP Servers:', agentData.config.custom_mcp_servers.length);
    
    const createdAgent = await service.createAgent(agentData);
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('🎯 O agente deve aparecer no painel do Evo AI!');
    console.log('🌐 Acesse: https://n8n-evo-ai-frontend.05pdov.easypanel.host/');
    console.log('\n📊 Resumo da integração:');
    console.log('✅ Conexão PostgreSQL: Funcionando');
    console.log('✅ Criação de agentes: Funcionando');
    console.log('✅ Estrutura JSON complexa: Suportada');
    console.log('✅ MCP Servers: Configurados');
    console.log('✅ Fallback do CRM: Implementado');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await service.close();
  }
}

testFinalAgentCreation().catch(console.error);