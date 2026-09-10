import React, { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { api } from '../services/api.js';
import { TouchButton } from '../components/TouchButton.jsx';
import { Database, Download, HardDrive, Settings, Upload } from 'lucide-react';

function nomeDoBackup() {
  const data = new Date().toISOString().slice(0, 10);
  return `dynamic-pilates-backup-${data}.json`;
}

export function Configuracoes() {
  const inputRef = useRef(null);
  const [mensagem, setMensagem] = useState('');
  const [processando, setProcessando] = useState(false);

  const criarBackup = async () => {
    setProcessando(true);
    setMensagem('');
    try {
      const backup = await api.exportBackup();
      const conteudo = JSON.stringify(backup, null, 2);
      const nome = nomeDoBackup();

      if (Capacitor.isNativePlatform()) {
        const arquivo = await Filesystem.writeFile({
          path: nome,
          data: conteudo,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Backup do Dynamic Pilates',
          text: 'Guarde este arquivo em um local seguro.',
          url: arquivo.uri,
          dialogTitle: 'Salvar ou enviar backup'
        });
      } else {
        const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = nome;
        link.click();
        URL.revokeObjectURL(url);
      }

      setMensagem('Backup criado. Guarde o arquivo fora do tablet.');
    } catch (error) {
      setMensagem(`Não foi possível criar o backup: ${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const restaurarBackup = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    if (!window.confirm('Restaurar este backup substituirá os dados atuais. Deseja continuar?')) return;

    setProcessando(true);
    setMensagem('');
    try {
      const backup = JSON.parse(await arquivo.text());
      await api.importBackup(backup);
      setMensagem('Backup restaurado. O aplicativo será recarregado.');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMensagem(`Não foi possível restaurar: ${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-pilates-600" />
          Ajustes
        </h2>
        <p className="text-sm text-slate-500">Opções que você usará só de vez em quando.</p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Seus dados ficam neste tablet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Alunos, pagamentos e presenças funcionam sem internet. Faça um backup regularmente para não perder dados se o tablet quebrar ou for trocado.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <TouchButton variant="primary" icon={Download} onClick={criarBackup} loading={processando}>
            Criar backup agora
          </TouchButton>
          <TouchButton variant="outline" icon={Upload} onClick={() => inputRef.current?.click()} disabled={processando}>
            Restaurar um backup
          </TouchButton>
        </div>
        <input ref={inputRef} type="file" accept="application/json,.json" onChange={restaurarBackup} className="hidden" />
        {mensagem && <p className="mt-4 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">{mensagem}</p>}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex items-center gap-3">
        <HardDrive className="w-5 h-5 text-pilates-600 shrink-0" />
        <div>
          <h3 className="font-bold text-slate-900">Modo offline ativo</h3>
          <p className="text-sm text-slate-500">Nenhum servidor precisa estar ligado para usar o aplicativo.</p>
        </div>
      </section>
    </div>
  );
}
