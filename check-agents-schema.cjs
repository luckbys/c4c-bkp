const { Pool } = require('pg');

// Configuração do PostgreSQL do Evo AI
const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function checkAgentsSchema() {
  let client;
  try {
    console.log('🔍 Verificando schema da tabela agents...');
    client = await pool.connect();
    
    // Verificar estrutura da tabela agents
    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'agents' 
      ORDER BY ordinal_position;
    `;
    
    const schemaResult = await client.query(schemaQuery);
    
    if (schemaResult.rows.length === 0) {
      console.log('❌ Tabela agents não encontrada!');
      return;
    }
    
    console.log('\n📊 Estrutura da tabela agents:');
    console.log('=' .repeat(80));
    console.log('| Coluna'.padEnd(20) + '| Tipo'.padEnd(20) + '| Nulo?'.padEnd(10) + '| Padrão'.padEnd(25) + '|');
    console.log('=' .repeat(80));
    
    schemaResult.rows.forEach(column => {
      const name = column.column_name.padEnd(18);
      const type = column.data_type.padEnd(18);
      const nullable = column.is_nullable.padEnd(8);
      const defaultVal = (column.column_default || 'NULL').padEnd(23);
      
      console.log(`| ${name} | ${type} | ${nullable} | ${defaultVal} |`);
      
      // Verificar especificamente a coluna id
      if (column.column_name === 'id') {
        console.log('\n🎯 Análise da coluna ID:');
        console.log(`   Tipo: ${column.data_type}`);
        console.log(`   Aceita NULL: ${column.is_nullable}`);
        console.log(`   Valor padrão: ${column.column_default || 'Nenhum'}`);
        
        if (column.data_type === 'uuid') {
          console.log('   ✅ Coluna ID está corretamente definida como UUID');
        } else {
          console.log('   ⚠️ Coluna ID NÃO é do tipo UUID!');
          console.log('   💡 Isso pode causar erros ao tentar inserir IDs não-UUID');
        }
      }
    });
    
    console.log('=' .repeat(80));
    
    // Verificar constraints da tabela
    console.log('\n🔒 Verificando constraints da tabela agents:');
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        ccu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'agents'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `;
    
    const constraintsResult = await client.query(constraintsQuery);
    
    if (constraintsResult.rows.length > 0) {
      constraintsResult.rows.forEach(constraint => {
        console.log(`   ${constraint.constraint_type}: ${constraint.constraint_name} (${constraint.column_name})`);
      });
    } else {
      console.log('   Nenhuma constraint encontrada.');
    }
    
    // Verificar alguns registros existentes para entender os tipos de ID
    console.log('\n📋 Verificando tipos de IDs existentes:');
    const sampleQuery = `
      SELECT 
        id::text as id_text,
        name,
        CASE 
          WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'UUID válido'
          ELSE 'ID inválido'
        END as id_type
      FROM agents 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n   Últimos 10 agentes:');
      sampleResult.rows.forEach((agent, index) => {
        const status = agent.id_type === 'UUID válido' ? '✅' : '❌';
        console.log(`   ${index + 1}. ${status} ${agent.id_text} (${agent.name}) - ${agent.id_type}`);
      });
      
      const invalidIds = sampleResult.rows.filter(agent => agent.id_type !== 'UUID válido');
      if (invalidIds.length > 0) {
        console.log(`\n⚠️ Encontrados ${invalidIds.length} agentes com IDs inválidos!`);
        console.log('💡 Estes IDs podem causar erros nas operações DELETE.');
      } else {
        console.log('\n✅ Todos os IDs verificados são UUIDs válidos!');
      }
    } else {
      console.log('   Nenhum agente encontrado na tabela.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar schema:', error);
    console.error('Stack:', error.stack);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Executar verificação
if (require.main === module) {
  checkAgentsSchema()
    .then(() => {
      console.log('\n✅ Verificação de schema concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na verificação:', error);
      process.exit(1);
    });
}

module.exports = { checkAgentsSchema };