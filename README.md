# Zello

Aplicativo Android offline-first para gestão de estúdios. Alunos, horários, presenças, planos e pagamentos continuam no SQLite do tablet; a camada Zello Cloud cuida de ativação por token, backup premium assistido e distribuição de novas versões do APK.

## Desenvolvimento

Requisitos: Node.js `24.15.0` e npm.

```powershell
npm install --prefix client
npm install --prefix server
npm run server:dev
npm run dev
```

Acesse `http://localhost:3000`. No navegador, o Vite encaminha `/api/v1` para o servidor local.

## Primeiro token

Com o servidor configurado, a equipe técnica cria um token e o entrega ao cliente:

```powershell
npm run token:create -- --name "Nome do cliente"
```

O token aparece uma única vez. Por padrão, as novas contas recebem suporte premium gratuito.

## Android

Antes de gerar o APK, copie `client/.env.example` para `client/.env.production` e defina a URL HTTPS pública da API. Depois:

```powershell
npm run android:sync
npm run android:open
```

O `applicationId` anterior foi preservado para que o Zello possa atualizar a instalação existente. A versão atual é `1.1.0` (`versionCode 2`).

## Operação da nuvem

Copie `server/.env.example` para `server/.env` e configure o servidor. Banco, pasta de backups e pasta de releases precisam estar em armazenamento persistente. Nunca altere `BACKUP_ENCRYPTION_KEY` sem migrar os arquivos existentes, pois ela é necessária para restaurá-los.

Para entregar um código temporário de restauração após validar o cliente pelo WhatsApp:

```powershell
npm run restore-code:create -- --account ID_DA_CONTA
```

Para disponibilizar um APK novo pela API de atualização:

```powershell
npm run release:publish -- --apk caminho\zello.apk --version 1.2.0 --version-code 3 --notes "Correções e melhorias"
```

Leia [docs/README.md](docs/README.md) e [docs/09-nuvem-backup-autenticacao-atualizacoes.md](docs/09-nuvem-backup-autenticacao-atualizacoes.md) para detalhes.

Para iniciar o sistema no computador, siga [COMO-RODAR-LOCAL.md](COMO-RODAR-LOCAL.md).
