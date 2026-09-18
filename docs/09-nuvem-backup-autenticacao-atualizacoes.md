# Operação local do Zello

## Visão geral

O aplicativo atual é totalmente independente. A autenticação, o banco operacional, o backup e a restauração funcionam no dispositivo sem chamadas HTTP. A camada de nuvem descrita anteriormente está pausada para uma futura versão.

## PIN e token de plano

- todos os usuários entram com um PIN numérico de 6 dígitos;
- o SQLite guarda somente o hash do PIN;
- somente o admin registra tokens;
- o SQLite guarda somente o hash do token e os metadados do usuário;
- tokens novos têm 24 caracteres URL-safe;
- o valor completo aparece uma única vez para ser copiado pela equipe técnica;
- receber um token transforma o usuário em SuperUser com direito a cadastrar até dois afiliados;
- afiliados recebem PIN, não recebem token e não podem cadastrar outros usuários;
- o login consulta apenas o SQLite local.

### Perfis iniciais

- Admin — PIN `731946`: vê todos os usuários e registra tokens;
- Doutor João — PIN `482615`: primeiro SuperUser, com limite de dois afiliados;
- token inicial do Doutor João: `zello_joao_2026_superusr`.

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
