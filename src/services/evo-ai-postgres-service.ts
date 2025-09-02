import { v4 as uuidv4 } from 'uuid';
import postgresService from './postgres-service';

interface EvoAIAgent {
  id: string;
  client_id?: string | null;
  name: string;
  description?: string | null;
  type: string;
  model?: string | null;
  api_key_id?: string | null;
  instruction?: string | null;
  agent_card_url?: string | null;
  folder_id?: string | null;
  config?: any;
  role?: string | null;
  goal?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CreateAgentData {
  name: string;
  description?: string;
  instruction?: string;
  goal?: string;
  type?: string;
  model?: string;
  role?: string;
  apiKey?: string; // Adicionar campo apiKey
  config?: {
    tools?: any;
    custom_tools?: any;
    mcp_servers?: Array<{
      id: string;
      envs: Record<string, string>;
      tools: string[];
    }>;
    custom_mcp_servers?: Array<{
      url: string;
      headers: Record<string, any>;
    }>;
    agent_tools?: any;
    sub_agents?: any;
    workflow?: any;
    apiKey?: string; // Também no config
  };
}

class EvoAIPostgresService {
  private validateAgentType(type?: string): string {
    const validTypes = ['llm', 'sequential', 'parallel', 'loop', 'a2a', 'workflow', 'crew_ai', 'task'];
    if (type && validTypes.includes(type)) {
      return type;
    }
    return 'llm'; // Default to 'llm' if invalid or not provided
  }

  async createAgent(agentData: CreateAgentData): Promise<EvoAIAgent | null> {
    try {
      console.log('🤖 Criando agente diretamente no PostgreSQL...');
      console.log('Dados do agente:', agentData);

      // Testar conexão primeiro
      const isConnected = await postgresService.testConnection();
      if (!isConnected) {
        throw new Error('Não foi possível conectar ao PostgreSQL');
      }

      // Gerar ID único para o agente
      const agentId = uuidv4();
      
      // Preparar dados do agente com valores padrão
      const agent: EvoAIAgent = {
        id: agentId,
        client_id: 'b43645b9-5616-4899-aa76-29bdd60c33e5', // Cliente devsible
        name: agentData.name,
        description: agentData.description || `Agente criado via CRM: ${agentData.name}`,
        type: this.validateAgentType(agentData.type) || 'llm',
        model: agentData.model || 'gpt-3.5-turbo',
        api_key_id: agentData.apiKey || null, // Mapear apiKey para api_key_id
        instruction: agentData.instruction || 'Você é um assistente útil e prestativo.',
        agent_card_url: null,
        folder_id: null,
        config: {
          ...(agentData.config || {}),
          tools: agentData.config?.tools || null,
          custom_tools: agentData.config?.custom_tools || null,
          mcp_servers: agentData.config?.mcp_servers || [],
          custom_mcp_servers: agentData.config?.custom_mcp_servers || [],
          agent_tools: agentData.config?.agent_tools || null,
          sub_agents: agentData.config?.sub_agents || null,
          workflow: agentData.config?.workflow || null,
          created_via: 'crm-integration',
          created_at: new Date().toISOString(),
          apiKey: agentData.apiKey || agentData.config?.apiKey || null // Preservar apiKey no config
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
      const result = await postgresService.query(insertQuery, values);
      
      if (result.rows && result.rows.length > 0) {
        const createdAgent = result.rows[0];
        console.log('✅ Agente criado com sucesso no PostgreSQL!');
        console.log('ID do agente:', createdAgent.id);
        console.log('Nome:', createdAgent.name);
        console.log('Tipo:', createdAgent.type);
        console.log('Criado em:', createdAgent.created_at);
        
        return createdAgent;
      } else {
        throw new Error('Nenhum resultado retornado da inserção');
      }

    } catch (error) {
      console.error('❌ Erro ao criar agente no PostgreSQL:', error);
      throw error;
    }
  }

  async listAgents(): Promise<EvoAIAgent[]> {
    try {
      console.log('📋 Listando agentes do PostgreSQL...');
      
      const query = `
        SELECT * FROM agents 
        ORDER BY created_at DESC 
        LIMIT 50;
      `;
      
      const result = await postgresService.query(query);
      console.log(`✅ Encontrados ${result.rows.length} agentes`);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao listar agentes:', error);
      throw error;
    }
  }

  async getAgentById(agentId: string): Promise<EvoAIAgent | null> {
    try {
      console.log(`🔍 Buscando agente por ID: ${agentId}`);
      
      const query = 'SELECT * FROM agents WHERE id = $1';
      const result = await postgresService.query(query, [agentId]);
      
      if (result.rows && result.rows.length > 0) {
        console.log('✅ Agente encontrado');
        return result.rows[0];
      } else {
        console.log('❌ Agente não encontrado');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar agente:', error);
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deletando agente: ${agentId}`);
      
      const query = 'DELETE FROM agents WHERE id = $1 RETURNING id';
      const result = await postgresService.query(query, [agentId]);
      
      if (result.rows && result.rows.length > 0) {
        console.log('✅ Agente deletado com sucesso');
        return true;
      } else {
        console.log('❌ Agente não encontrado para deletar');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao deletar agente:', error);
      throw error;
    }
  }

  async updateAgent(agentId: string, updateData: Partial<CreateAgentData>): Promise<EvoAIAgent | null> {
    try {
      console.log(`📝 Atualizando agente: ${agentId}`);
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (updateData.name) {
        updateFields.push(`name = $${paramIndex}`);
        values.push(updateData.name);
        paramIndex++;
      }

      if (updateData.description) {
        updateFields.push(`description = $${paramIndex}`);
        values.push(updateData.description);
        paramIndex++;
      }

      if (updateData.instruction) {
        updateFields.push(`instruction = $${paramIndex}`);
        values.push(updateData.instruction);
        paramIndex++;
      }

      if (updateData.goal) {
        updateFields.push(`goal = $${paramIndex}`);
        values.push(updateData.goal);
        paramIndex++;
      }

      if (updateData.type) {
        updateFields.push(`type = $${paramIndex}`);
        values.push(updateData.type);
        paramIndex++;
      }

      if (updateData.model) {
        updateFields.push(`model = $${paramIndex}`);
        values.push(updateData.model);
        paramIndex++;
      }

      if (updateData.role) {
        updateFields.push(`role = $${paramIndex}`);
        values.push(updateData.role);
        paramIndex++;
      }

      if (updateData.apiKey) {
        updateFields.push(`api_key_id = $${paramIndex}`);
        values.push(updateData.apiKey);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      // Adicionar updated_at
      updateFields.push(`updated_at = NOW()`);
      
      // Adicionar ID do agente como último parâmetro
      values.push(agentId);
      
      const query = `
        UPDATE agents 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *;
      `;

      const result = await postgresService.query(query, values);
      
      if (result.rows && result.rows.length > 0) {
        console.log('✅ Agente atualizado com sucesso');
        return result.rows[0];
      } else {
        console.log('❌ Agente não encontrado para atualizar');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar agente:', error);
      throw error;
    }
  }
}

export default new EvoAIPostgresService();
export { EvoAIPostgresService, type EvoAIAgent, type CreateAgentData };