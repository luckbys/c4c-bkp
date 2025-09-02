import { Pool, PoolClient } from 'pg';

interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

class PostgresService {
  private pool: Pool;
  private config: PostgresConfig;

  constructor() {
    this.config = {
      host: 'easypanel.devsible.com.br',
      port: 5432,
      user: 'postgres',
      password: 'e01fb274b8d6a88c8ea7',
      database: 'n8n'
    };

    this.pool = new Pool({
      ...this.config,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: false
    });

    this.pool.on('error', (err) => {
      console.error('Erro inesperado no pool PostgreSQL:', err);
    });
  }

  async testConnection(): Promise<boolean> {
    let client: PoolClient | null = null;
    try {
      console.log('🔍 Testando conexão PostgreSQL...');
      client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Conexão PostgreSQL estabelecida com sucesso:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar ao PostgreSQL:', error);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('❌ Erro ao executar query PostgreSQL:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getTableStructure(tableName: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `;
      const result = await this.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      console.error(`❌ Erro ao obter estrutura da tabela ${tableName}:`, error);
      throw error;
    }
  }

  async listTables(): Promise<string[]> {
    try {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      const result = await this.query(query);
      return result.rows.map((row: any) => row.table_name);
    } catch (error) {
      console.error('❌ Erro ao listar tabelas:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('🔒 Pool PostgreSQL fechado');
    } catch (error) {
      console.error('❌ Erro ao fechar pool PostgreSQL:', error);
    }
  }
}

export default new PostgresService();
export { PostgresService };