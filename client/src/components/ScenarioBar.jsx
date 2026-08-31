import React, { useState } from 'react';
import { Settings2, RotateCcw, Check, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';

export function ScenarioBar({ activeScenario, onScenarioChange, onDataReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelectScenario = async (scenarioId) => {
    setLoading(true);
    try {
      await api.selectScenario(scenarioId, true);
      onScenarioChange(scenarioId);
      if (onDataReset) onDataReset();
    } catch (e) {
      alert('Erro ao alterar cenário: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Deseja restaurar os dados originais da planilha (23 alunos)?')) return;
    setLoading(true);
    try {
      await api.resetDemoData();
      if (onDataReset) onDataReset();
      alert('Dados restaurados com sucesso para o estado original da planilha!');
    } catch (e) {
      alert('Erro ao restaurar dados: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 py-2.5 px-4 text-xs">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Scenario info */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800/60">
            <Sparkles className="w-3.5 h-3.5" />
            Protótipo Demonstrativo
          </span>
          <span className="text-slate-300 hidden sm:inline">
            Modo: <strong className="text-white">{activeScenario === 'SCENARIO_A' ? 'Cenário A (Trimestral = 3 Meses)' : 'Cenário B (Trimestral = Mensal c/ Fidelidade)'}</strong>
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectScenario(activeScenario === 'SCENARIO_A' ? 'SCENARIO_B' : 'SCENARIO_A')}
            disabled={loading}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-700 font-medium text-slate-200 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Alternar para {activeScenario === 'SCENARIO_A' ? 'Cenário B' : 'Cenário A'}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-700 font-medium text-slate-200 transition-colors"
            title="Restaura os dados originais da planilha"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Restaurar Planilha</span>
          </button>
        </div>
      </div>
    </div>
  );
}
