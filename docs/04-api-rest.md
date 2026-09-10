# Referência da API REST (legada)

> O APK vigente não usa esta API. Este documento preserva a referência do servidor anterior para manutenção histórica ou migração futura.

## Informações gerais

- URL local: `http://localhost:3001`
- Prefixo: `/api`
- Formato: JSON
- Autenticação: inexistente
- Datas: `YYYY-MM-DD`
- Competências: `YYYY-MM`

No frontend em desenvolvimento, use caminhos relativos `/api/...`; o Vite faz proxy para a porta 3001.

## Tratamento de erros

Algumas rotas retornam `{ "error": "mensagem" }` com status 400 ou 404. Erros originados nos serviços nem sempre são capturados e podem virar resposta 500 do Fastify. Não existe envelope padronizado nem identificador de erro.

## Saúde

### `GET /api/health`

Resposta esperada:

```json
{
  "status": "ok",
  "service": "Dynamic Pilates API",
  "timestamp": "2026-09-10T12:00:00.000Z"
}
```

## Dashboard

### `GET /api/dashboard/today`

Query opcional:

| Nome | Formato | Padrão |
|---|---|---|
| `data` | `YYYY-MM-DD` | data corrente em UTC |

Exemplo:

```http
GET /api/dashboard/today?data=2026-09-10
```

Estrutura resumida:

```json
{
  "dataHoje": "2026-09-10",
  "cenarioAtivo": {
    "id": "SCENARIO_A",
    "nome": "Cenário A",
    "descricao": "..."
  },
  "presencas": {
    "data": "2026-09-10",
    "diaSemana": 4,
    "totalAlunos": 5,
    "totalPresentes": 2,
    "totalFaltas": 1,
    "totalNaoRegistrados": 2,
    "horarios": []
  },
  "alertas": {
    "totalAlertas": 3,
    "emAtraso": [],
    "qtdEmAtraso": 3,
    "vencemHoje": [],
    "qtdVencemHoje": 0,
    "vencemEmBreve": []
  },
  "financeiroMes": {}
}
```

> Esse endpoint está indisponível até corrigir os exports relacionados a cenários.

## Alunos

### `GET /api/alunos`

Query:

| Nome | Descrição |
|---|---|
| `search` | trecho do nome, consultado com `LIKE` |
| `status` | `todos`, `em_dia`, `hoje`, `em_atraso` ou `pendente` |

Resposta: array de alunos, incluindo contrato ativo, horários, última quitação, próxima cobrança, situação financeira e fidelidade.

```json
[
  {
    "id": 1,
    "nome": "Exemplo",
    "telefone": "(71) 99999-9999",
    "ativo": 1,
    "tipo_plano": "mensal",
    "valor": 185,
    "dia_vencimento": 10,
    "horarios": [{ "dia_semana": 1, "horario": "08:00" }],
    "ultimoPagamento": null,
    "proximaCobranca": {
      "id": 1,
      "competencia": "2026-09",
      "data_vencimento": "2026-09-10",
      "valor_esperado": 185,
      "status": "pendente"
    },
    "situacaoFinanceira": {
      "code": "HOJE",
      "label": "Vence hoje",
      "color": "amber",
      "daysDiff": 0
    },
    "fidelidade": {
      "isFidelityActive": false,
      "label": "Sem fidelidade",
      "badgeType": "none"
    }
  }
]
```

### `GET /api/alunos/:id`

Retorna a ficha de um aluno. Responde 404 com `{ "error": "Aluno não encontrado" }` quando ausente.

### `GET /api/alunos/:id/historico-mensal`

Query:

| Nome | Formato | Padrão atual |
|---|---|---|
| `mes` | `YYYY-MM` | `2026-08` |

Resposta:

```json
{
  "alunoId": 1,
  "mesAno": "2026-09",
  "financeiro": {
    "totalCobrancas": 1,
    "totalPago": 185,
    "totalPendente": 0,
    "status": "EM_DIA",
    "cobrancas": [],
    "pagamentos": []
  },
  "frequencia": {
    "totalAulas": 8,
    "totalPresentes": 7,
    "totalFaltas": 1,
    "frequenciaPercentual": 87.5,
    "presencas": []
  }
}
```

