import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Header } from './components/Header.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { ScenarioBar } from './components/ScenarioBar.jsx';
import { Inicio } from './pages/Inicio.jsx';
import { Presenca } from './pages/Presenca.jsx';
import { Alunos } from './pages/Alunos.jsx';
import { Financeiro } from './pages/Financeiro.jsx';
import { api } from './services/api.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1
    }
  }
});

function MainApp() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [activeScenario, setActiveScenario] = useState('SCENARIO_A');

  // Buscar cenário ativo da API
  const { data: scenariosData, refetch: refetchScenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => api.getScenarios()
  });

  useEffect(() => {
    if (scenariosData?.activeScenario) {
      setActiveScenario(scenariosData.activeScenario);
    }
  }, [scenariosData]);

  // Contagem de alertas para badge
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard()
  });

  const totalAlertas = dashboardData?.alertas?.totalAlertas || 0;

  const handleDataReset = () => {
    queryClient.invalidateQueries();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Barra de Cenário de Apresentação (Topo) */}
      <ScenarioBar
        activeScenario={activeScenario}
        onScenarioChange={(newScenario) => {
          setActiveScenario(newScenario);
          refetchScenarios();
          queryClient.invalidateQueries();
        }}
        onDataReset={handleDataReset}
      />

      {/* Header Principal com Logo */}
      <Header />

      {/* Conteúdo Principal Touch-First */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28">
        {activeTab === 'inicio' && <Inicio onNavigate={setActiveTab} />}
        {activeTab === 'presenca' && <Presenca />}
        {activeTab === 'alunos' && <Alunos />}
        {activeTab === 'financeiro' && <Financeiro />}
      </main>

      {/* Navegação Inferior para Tablet */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertasCount={totalAlertas}
      />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

export default App;
