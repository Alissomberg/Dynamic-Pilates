# Documentação do Dynamic Pilates

Documentação do aplicativo Android offline-first, atualizada em 10 de setembro de 2026.

## Estado atual

O aplicativo React/JavaScript já opera sem servidor, usando SQLite local, e possui um projeto Android Capacitor em `client/android/`. Build web, sincronização Android e auditoria de dependências foram validados. A geração do APK neste computador aguarda apenas a instalação do JDK/Android Studio.

## Índice

1. [Visão geral e arquitetura original](./01-visao-geral-e-arquitetura.md)
2. [Instalação, execução e operação atuais](./02-instalacao-e-operacao.md)
3. [Regras de negócio e fluxos](./03-regras-de-negocio.md)
4. [API REST legada](./04-api-rest.md)
5. [Banco de dados](./05-banco-de-dados.md)
6. [Frontend e experiência de uso](./06-frontend.md)
7. [Diagnóstico histórico e roadmap](./07-diagnostico-e-roadmap.md)
8. [Decisão de arquitetura: APK offline-first](./08-decisao-apk-offline.md)
9. [Registro permanente de alterações](./ALTERACOES.md)

## Componentes vigentes

| Área | Local |
|---|---|
| Entrada React | `client/src/main.jsx` |
| Navegação e telas | `client/src/App.jsx`, `client/src/pages/` |
| Regras e consultas locais | `client/src/services/api.js` |
| Schema e conexão SQLite | `client/src/db/localDatabase.js` |
| Configuração Capacitor | `client/capacitor.config.json` |
| Projeto Android | `client/android/` |
| Histórico obrigatório | `docs/ALTERACOES.md` |

## Convenções vigentes

- código em JavaScript/JSX;
- datas em `YYYY-MM-DD` e competências em `YYYY-MM`;
- dinheiro armazenado como centavos inteiros;
- duração e recorrência do plano em meses;
- um horário independente para cada dia da semana;
- manhã antes de 12h e tarde a partir de 12h.

Os documentos 01, 04 e 07 preservam a arquitetura anterior. Em caso de divergência, este índice, os documentos 02 e 08 e `ALTERACOES.md` descrevem o estado vigente.