### `POST /api/alunos`

Corpo:

```json
{
  "nome": "Ana Souza",
  "telefone": "(71) 99999-9999",
  "observacoes": "Restrição no joelho direito",
  "plano": "trimestral",
  "valor": 200,
  "dia_vencimento": 10,
  "horarios": [
    { "dia": 2, "hora": "08:00" },
    { "dia": 4, "hora": "08:00" }
  ]
}
```

`nome` é obrigatório. Sucesso: 201 com a ficha criada.

### `PUT /api/alunos/:id`

Exemplo:

```json
{
  "nome": "Ana Souza",
  "telefone": "(71) 98888-8888",
  "observacoes": "Sem restrições",
  "plano": "mensal",
  "valor": 185,
  "dia_vencimento": 15
}
```

Para o contrato ser atualizado, `plano`, `valor` e `dia_vencimento` precisam ser enviados juntos. A rota não retorna 404 explicitamente para IDs inexistentes.

### `PUT /api/alunos/:id/horarios`

```json
{
  "horarios": [
    { "dia": 1, "hora": "09:00" },
    { "dia": 3, "hora": "09:00" }
  ]
}
```

A lista deve conter ao menos um item. Os horários existentes são substituídos integralmente.

## Presenças

### `GET /api/presencas/dia`

Query opcional `data=YYYY-MM-DD`. Retorna resumo e blocos agrupados por horário.

```json
{
  "data": "2026-09-10",
  "diaSemana": 4,
  "totalAlunos": 2,
  "totalPresentes": 1,
  "totalFaltas": 0,
  "totalNaoRegistrados": 1,
  "horarios": [
    {
      "horario": "08:00",
      "totalAlunos": 2,
      "presentes": 1,
      "faltas": 0,
      "pendentes": 1,
      "alunos": []
    }
  ]
}
```

### `POST /api/presencas/checkin`

```json
{
  "alunoId": 1,
  "data": "2026-09-10",
  "horario": "08:00",
  "status": "presente"
}
```

Todos os campos são obrigatórios; `status` aceita `presente` ou `falta`. Repetir a operação para aluno/data/horário atualiza o registro.

## Financeiro

### `GET /api/financeiro/pendencias`

Retorna todas as cobranças cujo status persistido é diferente de `pago`, ordenadas por vencimento. A situação exibida é recalculada dinamicamente.

### `GET /api/financeiro/historico`

Query opcional:

| Nome | Padrão |
|---|---:|
| `limit` | 50 |

Retorna pagamentos em ordem decrescente de data e ID.

### `GET /api/financeiro/resumo`

Query opcional `mesAno=YYYY-MM`. Sem ela, usa o mês corrente em UTC.

```json
{
  "competencia": "2026-09",
  "totalRecebido": 740,
  "qtdPagamentos": 4,
  "totalPendente": 1110,
  "qtdPendencias": 6,
  "totalAtrasado": 370,
  "qtdAtrasados": 2,
  "totalAlunosAtivos": 22
}
```

### `POST /api/financeiro/pagamento`

```json
{
  "alunoId": 1,
  "cobrancaId": 10,
  "valorPago": 185,
  "dataPagamento": "2026-09-10",
  "formaPagamento": "pix",
  "observacao": "Mensalidade de setembro"
}
```

Somente `alunoId` é validado pela rota. O serviço aceita como formas usuais `pix`, `dinheiro` e `cartao`, mas o banco não impõe uma lista fechada. Sucesso: 201 e informações da próxima cobrança.

## Cenários demonstrativos

### `GET /api/scenarios`

Retorna o identificador salvo e `Object.values(SCENARIOS)`.

### `POST /api/scenarios/select`

```json
{
  "scenarioId": "SCENARIO_B",
  "resetData": true
}
```

Com `resetData: true`, o banco é restaurado pelo seed. Operação destrutiva.

### `POST /api/scenarios/reset`

Sem corpo. Reexecuta o seed usando o cenário salvo. Operação destrutiva e sem autenticação.

> As três rotas de cenário estão indisponíveis no estado atual porque `SCENARIOS` não existe no motor de regras.
