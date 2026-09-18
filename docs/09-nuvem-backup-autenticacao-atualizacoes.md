# Operação local do Zello

## Visão geral

O aplicativo atual é totalmente independente. A autenticação, o banco operacional, o backup e a restauração funcionam no dispositivo sem chamadas HTTP. A camada de nuvem descrita anteriormente está pausada para uma futura versão.

## PIN e perfis locais

- todos os usuários entram com um PIN numérico de 6 dígitos;
- o SQLite guarda somente o derivado PBKDF2 do PIN, com salt aleatório e 120 mil iterações;
- não existem tokens de acesso ou de plano no aplicativo;
- o Admin cria contas SuperUser;
- cada SuperUser pode cadastrar até dois afiliados;
- afiliados não podem cadastrar outros usuários;
- SuperUser e afiliados compartilham os alunos do mesmo grupo;
- o Admin pode consultar e alterar os alunos de todos os grupos;
- somente o Admin pode zerar os dados operacionais ou carregar os dados mock;
- o login consulta apenas o SQLite local.

### Perfis iniciais

- Admin — PIN `731946`: vê todos os usuários e alunos, cria SuperUsers e controla a base;
- Doutor João — PIN `482615`: primeiro SuperUser, com limite de dois afiliados;

Esses PINs são dados iniciais para teste e implantação.

## Backup e restauração

O botão **Salvar cópia local** exporta a base SQLite para um arquivo JSON. O botão **Restaurar arquivo local** valida o arquivo e substitui a base após confirmação. Nenhum backup é enviado automaticamente.

As rotinas remotas de backup, restauração e atualizações continuam no servidor legado, mas não são chamadas pelo APK atual.

## Suporte

O botão de WhatsApp é opcional e abre o contato `(81) 92002-5567` somente quando o usuário solicita. O suporte não é necessário para autenticar ou operar o aplicativo.

## Testes

```powershell
npm test --prefix client
npm run build
```

Os testes do cliente cobrem as regras de negócio; o login local e os dados de demonstração são inicializados pelo seed do SQLite.
