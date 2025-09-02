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

async function removeOrphanSDRVendas() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Conectando ao PostgreSQL do Evo AI...');
    
    // 1. Buscar agentes com nome relacionado a SDR_VENDAS
    console.log('\n📋 Buscando agentes relacionados a SDR_VENDAS...');
    const searchQuery = `
      SELECT id, name, description, type, model, created_at, client_id
      FROM agents 
      WHERE UPPER(name) LIKE '%SDR%' 
         OR UPPER(name) LIKE '%VENDAS%'
         OR UPPER(name) LIKE '%SDR_VENDAS%'
      ORDER BY created_at DESC;
    `;
    
    const searchResult = await client.query(searchQuery);
    
    if (searchResult.rows.length === 0) {
      console.log('✅ Nenhum agente relacionado a SDR_VENDAS encontrado no PostgreSQL.');
      console.log('🎯 O agente já foi removido ou não existe mais.');
      return;
    }
    
    console.log(`\n📊 Encontrados ${searchResult.rows.length} agente(s) relacionado(s):`);
    console.table(searchResult.rows.map(row => ({
      ID: row.id,
      Nome: row.name,
      Descrição: row.description?.substring(0, 50) + '...',
      Tipo: row.type,
      Modelo: row.model,
      'Criado em': new Date(row.created_at).toLocaleString('pt-BR'),
      'Client ID': row.client_id
    })));
    
    // 2. Identificar o agente SDR_VENDAS específico
    const sdrVendasAgent = searchResult.rows.find(row => 
      row.name.toUpperCase().includes('SDR_VENDAS') || 
      row.name.toUpperCase() === 'SDR_VENDAS'
    );
    
    if (!sdrVendasAgent) {
      console.log('\n⚠️ Agente específico "SDR_VENDAS" não encontrado.');
      console.log('💡 Verifique se o nome está correto ou se já foi removido.');
      return;
    }
    
    console.log('\n🎯 Agente SDR_VENDAS identificado:');
    console.log(`   ID: ${sdrVendasAgent.id}`);
    console.log(`   Nome: ${sdrVendasAgent.name}`);
    console.log(`   Descrição: ${sdrVendasAgent.description}`);
    console.log(`   Criado em: ${new Date(sdrVendasAgent.created_at).toLocaleString('pt-BR')}`);
    
    // 3. Verificar se o agente existe no Firestore (CRM)
    console.log('\n🔍 Verificando se o agente existe no sistema CRM...');
    try {
      const crmCheckResponse = await fetch(`http://localhost:9004/api/agents/${sdrVendasAgent.id}`);
      
      if (crmCheckResponse.ok) {
        console.log('⚠️ ATENÇÃO: O agente ainda existe no sistema CRM!');
        console.log('💡 Recomendação: Delete primeiro pelo sistema CRM para evitar inconsistências.');
        return;
      } else if (crmCheckResponse.status === 404) {
        console.log('✅ Confirmado: Agente não existe no sistema CRM (agente órfão).');
      } else {
        console.log('⚠️ Não foi possível verificar o sistema CRM. Continuando...');
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar sistema CRM:', error.message);
      console.log('🔄 Continuando com a remoção do PostgreSQL...');
    }
    
    // 4. Remover o agente órfão do PostgreSQL
    console.log('\n🗑️ Removendo agente órfão do PostgreSQL...');
    const deleteQuery = 'DELETE FROM agents WHERE id = $1 RETURNING *';
    const deleteResult = await client.query(deleteQuery, [sdrVendasAgent.id]);
    
    if (deleteResult.rows.length > 0) {
      console.log('✅ Agente SDR_VENDAS removido com sucesso do PostgreSQL!');
      console.log(`   ID removido: ${deleteResult.rows[0].id}`);
      console.log(`   Nome removido: ${deleteResult.rows[0].name}`);
    } else {
      console.log('❌ Falha ao remover o agente do PostgreSQL.');
      return;
    }
    
    // 5. Verificar se a remoção foi bem-sucedida
    console.log('\n🔍 Verificando se a remoção foi bem-sucedida...');
    const verifyQuery = 'SELECT COUNT(*) as count FROM agents WHERE id = $1';
    const verifyResult = await client.query(verifyQuery, [sdrVendasAgent.id]);
    
    if (verifyResult.rows[0].count === '0') {
      console.log('✅ Confirmado: Agente completamente removido do PostgreSQL.');
    } else {
      console.log('❌ Erro: Agente ainda existe no PostgreSQL após tentativa de remoção.');
      return;
    }
    
    // 6. Verificar se ainda aparece no painel do Evo AI
    console.log('\n🎯 Verificando painel do Evo AI...');
    console.log('💡 Acesse: https://n8n-evo-ai-frontend.05pdov.easypanel.host/');
    console.log('📋 Faça login como cliente "devsible"');
    console.log('🔍 Verifique se o agente "SDR_VENDAS" ainda aparece na lista');
    console.log('✅ O agente deve ter desaparecido do painel após esta remoção.');
    
    // 7. Listar agentes restantes
    console.log('\n📊 Agentes restantes no PostgreSQL:');
    const remainingQuery = `
      SELECT name, type, created_at 
      FROM agents 
      WHERE client_id = 'b43645b9-5616-4899-aa76-29bdd60c33e5'
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    const remainingResult = await client.query(remainingQuery);
    
    if (remainingResult.rows.length > 0) {
      console.table(remainingResult.rows.map(row => ({
        Nome: row.name,
        Tipo: row.type,
        'Criado em': new Date(row.created_at).toLocaleString('pt-BR')
      })));
    } else {
      console.log('📝 Nenhum agente restante encontrado.');
    }
    
    console.log('\n🎉 Processo concluído com sucesso!');
    console.log('✅ Agente órfão "SDR_VENDAS" removido do PostgreSQL');
    console.log('🔄 O painel do Evo AI deve estar atualizado agora');
    
  } catch (error) {
    console.error('❌ Erro durante o processo:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o script
removeOrphanSDRVendas()
  .then(() => {
    console.log('\n✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });