import React from 'react';
import clsx from 'clsx';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle } from 'lucide-react';

export function StatusBadge({ status, type = 'financial', className = '' }) {
  if (type === 'financial') {
    const code = typeof status === 'object' ? status.code : status;
    const label = typeof status === 'object' ? status.label : status;

    switch (code) {
      case 'EM_DIA':
        return (
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200", className)}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {label || 'Em dia'}
          </span>
        );
      case 'HOJE':
        return (
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse", className)}>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {label || 'Vence hoje'}
          </span>
        );
      case 'EM_ATRASO':
        return (
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200", className)}>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            {label || 'Em atraso'}
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200", className)}>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {label || 'Pendente'}
          </span>
        );
    }
  }

  if (type === 'presence') {
    switch (status) {
      case 'presente':
        return (
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200", className)}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Presente
          </span>
        );
      case 'falta':
        return (
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200", className)}>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Falta
          </span>
        );
      default:
        return (
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200", className)}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Não registrado
          </span>
        );
    }
  }

  return null;
}
