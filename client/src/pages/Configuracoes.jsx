import React, { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  BadgeCheck,
  Database,
  Download,
  HardDrive,
  KeyRound,
  LogOut,
  MessageCircle,
  RefreshCcw,
  Save,
  Settings,
  Trash2,
  Upload
} from 'lucide-react';
import { api } from '../services/api.js';
import { createLocalUser, listLocalUsers } from '../services/localAuth.js';
import { TouchButton } from '../components/TouchButton.jsx';

const SUPPORT_PHONE = '5581920025567';
const APP_VERSION = '1.2.0';

function backupFileName() {
  return `zello-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'SuperUser';
  return 'Afiliado';
}

export function Configuracoes({ auth, onLogout }) {
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState('');
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const account = auth.account;
  const canManageUsers = account.role === 'admin' || account.role === 'manager';
  const isAdmin = account.role === 'admin';

  useEffect(() => {
    if (!canManageUsers) return;
    listLocalUsers(account).then((items) => {
      setUsers(items);
    }).catch((error) => setMessage(error.message));
  }, [account.id, account.role]);

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

  const restoreLocalCopy = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!window.confirm('A restauração substituirá os dados atuais deste aparelho. Deseja continuar?')) return;
    setProcessing('restore');
    setMessage('');
    try {
      await api.importBackup(JSON.parse(await file.text()));
      setMessage('Dados restaurados. O Zello será recarregado.');
      window.setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setMessage(`Não foi possível restaurar: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  const contactSupport = async () => {
    const text = encodeURIComponent(`Olá! Preciso de ajuda com o Zello. Meu ID local é ${account.id}.`);
    await Browser.open({ url: `https://wa.me/${SUPPORT_PHONE}?text=${text}` });
  };

  const registerUser = async () => {
    setProcessing('user');
    setMessage('');
    try {
      await createLocalUser(account, { username: newUsername, displayName: newUserName, pin: newUserPin });
      setNewUsername('');
      setNewUserName('');
      setNewUserPin('');
      setUsers(await listLocalUsers(account));
      setMessage(`${isAdmin ? 'SuperUser' : 'Afiliado'} criado. Entregue o PIN com segurança.`);
    } catch (error) {
      setMessage(`Não foi possível criar o usuário: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  const resetData = async () => {
    if (!window.confirm('Isso apagará alunos, contratos, cobranças, pagamentos e presenças. Os usuários e PINs serão mantidos. Deseja continuar?')) return;
    setProcessing('reset');
    setMessage('');
    try {
      await api.resetOperationalData();
      setMessage('Dados operacionais zerados. Recarregando o Zello…');
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(`Não foi possível zerar os dados: ${error.message}`);
      setProcessing('');
    }
  };

  const installMockData = async () => {
    if (!window.confirm('Os dados atuais serão substituídos pelos dados fictícios de demonstração. Deseja continuar?')) return;
    setProcessing('mock');
    setMessage('');
    try {
      await api.loadMockData();
      setMessage('Dados de demonstração carregados. Recarregando o Zello…');
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(`Não foi possível carregar os dados de demonstração: ${error.message}`);
      setProcessing('');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-pilates-600" /> Ajustes
        </h2>
        <p className="text-sm text-slate-500">Dados, usuários, PINs e cópias de segurança locais.</p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><HardDrive className="w-5 h-5" /></div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">Backup local</h3>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-full px-2 py-1"><BadgeCheck className="w-3.5 h-3.5" /> Sem servidor</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">O backup é exportado para um arquivo no dispositivo. Nenhum dado é enviado automaticamente.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TouchButton variant="outline" icon={Download} onClick={saveLocalCopy} loading={processing === 'local'} disabled={Boolean(processing)}>Salvar cópia local</TouchButton>
          <label className="inline-flex items-center justify-center gap-2 min-h-[50px] rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
            <Upload className="w-5 h-5" /> Restaurar arquivo local
            <input type="file" accept="application/json,.json" onChange={restoreLocalCopy} disabled={Boolean(processing)} className="sr-only" />
          </label>
        </div>
      </section>

      {canManageUsers && <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></div>
          <div><h3 className="font-bold text-slate-900">Administração local</h3><p className="text-sm text-slate-500 mt-1">Usuários e permissões ficam neste SQLite. Não existe consulta online.</p></div>
        </div>
        <p className="text-xs text-slate-500 mb-3">Acesso atual: <span className="font-semibold text-slate-800">{account.name}</span> · perfil <span className="font-semibold">{roleLabel(account.role)}</span>{account.role === 'manager' ? ` · limite: ${account.maxUsers} afiliados` : ''}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} placeholder="Usuário (ex.: joao)" className="min-h-[50px] rounded-xl border border-slate-300 px-4 outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100" />
          <input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Nome completo" className="min-h-[50px] rounded-xl border border-slate-300 px-4 outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100" />
          <input type="password" inputMode="numeric" maxLength={6} value={newUserPin} onChange={(event) => setNewUserPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="PIN de 6 números" className="min-h-[50px] rounded-xl border border-slate-300 px-4 outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100" />
        </div>
        <TouchButton icon={KeyRound} onClick={registerUser} loading={processing === 'user'} disabled={Boolean(processing)} className="w-full mt-3">Cadastrar {isAdmin ? 'SuperUser' : 'afiliado'}</TouchButton>
        <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">Usuários cadastrados</div>
          {users.map((user) => <div key={user.id} className="px-3 py-2 border-t border-slate-100 text-sm flex flex-wrap gap-x-3 gap-y-1"><span className="font-semibold">{user.display_name}</span><span className="text-slate-500">@{user.username}</span><span className="text-slate-500">{roleLabel(user.role)}</span>{user.creator_username && <span className="text-slate-400">criado por @{user.creator_username}</span>}</div>)}
        </div>
      </section>}

      {isAdmin && <section className="bg-white rounded-2xl border border-rose-200 shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"><Database className="w-5 h-5" /></div>
          <div><h3 className="font-bold text-slate-900">Controle dos dados</h3><p className="text-sm text-slate-500 mt-1">Somente o Admin pode zerar a base ou substituir os dados atuais pela demonstração.</p></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TouchButton variant="outline" icon={RefreshCcw} onClick={installMockData} loading={processing === 'mock'} disabled={Boolean(processing)}>Carregar dados mock</TouchButton>
          <TouchButton variant="danger" icon={Trash2} onClick={resetData} loading={processing === 'reset'} disabled={Boolean(processing)}>Zerar dados</TouchButton>
        </div>
        <p className="text-xs text-slate-500 mt-3">Essas ações não apagam Admin, SuperUsers, afiliados nem seus PINs.</p>
      </section>}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-5 h-5 text-pilates-600 shrink-0" />
          <div className="flex-1"><h3 className="font-bold text-slate-900">Suporte</h3><p className="text-sm text-slate-500">O WhatsApp é opcional e só abre quando você tocar no botão.</p></div>
        </div>
        <TouchButton variant="success" icon={MessageCircle} onClick={contactSupport} className="w-full">Falar no WhatsApp: (81) 92002-5567</TouchButton>
      </section>

      {message && <p className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl p-3">{message}</p>}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Save className="w-5 h-5 text-pilates-600 shrink-0" />
        <div className="flex-1"><h3 className="font-bold text-slate-900">{account.name}</h3><p className="text-sm text-slate-500">Zello {APP_VERSION} · dados salvos somente neste dispositivo.</p></div>
        <TouchButton variant="ghost" size="sm" icon={LogOut} onClick={onLogout}>Sair</TouchButton>
      </section>
    </div>
  );
}
