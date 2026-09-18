import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { TouchButton } from '../components/TouchButton.jsx';
import { DEMO_TOKEN } from '../services/localAuth.js';

export function Login({ onLogin }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!token.trim()) {
      setError('Digite o token entregue pela equipe técnica.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onLogin(token.trim());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-5">
      <section className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8">
        <img src="/logo.png" alt="Zello" className="w-44 h-36 object-contain mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-slate-900 text-center">Acessar o Zello</h1>
        <p className="text-sm text-slate-500 text-center mt-2 mb-6">
          Use o token de acesso fornecido pela nossa equipe técnica.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-700 mb-2">Token de acesso</span>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="Cole seu token de acesso"
                className="w-full min-h-[54px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-base outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100"
              />
            </div>
          </label>
          {error && <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
            O acesso é validado localmente neste dispositivo. Não é necessária conexão com a internet.
          </p>
          <button
            type="button"
            onClick={() => setToken(DEMO_TOKEN)}
            className="w-full text-xs font-semibold text-pilates-700 hover:text-pilates-900"
          >
            Preencher token de demonstração local
          </button>
          <TouchButton type="submit" size="lg" loading={loading} className="w-full">
            Entrar
          </TouchButton>
        </form>
      </section>
    </main>
  );
}
