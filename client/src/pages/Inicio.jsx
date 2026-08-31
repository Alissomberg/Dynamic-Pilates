import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TouchButton } from '../components/TouchButton.jsx';
import { TouchModal } from '../components/TouchModal.jsx';
import { 
  Users, 
  DollarSign, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  TrendingUp,
  MessageCircle,
  CreditCard,
  CalendarCheck,
  Calendar
} from 'lucide-react';

export function Inicio({ onNavigate }) {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedHorario, setSelectedHorario] = useState(null);
  const [pagamentoModalAluno, setPagamentoModalAluno] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [valorPagamento, setValorPagamento] = useState('');
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  // Carregar dados do Dashboard
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', todayStr],
    queryFn: () => api.getDashboard(todayStr),
    refetchInterval: 30000
  });

  // Mutação para check-in de presença com Optimistic UI
  const presencaMutation = useMutation({
    mutationFn: ({ alunoId, data, horario, status }) =>
      api.checkinPresenca({ alunoId, data, horario, status }),
    onMutate: async (newCheckin) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard', todayStr] });
      const previousDashboard = queryClient.getQueryData(['dashboard', todayStr]);

      if (previousDashboard) {
        queryClient.setQueryData(['dashboard', todayStr], (old) => {
          if (!old || !old.presencas) return old;
          const updatedHorarios = old.presencas.horarios.map(h => {
            if (h.horario !== newCheckin.horario) return h;
            return {
              ...h,
              alunos: h.alunos.map(a => 
                a.id === newCheckin.alunoId ? { ...a, status: newCheckin.status } : a
              )
            };
          });
          return {
            ...old,
            presencas: {
              ...old.presencas,
              horarios: updatedHorarios
            }
          };
        });
      }
      return { previousDashboard };
    },
    onError: (err, newCheckin, context) => {
      if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard', todayStr], context.previousDashboard);
      }
      alert('Erro ao registrar presença: ' + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['presencas'] });
    }
  });

  // Mutação para registrar pagamento com confirmação real
  const handleConfirmarPagamento = async () => {
    if (!pagamentoModalAluno) return;
    setSalvandoPagamento(true);
    try {
      await api.registrarPagamento({
        alunoId: pagamentoModalAluno.alunoId,
        cobrancaId: pagamentoModalAluno.cobrancaId,
        valorPago: valorPagamento ? Number(valorPagamento) : pagamentoModalAluno.valorEsperado,
        dataPagamento: todayStr,
        formaPagamento
      });

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setPagamentoModalAluno(null);
    } catch (e) {
      alert('Erro ao registrar pagamento: ' + e.message);
    } finally {
      setSalvandoPagamento(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pilates-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Carregando painel operacional do estúdio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl max-w-lg mx-auto my-8">
        <h3 className="font-bold text-lg mb-2">Erro ao carregar dados</h3>
        <p className="text-sm mb-4">{error.message}</p>
        <TouchButton onClick={() => window.location.reload()} variant="primary">
          Tentar Novamente
        </TouchButton>
      </div>
    );
  }

  const { presencas, alertas, financeiroMes } = dashboard;
  const gradeHorarios = presencas?.horarios || [];

  const horarioAtual = selectedHorario 
    ? gradeHorarios.find(h => h.horario === selectedHorario) 
    : gradeHorarios[0];

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Métricas Rápidas Operacionais do Mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Recebido */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Recebido no Mês</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            R$ {Number(financeiroMes.totalRecebido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {financeiroMes.qtdPagamentos || 0} mensalidades pagas
          </p>
        </div>

        {/* Pendente / Atrasado */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Em Aberto</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600">
            R$ {Number(financeiroMes.totalAtrasado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {alertas.qtdEmAtraso} alunos em atraso
          </p>
        </div>

        {/* Alunos Ativos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alunos Ativos</span>
            <div className="w-8 h-8 rounded-xl bg-pilates-100 text-pilates-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {financeiroMes.totalAlunosAtivos || 0}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Matriculados no estúdio
          </p>
        </div>

        {/* Presenças Hoje */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Aulas de Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {presencas.totalAlunos} <span className="text-xs font-normal text-slate-500">alunos</span>
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {presencas.totalPresentes} presentes • {presencas.totalFaltas} faltas
          </p>
        </div>
      </div>

      {/* 2. Chamada Rápida de Hoje com Seleção de Horário */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-pilates-600" />
              Chamada Rápida do Dia
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Selecione o horário e toque para registrar presença ou falta
            </p>
          </div>

          {/* Horários do dia em Pills Touch */}
          {gradeHorarios.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {gradeHorarios.map(h => (
                <button
                  key={h.horario}
                  type="button"
                  onClick={() => setSelectedHorario(h.horario)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap touch-press ${
                    (horarioAtual?.horario === h.horario)
                      ? 'bg-pilates-600 text-white shadow-sm shadow-pilates-600/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {h.horario}
                  <span className={`ml-1.5 text-xs px-2 py-0.5 rounded-full ${
                    (horarioAtual?.horario === h.horario) ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {h.totalAlunos}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de Alunos do Horário */}
        {horarioAtual && horarioAtual.alunos.length > 0 ? (
          <div className="divide-y divide-slate-100 mt-3">
            {horarioAtual.alunos.map(aluno => (
              <div 
                key={aluno.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0 border border-slate-200">
                    {aluno.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{aluno.nome}</h4>
                      <StatusBadge status={aluno.status} type="presence" />
                    </div>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">
                      Plano {aluno.plano || 'Mensal'} • {aluno.telefone}
                    </p>
                  </div>
                </div>

                {/* Ações 1-Toque com feedback visual */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => presencaMutation.mutate({
                      alunoId: aluno.id,
                      data: todayStr,
                      horario: horarioAtual.horario,
                      status: 'presente'
                    })}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[46px] transition-all touch-press ${
                      aluno.status === 'presente'
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{aluno.status === 'presente' ? '✓ Presente' : 'Presente'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => presencaMutation.mutate({
                      alunoId: aluno.id,
                      data: todayStr,
                      horario: horarioAtual.horario,
                      status: 'falta'
                    })}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[46px] transition-all touch-press ${
                      aluno.status === 'falta'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{aluno.status === 'falta' ? '✕ Falta' : 'Falta'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-slate-600">Nenhum aluno agendado para este horário hoje.</p>
          </div>
        )}
      </div>

      {/* 3. Alertas Financeiros: Quem está em atraso ou vence hoje */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Alertas Financeiros & Cobranças
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Alunos que precisam de atenção financeira hoje
            </p>
          </div>
          <TouchButton 
            onClick={() => onNavigate('financeiro')} 
            variant="ghost" 
            size="sm"
            icon={ArrowRight}
          >
            Ver Financeiro
          </TouchButton>
        </div>

        {alertas.emAtraso.length > 0 || alertas.vencemHoje.length > 0 ? (
          <div className="divide-y divide-slate-100 mt-2">
            {/* Vencem Hoje */}
            {alertas.vencemHoje.map(item => (
              <div key={item.cobrancaId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{item.alunoNome}</h4>
                    <p className="text-xs text-slate-500">
                      Vence Hoje (31/08) • R$ {item.valorEsperado} • Plano {item.tipoPlano}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.situacao} />
                  <TouchButton
                    size="sm"
                    variant="success"
                    onClick={() => {
                      setPagamentoModalAluno(item);
                      setValorPagamento(String(item.valorEsperado));
                    }}
                  >
                    Receber R$ {item.valorEsperado}
                  </TouchButton>
                </div>
              </div>
            ))}

            {/* Em Atraso */}
            {alertas.emAtraso.map(item => (
              <div key={item.cobrancaId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{item.alunoNome}</h4>
                    <p className="text-xs text-slate-500">
                      Venceu em {new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')} • R$ {item.valorEsperado}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.situacao} />
                  
                  {item.telefone && (
                    <a
                      href={`https://wa.me/55${item.telefone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(item.alunoNome)},%20passando%20para%20lembrar%20do%20pagamento%20da%20mensalidade%20do%20Pilates%20(R$%20${item.valorEsperado}).`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                      title="Enviar lembrete no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  <TouchButton
                    size="sm"
                    variant="success"
                    onClick={() => {
                      setPagamentoModalAluno(item);
                      setValorPagamento(String(item.valorEsperado));
                    }}
                  >
                    Dar Baixa
                  </TouchButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-slate-700">Tudo em dia! Nenhuma cobrança pendente para hoje.</p>
          </div>
        )}
      </div>

      {/* Modal de Baixa de Pagamento */}
      <TouchModal
        isOpen={!!pagamentoModalAluno}
        onClose={() => setPagamentoModalAluno(null)}
        title="Registrar Pagamento"
      >
        {pagamentoModalAluno && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-semibold">Aluno</p>
              <h4 className="text-lg font-bold text-slate-900">{pagamentoModalAluno.alunoNome}</h4>
              <p className="text-xs text-slate-500 mt-1 capitalize">
                Plano {pagamentoModalAluno.tipoPlano} • Vencimento: dia {pagamentoModalAluno.diaVencimento}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Valor Recebido (R$)
              </label>
              <input
                type="number"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
                className="w-full text-xl font-bold px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-pilates-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['pix', 'dinheiro', 'cartao'].map(forma => (
                  <button
                    key={forma}
                    type="button"
                    onClick={() => setFormaPagamento(forma)}
                    className={`py-3 rounded-xl font-bold text-sm uppercase transition-all touch-press ${
                      formaPagamento === forma
                        ? 'bg-pilates-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {forma}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <TouchButton
                variant="outline"
                onClick={() => setPagamentoModalAluno(null)}
              >
                Cancelar
              </TouchButton>
              <TouchButton
                variant="success"
                loading={salvandoPagamento}
                onClick={handleConfirmarPagamento}
                icon={CheckCircle2}
              >
                Confirmar Recebimento
              </TouchButton>
            </div>
          </div>
        )}
      </TouchModal>
    </div>
  );
}
