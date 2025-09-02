#!/bin/bash
# Script personalizado para build no Heroku
echo "Removendo package-lock.json para evitar conflitos"
rm -f package-lock.json

echo "Instalando dependências com npm install --force"
npm install --force

echo "Executando build"
npm run build