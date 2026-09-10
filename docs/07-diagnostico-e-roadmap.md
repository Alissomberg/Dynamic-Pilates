# Testes, diagnóstico histórico, riscos e roadmap

> Os bloqueios do servidor abaixo motivaram a migração. O aplicativo vigente não depende desse servidor.

## Resultado da análise

O projeto representa um MVP funcional em intenção, mas não está executável de ponta a ponta no estado atual. Os serviços de aluno, presença e financeiro possuem teste básico, enquanto a inicialização do servidor, o dashboard e os cenários não são cobertos.

## Bloqueadores de inicialização

### 1. Export `SCENARIOS` ausente

Estes arquivos importam `SCENARIOS`:

- `server/src/services/dashboardService.js`;
- `server/src/routes/scenariosRoutes.js`.

`server/src/rules/billingEngine.js` não exporta esse símbolo. Como imports ESM são validados antes da execução, o Node encerra o processo com:

```text
SyntaxError: The requested module '../rules/billingEngine.js'
does not provide an export named 'SCENARIOS'
```

### 2. Função `getActiveScenario` ausente

`dashboardService.js` importa `getActiveScenario` de `alunosService.js`, mas a função não existe. Esse erro aparece após corrigir o primeiro.

### 3. Versões Fastify incompatíveis

O `server/package.json` atual especifica:

| Pacote | Versão atual | Compatibilidade declarada pelo plugin instalado |
|---|---:|---|
| `fastify` | 5.x | — |
| `@fastify/cors` | 9.x | Fastify 4.x |
| `@fastify/helmet` | 11.x | Fastify 4.x |
| `@fastify/static` | 10.x | Fastify 5.x |

Com Fastify 5, o registro do CORS falha com `FST_ERR_PLUGIN_VERSION_MISMATCH`. A opção de menor risco é restaurar Fastify 4 e `@fastify/static` 7, compatíveis com a intenção original do repositório. A alternativa é atualizar todos os plugins para versões destinadas ao Fastify 5 e revisar eventuais mudanças de API.

### 4. Vite e plugin React desalinhados

O frontend usa Vite 8 com `@vitejs/plugin-react` 4, cujo intervalo de peer dependency não inclui Vite 8. Pode funcionar com avisos, mas não é uma combinação suportada pelo manifesto instalado. Restaurar Vite 5 é a opção conservadora.

## Decisão necessária sobre cenários

Há duas opções coerentes:

### Opção A — modelo único, recomendada

- usar apenas o comportamento implementado: cobrança mensal e fidelidade de três meses no plano trimestral;
- padronizar o identificador como `PADRAO` ou remover completamente `active_scenario`;
- remover `ScenarioBar` e a alternância A/B;
- manter apenas uma operação administrativa de reset, protegida e claramente marcada como destrutiva;
- retirar `SCENARIOS` do dashboard.

Essa opção reduz complexidade e reflete o motor atual.

### Opção B — restaurar dois cenários

- definir e exportar `SCENARIOS`;
- implementar `getActiveScenario`;
- fazer cada cenário alterar efetivamente contratos, valores, cobrança e seed;
- documentar as diferenças;
- criar testes separados para A e B;
- alinhar todos os defaults (`env.js`, `db.js`, `seed.js`, `server.js`, rotas e frontend).

Somente adicionar um objeto `SCENARIOS` eliminaria o erro de import, mas deixaria o botão alternando rótulos sem alterar a regra real.

## Testes existentes

O arquivo `server/test/api.test.js` usa `node:assert` e cobre:

- seed com 22 alunos;
- distribuição de situações financeiras;
- histórico de julho de 2026;
- remarcação de Beatriz para terça e quinta às 16:00;
- preservação do histórico anterior;
- reflexo do novo horário na grade.

Execução:

```powershell
node server/test/api.test.js
```

> **Atenção:** não é um teste isolado. Ele chama `runSeed`, apaga o banco configurado e deixa a agenda de um aluno alterada ao final. Sempre use `DB_PATH` apontando para um arquivo temporário.

## Lacunas de testes

- inicialização real do Fastify;
- endpoint de saúde;
- todos os endpoints HTTP e seus status;
- dashboard;
- cenários;
- criação e alteração de aluno;
- baixa de pagamento e geração da próxima cobrança;
- meses com menos dias quando o vencimento é 29, 30 ou 31;
- duplicidade de pagamentos/cobranças;
- falhas intermediárias e rollback;
- validação de IDs, datas, valores e horários;
- concorrência;
- componentes e fluxos do frontend;
- acessibilidade;
- build compatível com as versões declaradas.

## Riscos funcionais e técnicos

### Prioridade crítica

