import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';
import App from './App.jsx';
import './index.css';

async function startApp() {
  if (Capacitor.getPlatform() === 'web') {
    defineJeepSqlite(window);
    await customElements.whenDefined('jeep-sqlite');
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

startApp().catch((error) => {
  console.error('[Zello] Falha ao iniciar:', error);
  document.getElementById('root').innerHTML = `
    <main style="font-family: system-ui; padding: 32px; max-width: 560px; margin: auto">
      <h1>Não foi possível abrir o aplicativo</h1>
      <p>Feche e abra novamente. Se o problema continuar, procure o suporte sem apagar os dados do aplicativo.</p>
    </main>
  `;
});
