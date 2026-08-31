import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TouchButton } from '../components/TouchButton.jsx';
import { 
  CalendarCheck, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users,
  Check
} from 'lucide-react';

export function Presenca() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedHorario, setSelectedHorario] = useState(null);

  // Carregar dados de presença do dia selecionado
  const { data: presencaDia, isLoading } = useQuery({
    queryKey: ['presencas', selectedDate],
    queryFn: () => api.getPresencasDia(selectedDate)
  });

  // Mutação para check-in de presença com Optimistic UI
  const checkinMutation = useMutation({
    mutationFn: ({ alunoId, data, horario, status }) =>
      api.checkinPresenca({ alunoId, data, horario, status }),
    onMutate: async (newCheckin) => {
      await queryClient.cancelQueries({ queryKey: ['presencas', selectedDate] });
      const previousData = queryClient.getQueryData(['presencas', selectedDate]);

      if (previousData) {
        queryClient.setQueryData(['presencas', selectedDate], (old) => {
          if (!old) return old;
          const updatedHorarios = old.horarios.map(h => {
            if (h.horario !== newCheckin.horario) return h;
            return {
              ...h,
              alunos: h.alunos.map(a => 
                a.id === newCheckin.alunoId ? { ...a, status: newCheckin.status } : a
              )
            };
          });
          return { ...old, horarios: updatedHorarios };
        });
      }
      return { previousData };
    },
    onError: (err, newCheckin, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['presencas', selectedDate], context.previousData);
      }
      alert('Erro ao registrar presença: ' + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['presencas', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // Navegação de datas
  const handleMudarDia = (dias) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedHorario(null);
  };

  const handleIrHoje = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedHorario(null);
  };

  const formattedDateTitle = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const gradeHorarios = presencaDia?.horarios || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Navegação de Data */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-pilates-600" />
            Chamada & Frequência
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 capitalize">
            {formattedDateTitle} {isToday && '• (Hoje)'}
          </p>
        </div>

        {/* Controles de Navegação de Data Touch */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <TouchButton
            variant="outline"
            size="sm"
            onClick={() => handleMudarDia(-1)}
            icon={ChevronLeft}
          >
            Ontem
          </TouchButton>

          <TouchButton
            variant={isToday ? 'primary' : 'outline'}
            size="sm"
            onClick={handleIrHoje}
          >
            Hoje
          </TouchButton>

          <TouchButton
            variant="outline"
            size="sm"
            onClick={() => handleMudarDia(1)}
          >
            Amanhã
            <ChevronRight className="w-4 h-4" />
          </TouchButton>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedHorario(null);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 font-medium bg-slate-50 text-slate-700"
          />
        </div>
      </div>

      {/* Resumo do Dia */}
      {presencaDia && (
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Agendados</p>
            <p className="text-2xl font-black text-slate-900">{presencaDia.totalAlunos}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <p className="text-xs font-semibold text-emerald-600">Presentes</p>
            <p className="text-2xl font-black text-emerald-600">{presencaDia.totalPresentes}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <p className="text-xs font-semibold text-rose-600">Faltas</p>
            <p className="text-2xl font-black text-rose-600">{presencaDia.totalFaltas}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <p className="text-xs font-semibold text-slate-400">Pendentes</p>
            <p className="text-2xl font-black text-slate-600">{presencaDia.totalNaoRegistrados}</p>
          </div>
        </div>
      )}

      {/* Lista de Horários do Dia */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="w-10 h-10 border-4 border-pilates-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Carregando horários do estúdio...</p>
        </div>
      ) : gradeHorarios.length > 0 ? (
        <div className="space-y-4">
          {gradeHorarios.map(bloco => (
            <div 
              key={bloco.horario} 
              className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden transition-all"
            >
              {/* Header do Horário com status do bloco */}
              <div className="bg-slate-50/90 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pilates-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{bloco.horario}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {bloco.totalAlunos} {bloco.totalAlunos === 1 ? 'aluno agendado' : 'alunos agendados'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                    {bloco.presentes} presentes
                  </span>
                  {bloco.faltas > 0 && (
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-lg">
                      {bloco.faltas} faltas
                    </span>
                  )}
                </div>
              </div>

              {/* Lista de Alunos daquele Horário */}
              <div className="divide-y divide-slate-100 p-2 sm:p-4">
                {bloco.alunos.map(aluno => (
                  <div 
                    key={aluno.id}
                    className="py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0 border border-slate-200">
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

                    {/* Botões de Ação 1-Toque (Com suporte a correção de marcação) */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => checkinMutation.mutate({
                          alunoId: aluno.id,
                          data: selectedDate,
                          horario: bloco.horario,
                          status: 'presente'
                        })}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm min-h-[50px] transition-all touch-press ${
                          aluno.status === 'presente'
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30'
                            : 'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{aluno.status === 'presente' ? '✓ Presente' : 'Presente'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => checkinMutation.mutate({
                          alunoId: aluno.id,
                          data: selectedDate,
                          horario: bloco.horario,
                          status: 'falta'
                        })}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm min-h-[50px] transition-all touch-press ${
                          aluno.status === 'falta'
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600/30'
                            : 'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 border border-rose-200'
                        }`}
                      >
                        <XCircle className="w-5 h-5" />
                        <span>{aluno.status === 'falta' ? '✕ Falta' : 'Falta'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-card">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">Nenhuma aula agendada para este dia</h3>
          <p className="text-sm text-slate-500 mt-1">
            Navegue para outro dia da semana (ex: Segunda, Terça, Quarta) para visualizar as turmas programadas.
          </p>
        </div>
      )}
    </div>
  );
}
