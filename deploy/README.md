# Pasta de Deploy

Esta pasta contém todos os arquivos relacionados ao deploy e configuração de infraestrutura do projeto CRM-C4.

## Conteúdo

### Arquivos Docker
- `.dockerignore` - Arquivos ignorados pelo Docker
- `Dockerfile` - Configuração principal do Docker
- `Dockerfile.optimized` - Versão otimizada do Dockerfile
- `docker-compose.yml` - Configuração do Docker Compose

### Configurações de Plataforma
- `app.json` - Configuração para Heroku
- `Procfile` - Arquivo de processo do Heroku
- `heroku-build.sh` - Script de build do Heroku
- `easypanel.yml` - Configuração para EasyPanel
- `apphosting.yaml` - Configuração para App Hosting

### Configurações Firebase
- `firebase.json` - Configuração principal do Firebase
- `setup-firebase.md` - Guia de configuração do Firebase

### Configurações CORS
- `cors.json` - Configuração de CORS
- `CORS_SETUP.md` - Guia de configuração de CORS
- `CORS_MANUAL_SETUP.md` - Configuração manual de CORS
- `setup-cors.sh` - Script de configuração de CORS

### Scripts de Deploy
- `deploy.ps1` - Script de deploy para PowerShell
- `deploy.sh` - Script de deploy para Bash
- `deploy-alternative.sh` - Script alternativo de deploy

### Documentação
- `DEPLOY.md` - Guia principal de deploy
- `DEPLOYMENT.md` - Documentação de deployment

## Como Usar

### Deploy Local com Docker
```bash
# Build da imagem
docker build -f deploy/Dockerfile -t crm-c4 .

# Executar com docker-compose
docker-compose -f deploy/docker-compose.yml up
```

### Deploy no Heroku
```bash
# Configurar Heroku
heroku create seu-app-name

# Deploy
git push heroku main
```

### Deploy com Scripts
```bash
# Linux/Mac
bash deploy/deploy.sh

# Windows PowerShell
.\deploy\deploy.ps1
```

## Configuração

Antes de fazer o deploy, certifique-se de:
1. Configurar as variáveis de ambiente necessárias
2. Configurar o Firebase seguindo `setup-firebase.md`
3. Configurar CORS seguindo `CORS_SETUP.md`
4. Revisar as configurações específicas da plataforma

## Plataformas Suportadas

- **Docker** - Containerização local e produção
- **Heroku** - Deploy em nuvem
- **EasyPanel** - Painel de controle
- **Firebase** - Hosting e serviços
- **App Hosting** - Hosting de aplicações