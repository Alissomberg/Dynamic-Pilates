# Como rodar o Zello localmente

Este guia inicia o aplicativo web e a API usada para validar tokens, enviar backups e verificar atualizações.

## Requisitos

- Node.js `24.15.0` ou uma versão compatível;
- npm;
- PowerShell ou Terminal do Windows.

Confira a instalação:

```powershell
node --version
npm --version
```

## Primeira instalação

Abra um terminal na pasta do projeto:

```powershell
cd "C:\Users\fabio\Documents\Dynamic Pylates"
```

Instale as dependências dos três módulos:

```powershell
npm install
npm install --prefix client
npm install --prefix server
```

Essa etapa só precisa ser repetida quando as dependências forem alteradas.

## Iniciar o sistema

Na raiz do projeto, execute:

```powershell
npm run dev
```

Esse único comando inicia:

- aplicativo Zello em `http://localhost:3000`;
- API Zello Cloud em `http://127.0.0.1:3001`.

Se a porta `3000` já estiver ocupada, o Vite mostrará no terminal outra porta, como `http://localhost:3002`.

Mantenha o terminal aberto enquanto estiver usando o sistema. Para encerrar aplicativo e servidor, pressione `Ctrl + C`.

## Criar um token de teste

Em outro terminal aberto na raiz do projeto, execute:

```powershell
npm run token:create -- --name "Cliente de teste"
```

Copie o campo `token` exibido e use-o na tela **Acessar o Zello**. O token completo aparece apenas no momento da criação.

## Confirmar que a API está funcionando

Abra no navegador:

```text
http://127.0.0.1:3001/api/health
```

A resposta deve conter `"status":"ok"` e `"service":"Zello Cloud API"`.

## Erro “O servidor demorou para responder”

1. Confira se o terminal com `npm run dev` continua aberto.
2. Teste `http://127.0.0.1:3001/api/health` no navegador.
3. Pare processos antigos com `Ctrl + C` e execute `npm run dev` novamente.
4. Atualize a página do Zello com `Ctrl + F5`.

O proxy local usa explicitamente `127.0.0.1` para evitar conflitos de IPv6 do Windows.

## Executar separadamente

Se precisar acompanhar cada processo em um terminal diferente:

Terminal da API:

```powershell
npm run server:dev
```

Terminal do aplicativo:

```powershell
npm run client
```

## Testes e build

```powershell
npm test --prefix client
npm test --prefix server
npm run build
```

## Observação sobre `.env`

Para uso local, o sistema funciona sem arquivos `.env` e usa configurações de desenvolvimento. Para gerar um APK ou publicar o servidor, configure `client/.env.production` e `server/.env` a partir dos respectivos arquivos `.env.example`.
