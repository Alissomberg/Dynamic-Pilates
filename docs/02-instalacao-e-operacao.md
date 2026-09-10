# Instalação, execução e operação

## Arquitetura vigente

O aplicativo é local-first. O frontend React acessa diretamente o SQLite do dispositivo. O servidor em `server/` não deve ser iniciado para a operação normal.

## Desenvolvimento no navegador

Use Node.js `24.15.0`, registrado em `.node-version`.

```powershell
npm install --prefix client
npm run dev
```

Abra `http://localhost:3000`. No navegador, o SQLite é persistido em IndexedDB pelo componente `jeep-sqlite`; no APK, o plugin usa SQLite nativo.

## Compilar e sincronizar o Android

Além do Node, a máquina de build precisa de:

- Android Studio e Android SDK 36;
- JDK 17 (exigido pelo Android Gradle Plugin 8.13 do projeto);
- variável `JAVA_HOME` configurada quando a compilação for feita no terminal.

Comandos:

```powershell
npm run android:sync
npm run android:open
```

No Android Studio, aguarde a sincronização do Gradle e use **Build > Build APK(s)**. Para depuração por terminal, dentro de `client/android/`:

```powershell
.\gradlew.bat assembleDebug
```

O APK de depuração será criado em `client/android/app/build/outputs/apk/debug/app-debug.apk`.

## Rotina após alterar a interface

```powershell
npm run android:sync
```

Esse comando compila a interface e sincroniza o Android.

## Backup no tablet

Na aba **Ajustes**:

1. toque em **Criar backup agora**;
2. salve ou compartilhe o arquivo JSON para um local fora do tablet;
3. para recuperar dados, toque em **Restaurar um backup** e selecione o arquivo.

A restauração substitui o banco atual e exige confirmação. Faça backup antes de atualizar ou reinstalar o APK.

## Operação offline

As funções principais não fazem requisições HTTP. Abrir WhatsApp é uma conveniência externa e exige o aplicativo correspondente e conexão, sem interferir no cadastro, chamada ou financeiro.

## Servidor legado

O código Fastify permanece em `server/` apenas para consulta e eventual migração. Seus comandos estão marcados como legados:

```powershell
npm run legacy:server
npm run legacy:server:dev
npm run legacy:seed
```

Ele ainda contém os problemas históricos descritos em [Diagnóstico e roadmap](./07-diagnostico-e-roadmap.md) e não é requisito do APK.
