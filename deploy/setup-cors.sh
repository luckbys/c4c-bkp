#!/bin/bash

# Script para configurar CORS no Firebase Storage
# Este script aplica a configuração CORS definida em cors.json ao bucket do Firebase Storage

echo "🔧 Configurando CORS para o Firebase Storage..."

# Verificar se o arquivo cors.json existe
if [ ! -f "cors.json" ]; then
    echo "❌ Erro: Arquivo cors.json não encontrado!"
    echo "   Certifique-se de que o arquivo cors.json está no diretório atual."
    exit 1
fi

# Verificar se o gsutil está instalado
if ! command -v gsutil &> /dev/null; then
    echo "❌ Erro: gsutil não está instalado!"
    echo "   Instale o Google Cloud SDK primeiro:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Aplicar configuração CORS
echo "📋 Aplicando configuração CORS ao bucket gs://cerc-3m1uep.appspot.com..."
gsutil cors set cors.json gs://cerc-3m1uep.appspot.com

if [ $? -eq 0 ]; then
    echo "✅ Configuração CORS aplicada com sucesso!"
    echo "🔍 Verificando configuração atual..."
    gsutil cors get gs://cerc-3m1uep.appspot.com
else
    echo "❌ Erro ao aplicar configuração CORS!"
    echo "   Verifique se você tem permissões adequadas no projeto Firebase."
    exit 1
fi

echo "🎉 Configuração CORS concluída!"
echo "   As imagens agora devem carregar corretamente em:"
echo "   - https://c4c.devsible.com.br"
echo "   - http://localhost:9003"