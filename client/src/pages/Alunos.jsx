import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TouchButton } from '../components/TouchButton.jsx';
import { TouchModal } from '../components/TouchModal.jsx';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MessageCircle, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  X,
  CreditCard,
  History,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  ShieldCheck,
  FileText
} from 'lucide-react';

export function Alunos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'em_dia' | 'em_atraso' | 'hoje'
  
  // Modal de Novo Aluno
  const [isNovoAlunoOpen, setIsNovoAlunoOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [plano, setPlano] = useState('trimestral');
  const [valor, setValor] = useState('185');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [observacoes, setObservacoes] = useState('');
  const [selectedDias, setSelectedDias] = useState([1, 3]); // Seg e Qua
  const [horarioAula, setHorarioAula] = useState('08:00');

  // Modal de Detalhes do Aluno
  const [selectedAlunoId, setSelectedAlunoId] = useState(null);
  const [mesFinanceiro, setMesFinanceiro] = useState('2026-08');
  const [mesPresenca, setMesPresenca] = useState('2026-08');

  // Modal de Remarcar Horários
  const [isRemarcarOpen, setIsRemarcarOpen] = useState(false);
  const [remarcarDias, setRemarcarDias] = useState([1, 3]);
  const [remarcarHora, setRemarcarHora] = useState('08:00');
  const [salvandoRemarcacao, setSalvandoRemarcacao] = useState(false);

  // Buscar lista de alunos
  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ['alunos', searchTerm, statusFilter],
    queryFn: () => api.getAlunos({ search: searchTerm, status: statusFilter })
  });

  // Buscar detalhes do aluno selecionado
  const { data: alunoDetalhe, isLoading: isLoadingDetalhe } = useQuery({
    queryKey: ['aluno', selectedAlunoId],
    queryFn: () => api.getAlunoById(selectedAlunoId),
    enabled: !!selectedAlunoId
  });

  // Buscar Histórico Mensal de Financeiro
  const { data: historicoFinanceiroData, isLoading: isLoadingFin } = useQuery({
    queryKey: ['alunoHistoricoFin', selectedAlunoId, mesFinanceiro],
    queryFn: () => api.getAlunoHistoricoMensal(selectedAlunoId, mesFinanceiro),
    enabled: !!selectedAlunoId
  });

  // Buscar Histórico Mensal de Presença
  const { data: historicoPresencaData, isLoading: isLoadingPres } = useQuery({
    queryKey: ['alunoHistoricoPres', selectedAlunoId, mesPresenca],
    queryFn: () => api.getAlunoHistoricoMensal(selectedAlunoId, mesPresenca),
    enabled: !!selectedAlunoId
  });

  // Mutação para criar aluno
  const criarAlunoMutation = useMutation({
    mutationFn: (data) => api.createAluno(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['presencas'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
      setIsNovoAlunoOpen(false);
      setNome('');
      setTelefone('');
      setPlano('trimestral');
      setValor('185');
      setDiaVencimento('10');
      setObservacoes('');
      setSelectedDias([1, 3]);
      setHorarioAula('08:00');
    },
    onError: (err) => {
      alert('Erro ao cadastrar aluno: ' + err.message);
    }
  });

  const handleSalvarNovoAluno = (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Por favor, informe o nome do aluno.');
      return;
    }
    const horarios = selectedDias.map(dia => ({ dia, hora: horarioAula }));
    criarAlunoMutation.mutate({
      nome: nome.trim(),
      telefone: telefone.trim(),
      plano,
      valor: Number(valor),
      dia_vencimento: Number(diaVencimento),
      observacoes: observacoes.trim(),
      horarios
    });
  };

  // Confirmar Remarcação de Horário
  const handleConfirmarRemarcacao = async () => {
    if (!selectedAlunoId) return;
    setSalvandoRemarcacao(true);
    try {
      const novosHorarios = remarcarDias.map(dia => ({ dia, hora: remarcarHora }));
      await api.updateAlunoHorarios(selectedAlunoId, novosHorarios);
      queryClient.invalidateQueries({ queryKey: ['aluno', selectedAlunoId] });
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      queryClient.invalidateQueries({ queryKey: ['presencas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsRemarcarOpen(false);
    } catch (err) {
      alert('Erro ao remarcar horário: ' + err.message);
    } finally {
      setSalvandoRemarcacao(false);
    }
  };

  const toggleDiaSemana = (dia, selectedList, setter) => {
    if (selectedList.includes(dia)) {
      if (selectedList.length > 1) {
        setter(selectedList.filter(d => d !== dia));
      }
    } else {
      setter([...selectedList, dia].sort());
    }
  };

  const mesesNomes = {
    '2026-05': 'Maio 2026',
    '2026-06': 'Junho 2026',
    '2026-07': 'Julho 2026',
    '2026-08': 'Agosto 2026',
    '2026-09': 'Setembro 2026',
    '2026-10': 'Outubro 2026',
    '2026-11': 'Novembro 2026'
  };

  const mesesOrdem = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

  const mudarMes = (mesAtual, offset, setter) => {
    const idx = mesesOrdem.indexOf(mesAtual);
    const novoIdx = idx + offset;
    if (novoIdx >= 0 && novoIdx < mesesOrdem.length) {
      setter(mesesOrdem[novoIdx]);
    }
  };

  const diasSemanaNome = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-pilates-600" />
            Alunos do Estúdio ({alunos.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Contratos, fidelidade, cobrança mensal e histórico de aulas
          </p>
        </div>

        <TouchButton
          onClick={() => setIsNovoAlunoOpen(true)}
          icon={UserPlus}
          variant="primary"
          size="md"
        >
          + Novo Aluno
        </TouchButton>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-pilates-500 focus:border-pilates-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'em_dia', label: 'Em Dia' },
            { id: 'hoje', label: 'Vence Hoje' },
            { id: 'em_atraso', label: 'Em Atraso' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-press ${
                statusFilter === filter.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Alunos em Cards Touch */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="w-10 h-10 border-4 border-pilates-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Carregando catálogo de alunos...</p>
        </div>
      ) : alunos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alunos.map(aluno => (
            <div
              key={aluno.id}
              onClick={() => {
                setSelectedAlunoId(aluno.id);
                setMesFinanceiro('2026-08');
                setMesPresenca('2026-08');
              }}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card hover:border-pilates-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {aluno.nome}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded capitalize">
                        {aluno.tipo_plano}
                      </span>
                      {aluno.duracao_fidelidade_meses > 0 && (
                        <span className="text-[11px] font-semibold text-pilates-700 bg-pilates-50 px-2 py-0.5 rounded border border-pilates-200">
                          Fidelidade 3 meses
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={aluno.situacaoFinanceira} />
                </div>

                <div className="bg-slate-50 rounded-xl p-3 my-3 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Cobrança</span>
                    <span className="font-black text-slate-900 text-sm">
                      R$ {Number(aluno.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <span className="text-[11px] font-normal text-slate-500">/mês</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Venc: dia {aluno.dia_vencimento}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 block font-medium">Agenda</span>
                    <span className="font-semibold text-slate-700">
                      {aluno.horarios && aluno.horarios.length > 0
                        ? aluno.horarios.map(h => `${diasSemanaNome[h.dia_semana]?.substring(0, 3)} ${h.horario}`).join(' • ')
                        : 'A definir'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                <span className="text-xs text-slate-500 font-medium">
                  {aluno.ultimoPagamento ? (
                    <>Último: {new Date(aluno.ultimoPagamento.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</>
                  ) : (
                    'Sem pagamentos'
                  )}
                </span>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {aluno.telefone && (
                    <a
                      href={`https://wa.me/55${aluno.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setSelectedAlunoId(aluno.id);
                      setMesFinanceiro('2026-08');
                      setMesPresenca('2026-08');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                  >
                    Ver Ficha
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-card">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">Nenhum aluno encontrado</h3>
          <p className="text-sm text-slate-500 mt-1">Tente ajustar o termo de busca ou cadastre um novo aluno.</p>
        </div>
      )}

      {/* Modal: Ficha Detalhada do Aluno com Contrato, Fidelidade e Histórico Mensal */}
      <TouchModal
        isOpen={!!selectedAlunoId}
        onClose={() => setSelectedAlunoId(null)}
        title="Ficha do Aluno"
        maxWidth="max-w-2xl"
      >
        {isLoadingDetalhe || !alunoDetalhe ? (
          <div className="py-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-pilates-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando dados do aluno...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header com Dados e Status do Aluno */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{alunoDetalhe.nome}</h3>
                {alunoDetalhe.telefone && (
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {alunoDetalhe.telefone}
                  </p>
                )}
              </div>
              <StatusBadge status={alunoDetalhe.situacaoFinanceira} />
            </div>

            {/* Box Detalhado do Contrato e Fidelidade */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-pilates-600" />
                Dados do Contrato
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Plano</span>
                  <span className="font-bold text-slate-900 capitalize text-sm">
                    {alunoDetalhe.tipo_plano}
                  </span>
                  <span className="text-[11px] text-slate-500 block">Cobrança Mensal</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Valor</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    R$ {Number(alunoDetalhe.valor).toFixed(2)}/mês
                  </span>
                  <span className="text-[11px] text-slate-500 block">Venc: dia {alunoDetalhe.dia_vencimento}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Fidelidade</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {alunoDetalhe.duracao_fidelidade_meses > 0 ? `${alunoDetalhe.duracao_fidelidade_meses} meses` : 'Sem fidelidade'}
                  </span>
                  {alunoDetalhe.fidelidade && alunoDetalhe.duracao_fidelidade_meses > 0 && (
                    <span className={`text-[10px] font-bold block mt-0.5 ${
                      alunoDetalhe.fidelidade.isFidelityActive ? 'text-pilates-700' : 'text-emerald-700'
                    }`}>
                      {alunoDetalhe.fidelidade.label}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Início Contrato</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {new Date(alunoDetalhe.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold block">Contrato Ativo</span>
                </div>
              </div>
            </div>

            {/* Programação de Aulas & Botão de Remarcação */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-pilates-600" />
                  Programação Semanal de Aulas
                </h4>
                <button
                  onClick={() => {
                    if (alunoDetalhe.horarios && alunoDetalhe.horarios.length > 0) {
                      setRemarcarDias(alunoDetalhe.horarios.map(h => h.dia_semana));
                      setRemarcarHora(alunoDetalhe.horarios[0].horario);
                    }
                    setIsRemarcarOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pilates-50 hover:bg-pilates-100 text-pilates-700 font-bold text-xs border border-pilates-200 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Remarcar Horário</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {alunoDetalhe.horarios && alunoDetalhe.horarios.length > 0 ? (
                  alunoDetalhe.horarios.map((h, idx) => (
                    <span key={idx} className="bg-pilates-50 border border-pilates-200 text-pilates-800 text-xs font-bold px-3 py-1.5 rounded-lg">
                      {diasSemanaNome[h.dia_semana]}: {h.horario}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nenhum horário cadastrado</span>
                )}
              </div>
            </div>

            {/* SEÇÃO 1: Histórico de Mensalidades Paginado por Mês */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-pilates-600" />
                  Mensalidades & Cobranças
                </h4>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => mudarMes(mesFinanceiro, -1, setMesFinanceiro)}
                    className="p-1 rounded hover:bg-white text-slate-600"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2 min-w-[90px] text-center">
                    {mesesNomes[mesFinanceiro] || mesFinanceiro}
                  </span>
                  <button
                    onClick={() => mudarMes(mesFinanceiro, 1, setMesFinanceiro)}
                    className="p-1 rounded hover:bg-white text-slate-600"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Resumo Mensal Financeiro */}
              {historicoFinanceiroData?.financeiro && (
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Cobranças</span>
                    <span className="font-bold text-slate-800">{historicoFinanceiroData.financeiro.totalCobrancas}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Pago</span>
                    <span className="font-bold text-emerald-700">R$ {historicoFinanceiroData.financeiro.totalPago.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Pendente</span>
                    <span className="font-bold text-rose-600">R$ {historicoFinanceiroData.financeiro.totalPendente.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Status</span>
                    <span className={`font-bold ${historicoFinanceiroData.financeiro.status === 'EM_DIA' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {historicoFinanceiroData.financeiro.status === 'EM_DIA' ? 'Em dia' : 'Em atraso'}
                    </span>
                  </div>
                </div>
              )}

              {/* Lista de Cobranças do Mês */}
              {isLoadingFin ? (
                <p className="text-xs text-slate-400 py-3 text-center">Carregando...</p>
              ) : historicoFinanceiroData?.financeiro?.pagamentos?.length > 0 || historicoFinanceiroData?.financeiro?.cobrancas?.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {historicoFinanceiroData.financeiro.pagamentos.map(p => (
                    <div key={p.id} className="p-2.5 flex items-center justify-between text-xs bg-white">
                      <div>
                        <span className="font-bold text-slate-800">
                          {new Date(p.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-slate-500 ml-2">Mensalidade Quitada</span>
                        <span className="text-slate-400 ml-1 uppercase text-[10px]">({p.forma_pagamento})</span>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Pago R$ {Number(p.valor_pago).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  {historicoFinanceiroData.financeiro.cobrancas.filter(c => c.status !== 'pago').map(c => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between text-xs bg-rose-50/50">
                      <div>
                        <span className="font-bold text-slate-800">
                          Venc: {new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-rose-600 ml-2 font-semibold">Mensalidade Aberta</span>
                      </div>
                      <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                        Pendente R$ {Number(c.valor_esperado).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhuma movimentação financeira neste mês.</p>
              )}
            </div>

            {/* SEÇÃO 2: Histórico de Presença Paginado por Mês */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-pilates-600" />
                  Histórico de Frequência
                </h4>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => mudarMes(mesPresenca, -1, setMesPresenca)}
                    className="p-1 rounded hover:bg-white text-slate-600"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2 min-w-[90px] text-center">
                    {mesesNomes[mesPresenca] || mesPresenca}
                  </span>
                  <button
                    onClick={() => mudarMes(mesPresenca, 1, setMesPresenca)}
                    className="p-1 rounded hover:bg-white text-slate-600"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {historicoPresencaData?.frequencia && (
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Aulas</span>
                    <span className="font-bold text-slate-800">{historicoPresencaData.frequencia.totalAulas}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Presenças</span>
                    <span className="font-bold text-emerald-700">{historicoPresencaData.frequencia.totalPresentes}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Faltas</span>
                    <span className="font-bold text-rose-600">{historicoPresencaData.frequencia.totalFaltas}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Frequência</span>
                    <span className="font-black text-pilates-700">{historicoPresencaData.frequencia.frequenciaPercentual}%</span>
                  </div>
                </div>
              )}

              {isLoadingPres ? (
                <p className="text-xs text-slate-400 py-3 text-center">Carregando...</p>
              ) : historicoPresencaData?.frequencia?.presencas?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {historicoPresencaData.frequencia.presencas.map(pr => {
                    const dataObj = new Date(pr.data + 'T12:00:00');
                    const diaSemanaStr = diasSemanaNome[dataObj.getDay() === 0 ? 7 : dataObj.getDay()];
                    return (
                      <div key={pr.id} className="p-2 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium">
                          {dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {diaSemanaStr} ({pr.horario})
                        </span>
                        <StatusBadge status={pr.status} type="presence" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhum registro de presença neste mês.</p>
              )}
            </div>
          </div>
        )}
      </TouchModal>

      {/* Modal: Remarcar Horário do Aluno */}
      <TouchModal
        isOpen={isRemarcarOpen}
        onClose={() => setIsRemarcarOpen(false)}
        title="Remarcar Horário do Aluno"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <p className="text-slate-500">Aluno</p>
            <h4 className="font-bold text-slate-900 text-base">{alunoDetalhe?.nome}</h4>
            <p className="text-slate-500 mt-1">
              A remarcação atualiza a programação atual e futura. O histórico de presenças passadas é totalmente preservado.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Novos Dias de Aula
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 1, label: 'Segunda' },
                { id: 2, label: 'Terça' },
                { id: 3, label: 'Quarta' },
                { id: 4, label: 'Quinta' },
                { id: 5, label: 'Sexta' },
                { id: 6, label: 'Sábado' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDiaSemana(d.id, remarcarDias, setRemarcarDias)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all touch-press ${
                    remarcarDias.includes(d.id)
                      ? 'bg-pilates-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Novo Horário
            </label>
            <select
              value={remarcarHora}
              onChange={(e) => setRemarcarHora(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold bg-white"
            >
              {['07:00', '08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <TouchButton
              variant="outline"
              onClick={() => setIsRemarcarOpen(false)}
            >
              Cancelar
            </TouchButton>
            <TouchButton
              variant="primary"
              loading={salvandoRemarcacao}
              onClick={handleConfirmarRemarcacao}
              icon={Check}
            >
              Confirmar Remarcação
            </TouchButton>
          </div>
        </div>
      </TouchModal>

      {/* Modal: Cadastrar Novo Aluno */}
      <TouchModal
        isOpen={isNovoAlunoOpen}
        onClose={() => setIsNovoAlunoOpen(false)}
        title="Cadastrar Novo Aluno"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSalvarNovoAluno} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nome do Aluno *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Juliana Prado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-pilates-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              WhatsApp / Telefone
            </label>
            <input
              type="tel"
              placeholder="(71) 98888-7777"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-pilates-500"
            />
          </div>

          {/* Seleção Clara de Plano */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Tipo de Plano
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPlano('mensal')}
                className={`p-3 rounded-xl border text-left transition-all touch-press ${
                  plano === 'mensal'
                    ? 'border-pilates-600 bg-pilates-50 ring-2 ring-pilates-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="font-bold text-slate-900 block text-sm">Plano Mensal</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Sem fidelidade • Cobrança mensal</span>
              </button>

              <button
                type="button"
                onClick={() => setPlano('trimestral')}
                className={`p-3 rounded-xl border text-left transition-all touch-press ${
                  plano === 'trimestral'
                    ? 'border-pilates-600 bg-pilates-50 ring-2 ring-pilates-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="font-bold text-slate-900 block text-sm">Plano Trimestral</span>
                <span className="text-[11px] text-pilates-700 font-semibold block mt-0.5">Fidelidade 3 meses • Cobrança mensal</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Ambos os planos possuem cobrança mensal. O plano Trimestral estabelece um compromisso inicial de 3 meses.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Valor da Mensalidade (R$/mês)
            </label>
            <select
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-base font-medium bg-white"
            >
              <option value="180">R$ 180,00/mês</option>
              <option value="185">R$ 185,00/mês (Padrão)</option>
              <option value="200">R$ 200,00/mês</option>
              <option value="220">R$ 220,00/mês</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Dia de Vencimento
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 15, 20, 31].map(dia => (
                <button
                  key={dia}
                  type="button"
                  onClick={() => setDiaVencimento(String(dia))}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-all touch-press ${
                    diaVencimento === String(dia)
                      ? 'bg-pilates-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {dia === 31 ? 'Fim Mês' : `Dia ${dia}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Dias das Aulas
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 1, label: 'Segunda' },
                { id: 2, label: 'Terça' },
                { id: 3, label: 'Quarta' },
                { id: 4, label: 'Quinta' },
                { id: 5, label: 'Sexta' },
                { id: 6, label: 'Sábado' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDiaSemana(d.id, selectedDias, setSelectedDias)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all touch-press ${
                    selectedDias.includes(d.id)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Horário das Aulas
            </label>
            <select
              value={horarioAula}
              onChange={(e) => setHorarioAula(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-base font-medium bg-white"
            >
              {['07:00', '08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <TouchButton
              variant="outline"
              onClick={() => setIsNovoAlunoOpen(false)}
            >
              Cancelar
            </TouchButton>
            <TouchButton
              type="submit"
              variant="primary"
              loading={criarAlunoMutation.isPending}
              icon={CheckCircle2}
            >
              Salvar Aluno
            </TouchButton>
          </div>
        </form>
      </TouchModal>
    </div>
  );
}
