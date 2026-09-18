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
  FileText,
  Settings2,
  Plus
} from 'lucide-react';

const DIAS_SEMANA = [
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sábado' }
];

function mesAtual() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatarMes(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const text = new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mudarMes(month, offset) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function Alunos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'em_dia' | 'em_atraso' | 'hoje'
  const [periodFilter, setPeriodFilter] = useState('manha');
  
  // Modal de Novo Aluno
  const [isNovoAlunoOpen, setIsNovoAlunoOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [plano, setPlano] = useState('mensal');
  const [nomePlano, setNomePlano] = useState('Mensal');
  const [duracaoPlano, setDuracaoPlano] = useState('1');
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [valor, setValor] = useState('185');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [observacoes, setObservacoes] = useState('');
  const [horariosPorDia, setHorariosPorDia] = useState({ 1: '08:00', 3: '09:00' });

  // Modal simples para cadastrar opções frequentes de plano
  const [isPlanosOpen, setIsPlanosOpen] = useState(false);
  const [novoPlanoNome, setNovoPlanoNome] = useState('');
  const [novoPlanoDuracao, setNovoPlanoDuracao] = useState('1');
  const [novoPlanoValor, setNovoPlanoValor] = useState('185');

  // Modal de Detalhes do Aluno
  const [selectedAlunoId, setSelectedAlunoId] = useState(null);
  const [mesFinanceiro, setMesFinanceiro] = useState(mesAtual);
  const [mesPresenca, setMesPresenca] = useState(mesAtual);

  // Modal de Remarcar Horários
  const [isRemarcarOpen, setIsRemarcarOpen] = useState(false);
  const [remarcarHorarios, setRemarcarHorarios] = useState({ 1: '08:00', 3: '09:00' });
  const [salvandoRemarcacao, setSalvandoRemarcacao] = useState(false);

  // Buscar lista de alunos
  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ['alunos', searchTerm, statusFilter],
    queryFn: () => api.getAlunos({ search: searchTerm, status: statusFilter })
  });

  const alunosDoPeriodo = alunos.filter((aluno) => aluno.horarios?.some((horario) => {
    const hour = Number(String(horario.horario || '').split(':')[0]);
    return periodFilter === 'manha' ? hour < 12 : hour >= 12;
  }));

  const { data: planos = [] } = useQuery({
    queryKey: ['planos'],
    queryFn: () => api.getPlanPresets()
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
      setPlano('mensal');
      setNomePlano('Mensal');
      setDuracaoPlano('1');
      setSelectedPresetId(null);
      setValor('185');
      setDiaVencimento('10');
      setObservacoes('');
      setHorariosPorDia({ 1: '08:00', 3: '09:00' });
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
    const horarios = Object.entries(horariosPorDia).map(([dia, hora]) => ({ dia: Number(dia), hora }));
    criarAlunoMutation.mutate({
      nome: nome.trim(),
      telefone: telefone.trim(),
      plano,
      nome_plano: nomePlano,
      duracao_meses: Number(duracaoPlano),
      preset_id: selectedPresetId,
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
      const novosHorarios = Object.entries(remarcarHorarios).map(([dia, hora]) => ({ dia: Number(dia), hora }));
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

  const toggleDiaSemana = (dia, setter) => {
    setter((current) => {
      const next = { ...current };
      if (next[dia]) {
        if (Object.keys(next).length > 1) delete next[dia];
      } else {
        next[dia] = '08:00';
      }
      return next;
    });
  };

  const aplicarPlano = (preset) => {
    setSelectedPresetId(preset.id);
    setNomePlano(preset.nome);
    setDuracaoPlano(String(preset.duracao_meses));
    setPlano(preset.duracao_meses === 1 ? 'mensal' : preset.duracao_meses === 3 ? 'trimestral' : 'personalizado');
    setValor(String(preset.valor));
  };

  const criarPlanoMutation = useMutation({
    mutationFn: () => api.createPlanPreset({
      nome: novoPlanoNome,
      duracao_meses: Number(novoPlanoDuracao),
      valor: Number(novoPlanoValor)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      setNovoPlanoNome('');
      setNovoPlanoDuracao('1');
      setNovoPlanoValor('185');
    },
    onError: (error) => alert('Não foi possível salvar o plano: ' + error.message)
  });

  const diasSemanaNome = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-pilates-600" />
            Alunos do Estúdio ({alunosDoPeriodo.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Planos, pagamentos e programação de aulas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TouchButton onClick={() => setIsPlanosOpen(true)} icon={Settings2} variant="outline" size="sm">
            Planos
          </TouchButton>
          <TouchButton
            onClick={() => {
              const monthly = planos.find((item) => item.duracao_meses === 1);
              if (monthly) aplicarPlano(monthly);
              setIsNovoAlunoOpen(true);
            }}
            icon={UserPlus}
            variant="primary"
            size="md"
          >
            + Novo Aluno
          </TouchButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-200 p-1.5">
        {[
          { id: 'manha', label: 'Manhã' },
          { id: 'tarde', label: 'Tarde' }
        ].map((period) => (
          <button
            key={period.id}
            type="button"
            onClick={() => setPeriodFilter(period.id)}
            className={`min-h-[46px] rounded-xl text-sm font-bold transition-colors ${periodFilter === period.id ? 'bg-white text-pilates-700 shadow-sm' : 'text-slate-600'}`}
          >
            {period.label}
          </button>
        ))}
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
      ) : alunosDoPeriodo.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alunosDoPeriodo.map(aluno => (
            <div
              key={aluno.id}
              onClick={() => {
                setSelectedAlunoId(aluno.id);
                setMesFinanceiro(mesAtual());
                setMesPresenca(mesAtual());
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
                        {aluno.nome_plano || aluno.tipo_plano}
                      </span>
                      {aluno.duracao_plano_meses > 1 && (
                        <span className="text-[11px] font-semibold text-pilates-700 bg-pilates-50 px-2 py-0.5 rounded border border-pilates-200">
                          Ciclo de {aluno.duracao_plano_meses} meses
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
                      <span className="text-[11px] font-normal text-slate-500">/ciclo</span>
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
                      setMesFinanceiro(mesAtual());
                      setMesPresenca(mesAtual());
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
                  <span className="font-bold text-slate-900 text-sm">
                    {alunoDetalhe.nome_plano || alunoDetalhe.tipo_plano}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Pagamento a cada {alunoDetalhe.duracao_plano_meses} {alunoDetalhe.duracao_plano_meses === 1 ? 'mês' : 'meses'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Valor</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    R$ {Number(alunoDetalhe.valor).toFixed(2)}/ciclo
                  </span>
                  <span className="text-[11px] text-slate-500 block">Venc: dia {alunoDetalhe.dia_vencimento}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Duração do ciclo</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {alunoDetalhe.duracao_plano_meses} {alunoDetalhe.duracao_plano_meses === 1 ? 'mês' : 'meses'}
                  </span>
                  <span className="text-[10px] font-bold block mt-0.5 text-pilates-700">Valor referente ao ciclo completo</span>
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
                      setRemarcarHorarios(Object.fromEntries(
                        alunoDetalhe.horarios.map((h) => [h.dia_semana, h.horario])
                      ));
                    }
                    setIsRemarcarOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pilates-50 hover:bg-pilates-100 text-pilates-700 font-bold text-xs border border-pilates-200 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Horários</span>
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

            {/* SEÇÃO 1: Histórico financeiro paginado por mês */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-pilates-600" />
                  Pagamentos & Cobranças
                </h4>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setMesFinanceiro(mudarMes(mesFinanceiro, -1))}
                    className="p-1 rounded hover:bg-white text-slate-600"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2 min-w-[90px] text-center">
                    {formatarMes(mesFinanceiro)}
                  </span>
                  <button
                    onClick={() => setMesFinanceiro(mudarMes(mesFinanceiro, 1))}
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
                    <span className={`font-bold ${
                      historicoFinanceiroData.financeiro.status === 'EM_DIA'
                        ? 'text-emerald-700'
                        : historicoFinanceiroData.financeiro.status === 'EM_ATRASO'
                          ? 'text-rose-600'
                          : 'text-amber-700'
                    }`}>
                      {{ EM_DIA: 'Em dia', EM_ATRASO: 'Em atraso', HOJE: 'Vence hoje', PENDENTE: 'Pendente' }[historicoFinanceiroData.financeiro.status]}
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
                        <span className="text-slate-500 ml-2">Ciclo quitado</span>
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
                        <span className="text-rose-600 ml-2 font-semibold">Pagamento em aberto</span>
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
                    onClick={() => setMesPresenca(mudarMes(mesPresenca, -1))}
                    className="p-1 rounded hover:bg-white text-slate-600"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2 min-w-[90px] text-center">
                    {formatarMes(mesPresenca)}
                  </span>
                  <button
                    onClick={() => setMesPresenca(mudarMes(mesPresenca, 1))}
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
        title="Editar Horários do Aluno"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <p className="text-slate-500">Aluno</p>
            <h4 className="font-bold text-slate-900 text-base">{alunoDetalhe?.nome}</h4>
            <p className="text-slate-500 mt-1">
              A alteração vale para as próximas aulas. As presenças antigas continuam guardadas.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Escolha os dias</label>
            <div className="grid grid-cols-3 gap-2">
              {DIAS_SEMANA.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDiaSemana(d.id, setRemarcarHorarios)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all touch-press ${
                    remarcarHorarios[d.id]
                      ? 'bg-pilates-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Defina um horário para cada dia</label>
            {DIAS_SEMANA.filter((day) => remarcarHorarios[day.id]).map((day) => (
              <div key={day.id} className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-700">{day.label}</span>
                <input
                  type="time"
                  step="900"
                  value={remarcarHorarios[day.id]}
                  onChange={(event) => setRemarcarHorarios((current) => ({ ...current, [day.id]: event.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold bg-white"
                />
              </div>
            ))}
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
              Salvar Horários
            </TouchButton>
          </div>
        </div>
      </TouchModal>

      {/* Modal: opções salvas para agilizar novos cadastros */}
      <TouchModal
        isOpen={isPlanosOpen}
        onClose={() => setIsPlanosOpen(false)}
        title="Planos e valores"
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-slate-800 mb-2">Opções disponíveis</p>
            <div className="space-y-2">
              {planos.map((preset) => (
                <div key={preset.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">{preset.nome}</p>
                    <p className="text-xs text-slate-500">Pagamento a cada {preset.duracao_meses} {preset.duracao_meses === 1 ? 'mês' : 'meses'}</p>
                  </div>
                  <span className="font-black text-pilates-700">R$ {Number(preset.valor).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5"><Plus className="w-4 h-4" />Adicionar uma opção</p>
              <p className="text-xs text-slate-500">Ela ficará disponível no próximo cadastro de aluno.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nome</label>
              <input value={novoPlanoNome} onChange={(event) => setNovoPlanoNome(event.target.value)} placeholder="Ex.: Semestral" className="w-full px-3 py-2.5 rounded-xl border border-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Meses</label>
                <input type="number" min="1" max="60" value={novoPlanoDuracao} onChange={(event) => setNovoPlanoDuracao(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor do ciclo</label>
                <input type="number" min="0.01" step="0.01" value={novoPlanoValor} onChange={(event) => setNovoPlanoValor(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300" />
              </div>
            </div>
            <TouchButton variant="primary" icon={Plus} loading={criarPlanoMutation.isPending}
              onClick={() => criarPlanoMutation.mutate()} className="w-full">
              Salvar nova opção
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

          {/* Escolha simples de plano; opções avançadas ficam fora do fluxo diário */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Plano</label>
            <div className="grid grid-cols-2 gap-2.5">
              {planos.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => aplicarPlano(preset)}
                  className={`p-3 rounded-xl border text-left transition-all touch-press ${
                    selectedPresetId === preset.id
                      ? 'border-pilates-600 bg-pilates-50 ring-2 ring-pilates-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold text-slate-900 block text-sm">{preset.nome}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {preset.duracao_meses} {preset.duracao_meses === 1 ? 'mês' : 'meses'} • R$ {Number(preset.valor).toFixed(2)}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedPresetId(null);
                  setPlano('personalizado');
                  setNomePlano('Personalizado');
                  setDuracaoPlano('2');
                }}
                className={`p-3 rounded-xl border text-left transition-all touch-press ${
                  plano === 'personalizado' && !selectedPresetId
                    ? 'border-pilates-600 bg-pilates-50 ring-2 ring-pilates-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="font-bold text-slate-900 block text-sm">Outro período</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Escolher quantidade de meses</span>
              </button>
            </div>
            {plano === 'personalizado' && !selectedPresetId && (
              <div className="grid grid-cols-2 gap-3 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome do plano</label>
                  <input value={nomePlano} onChange={(event) => setNomePlano(event.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Quantidade de meses</label>
                  <input type="number" min="1" max="60" value={duracaoPlano} onChange={(event) => setDuracaoPlano(event.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Valor deste ciclo</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {[180, 185, 200, 220, 555].map((quickValue) => (
                <button key={quickValue} type="button" onClick={() => setValor(String(quickValue))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${Number(valor) === quickValue ? 'bg-pilates-600 text-white border-pilates-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  R$ {quickValue}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg font-bold bg-white"
            />
            <p className="text-[11px] text-slate-500 mt-1">O próximo pagamento será gerado após {duracaoPlano} {Number(duracaoPlano) === 1 ? 'mês' : 'meses'}.</p>
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
              Dias e horários das aulas
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIAS_SEMANA.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDiaSemana(d.id, setHorariosPorDia)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all touch-press ${
                    horariosPorDia[d.id]
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {DIAS_SEMANA.filter((day) => horariosPorDia[day.id]).map((day) => (
              <div key={day.id} className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-700">{day.label}</span>
                <input type="time" step="900" value={horariosPorDia[day.id]}
                  onChange={(event) => setHorariosPorDia((current) => ({ ...current, [day.id]: event.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold bg-white" />
              </div>
            ))}
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
