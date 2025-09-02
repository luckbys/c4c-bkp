const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function createAgentFromExample() {
  let client;
  try {
    console.log('🤖 Criando agente baseado no exemplo fornecido...');
    client = await pool.connect();
    
    // Dados do agente baseados no exemplo
    const agentExample = {
      name: "Suporte_",
      description: "Suporte ao cliente",
      role: "suporte ao cliente",
      goal: "Voce é um assistente suporte da legados marcas e patentes",
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
      },
      id: "d01bdd5f-53c6-49be-9ffc-b764343e539c"
    };
    
    // Gerar novo ID para o agente
    const agentId = uuidv4();
    
    console.log('📝 Dados do agente a ser criado:');
    console.log('  Nome:', agentExample.name);
    console.log('  Descrição:', agentExample.description);
    console.log('  Tipo:', agentExample.type);
    console.log('  Modelo:', agentExample.model);
    console.log('  ID:', agentId);
    
    // Query de inserção
    const insertQuery = `
      INSERT INTO agents (
        id, name, description, type, model, instruction, role, goal, 
        config, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *;
    `;
    
    const values = [
      agentId,
      agentExample.name,
      agentExample.description,
      agentExample.type,
      agentExample.model,
      agentExample.instruction,
      agentExample.role,
      agentExample.goal,
      JSON.stringify(agentExample.config) // Converter config para JSON
    ];
    
    console.log('\n🔄 Inserindo agente no PostgreSQL...');
    const result = await client.query(insertQuery, values);
    
    if (result.rows && result.rows.length > 0) {
      const createdAgent = result.rows[0];
      console.log('\n✅ Agente criado com sucesso!');
      console.log('📊 Detalhes do agente criado:');
      console.log('  ID:', createdAgent.id);
      console.log('  Nome:', createdAgent.name);
      console.log('  Descrição:', createdAgent.description);
      console.log('  Tipo:', createdAgent.type);
      console.log('  Modelo:', createdAgent.model);
      console.log('  Role:', createdAgent.role);
      console.log('  Goal:', createdAgent.goal);
      console.log('  Criado em:', createdAgent.created_at);
      
      // Verificar se o config foi salvo corretamente
      console.log('\n🔧 Configuração salva:');
      try {
        const savedConfig = JSON.parse(createdAgent.config);
        console.log('  MCP Servers:', savedConfig.mcp_servers?.length || 0);
        console.log('  Custom MCP Servers:', savedConfig.custom_mcp_servers?.length || 0);
        console.log('  Tools:', savedConfig.tools);
        console.log('  Agent Tools:', savedConfig.agent_tools);
      } catch (configError) {
        console.error('❌ Erro ao parsear config:', configError);
      }
      
      console.log('\n🎯 O agente deve aparecer no painel do Evo AI!');
      console.log('🌐 Acesse: https://n8n-evo-ai-frontend.05pdov.easypanel.host/');
      
      return createdAgent;
    } else {
      throw new Error('Nenhum resultado retornado da inserção');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar agente:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createAgentFromExample().catch(console.error);