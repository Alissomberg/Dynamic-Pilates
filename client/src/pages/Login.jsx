import React, { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { TouchButton } from '../components/TouchButton.jsx';

export function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setError('Digite seu PIN de 6 números.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onLogin(pin);
    } catch (loginError) {
      setError(loginError.message);
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
          Digite o PIN local fornecido pelo administrador ou pelo seu SuperUser.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-700 mb-2">PIN de acesso</span>
            <div className="relative">
              <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="off"
                placeholder="••••••"
                aria-label="PIN de acesso"
                className="w-full min-h-[58px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-center text-2xl tracking-[0.45em] font-bold outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100"
              />
            </div>
          </label>
          {error && <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
            O PIN é validado somente neste dispositivo. Não é necessária conexão com a internet.
          </p>
          <TouchButton type="submit" size="lg" loading={loading} className="w-full">Entrar</TouchButton>
        </form>
      </section>
    </main>
  );
}
