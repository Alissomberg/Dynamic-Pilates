import React from 'react';
import { Calendar, UserCheck } from 'lucide-react';

export function Header() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pilates-600 to-pilates-400 p-1 shadow-sm flex items-center justify-center shrink-0">
            <img 
              src="/logo.png" 
              alt="Dynamic Pilates Logo" 
              className="w-full h-full object-contain rounded-xl bg-white p-0.5" 
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Dynamic Pilates
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Estúdio de Pilates & Fisioterapia • Dr. João
            </p>
          </div>
        </div>

        {/* Date / Today pill */}
        <div className="flex items-center gap-2 bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200/60 text-slate-700 text-xs sm:text-sm font-medium">
          <Calendar className="w-4 h-4 text-pilates-600 shrink-0" />
          <span>{capitalizedDate}</span>
        </div>
      </div>
    </header>
  );
}
