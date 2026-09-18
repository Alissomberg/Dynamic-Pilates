import { Capacitor } from '@capacitor/core';

export const APP_VERSION = '1.1.0';
export const APP_VERSION_CODE = 2;

const configuredBaseUrl = String(import.meta.env.VITE_CLOUD_API_URL || '').trim().replace(/\/$/, '');
const API_BASE_URL = configuredBaseUrl || (Capacitor.isNativePlatform() ? '' : '/api/v1');
const AUTH_KEY = 'zello.cloud.auth';
const DEVICE_KEY = 'zello.device.id';

function requireApiUrl() {
  if (!API_BASE_URL) {
    throw new Error('O endereço do servidor não foi configurado neste APK. Fale com o suporte.');
  }
}

async function request(path, { token, method = 'GET', body, timeout = 15000 } = {}) {
  requireApiUrl();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'O servidor não conseguiu concluir a solicitação.');
      error.status = response.status;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('O servidor demorou para responder. Verifique sua internet.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getCachedAuth() {
  try {
    const value = JSON.parse(localStorage.getItem(AUTH_KEY));
    return value?.token && value?.account ? value : null;
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ ...auth, validatedAt: new Date().toISOString() }));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export const cloudApi = {
  isConfigured: Boolean(API_BASE_URL),
  async validateToken(token) {
    return request('/auth/validate', { token: String(token).trim(), method: 'POST' });
  },
  async uploadBackup(token, backup) {
    return request('/backups', {
      token,
      method: 'POST',
      timeout: 45000,
      body: { backup, deviceId: getDeviceId(), appVersion: APP_VERSION }
    });
  },
  async getBackupStatus(token) {
    return request('/backups/status', { token });
  },
  async restoreBackup(token, code) {
    return request('/backups/restore', {
      token,
      method: 'POST',
      timeout: 45000,
      body: { code }
    });
  },
  async getLatestUpdate(token) {
    return request('/updates/latest', { token });
  }
};
