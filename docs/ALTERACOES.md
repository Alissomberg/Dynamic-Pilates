# Registro de alterações

Este arquivo deve ser atualizado em toda mudança funcional, técnica ou de dados do Zello.

## 2026-09-18 — Zello 1.2.0: operação totalmente local

- removida a verificação online de tokens do aplicativo;
- adicionada a tabela SQLite `access_tokens` e criação de tokens em **Ajustes > Tokens locais**;
- adicionado o token local de demonstração `zello-demo-2026`;
- adicionados três alunos fictícios com cenários de cobrança, pagamento e presença;
- backup e restauração passaram a usar somente arquivos locais;
- chamadas da API de nuvem e atualização online foram retiradas do cliente;
- o servidor permanece apenas como código legado para uma futura fase.

## 2026-09-18 — Zello 1.1.0

- nova identidade Zello aplicada à interface, ícone e tela de abertura;
- login obrigatório com token emitido pela equipe técnica;
- sessão offline após a primeira validação;
- backup premium enviado ao servidor, atualmente gratuito;
- restauração assistida por WhatsApp e código temporário de uso único;
- API de atualização e publicação de novos APKs;
- backup compactado e criptografado em repouso com AES-256-GCM.

## 2026-09-18 — Tokens compactos

- novos tokens passam a ter 24 caracteres URL-safe;
- tokens antigos continuam válidos para não interromper clientes já ativados.

## 2026-09-10 — Início da migração para aplicativo offline

### Decisões aprovadas

- O produto principal será um APK Android offline-first.
- A interface React aprovada pelo cliente será preservada.
- O projeto continuará em JavaScript.
- Capacitor será usado para empacotar o frontend como aplicativo Android.
- O banco operacional ficará no tablet e usará SQLite.
- Node.js e npm serão ferramentas de desenvolvimento, não requisitos no dispositivo do cliente.
- O servidor Fastify atual será preservado temporariamente como referência, mas deixará de ser requisito do aplicativo.
- A interface deve priorizar linguagem simples, poucos passos e ações grandes, adequadas a um usuário não técnico.

### Funcionalidades aprovadas

- horário independente para cada dia de aula do aluno;
- divisão da grade entre manhã e tarde;
- predefinições de planos e valores;
- valor livre para contratos específicos;
- planos mensal, trimestral e personalizado;
- plano trimestral cobrado a cada três meses;
- remoção da barra de alternância de cenários demonstrativos;
- funcionamento das operações principais sem internet;
- backup e restauração do banco local.

### Alterações desta entrega

- criada documentação inicial completa em `docs/`;
- criado este registro permanente de alterações;
- fixada a versão de referência do Node em `.node-version`;
- configurados arquivos ignorados para dependências, builds e bancos locais;
- removida a alternância entre cenários de demonstração;
- substituídas as chamadas HTTP por serviços JavaScript sobre SQLite local;
- criado schema local versionado para alunos, contratos, horários, cobranças, pagamentos, presenças, opções de plano e configurações;
- valores monetários passaram a ser armazenados em centavos inteiros;
- adicionados os planos iniciais Mensal e Trimestral, cobrados a cada 1 e 3 meses;
- implementadas opções salvas de plano e duração/valor personalizados;
- implementado horário independente para cada dia, com entrada livre de horário;
- adicionada separação visual entre turmas da manhã e da tarde;
- adicionada tela de Ajustes com backup e restauração;
- adicionado indicador de dados salvos no tablet;
- removida a dependência de fontes externas para a interface abrir offline;
- adicionados Capacitor Android, SQLite, Filesystem e Share;
- aplicado o logotipo existente aos ícones e telas de abertura do Android;
- gerado e sincronizado o projeto nativo em `client/android/`;
- fixada a compilação Java do Android em JDK 17;
- fixadas versões exatas das dependências;
- atualizados Vite e pacotes relacionados; `npm audit` retorna zero vulnerabilidades;
- validado no navegador o banco local, a navegação, o cadastro responsivo e a criação de backup;
- validados `npm run build` e `npx cap sync android`.
- adicionados testes automáticos para recorrência trimestral, fim do mês e situação financeira.

### Observações de implantação

- O computador atual ainda não possui Java/JDK, Android SDK, `adb` ou Gradle no PATH.
- A estrutura Android foi gerada. A tentativa de `assembleDebug` para antes da compilação porque este computador não possui Java/JDK nem `JAVA_HOME`.
- Depois de instalar Android Studio/JDK, executar `npm run android:sync` e gerar o APK pelo Android Studio ou com `client/android/gradlew.bat assembleDebug`.
