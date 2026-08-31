import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TouchButton } from '../components/TouchButton.jsx';
import { TouchModal } from '../components/TouchModal.jsx';
import { 
  DollarSign, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  MessageCircle, 
  CreditCard, 
  History, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';

export function Financeiro() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const mesAtualStr = todayStr.substring(0, 7);

  // Estados do Modal de Baixa de Pagamento
  const [pagamentoModalAluno, setPagamentoModalAluno] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [valorPagamento, setValorPagamento] = useState('');
  const [dataPagamento, setDataPagamento] = useState(todayStr);
  const [observacao, setObservacao] = useState('');
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  // Carregar Pendências
  const { data: pendencias = [], isLoading: isLoadingPendencias } = useQuery({
    queryKey: ['financeiro', 'pendencias'],
    queryFn: () => api.getPendencias()
  });

  // Carregar Resumo do Mês
  const { data: resumoMes, isLoading: isLoadingResumo } = useQuery({
    queryKey: ['financeiro', 'resumo', mesAtualStr],
    queryFn: () => api.getResumoFinanceiro(mesAtualStr)
  });

  // Carregar Histórico de Transações
  const { data: historico = [], isLoading: isLoadingHistorico } = useQuery({
    queryKey: ['financeiro', 'historico'],
    queryFn: () => api.getHistoricoFinanceiro(30)
  });

  // Confirmar Baixa de Pagamento
  const handleConfirmarPagamento = async () => {
    if (!pagamentoModalAluno) return;
    setSalvandoPagamento(true);
    try {
      await api.registrarPagamento({
        alunoId: pagamentoModalAluno.alunoId,
        cobrancaId: pagamentoModalAluno.cobrancaId,
        valorPago: valorPagamento ? Number(valorPagamento) : pagamentoModalAluno.valorEsperado,
        dataPagamento: dataPagamento || todayStr,
        formaPagamento,
        observacao
      });

      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setPagamentoModalAluno(null);
      setObservacao('');
    } catch (e) {
      alert('Erro ao registrar pagamento: ' + e.message);
    } finally {
      setSalvandoPagamento(false);
    }
  };

  const emAtraso = pendencias.filter(p => p.situacao.code === 'EM_ATRASO');
  const vencendo = pendencias.filter(p => p.situacao.code === 'HOJE' || p.situacao.code === 'PENDENTE');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-pilates-600" />
          Controle Financeiro & Mensalidades
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Acompanhe recebimentos, pendências e dê baixa em pagamentos com 1 toque
        </p>
      </div>

      {/* Cards de Resumo Financeiro */}
      {resumoMes && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Recebido */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Recebido este Mês</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              R$ {Number(resumoMes.totalRecebido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {resumoMes.qtdPagamentos} pagamentos confirmados
            </p>
          </div>

          {/* Em Atraso */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total em Atraso</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600">
              R$ {Number(resumoMes.totalAtrasado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-rose-600 font-medium mt-1">
              {resumoMes.qtdAtrasados} mensalidades vencidas
            </p>
          </div>

          {/* Total Pendente Geral */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Previsão Total a Receber</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              R$ {Number(resumoMes.totalPendente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {resumoMes.qtdPendencias} cobranças no ciclo
            </p>
          </div>
        </div>
      )}

      {/* Lista de Mensalidades em Atraso e Vencendo */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Mensalidades Pendentes & Cobranças ({pendencias.length})
            </h3>
            <p className="text-xs text-slate-500">
              Alunos ordenados pelos vencimentos mais urgentes
            </p>
          </div>
        </div>

        {isLoadingPendencias ? (
          <div className="py-10 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-pilates-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando pendências...</p>
          </div>
        ) : pendencias.length > 0 ? (
          <div className="divide-y divide-slate-100 mt-2">
            {pendencias.map(item => (
              <div
                key={item.cobrancaId}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    item.situacao.code === 'EM_ATRASO' ? 'bg-rose-500' : item.situacao.code === 'HOJE' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                  }`} />
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{item.alunoNome}</h4>
                    <p className="text-xs text-slate-500 capitalize">
                      Plano {item.tipoPlano} • Vencimento: dia {item.diaVencimento} ({new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right mr-2 hidden sm:block">
                    <span className="text-xs text-slate-400 block font-medium">Valor</span>
                    <span className="font-bold text-slate-900 text-base">
                      R$ {Number(item.valorEsperado).toFixed(2)}
                    </span>
                  </div>

                  <StatusBadge status={item.situacao} />

                  {item.telefone && (
                    <a
                      href={`https://wa.me/55${item.telefone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(item.alunoNome)},%20passando%20para%20lembrar%20do%20pagamento%20da%20mensalidade%20do%20Pilates%20(R$%20${item.valorEsperado}).`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                      title="Enviar lembrete pelo WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  <TouchButton
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setPagamentoModalAluno(item);
                      setValorPagamento(String(item.valorEsperado));
                      setDataPagamento(todayStr);
                    }}
                    icon={CheckCircle2}
                  >
                    Receber R$ {item.valorEsperado}
                  </TouchButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-base">Todas as mensalidades estão em dia!</h4>
            <p className="text-xs text-slate-400 mt-1">Nenhum aluno com pendências no momento.</p>
          </div>
        )}
      </div>

      {/* Histórico Recente de Transações */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-pilates-600" />
              Histórico de Pagamentos Recebidos
            </h3>
            <p className="text-xs text-slate-500">
              Últimas quitações registradas no estúdio
            </p>
          </div>
        </div>

        {isLoadingHistorico ? (
          <div className="py-10 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-pilates-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando histórico...</p>
          </div>
        ) : historico.length > 0 ? (
          <div className="divide-y divide-slate-100 mt-2">
            {historico.map(p => (
              <div key={p.id} className="py-3 px-2 flex items-center justify-between text-sm hover:bg-slate-50/80 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{p.aluno_nome}</h4>
                    <p className="text-xs text-slate-500">
                      Pago em {new Date(p.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')} • {p.observacao || 'Mensalidade'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-emerald-700 text-base">
                    + R$ {Number(p.valor_pago).toFixed(2)}
                  </span>
                  <span className="block text-[11px] text-slate-400 uppercase font-semibold">
                    via {p.forma_pagamento}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            Nenhum histórico disponível.
          </div>
        )}
      </div>

      {/* Modal de Baixa de Pagamento */}
      <TouchModal
        isOpen={!!pagamentoModalAluno}
        onClose={() => setPagamentoModalAluno(null)}
        title="Dar Baixa de Pagamento"
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
                Data do Recebimento
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-medium"
              />
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
