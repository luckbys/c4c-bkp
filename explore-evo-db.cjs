const { Pool } = require('pg');

const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function exploreDatabase() {
  let client;
  try {
    console.log('🔍 Conectando ao banco de dados...');
    client = await pool.connect();
    
    // Testar conexão
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Conexão estabelecida:', testResult.rows[0].now);
    
    // Listar todas as tabelas
    console.log('\n📋 Listando todas as tabelas:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Tabelas encontradas:', tables);
    
    // Procurar tabelas relacionadas a agentes
    const agentTables = tables.filter(table => 
      table.toLowerCase().includes('agent') || 
      table.toLowerCase().includes('bot') ||
      table.toLowerCase().includes('ai') ||
      table.toLowerCase().includes('workflow')
    );
    
    console.log('\n🤖 Tabelas relacionadas a agentes/bots:', agentTables);
    
    // Explorar estrutura das tabelas de agentes
    for (const table of agentTables) {
      console.log(`\n📊 Estrutura da tabela '${table}':`);
      try {
        const structureResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position;
        `, [table]);
        
        console.table(structureResult.rows);
        
        // Verificar se há dados na tabela
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`Registros na tabela: ${countResult.rows[0].count}`);
        
        // Se houver poucos registros, mostrar alguns exemplos
        if (countResult.rows[0].count > 0 && countResult.rows[0].count <= 5) {
          console.log('\n📝 Exemplos de dados:');
          const sampleResult = await client.query(`SELECT * FROM "${table}" LIMIT 3`);
          console.table(sampleResult.rows);
        }
      } catch (error) {
        console.error(`❌ Erro ao explorar tabela ${table}:`, error.message);
      }
    }
    
    // Se não encontrou tabelas específicas, listar todas para análise manual
    if (agentTables.length === 0) {
      console.log('\n🔍 Nenhuma tabela de agente encontrada automaticamente.');
      console.log('Explorando todas as tabelas para encontrar estruturas relevantes...');
      
      for (const table of tables.slice(0, 10)) { // Limitar a 10 primeiras tabelas
        console.log(`\n📊 Estrutura da tabela '${table}':`);
        try {
          const structureResult = await client.query(`
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position;
          `, [table]);
          
          console.table(structureResult.rows);
          
          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
          console.log(`Registros na tabela: ${countResult.rows[0].count}`);
        } catch (error) {
          console.error(`❌ Erro ao explorar tabela ${table}:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

exploreDatabase().catch(console.error);