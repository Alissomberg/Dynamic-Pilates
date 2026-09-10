import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Header } from './components/Header.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { Inicio } from './pages/Inicio.jsx';
import { Presenca } from './pages/Presenca.jsx';
import { Alunos } from './pages/Alunos.jsx';
import { Financeiro } from './pages/Financeiro.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';
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

  // Contagem de alertas para badge
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard()
  });

  const totalAlertas = dashboardData?.alertas?.totalAlertas || 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header Principal com Logo */}
      <Header />

      {/* Conteúdo Principal Touch-First */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28">
        {activeTab === 'inicio' && <Inicio onNavigate={setActiveTab} />}
        {activeTab === 'presenca' && <Presenca />}
        {activeTab === 'alunos' && <Alunos />}
        {activeTab === 'financeiro' && <Financeiro />}
        {activeTab === 'ajustes' && <Configuracoes />}
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
