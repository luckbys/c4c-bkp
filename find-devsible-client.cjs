const { Pool } = require('pg');

const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function findDevsibleClient() {
  let client;
  try {
    console.log('🔍 Procurando cliente "devsible"...');
    client = await pool.connect();
    
    // Listar todas as tabelas para encontrar tabela de clientes
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('📋 Tabelas disponíveis:', tables);
    
    // Procurar tabelas relacionadas a clientes/usuários
    const clientTables = tables.filter(table => 
      table.toLowerCase().includes('client') || 
      table.toLowerCase().includes('user') ||
      table.toLowerCase().includes('company') ||
      table.toLowerCase().includes('organization')
    );
    
    console.log('\n👥 Tabelas relacionadas a clientes:', clientTables);
    
    // Explorar cada tabela de clientes
    for (const table of clientTables) {
      console.log(`\n📊 Explorando tabela '${table}':`);
      try {
        // Verificar estrutura
        const structureResult = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position;
        `, [table]);
        
        console.table(structureResult.rows);
        
        // Procurar por 'devsible' nos dados
        const searchResult = await client.query(`
          SELECT * FROM "${table}" 
          WHERE LOWER(CAST("${table}" AS TEXT)) LIKE '%devsible%' 
          OR LOWER(CAST("${table}" AS TEXT)) LIKE '%devisible%'
          LIMIT 10;
        `);
        
        if (searchResult.rows.length > 0) {
          console.log(`\n🎯 Encontrado 'devsible' na tabela ${table}:`);
          console.table(searchResult.rows);
        } else {
          // Tentar buscar em campos específicos
          const columns = structureResult.rows.map(row => row.column_name);
          const nameColumns = columns.filter(col => 
            col.toLowerCase().includes('name') || 
            col.toLowerCase().includes('title') ||
            col.toLowerCase().includes('company')
          );
          
          for (const col of nameColumns) {
            try {
              const nameSearchResult = await client.query(`
                SELECT * FROM "${table}" 
                WHERE LOWER("${col}") LIKE '%devsible%' 
                OR LOWER("${col}") LIKE '%devisible%'
                LIMIT 5;
              `);
              
              if (nameSearchResult.rows.length > 0) {
                console.log(`\n🎯 Encontrado 'devsible' na coluna ${col} da tabela ${table}:`);
                console.table(nameSearchResult.rows);
              }
            } catch (colError) {
              // Ignorar erros de coluna específica
            }
          }
        }
        
        // Mostrar alguns registros para análise
        const sampleResult = await client.query(`SELECT * FROM "${table}" LIMIT 3`);
        if (sampleResult.rows.length > 0) {
          console.log(`\n📝 Exemplos de dados na tabela ${table}:`);
          console.table(sampleResult.rows);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao explorar tabela ${table}:`, error.message);
      }
    }
    
    // Se não encontrou tabelas específicas, verificar agentes existentes
    console.log('\n🤖 Verificando agentes existentes para identificar client_id:');
    try {
      const agentsResult = await client.query(`
        SELECT id, client_id, name, description, created_at 
        FROM agents 
        ORDER BY created_at DESC 
        LIMIT 10;
      `);
      
      if (agentsResult.rows.length > 0) {
        console.log('📋 Agentes existentes:');
        console.table(agentsResult.rows);
        
        // Verificar client_ids únicos
        const clientIdsResult = await client.query(`
          SELECT DISTINCT client_id, COUNT(*) as agent_count
          FROM agents 
          WHERE client_id IS NOT NULL
          GROUP BY client_id;
        `);
        
        if (clientIdsResult.rows.length > 0) {
          console.log('\n🆔 Client IDs únicos encontrados:');
          console.table(clientIdsResult.rows);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar agentes:', error.message);
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

findDevsibleClient().catch(console.error);