import React, { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  BadgeCheck,
  CloudUpload,
  Database,
  Download,
  HardDrive,
  LogOut,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Settings,
  WifiOff
} from 'lucide-react';
import { api } from '../services/api.js';
import { APP_VERSION, APP_VERSION_CODE, cloudApi } from '../services/cloudApi.js';
import { TouchButton } from '../components/TouchButton.jsx';

const SUPPORT_PHONE = '5581920025567';

function formatDate(value) {
  if (!value) return 'Nenhum backup enviado';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function backupFileName() {
  return `zello-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export function Configuracoes({ auth, offlineSession, onLogout }) {
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState('');
  const [restoreCode, setRestoreCode] = useState('');
  const [latestBackup, setLatestBackup] = useState(null);
  const [release, setRelease] = useState(null);

  const token = auth.token;
  const account = auth.account;
  const premium = account.support?.active && account.support?.tier === 'premium';

  useEffect(() => {
    if (offlineSession) return;
    Promise.allSettled([
      cloudApi.getBackupStatus(token).then(({ latest }) => setLatestBackup(latest)),
      cloudApi.getLatestUpdate(token).then(({ release: latest }) => setRelease(latest))
    ]);
  }, [offlineSession, token]);

  const uploadBackup = async () => {
    setProcessing('upload');
    setMessage('');
    try {
      const backup = await api.exportBackup();
      const result = await cloudApi.uploadBackup(token, backup);
      setLatestBackup(result.backup);
      setMessage('Backup enviado com segurança para o servidor.');
    } catch (error) {
      setMessage(`Não foi possível enviar o backup: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  const saveLocalCopy = async () => {
    setProcessing('local');
    setMessage('');
    try {
      const backup = await api.exportBackup();
      const content = JSON.stringify(backup, null, 2);
      const name = backupFileName();
      if (Capacitor.isNativePlatform()) {
        const file = await Filesystem.writeFile({
          path: name,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Cópia de segurança do Zello',
          text: 'Guarde este arquivo em um local seguro.',
          url: file.uri,
          dialogTitle: 'Salvar cópia do backup'
        });
      } else {
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
      }
      setMessage('Cópia local criada. Guarde o arquivo fora do tablet.');
    } catch (error) {
      setMessage(`Não foi possível criar a cópia: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  const contactSupport = async () => {
    const text = encodeURIComponent(`Olá! Preciso restaurar meu backup do Zello. Meu ID de suporte é ${account.id}.`);
    await Browser.open({ url: `https://wa.me/${SUPPORT_PHONE}?text=${text}` });
  };

  const restoreFromServer = async () => {
    if (!restoreCode.trim()) {
      setMessage('Informe o código de restauração enviado pelo suporte.');
      return;
    }
    if (!window.confirm('A restauração substituirá todos os dados atuais deste aparelho. Deseja continuar?')) return;
    setProcessing('restore');
    setMessage('');
    try {
      const { backup } = await cloudApi.restoreBackup(token, restoreCode);
      await api.importBackup(backup);
      setMessage('Dados restaurados. O Zello será recarregado.');
      window.setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setMessage(`Não foi possível restaurar: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  const checkUpdate = async () => {
    setProcessing('update');
    setMessage('');
    try {
      const { release: latest } = await cloudApi.getLatestUpdate(token);
      setRelease(latest);
      setMessage(
        latest && Number(latest.versionCode) > APP_VERSION_CODE
          ? `A versão ${latest.version} está disponível.`
          : 'Você já está usando a versão mais recente.'
      );
    } catch (error) {
      setMessage(`Não foi possível verificar atualizações: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-pilates-600" /> Ajustes
        </h2>
        <p className="text-sm text-slate-500">Backup, suporte, atualizações e acesso.</p>
      </div>

      {offlineSession && (
        <div className="flex gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4">
          <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">Você está usando o Zello offline. Os dados locais continuam funcionando, mas backup e atualização precisam de internet.</p>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><CloudUpload className="w-5 h-5" /></div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">Backup seguro</h3>
              {premium && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-full px-2 py-1"><BadgeCheck className="w-3.5 h-3.5" /> {account.support.complimentary ? 'Premium gratuito' : 'Premium'}</span>}
            </div>
            <p className="text-sm text-slate-500 mt-1">Envie alunos, pagamentos e presenças para o servidor. Por enquanto, o suporte premium não tem cobrança.</p>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mb-4 text-sm text-slate-600">Último envio: <strong className="text-slate-800">{formatDate(latestBackup?.createdAt)}</strong></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TouchButton icon={CloudUpload} onClick={uploadBackup} loading={processing === 'upload'} disabled={!premium || offlineSession || Boolean(processing)}>Enviar backup agora</TouchButton>
          <TouchButton variant="outline" icon={Download} onClick={saveLocalCopy} loading={processing === 'local'} disabled={Boolean(processing)}>Salvar cópia local</TouchButton>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0"><RotateCcw className="w-5 h-5" /></div>
          <div><h3 className="font-bold text-slate-900">Restaurar com o suporte</h3><p className="text-sm text-slate-500 mt-1">Fale conosco no WhatsApp. A equipe confirmará sua conta e enviará um código temporário.</p></div>
        </div>
        <p className="text-xs text-slate-500 mb-3">ID de suporte: <span className="font-mono select-text">{account.id}</span></p>
        <TouchButton variant="success" icon={MessageCircle} onClick={contactSupport} className="w-full mb-4">Falar no WhatsApp: (81) 92002-5567</TouchButton>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <input value={restoreCode} onChange={(event) => setRestoreCode(event.target.value.toUpperCase())} placeholder="Código de restauração" autoCapitalize="characters" className="min-h-[50px] rounded-xl border border-slate-300 px-4 font-mono outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100" />
          <TouchButton variant="outline" icon={Database} onClick={restoreFromServer} loading={processing === 'restore'} disabled={offlineSession || Boolean(processing)}>Restaurar</TouchButton>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className="w-5 h-5 text-pilates-600 shrink-0" />
          <div className="flex-1"><h3 className="font-bold text-slate-900">Atualizações do aplicativo</h3><p className="text-sm text-slate-500">Versão instalada: {APP_VERSION}</p></div>
        </div>
        {release && Number(release.versionCode) > APP_VERSION_CODE && (
          <div className="rounded-xl border border-pilates-200 bg-pilates-50 p-4 mb-3">
            <p className="font-bold text-pilates-900">Zello {release.version} disponível</p><p className="text-sm text-pilates-800 mt-1">{release.notes}</p>
            <TouchButton icon={Download} onClick={() => Browser.open({ url: release.downloadUrl })} className="w-full mt-3">Baixar novo APK</TouchButton>
          </div>
        )}
        <TouchButton variant="outline" icon={RefreshCw} onClick={checkUpdate} loading={processing === 'update'} disabled={offlineSession || Boolean(processing)} className="w-full">Verificar atualizações</TouchButton>
      </section>

      {message && <p className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl p-3">{message}</p>}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <HardDrive className="w-5 h-5 text-pilates-600 shrink-0" />
        <div className="flex-1"><h3 className="font-bold text-slate-900">{account.name}</h3><p className="text-sm text-slate-500">Seus dados diários continuam salvos neste tablet.</p></div>
        <TouchButton variant="ghost" size="sm" icon={LogOut} onClick={onLogout}>Sair</TouchButton>
      </section>
    </div>
  );
}