1. **Backend não inicia:** imports e versões bloqueiam qualquer uso.
2. **Reset sem autenticação:** `/api/scenarios/reset` apaga e recria todo o banco.
3. **Sem autenticação/autorização:** qualquer pessoa com acesso à API pode ler e alterar dados financeiros e pessoais.
4. **Testes usam o banco padrão:** executar a suíte pode destruir dados operacionais.

### Prioridade alta

1. **Ausência de transações:** cadastro, remarcação, pagamento e seed fazem múltiplas operações sem atomicidade.
2. **Validação insuficiente:** datas, valores, IDs, plano, telefone, competência e horários não possuem schemas completos.
3. **Dados sensíveis versionados:** o SQLite está no repositório; os textos divergem sobre os alunos serem reais ou fictícios.
4. **CORS aberto:** `origin: true` aceita origens amplamente.
5. **Datas baseadas em UTC:** `toISOString()` pode produzir o dia anterior/seguinte em relação ao horário local.
6. **Primeiro vencimento inválido:** cadastro concatena diretamente o dia, permitindo strings como `2026-02-31`.
7. **Pagamento pouco validado:** uma cobrança informada não é conferida contra o `alunoId`; valores zero caem no valor padrão por uso de `||`.

### Prioridade média

1. histórico mensal padrão fixo em agosto de 2026;
2. comentários e interface afirmam 23 alunos, mas o seed cria 22;
3. resumo mensal mistura recebido no mês com pendências globais;
4. situação persistida `atrasado` pode divergir da situação calculada;
5. `lastPaymentDate` não é usado no cálculo financeiro;
6. atualização do contrato exige três campos juntos e não informa isso via validação;
7. horários duplicados são permitidos;
8. ausência de paginação nas listagens principais;
9. consultas N+1 na listagem de alunos e pendências;
10. `@fastify/static` está instalado, mas não é usado;
11. não há migrações de banco;
12. não há `.gitignore` no projeto, deixando `node_modules`, banco e builds expostos ao versionamento acidental.

## Segurança e privacidade

Antes de disponibilizar o sistema em rede:

- implementar autenticação;
- definir papéis e permissões;
- proteger ou remover seed/reset;
- restringir CORS;
- validar todas as entradas com schemas;
- limitar tentativas e tamanho de payload;
- adicionar logs de auditoria para pagamentos e alterações contratuais;
- criar política de backup e recuperação;
- não versionar banco, WAL, SHM ou dados pessoais;
- usar HTTPS no ambiente publicado;
- revisar mensagens de WhatsApp e consentimento para contato.

Helmet adiciona cabeçalhos úteis, mas não substitui esses controles. A política de segurança de conteúdo está desabilitada no registro atual.

## Roadmap recomendado

### Fase 1 — colocar o projeto para iniciar

1. escolher modelo único ou dois cenários;
2. corrigir imports e defaults;
3. alinhar Fastify/plugins;
4. alinhar Vite/plugin React;
5. adicionar `.gitignore`;
6. criar teste de inicialização e saúde.

Critério de conclusão: servidor inicia, `/api/health` responde 200 e frontend carrega sem erros de rede.

### Fase 2 — proteger dados

1. mover testes para banco temporário;
2. adicionar transações;
3. criar validação Fastify por schema;
4. implementar autenticação e autorização;
5. proteger reset;
6. remover dados/banco do Git e criar backup.

### Fase 3 — consolidar regras financeiras

1. validar datas e fim do mês;
2. padronizar dinheiro em centavos inteiros ou tipo decimal apropriado;
3. impedir cobranças duplicadas por constraint;
4. validar vínculo cobrança/aluno;
5. definir pagamento parcial, excedente, cancelamento e estorno;
6. definir claramente competência versus data de pagamento;
7. implementar encerramento de contrato e inativação de aluno.

### Fase 4 — qualidade e publicação

1. testes unitários, integração HTTP e frontend;
2. migrações versionadas;
3. observabilidade e auditoria;
4. melhorias de acessibilidade;
5. configuração de produção e HTTPS;
6. CI com instalação limpa, testes e build.

## Checklist de aceite técnico

- [ ] `npm install` é reproduzível sem conflito de peer dependencies.
- [ ] backend inicia sem erro ESM.
- [ ] `/api/health` retorna 200.
- [ ] frontend acessa o backend.
- [ ] cenários foram removidos ou funcionam de verdade.
- [ ] testes não tocam o banco operacional.
- [ ] seed/reset exigem autorização explícita.
- [ ] operações compostas usam transações.
- [ ] entradas possuem schemas e respostas de erro padronizadas.
- [ ] banco e dados pessoais não estão no Git.
- [ ] há backup e restauração verificados.
- [ ] datas são tratadas no fuso do negócio.
- [ ] documentação acompanha mudanças da API e do schema.
