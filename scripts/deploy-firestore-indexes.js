#!/usr/bin/env node

/**
 * Script para fazer deploy dos índices Firestore
 * 
 * Uso:
 * npm run deploy:indexes
 * ou
 * node scripts/deploy-firestore-indexes.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔥 Iniciando deploy dos índices Firestore...');

try {
  // Verificar se Firebase CLI está instalado
  execSync('firebase --version', { stdio: 'pipe' });
  console.log('✓ Firebase CLI encontrado');
} catch (error) {
  console.error('❌ Firebase CLI não encontrado. Instale com: npm install -g firebase-tools');
  process.exit(1);
}

try {
  // Fazer deploy dos índices
  console.log('📤 Fazendo deploy dos índices...');
  execSync('firebase deploy --only firestore:indexes', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  
  console.log('✅ Índices Firestore deployados com sucesso!');
  console.log('ℹ️ Os índices podem levar alguns minutos para serem criados no Firebase Console.');
  
} catch (error) {
  console.error('❌ Erro ao fazer deploy dos índices:', error.message);
  process.exit(1);
}