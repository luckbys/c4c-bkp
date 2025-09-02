const { Pool } = require('pg');

const pool = new Pool({
  host: 'easypanel.devsible.com.br',
  port: 5432,
  user: 'postgres',
  password: 'e01fb274b8d6a88c8ea7',
  database: 'n8n',
  ssl: false
});

async function fixOrphanAgents() {
  let client;
  try {
    console.log('🔧 Corrigindo agentes órfãos (sem client_id)...');
    client = await pool.connect();
    
    const devsibleClientId = 'b43645b9-5616-4899-aa76-29bdd60c33e5';
    
    // Listar agentes órfãos
    console.log('📋 Listando agentes órfãos:');
    const orphanAgentsResult = await client.query(`
      SELECT id, name, type, description, created_at 
      FROM agents 
      WHERE client_id IS NULL 
      ORDER BY created_at DESC;
    `);
    
    if (orphanAgentsResult.rows.length === 0) {
      console.log('✅ Nenhum agente órfão encontrado!');
      return;
    }
    
    console.table(orphanAgentsResult.rows);
    console.log(`\n📊 Total de agentes órfãos: ${orphanAgentsResult.rows.length}`);
    
    // Confirmar antes de corrigir
    console.log(`\n🎯 Vinculando todos os agentes órfãos ao cliente devsible (${devsibleClientId})...`);
    
    // Atualizar todos os agentes órfãos
    const updateResult = await client.query(`
      UPDATE agents 
      SET 
        client_id = $1,
        updated_at = NOW()
      WHERE client_id IS NULL 
      RETURNING id, name, client_id;
    `, [devsibleClientId]);
    
    console.log(`\n✅ ${updateResult.rows.length} agentes corrigidos com sucesso!`);
    
    if (updateResult.rows.length > 0) {
      console.log('📝 Agentes corrigidos:');
      console.table(updateResult.rows);
    }
    
    // Verificar resultado final
    console.log('\n📊 Verificação final:');
    
    // Contar agentes por cliente
    const clientStatsResult = await client.query(`
      SELECT 
        CASE 
          WHEN client_id IS NULL THEN 'SEM CLIENT_ID (ÓRFÃOS)'
          WHEN client_id = $1 THEN 'DEVSIBLE'
          ELSE 'OUTROS CLIENTES'
        END as cliente,
        COUNT(*) as total_agentes
      FROM agents 
      GROUP BY 
        CASE 
          WHEN client_id IS NULL THEN 'SEM CLIENT_ID (ÓRFÃOS)'
          WHEN client_id = $1 THEN 'DEVSIBLE'
          ELSE 'OUTROS CLIENTES'
        END
      ORDER BY total_agentes DESC;
    `, [devsibleClientId]);
    
    console.table(clientStatsResult.rows);
    
    // Listar agentes do devsible
    console.log('\n📋 Agentes do cliente devsible:');
    const devsibleAgentsResult = await client.query(`
      SELECT id, name, type, model, created_at, updated_at
      FROM agents 
      WHERE client_id = $1 
      ORDER BY created_at DESC;
    `, [devsibleClientId]);
    
    console.table(devsibleAgentsResult.rows);
    
    console.log('\n🎉 Correção concluída!');
    console.log('✅ Todos os agentes agora estão vinculados ao cliente devsible');
    console.log('📊 Os agentes devem aparecer no painel do Evo AI');
    console.log('🌐 Verifique em: https://n8n-evo-ai-frontend.05pdov.easypanel.host/');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

fixOrphanAgents().catch(console.error);