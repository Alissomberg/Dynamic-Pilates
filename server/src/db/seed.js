import { db, initDatabase } from './db.js';
import { calculateFidelityEndDate } from '../rules/billingEngine.js';

export function runSeed(scenario = 'PADRAO') {
  console.log(`[Seed] Carregando dataset com cobrança mensal e fidelidade de 3 meses...`);
  initDatabase(true);

  // Limpar tabelas
  db.exec(`
    DELETE FROM presencas;
    DELETE FROM pagamentos;
    DELETE FROM cobrancas;
    DELETE FROM aluno_horarios;
    DELETE FROM contratos;
    DELETE FROM alunos;
    DELETE FROM sqlite_sequence WHERE name IN ('alunos', 'contratos', 'aluno_horarios', 'cobrancas', 'pagamentos', 'presencas');
  `);

  db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('active_scenario', ?)").run(scenario);

  // 22 Alunos Fictícios (Mensais e Trimestrais com Cobrança Mensal)
  const alunos = [
    // 1. Camila Silveira (Mensal | Vence HOJE 31/08) | Seg/Qua/Sex 07:00
    {
      nome: 'Camila Silveira',
      telefone: '(71) 99123-4501',
      plano: 'mensal',
      valor: 185,
      vencimento: 31,
      dataInicio: '2026-05-01',
      horarios: [{ dia: 1, hora: '07:00' }, { dia: 3, hora: '07:00' }, { dia: 5, hora: '07:00' }],
      pagamentos: [
        { comp: '2026-05', venc: '2026-05-31', pago: '2026-05-31', valor: 185, forma: 'pix' },
        { comp: '2026-06', venc: '2026-06-30', pago: '2026-06-30', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-31', pago: '2026-07-31', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-08', venc: '2026-08-31', valor: 185, status: 'pendente' } // Vence HOJE
    },

    // 2. Rodrigo Mendes (Trimestral - Dentro da Fidelidade | Em Atraso 21d) | Seg/Qua 07:00
    {
      nome: 'Rodrigo Mendes',
      telefone: '(71) 98765-1002',
      plano: 'trimestral',
      valor: 200,
      vencimento: 10,
      dataInicio: '2026-07-10', // Fidelidade até 2026-10-10
      horarios: [{ dia: 1, hora: '07:00' }, { dia: 3, hora: '07:00' }],
      pagamentos: [
        { comp: '2026-07', venc: '2026-07-10', pago: '2026-07-10', valor: 200, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-08', venc: '2026-08-10', valor: 200, status: 'atrasado' } // 21d atraso
    },

    // 3. Mariana Costa (Mensal | Em Dia) | Seg/Qua 08:00
    {
      nome: 'Mariana Costa',
      telefone: '(71) 99234-5603',
      plano: 'mensal',
      valor: 180,
      vencimento: 5,
      dataInicio: '2026-04-05',
      horarios: [{ dia: 1, hora: '08:00' }, { dia: 3, hora: '08:00' }],
      pagamentos: [
        { comp: '2026-05', venc: '2026-05-05', pago: '2026-05-05', valor: 180, forma: 'pix' },
        { comp: '2026-06', venc: '2026-06-05', pago: '2026-06-05', valor: 180, forma: 'dinheiro' },
        { comp: '2026-07', venc: '2026-07-05', pago: '2026-07-05', valor: 180, forma: 'dinheiro' },
        { comp: '2026-08', venc: '2026-08-05', pago: '2026-08-05', valor: 180, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-05', valor: 180, status: 'pendente' }
    },

    // 4. Carlos Eduardo Lima (Trimestral - Fidelidade Cumprida | Em Atraso 47d) | Seg/Qua 08:00
    {
      nome: 'Carlos Eduardo Lima',
      telefone: '(71) 98877-3304',
      plano: 'trimestral',
      valor: 185,
      vencimento: 15,
      dataInicio: '2026-01-15', // Fidelidade cumpriu em 15/04/2026
      horarios: [{ dia: 1, hora: '08:00' }, { dia: 3, hora: '08:00' }],
      pagamentos: [
        { comp: '2026-04', venc: '2026-04-15', pago: '2026-04-15', valor: 185, forma: 'cartao' },
        { comp: '2026-05', venc: '2026-05-15', pago: '2026-05-15', valor: 185, forma: 'cartao' },
        { comp: '2026-06', venc: '2026-06-15', pago: '2026-06-15', valor: 185, forma: 'cartao' }
      ],
      cobrancaAberta: { comp: '2026-07', venc: '2026-07-15', valor: 185, status: 'atrasado' } // 47d atraso
    },

    // 5. Beatriz Fontes (Mensal | Em Dia) | Seg/Qua 08:00
    {
      nome: 'Beatriz Fontes',
      telefone: '(71) 99345-6705',
      plano: 'mensal',
      valor: 200,
      vencimento: 15,
      dataInicio: '2026-05-15',
      horarios: [{ dia: 1, hora: '08:00' }, { dia: 3, hora: '08:00' }],
      pagamentos: [
        { comp: '2026-05', venc: '2026-05-15', pago: '2026-05-15', valor: 200, forma: 'pix' },
        { comp: '2026-06', venc: '2026-06-15', pago: '2026-06-15', valor: 200, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-15', pago: '2026-07-15', valor: 200, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-15', pago: '2026-08-18', valor: 200, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-15', valor: 200, status: 'pendente' }
    },

    // 6. Lucas Guimarães (Mensal | Vence em Breve 05/09 - 5d) | Seg/Qua 08:00
    {
      nome: 'Lucas Guimarães',
      telefone: '(71) 98112-9906',
      plano: 'mensal',
      valor: 185,
      vencimento: 5,
      dataInicio: '2026-06-05',
      horarios: [{ dia: 1, hora: '08:00' }, { dia: 3, hora: '08:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-05', pago: '2026-06-05', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-05', pago: '2026-07-05', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-05', pago: '2026-08-05', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-05', valor: 185, status: 'pendente' }
    },

    // 7. Juliana Peixoto (Trimestral - Dentro da Fidelidade | Em Dia) | Seg/Qua/Sex 09:00
    {
      nome: 'Juliana Peixoto',
      telefone: '(71) 99456-7807',
      plano: 'trimestral',
      valor: 220,
      vencimento: 20,
      dataInicio: '2026-06-20', // Fidelidade até 2026-09-20
      horarios: [{ dia: 1, hora: '09:00' }, { dia: 3, hora: '09:00' }, { dia: 5, hora: '09:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-20', pago: '2026-06-20', valor: 220, forma: 'cartao' },
        { comp: '2026-07', venc: '2026-07-20', pago: '2026-07-20', valor: 220, forma: 'cartao' },
        { comp: '2026-08', venc: '2026-08-20', pago: '2026-08-20', valor: 220, forma: 'cartao' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-20', valor: 220, status: 'pendente' }
    },

    // 8. Thiago Azevedo (Mensal | Em Dia) | Seg/Qua 09:00
    {
      nome: 'Thiago Azevedo',
      telefone: '(71) 98223-4408',
      plano: 'mensal',
      valor: 185,
      vencimento: 10,
      dataInicio: '2026-06-10',
      horarios: [{ dia: 1, hora: '09:00' }, { dia: 3, hora: '09:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-10', pago: '2026-06-10', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-10', pago: '2026-07-10', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-10', pago: '2026-08-09', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-10', valor: 185, status: 'pendente' }
    },

    // 9. Patrícia Ramos (Mensal | Em Dia) | Seg/Sex 09:00
    {
      nome: 'Patrícia Ramos',
      telefone: '(71) 99567-8909',
      plano: 'mensal',
      valor: 185,
      vencimento: 20,
      dataInicio: '2026-06-20',
      horarios: [{ dia: 1, hora: '09:00' }, { dia: 5, hora: '09:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-20', pago: '2026-06-20', valor: 185, forma: 'dinheiro' },
        { comp: '2026-07', venc: '2026-07-20', pago: '2026-07-20', valor: 185, forma: 'dinheiro' },
        { comp: '2026-08', venc: '2026-08-20', pago: '2026-08-20', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-20', valor: 185, status: 'pendente' }
    },

    // 10. Fernando Alencar (Trimestral - Fidelidade Cumprida | Em Dia) | Seg/Qua/Sex 10:00
    {
      nome: 'Fernando Alencar',
      telefone: '(71) 98334-5510',
      plano: 'trimestral',
      valor: 185,
      vencimento: 15,
      dataInicio: '2026-02-15', // Fidelidade até 15/05/2026
      horarios: [{ dia: 1, hora: '10:00' }, { dia: 3, hora: '10:00' }, { dia: 5, hora: '10:00' }],
      pagamentos: [
        { comp: '2026-05', venc: '2026-05-15', pago: '2026-05-15', valor: 185, forma: 'pix' },
        { comp: '2026-06', venc: '2026-06-15', pago: '2026-06-15', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-15', pago: '2026-07-15', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-15', pago: '2026-08-15', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-15', valor: 185, status: 'pendente' }
    },

    // 11. Larissa Nogueira (Mensal | Em Dia) | Seg/Qua 10:00
    {
      nome: 'Larissa Nogueira',
      telefone: '(71) 99678-9011',
      plano: 'mensal',
      valor: 200,
      vencimento: 10,
      dataInicio: '2026-06-10',
      horarios: [{ dia: 1, hora: '10:00' }, { dia: 3, hora: '10:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-10', pago: '2026-06-10', valor: 200, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-10', pago: '2026-07-10', valor: 200, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-10', pago: '2026-08-10', valor: 200, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-10', valor: 200, status: 'pendente' }
    },

    // 12. Marcelo Dantas (Mensal | Em Dia) | Ter/Qui 08:00
    {
      nome: 'Marcelo Dantas',
      telefone: '(71) 98445-6612',
      plano: 'mensal',
      valor: 185,
      vencimento: 5,
      dataInicio: '2026-06-05',
      horarios: [{ dia: 2, hora: '08:00' }, { dia: 4, hora: '08:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-05', pago: '2026-06-05', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-05', pago: '2026-07-05', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-05', pago: '2026-08-05', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-05', valor: 185, status: 'pendente' }
    },

    // 13. Fernanda Barreto (Trimestral - Fidelidade Cumprida | Em Dia) | Ter/Qui 08:00
    {
      nome: 'Fernanda Barreto',
      telefone: '(71) 99789-0113',
      plano: 'trimestral',
      valor: 185,
      vencimento: 10,
      dataInicio: '2026-03-10', // Fidelidade até 10/06/2026
      horarios: [{ dia: 2, hora: '08:00' }, { dia: 4, hora: '08:00' }],
      pagamentos: [
        { comp: '2026-05', venc: '2026-05-10', pago: '2026-05-10', valor: 185, forma: 'pix' },
        { comp: '2026-06', venc: '2026-06-10', pago: '2026-06-10', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-10', pago: '2026-07-10', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-10', pago: '2026-08-10', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-10', valor: 185, status: 'pendente' }
    },

    // 14. Renato Rocha (Mensal | Em Dia) | Ter/Qui 09:00
    {
      nome: 'Renato Rocha',
      telefone: '(71) 98556-7714',
      plano: 'mensal',
      valor: 180,
      vencimento: 15,
      dataInicio: '2026-06-15',
      horarios: [{ dia: 2, hora: '09:00' }, { dia: 4, hora: '09:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-15', pago: '2026-06-15', valor: 180, forma: 'dinheiro' },
        { comp: '2026-07', venc: '2026-07-15', pago: '2026-07-15', valor: 180, forma: 'dinheiro' },
        { comp: '2026-08', venc: '2026-08-15', pago: '2026-08-14', valor: 180, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-15', valor: 180, status: 'pendente' }
    },

    // 15. Aline Vasconcelos (Trimestral - Dentro da Fidelidade | Em Dia) | Ter/Qui 09:00
    {
      nome: 'Aline Vasconcelos',
      telefone: '(71) 99890-1215',
      plano: 'trimestral',
      valor: 220,
      vencimento: 20,
      dataInicio: '2026-07-20', // Fidelidade até 2026-10-20
      horarios: [{ dia: 2, hora: '09:00' }, { dia: 4, hora: '09:00' }],
      pagamentos: [
        { comp: '2026-07', venc: '2026-07-20', pago: '2026-07-20', valor: 220, forma: 'cartao' },
        { comp: '2026-08', venc: '2026-08-20', pago: '2026-08-20', valor: 220, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-20', valor: 220, status: 'pendente' }
    },

    // 16. Gabriel Medina (Mensal | Vence em Breve 05/09) | Ter 15:00 / Qui 16:00
    {
      nome: 'Gabriel Medina',
      telefone: '(71) 98667-8816',
      plano: 'mensal',
      valor: 185,
      vencimento: 5,
      dataInicio: '2026-06-05',
      horarios: [{ dia: 2, hora: '15:00' }, { dia: 4, hora: '16:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-05', pago: '2026-06-05', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-05', pago: '2026-07-05', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-05', pago: '2026-08-05', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-05', valor: 185, status: 'pendente' }
    },

    // 17. Cláudia Valença (Mensal | Em Atraso 16d) | Ter/Qui 15:00
    {
      nome: 'Cláudia Valença',
      telefone: '(71) 99901-2317',
      plano: 'mensal',
      valor: 200,
      vencimento: 15,
      dataInicio: '2026-05-15',
      horarios: [{ dia: 2, hora: '15:00' }, { dia: 4, hora: '15:00' }],
      pagamentos: [
        { comp: '2026-05', venc: '2026-05-15', pago: '2026-05-15', valor: 200, forma: 'pix' },
        { comp: '2026-06', venc: '2026-06-15', pago: '2026-06-15', valor: 200, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-15', pago: '2026-07-15', valor: 200, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-08', venc: '2026-08-15', valor: 200, status: 'atrasado' } // 16d atraso
    },

    // 18. Diego Farias (Trimestral - Dentro da Fidelidade | Em Dia) | Ter/Qui 16:00
    {
      nome: 'Diego Farias',
      telefone: '(71) 98778-9918',
      plano: 'trimestral',
      valor: 185,
      vencimento: 10,
      dataInicio: '2026-06-10', // Fidelidade até 10/09/2026
      horarios: [{ dia: 2, hora: '16:00' }, { dia: 4, hora: '16:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-10', pago: '2026-06-10', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-10', pago: '2026-07-10', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-10', pago: '2026-08-10', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-10', valor: 185, status: 'pendente' }
    },

    // 19. Vanessa Prado (Mensal | Em Dia) | Ter/Qui 16:00
    {
      nome: 'Vanessa Prado',
      telefone: '(71) 99112-3419',
      plano: 'mensal',
      valor: 185,
      vencimento: 20,
      dataInicio: '2026-06-20',
      horarios: [{ dia: 2, hora: '16:00' }, { dia: 4, hora: '16:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-20', pago: '2026-06-20', valor: 185, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-20', pago: '2026-07-20', valor: 185, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-20', pago: '2026-08-20', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-20', valor: 185, status: 'pendente' }
    },

    // 20. Henrique Meirelles (Mensal | Em Dia) | Seg/Qua 17:00
    {
      nome: 'Henrique Meirelles',
      telefone: '(71) 98889-0020',
      plano: 'mensal',
      valor: 185,
      vencimento: 15,
      dataInicio: '2026-06-15',
      horarios: [{ dia: 1, hora: '17:00' }, { dia: 3, hora: '17:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-15', pago: '2026-06-15', valor: 185, forma: 'dinheiro' },
        { comp: '2026-07', venc: '2026-07-15', pago: '2026-07-15', valor: 185, forma: 'dinheiro' },
        { comp: '2026-08', venc: '2026-08-15', pago: '2026-08-15', valor: 185, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-15', valor: 185, status: 'pendente' }
    },

    // 21. Isabela Carneiro (Trimestral - Fidelidade Cumprida | Em Dia) | Seg/Qua 17:00
    {
      nome: 'Isabela Carneiro',
      telefone: '(71) 99223-4521',
      plano: 'trimestral',
      valor: 200,
      vencimento: 15,
      dataInicio: '2026-02-15', // Fidelidade até 15/05/2026
      horarios: [{ dia: 1, hora: '17:00' }, { dia: 3, hora: '17:00' }],
      pagamentos: [
        { comp: '2026-05', venc: '2026-05-15', pago: '2026-05-15', valor: 200, forma: 'pix' },
        { comp: '2026-06', venc: '2026-06-15', pago: '2026-06-15', valor: 200, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-15', pago: '2026-07-15', valor: 200, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-15', pago: '2026-08-15', valor: 200, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-15', valor: 200, status: 'pendente' }
    },

    // 22. André Antunes (Mensal | Em Dia) | Seg/Sex 18:00
    {
      nome: 'André Antunes',
      telefone: '(71) 98990-1122',
      plano: 'mensal',
      valor: 220,
      vencimento: 20,
      dataInicio: '2026-06-20',
      horarios: [{ dia: 1, hora: '18:00' }, { dia: 5, hora: '18:00' }],
      pagamentos: [
        { comp: '2026-06', venc: '2026-06-20', pago: '2026-06-20', valor: 220, forma: 'pix' },
        { comp: '2026-07', venc: '2026-07-20', pago: '2026-07-20', valor: 220, forma: 'pix' },
        { comp: '2026-08', venc: '2026-08-20', pago: '2026-08-20', valor: 220, forma: 'pix' }
      ],
      cobrancaAberta: { comp: '2026-09', venc: '2026-09-20', valor: 220, status: 'pendente' }
    }
  ];

  const insertAluno = db.prepare(`
    INSERT INTO alunos (nome, telefone, observacoes, ativo)
    VALUES (?, ?, ?, 1)
  `);

  const insertContrato = db.prepare(`
    INSERT INTO contratos (
      aluno_id, tipo_plano, periodicidade_cobranca, duracao_fidelidade_meses,
      valor, dia_vencimento, data_inicio, data_fim_fidelidade, ativo
    )
    VALUES (?, ?, 'mensal', ?, ?, ?, ?, ?, 1)
  `);

  const insertHorario = db.prepare(`
    INSERT INTO aluno_horarios (aluno_id, dia_semana, horario)
    VALUES (?, ?, ?)
  `);

  const insertCobranca = db.prepare(`
    INSERT INTO cobrancas (aluno_id, contrato_id, competencia, data_vencimento, valor_esperado, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPagamento = db.prepare(`
    INSERT INTO pagamentos (cobranca_id, aluno_id, data_pagamento, valor_pago, forma_pagamento, observacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPresenca = db.prepare(`
    INSERT INTO presencas (aluno_id, data, horario, status)
    VALUES (?, ?, ?, ?)
  `);

  for (let i = 0; i < alunos.length; i++) {
    const a = alunos[i];
    const isTrimestral = a.plano === 'trimestral';
    const duracaoFidelidade = isTrimestral ? 3 : 0;
    const dataFimFidelidade = isTrimestral ? calculateFidelityEndDate(a.dataInicio, 3) : null;

    const alunoRes = insertAluno.run(a.nome, a.telefone, `Aluno regular (${a.plano})`);
    const alunoId = Number(alunoRes.lastInsertRowid);

    const contratoRes = insertContrato.run(
      alunoId,
      a.plano,
      duracaoFidelidade,
      a.valor,
      a.vencimento,
      a.dataInicio,
      dataFimFidelidade
    );
    const contratoId = Number(contratoRes.lastInsertRowid);

    // Inserir horários de aula
    for (const h of a.horarios) {
      insertHorario.run(alunoId, h.dia, h.hora);
    }

    // Inserir cobranças e pagamentos mensais
    for (const p of a.pagamentos) {
      const cobrancaPagaRes = insertCobranca.run(
        alunoId,
        contratoId,
        p.comp,
        p.venc,
        p.valor,
        'pago'
      );
      const cobrancaId = Number(cobrancaPagaRes.lastInsertRowid);
      insertPagamento.run(cobrancaId, alunoId, p.pago, p.valor, p.forma, 'Mensalidade regular');
    }

    // Inserir cobrança aberta mensal
    if (a.cobrancaAberta) {
      insertCobranca.run(
        alunoId,
        contratoId,
        a.cobrancaAberta.comp,
        a.cobrancaAberta.venc,
        a.cobrancaAberta.valor,
        a.cobrancaAberta.status
      );
    }

    // Inserir histórico de presenças
    const datasHistorico = [
      { data: '2026-05-04', dia: 1 }, { data: '2026-05-06', dia: 3 }, { data: '2026-05-08', dia: 5 },
      { data: '2026-05-11', dia: 1 }, { data: '2026-05-13', dia: 3 }, { data: '2026-05-15', dia: 5 },
      { data: '2026-06-01', dia: 1 }, { data: '2026-06-03', dia: 3 }, { data: '2026-06-05', dia: 5 },
      { data: '2026-06-08', dia: 1 }, { data: '2026-06-10', dia: 3 }, { data: '2026-06-12', dia: 5 },
      { data: '2026-07-06', dia: 1 }, { data: '2026-07-08', dia: 3 }, { data: '2026-07-10', dia: 5 },
      { data: '2026-07-13', dia: 1 }, { data: '2026-07-15', dia: 3 }, { data: '2026-07-17', dia: 5 },
      { data: '2026-08-03', dia: 1 }, { data: '2026-08-05', dia: 3 }, { data: '2026-08-07', dia: 5 },
      { data: '2026-08-10', dia: 1 }, { data: '2026-08-12', dia: 3 }, { data: '2026-08-14', dia: 5 },
      { data: '2026-08-17', dia: 1 }, { data: '2026-08-19', dia: 3 }, { data: '2026-08-21', dia: 5 },
      { data: '2026-08-24', dia: 1 }, { data: '2026-08-26', dia: 3 }, { data: '2026-08-28', dia: 5 }
    ];

    for (const item of datasHistorico) {
      const match = a.horarios.find(h => h.dia === item.dia);
      if (match) {
        const isFalta = (i + item.dia + Number(item.data.slice(-2))) % 9 === 0;
        insertPresenca.run(alunoId, item.data, match.hora, isFalta ? 'falta' : 'presente');
      }
    }
  }

  // Presenças de hoje (31/08/2026 - Segunda)
  insertPresenca.run(1, '2026-08-31', '07:00', 'presente');
  insertPresenca.run(2, '2026-08-31', '07:00', 'falta');
  insertPresenca.run(5, '2026-08-31', '08:00', 'presente');
  insertPresenca.run(6, '2026-08-31', '08:00', 'presente');

  console.log(`[Seed] Sucesso: 22 alunos criados com cobrança mensal e fidelidade de 3 meses configurada!`);
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed();
}
