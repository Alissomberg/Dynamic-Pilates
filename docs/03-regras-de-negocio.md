# Regras de negócio e fluxos

## Planos e cobrança

Cada contrato registra nome, duração em meses, valor do ciclo, dia de vencimento e data de início.

| Opção inicial | Duração | Próxima cobrança |
|---|---:|---:|
| Mensal | 1 mês | após 1 mês |
| Trimestral | 3 meses | após 3 meses |
| Personalizado | 1 a 60 meses | após a duração escolhida |

O valor representa todo o ciclo. No trimestral, por exemplo, R$ 555 é cobrado a cada três meses. Não existe mais regra de fidelidade nem alternância de cenários.

O usuário pode cadastrar opções frequentes em **Alunos > Planos**. Mesmo escolhendo uma opção salva, pode alterar o valor no cadastro do aluno.

## Cadastro de aluno

O fluxo cria, em uma transação:

1. aluno;
2. contrato ativo;
3. um horário para cada dia escolhido;
4. primeira cobrança.

Nome, plano, valor positivo, duração de 1 a 60 meses, vencimento de 1 a 31 e ao menos um dia/horário são validados. A data de vencimento é limitada ao último dia quando o mês não possui o dia configurado.

## Agenda e presença

Os dias são 1 (segunda) a 6 (sábado). Cada aluno só pode ter uma entrada por dia, mas o horário pode ser diferente em cada dia. O campo aceita horário em `HH:mm`.

Horários antes de 12h pertencem à **Manhã**; a partir de 12h, à **Tarde**. A tela de presença exibe separadores visuais para os dois períodos.

O check-in aceita `presente` ou `falta`. Registrar novamente o mesmo aluno/data/horário corrige o status sem duplicar. Remarcar altera apenas a agenda futura; o histórico permanece.

## Situação financeira

| Condição da cobrança aberta | Código | Exibição |
|---|---|---|
| vencimento anterior a hoje | `EM_ATRASO` | dias em atraso |
| vencimento hoje | `HOJE` | vence hoje |
| vencimento nos próximos 5 dias | `PENDENTE` | vence em N dias |
| vencimento posterior | `EM_DIA` | em dia |

Ao receber uma cobrança, uma transação grava o pagamento, marca a cobrança como paga e cria a seguinte somando a duração do plano. A unicidade por aluno/data impede duplicação da próxima cobrança.

## Dashboard

Combina aulas do dia, presenças/faltas, cobranças atrasadas ou do dia, recebimentos do mês e total de alunos ativos. Tudo é consultado no banco local.

## Backup

O backup exporta todas as tabelas em JSON. A restauração valida a identificação do aplicativo, pede confirmação, substitui o banco atual, reabre a conexão e recarrega a interface.

