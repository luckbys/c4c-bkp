const { Pool } = require('pg');

const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function checkConstraints() {
  let client;
  try {
    console.log('🔍 Verificando constraints da tabela agents...');
    client = await pool.connect();
    
    // Verificar constraints da tabela agents
    const constraintsResult = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'agents'::regclass;
    `);
    
    console.log('📋 Constraints encontradas:');
    console.table(constraintsResult.rows);
    
    // Verificar especificamente a constraint check_agent_type
    const typeConstraintResult = await client.query(`
      SELECT pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'check_agent_type' AND conrelid = 'agents'::regclass;
    `);
    
    if (typeConstraintResult.rows.length > 0) {
      console.log('\n🎯 Constraint check_agent_type:');
      console.log(typeConstraintResult.rows[0].definition);
    }
    
    // Verificar se há dados existentes para entender os valores válidos
    console.log('\n📊 Verificando valores únicos na coluna type:');
    const uniqueTypesResult = await client.query(`
      SELECT DISTINCT type, COUNT(*) as count
      FROM agents 
      GROUP BY type
      ORDER BY count DESC;
    `);
    
    if (uniqueTypesResult.rows.length > 0) {
      console.table(uniqueTypesResult.rows);
    } else {
      console.log('Nenhum dado encontrado na tabela agents');
    }
    
    // Verificar enums relacionados ao tipo
    console.log('\n🔍 Verificando tipos enum relacionados:');
    const enumsResult = await client.query(`
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname LIKE '%agent%' OR t.typname LIKE '%type%'
      GROUP BY t.typname;
    `);
    
    if (enumsResult.rows.length > 0) {
      console.table(enumsResult.rows);
    } else {
      console.log('Nenhum enum relacionado encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar constraints:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkConstraints().catch(console.error);