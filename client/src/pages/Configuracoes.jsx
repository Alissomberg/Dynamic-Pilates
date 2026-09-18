import React, { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  BadgeCheck,
  Check,
  Copy,
  Download,
  HardDrive,
  KeyRound,
  LogOut,
  MessageCircle,
  Save,
  Settings,
  Upload
} from 'lucide-react';
import { api } from '../services/api.js';
import { createLocalToken, createLocalUser, listLocalUsers } from '../services/localAuth.js';
import { TouchButton } from '../components/TouchButton.jsx';

const SUPPORT_PHONE = '5581920025567';
const APP_VERSION = '1.2.0';

function backupFileName() {
  return `zello-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export function Configuracoes({ auth, onLogout }) {
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState('');
  const [createdToken, setCreatedToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const account = auth.account;
  const canManageUsers = account.role === 'admin' || account.role === 'manager';
  const isAdmin = account.role === 'admin';

  useEffect(() => {
    if (!canManageUsers) return;
    listLocalUsers(account).then((items) => {
      setUsers(items);
      if (!selectedUserId && items[0]) setSelectedUserId(String(items[0].id));
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
    setProcessing('token');
    setMessage('');
    try {
      await createLocalUser(account, { username: newUsername, displayName: newUserName, password: newUserPassword });
      setNewUsername('');
      setNewUserName('');
      setNewUserPassword('');
      setUsers(await listLocalUsers(account));
      setMessage('Usuário local criado. Entregue a senha com segurança.');
    } catch (error) {
      setMessage(`Não foi possível criar o usuário: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  const registerToken = async () => {
    setProcessing('token');
    setMessage('');
    try {
      const result = await createLocalToken(account, Number(selectedUserId));
      setCreatedToken(result.token);
      setMessage('Token local criado. Ele será exibido somente agora; copie e guarde com segurança.');
    } catch (error) {
      setMessage(`Não foi possível criar o token: ${error.message}`);
    } finally {
      setProcessing('');
    }
  };

  const copyToken = async () => {
    if (!createdToken) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(createdToken);
    } else {
      const helper = document.createElement('textarea');
      helper.value = createdToken;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-pilates-600" /> Ajustes
        </h2>
        <p className="text-sm text-slate-500">Dados, tokens e cópias de segurança locais.</p>
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
        <p className="text-xs text-slate-500 mb-3">Acesso atual: <span className="font-semibold text-slate-800">{account.name}</span> · perfil <span className="font-semibold">{account.role}</span>{account.role === 'manager' ? ` · limite: ${account.maxUsers} usuários` : ''}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} placeholder="Usuário (ex.: joao)" className="min-h-[50px] rounded-xl border border-slate-300 px-4 outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100" />
          <input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Nome completo" className="min-h-[50px] rounded-xl border border-slate-300 px-4 outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100" />
          <input type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} placeholder="Senha (mín. 6)" className="min-h-[50px] rounded-xl border border-slate-300 px-4 outline-none focus:border-pilates-600 focus:ring-2 focus:ring-pilates-100" />
        </div>
        <TouchButton icon={KeyRound} onClick={registerUser} loading={processing === 'token'} disabled={Boolean(processing)} className="w-full mt-3">Cadastrar usuário</TouchButton>
        <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">Usuários cadastrados</div>
          {users.map((user) => <div key={user.id} className="px-3 py-2 border-t border-slate-100 text-sm flex flex-wrap gap-x-3 gap-y-1"><span className="font-semibold">{user.display_name}</span><span className="text-slate-500">@{user.username}</span><span className="text-slate-500">{user.role}</span><span className="text-slate-500">tokens: {user.token_count}</span></div>)}
        </div>
        {isAdmin && <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-800 mb-2">Registrar token para um usuário</p>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="min-h-[50px] rounded-xl border border-slate-300 px-4 bg-white">
              {users.map((user) => <option key={user.id} value={user.id}>{user.display_name} (@{user.username})</option>)}
            </select>
            <TouchButton icon={KeyRound} onClick={registerToken} loading={processing === 'token'} disabled={Boolean(processing) || !selectedUserId}>Criar token</TouchButton>
          </div>
        </div>}
        {createdToken && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900 mb-2">Token criado — copie agora:</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 min-w-0 break-all rounded-lg bg-white border border-amber-200 px-3 py-2 text-sm text-slate-800">{createdToken}</code>
              <button type="button" onClick={copyToken} className="shrink-0 rounded-lg border border-amber-300 p-2 text-amber-800 hover:bg-amber-100" aria-label="Copiar token">
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
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
