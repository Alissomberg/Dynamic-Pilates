import React from 'react';
import { Download, X } from 'lucide-react';

export function UpdateBanner({ release, onDownload, onDismiss }) {
  if (!release) return null;
  return (
    <div className="bg-pilates-800 text-white px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <Download className="w-5 h-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Nova versão {release.version} disponível</p>
          <p className="text-xs text-pilates-100 truncate">{release.notes}</p>
        </div>
        <button onClick={onDownload} className="rounded-lg bg-white text-pilates-800 px-3 py-2 text-sm font-bold shrink-0">
          Baixar APK
        </button>
        <button onClick={onDismiss} aria-label="Fechar aviso" className="p-2 rounded-lg hover:bg-white/10 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
