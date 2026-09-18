# Banco de dados local

## Armazenamento

No Android, `@capacitor-community/sqlite` usa SQLite nativo no dispositivo. No navegador de desenvolvimento, `jeep-sqlite` mantém a mesma base em IndexedDB. Não há banco hospedado nem conexão obrigatória com servidor.

O schema atual tem versão `2` e fica em `client/src/db/localDatabase.js`.

## Tabelas

| Tabela | Finalidade |
|---|---|
| `schema_migrations` | versão aplicada do schema |
| `settings` | configurações futuras por chave/valor |
| `access_tokens` | tokens locais, hash, usuário e status de acesso |
| `plan_presets` | opções frequentes de nome, meses e valor |
| `alunos` | dados pessoais e status ativo |
| `contratos` | plano, recorrência, valor e vencimento |
| `aluno_horarios` | horário independente por aluno e dia |
| `cobrancas` | ciclos pendentes, pagos ou cancelados |
| `pagamentos` | recebimentos e forma de pagamento |
| `presencas` | presença/falta por data e horário |

## Integridade importante

- chaves estrangeiras são ativadas;
- `aluno_horarios` é único por `(aluno_id, dia_semana)`;
- `cobrancas` é única por `(aluno_id, data_vencimento)`;
- `presencas` é única por `(aluno_id, data, horario)`;
- dias aceitos: 1 a 6;
- planos: duração positiva;
- vencimento: 1 a 31;
- cobranças e pagamentos: valores positivos;
- presença: `presente` ou `falta`;
- pagamento: `pix`, `dinheiro` ou `cartao`.

## Dinheiro e datas

Valores são inteiros em centavos (`valor_centavos`), evitando erros de ponto flutuante. Datas de negócio usam texto local `YYYY-MM-DD`; timestamps de auditoria usam ISO. Competências usam `YYYY-MM`.

## Transações

Criação de aluno, substituição de horários e recebimento financeiro usam transações. Em erro, ocorre rollback. No navegador, alterações confirmadas também são salvas no armazenamento persistente do componente web.

## Dados iniciais

Em um banco vazio são criados:

- Mensal: 1 mês, R$ 185;
- Trimestral: 3 meses, R$ 555.
- três alunos fictícios para demonstração, com contratos, cobranças, pagamentos e presenças;
- um acesso local de demonstração com o token `zello-demo-2026`.

Os dados de demonstração só são incluídos quando ainda não há alunos no banco. O servidor legado não participa desse seed.

## Migrações futuras

Toda mudança de schema deve aumentar `DATABASE_VERSION`, aplicar migração incremental e registrar a versão em `schema_migrations`. Nunca se deve exigir que o cliente apague o aplicativo para atualizar.
