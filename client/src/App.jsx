import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Browser } from '@capacitor/browser';
import { Header } from './components/Header.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { Inicio } from './pages/Inicio.jsx';
import { Presenca } from './pages/Presenca.jsx';
import { Alunos } from './pages/Alunos.jsx';
import { Financeiro } from './pages/Financeiro.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';
import { Login } from './pages/Login.jsx';
import { UpdateBanner } from './components/UpdateBanner.jsx';
import { api } from './services/api.js';
import { APP_VERSION_CODE, clearAuth, cloudApi, getCachedAuth, saveAuth } from './services/cloudApi.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1
    }
  }
});

function MainApp({ auth, offlineSession, onLogout }) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [update, setUpdate] = useState(null);

  useEffect(() => {
    if (offlineSession) return;
    cloudApi.getLatestUpdate(auth.token).then(({ release }) => {
      if (release && Number(release.versionCode) > APP_VERSION_CODE) setUpdate(release);
    }).catch(() => {});
  }, [auth.token, offlineSession]);

  const downloadUpdate = async () => {
    if (!update?.downloadUrl) return;
    await Browser.open({ url: update.downloadUrl });
  };

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
      <UpdateBanner release={update} onDownload={downloadUpdate} onDismiss={() => setUpdate(null)} />

      {/* Conteúdo Principal Touch-First */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28">
        {activeTab === 'inicio' && <Inicio onNavigate={setActiveTab} />}
        {activeTab === 'presenca' && <Presenca />}
        {activeTab === 'alunos' && <Alunos />}
        {activeTab === 'financeiro' && <Financeiro />}
        {activeTab === 'ajustes' && (
          <Configuracoes auth={auth} offlineSession={offlineSession} onLogout={onLogout} />
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
  const [state, setState] = useState({ loading: true, auth: null, offline: false });

  useEffect(() => {
    const cached = getCachedAuth();
    if (!cached) {
      setState({ loading: false, auth: null, offline: false });
      return;
    }
    cloudApi.validateToken(cached.token).then(({ account }) => {
      const auth = { token: cached.token, account };
      saveAuth(auth);
      setState({ loading: false, auth, offline: false });
    }).catch((error) => {
      if (error.status === 401) {
        clearAuth();
        setState({ loading: false, auth: null, offline: false });
      } else {
        setState({ loading: false, auth: cached, offline: true });
      }
    });
  }, []);

  const login = async (token) => {
    const { account } = await cloudApi.validateToken(token);
    const auth = { token, account };
    saveAuth(auth);
    setState({ loading: false, auth, offline: false });
  };

  const logout = () => {
    clearAuth();
    queryClient.clear();
    setState({ loading: false, auth: null, offline: false });
  };

  if (state.loading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">Abrindo o Zello…</div>;
  }
  if (!state.auth) return <Login onLogin={login} apiConfigured={cloudApi.isConfigured} />;

  return (
    <QueryClientProvider client={queryClient}>
      <MainApp auth={state.auth} offlineSession={state.offline} onLogout={logout} />
    </QueryClientProvider>
  );
}

export default App;
