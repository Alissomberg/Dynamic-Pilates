# Nuvem Zello: autenticação, backup e atualizações

## Visão geral

O uso diário continua offline. A conexão é obrigatória na primeira ativação do token e nas operações de backup, restauração e atualização. Depois de uma ativação válida, o aplicativo mantém uma sessão local para que uma queda de internet não impeça o acesso aos dados do tablet.

## Token de acesso

- a equipe cria o token com `npm run token:create -- --name "Cliente"`;
- o servidor guarda somente um HMAC do token; o valor completo aparece uma única vez;
- todos os tokens novos começam com suporte `premium` ativo e gratuito;
- tokens novos têm 24 caracteres URL-safe para facilitar a digitação e o compartilhamento;
- o app envia o token no cabeçalho `Authorization: Bearer` somente por HTTPS;
- a sessão offline previamente validada continua disponível até o usuário sair ou os dados do app serem limpos.

## Backup

`POST /api/v1/backups` recebe a exportação completa do SQLite local. O servidor:

1. valida o token e o direito ao suporte premium;
2. valida o formato e o limite de tamanho;
3. compacta o JSON;
4. criptografa o conteúdo com AES-256-GCM;
5. grava o arquivo em armazenamento persistente;
6. mantém as dez cópias mais recentes por conta, salvo configuração diferente.

`BACKUP_ENCRYPTION_KEY` deve ser um segredo forte, separado de `TOKEN_PEPPER`, guardado também em cofre seguro. Perder essa chave torna os backups irrecuperáveis.

## Restauração assistida

O usuário toca em **Falar no WhatsApp** e envia o ID da conta para `(81) 92002-5567`. Depois de conferir a identidade do cliente, a equipe executa:

```powershell
npm run restore-code:create -- --account ID_DA_CONTA
```

O código vale por 24 horas e pode ser usado uma vez. Ao confirmar no aplicativo, o backup mais recente substitui a base local. A tela exige confirmação antes dessa ação destrutiva.

## Atualizações do APK

O manifesto público é produzido por `release:publish`. A rota autenticada `GET /api/v1/updates/latest` devolve versão, `versionCode`, notas, hash SHA-256 e URL do APK. O app compara o `versionCode` com a versão instalada e abre o navegador do Android para baixar quando houver uma versão superior.

O APK novo precisa usar o mesmo `applicationId` e a mesma chave de assinatura do APK anterior. O Android não aceitará a atualização se a assinatura mudar. Sirva a API e os APKs somente por HTTPS.

## Variáveis obrigatórias em produção

- `PUBLIC_BASE_URL`: origem HTTPS usada nos links de download;
- `CORS_ORIGIN`: origem web autorizada;
- `TOKEN_PEPPER`: segredo para HMAC de tokens e códigos;
- `BACKUP_ENCRYPTION_KEY`: segredo da criptografia dos arquivos;
- `DB_PATH`, `STORAGE_PATH` e `RELEASES_PATH`: caminhos persistentes.

## Testes

```powershell
npm test --prefix client
npm test --prefix server
npm run build
```

O teste do servidor cobre autenticação, envio de backup criptografado, restauração e rejeição da reutilização do código.
