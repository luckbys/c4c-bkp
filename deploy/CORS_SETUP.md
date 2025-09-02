# Configuração CORS para Firebase Storage

## Problema

As imagens armazenadas no Firebase Storage não estão sendo carregadas no domínio de produção devido a erro de CORS:

```
Access to image at 'https://firebasestorage.googleapis.com/...' from origin 'https://c4c.devsible.com.br' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solução

Configurar CORS no bucket do Firebase Storage para permitir requisições dos domínios autorizados.

## Pré-requisitos

### 1. Instalar Google Cloud SDK

**Windows:**
```bash
# Baixar e instalar o Google Cloud SDK
# https://cloud.google.com/sdk/docs/install-windows
```

**macOS:**
```bash
brew install google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Autenticar com o Google Cloud

```bash
# Fazer login na conta Google
gcloud auth login

# Configurar o projeto
gcloud config set project cerc-3m1uep

# Verificar configuração
gcloud config list
```

## Configuração CORS

### 1. Verificar configuração atual

```bash
# Verificar CORS atual do bucket
gsutil cors get gs://cerc-3m1uep.appspot.com
```

### 2. Aplicar nova configuração

```bash
# Aplicar configuração CORS usando o arquivo cors.json
gsutil cors set cors.json gs://cerc-3m1uep.appspot.com
```

### 3. Verificar configuração aplicada

```bash
# Confirmar que a configuração foi aplicada
gsutil cors get gs://cerc-3m1uep.appspot.com
```

## Script Automatizado

Para facilitar o processo, use o script `setup-cors.sh`:

```bash
# Dar permissão de execução (Linux/macOS)
chmod +x setup-cors.sh

# Executar o script
./setup-cors.sh
```

**Windows (PowerShell):**
```powershell
# Executar usando Git Bash ou WSL
bash setup-cors.sh
```

## Configuração CORS Aplicada

O arquivo `cors.json` configura:

- **Origens permitidas:**
  - `https://c4c.devsible.com.br` (produção)
  - `http://localhost:9003` (desenvolvimento)
  - `https://localhost:9003` (desenvolvimento HTTPS)

- **Métodos permitidos:** `GET`
- **Cache:** 3600 segundos (1 hora)
- **Headers de resposta:** Content-Type, Access-Control-*

## Verificação

Após aplicar a configuração:

1. **Aguarde alguns minutos** para propagação
2. **Limpe o cache do navegador**
3. **Teste o carregamento das imagens** no chat
4. **Verifique o console** para confirmar que não há mais erros de CORS

## Troubleshooting

### Erro: "gsutil: command not found"
- Instale o Google Cloud SDK
- Reinicie o terminal após a instalação

### Erro: "AccessDeniedException"
- Verifique se está autenticado: `gcloud auth list`
- Confirme as permissões no projeto Firebase

### Erro: "BucketNotFoundException"
- Verifique o nome do bucket: `cerc-3m1uep.appspot.com`
- Confirme que o projeto está correto

### Imagens ainda não carregam
- Aguarde até 10 minutos para propagação
- Limpe cache do navegador (Ctrl+Shift+R)
- Verifique se a URL da imagem está correta
- Teste em modo incógnito

## Alternativas

Se o problema persistir, considere:

1. **Proxy interno:** Usar endpoint `/api/image-proxy` para contornar CORS
2. **CDN:** Configurar CloudFlare ou similar
3. **Signed URLs:** Usar URLs assinadas do Firebase

## Monitoramento

Para monitorar requisições CORS:

```bash
# Ver logs do bucket
gsutil logging get gs://cerc-3m1uep.appspot.com
```

## Contato

Em caso de problemas, verifique:
- Console do Firebase Storage
- Logs do Google Cloud Console
- Network tab do DevTools do navegador