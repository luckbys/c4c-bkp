# Pasta de Testes

Esta pasta contém todos os arquivos de teste, debug e análise do projeto CRM-C4.

## Conteúdo

### Testes de Funcionalidade
- `test-*.js` / `test-*.cjs` - Scripts de teste para diferentes funcionalidades
- `test-*.json` - Dados de teste e payloads

### Arquivos de Debug
- `debug-*.json` - Logs e respostas de debug
- `firebase-debug.log` - Logs de debug do Firebase

### Utilitários de Análise
- `log-analyzer.js` - Analisador de logs
- Outros arquivos de análise e monitoramento

### Imagens de Teste
- `test-base64-image.jpg` - Imagem de teste para validação de upload

## Como Executar os Testes

Para executar os testes a partir do diretório raiz do projeto:

```bash
# Exemplo para testes Node.js
node tests/test-real-evolution-message.cjs

# Exemplo para testes específicos
node tests/test-minio-upload.cjs
```

## Organização

Todos os arquivos relacionados a testes, debug e análise foram organizados nesta pasta para:
- Manter o diretório raiz limpo
- Facilitar a manutenção
- Melhorar a organização do projeto
- Separar código de produção de código de teste