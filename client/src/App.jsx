import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Header } from './components/Header.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { Inicio } from './pages/Inicio.jsx';
import { Presenca } from './pages/Presenca.jsx';
import { Alunos } from './pages/Alunos.jsx';
import { Financeiro } from './pages/Financeiro.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';
import { Login } from './pages/Login.jsx';
import { api } from './services/api.js';
import { clearAuth, getCachedAuth, initializeLocalAuth, saveAuth, validateLocalToken } from './services/localAuth.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1
    }
  }
});

function MainApp({ auth, onLogout }) {
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
        {activeTab === 'ajustes' && (
          <Configuracoes auth={auth} onLogout={onLogout} />
        )}
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
  const [state, setState] = useState({ loading: true, auth: null, error: '' });

  useEffect(() => {
    initializeLocalAuth().then(() => {
      const cached = getCachedAuth();
      if (!cached) {
        setState({ loading: false, auth: null, error: '' });
        return;
      }
      return validateLocalToken(cached.token).then(({ account }) => {
        const auth = { token: cached.token, account };
        saveAuth(auth);
        setState({ loading: false, auth, error: '' });
      }).catch(() => {
        clearAuth();
        setState({ loading: false, auth: null, error: '' });
      });
    }).catch((error) => {
      setState({ loading: false, auth: null, error: error.message || 'Não foi possível abrir o banco local.' });
    });
  }, []);

  const login = async (token) => {
    const { account } = await validateLocalToken(token);
    const auth = { token, account };
    saveAuth(auth);
    setState({ loading: false, auth, error: '' });
  };

  const logout = () => {
    clearAuth();
    queryClient.clear();
    setState({ loading: false, auth: null, error: '' });
  };

  if (state.loading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">Abrindo o Zello…</div>;
  }
  if (state.error) return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-center text-rose-700">{state.error}</div>;
  if (!state.auth) return <Login onLogin={login} />;

  return (
    <QueryClientProvider client={queryClient}>
      <MainApp auth={state.auth} onLogout={logout} />
    </QueryClientProvider>
  );
}

export default App;
