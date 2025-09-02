# Configuração Manual de CORS no Firebase Storage

Como o `gsutil` não está instalado, você pode configurar CORS manualmente através do console do Firebase.

## Opção 1: Console do Firebase (Recomendado)

1. **Acesse o Console do Firebase:**
   - Vá para https://console.firebase.google.com/
   - Selecione seu projeto `cerc-3m1uep`

2. **Navegue para Storage:**
   - No menu lateral, clique em "Storage"
   - Vá para a aba "Rules" ou "Regras"

3. **Configure CORS:**
   - Procure por configurações de CORS ou "Cross-Origin Resource Sharing"
   - Adicione as seguintes origens permitidas:
     ```
     https://c4c.devsible.com.br
     http://localhost:9002
     https://localhost:9002
     http://localhost:9003
     https://localhost:9003
     ```

## Opção 2: Google Cloud Console

1. **Acesse o Google Cloud Console:**
   - Vá para https://console.cloud.google.com/
   - Selecione o projeto associado ao Firebase

2. **Navegue para Cloud Storage:**
   - No menu lateral, vá para "Storage" > "Browser"
   - Encontre o bucket `cerc-3m1uep.appspot.com`

3. **Configure CORS:**
   - Clique no bucket
   - Vá para a aba "Permissions" ou "Configuration"
   - Procure por "CORS configuration"
   - Cole a seguinte configuração JSON:

```json
[
  {
    "origin": [
      "https://c4c.devsible.com.br",
      "http://localhost:9002",
      "https://localhost:9002",
      "http://localhost:9003",
      "https://localhost:9003"
    ],
    "method": ["GET"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers"
    ]
  }
]
```

## Opção 3: Instalar Google Cloud SDK

Se preferir usar a linha de comando:

1. **Baixe e instale o Google Cloud SDK:**
   - Vá para https://cloud.google.com/sdk/docs/install
   - Baixe o instalador para Windows
   - Execute a instalação

2. **Configure a autenticação:**
   ```powershell
   gcloud auth login
   gcloud config set project cerc-3m1uep
   ```

3. **Execute o comando CORS:**
   ```powershell
   gsutil cors set cors.json gs://cerc-3m1uep.appspot.com
   ```

## Verificação

Após configurar CORS por qualquer método:

1. **Aguarde alguns minutos** para a configuração se propagar
2. **Recarregue a página** da aplicação
3. **Teste o carregamento de imagens** no chat
4. **Verifique o console do navegador** para confirmar que não há mais erros de CORS

## Fallback Automático

Se ainda houver problemas de CORS, a aplicação possui um sistema de fallback automático:
- As imagens tentarão carregar diretamente do Firebase Storage
- Em caso de erro CORS, automaticamente usarão o proxy interno `/api/image-proxy`
- O proxy contorna completamente os problemas de CORS

## Status Atual

✅ Arquivo `cors.json` criado com configuração para portas 9002 e 9003
✅ Proxy interno `/api/image-proxy` implementado como fallback
✅ Componente `ImageMessage` com detecção automática de CORS
⏳ **Próximo passo:** Configurar CORS no console do Firebase (manual)

---

**Nota:** A configuração manual através do console é mais simples e não requer instalação de ferramentas adicionais.