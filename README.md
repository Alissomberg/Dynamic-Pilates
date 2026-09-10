# Dynamic Pilates

Aplicativo Android offline-first para a rotina do estúdio Dynamic Pilates. A interface é React/JavaScript, os dados ficam em SQLite no tablet e o cliente não precisa instalar nem executar Node.js.

## Desenvolvimento

Requisitos: Node.js `24.15.0` e npm.

```powershell
npm install --prefix client
npm run dev
```

Acesse `http://localhost:3000`. O servidor antigo não é necessário.

## Android

O projeto nativo está em `client/android/`.

```powershell
npm run android:sync
npm run android:open
```

O primeiro comando compila a interface e copia tudo para o Android. O segundo abre o projeto no Android Studio, onde o APK pode ser gerado.

## Funciona sem internet

- alunos, horários, presenças, planos, cobranças e pagamentos ficam no SQLite local;
- a interface e o banco são empacotados no APK;
- a tela **Ajustes** cria e restaura backups em arquivo;
- o antigo servidor Fastify permanece em `server/` apenas como referência legada.

Leia [docs/README.md](docs/README.md) para arquitetura, operação, regras e histórico de alterações.
