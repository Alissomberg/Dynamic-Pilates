# Zello

Aplicativo Android offline-first para gestão de estúdios. Alunos, horários, presenças, planos, pagamentos e tokens ficam no SQLite do próprio dispositivo. O aplicativo não depende de servidor para abrir, autenticar ou operar.

## Desenvolvimento

Requisitos: Node.js `24.15.0` e npm.

```powershell
npm install --prefix client
npm run client
```

Acesse `http://localhost:3000`.

## Token de teste

Em uma instalação nova, use este token local na tela de login:

```powershell
zello-demo-2026
```

Para criar tokens adicionais, abra **Ajustes > Tokens locais**, informe o nome do usuário e copie o token exibido. O valor completo aparece somente uma vez e fica validado pelo SQLite local.

## Android

```powershell
npm run android:sync
npm run android:open
```

Com o keystore de produção criado, o APK assinado também pode ser gerado pelo terminal do Windows:

```powershell
npm run android:release
```

Esse comando usa o JDK 17/21, solicita as senhas do keystore sem gravá-las no projeto e calcula o SHA-256 do APK ao final. O arquivo é criado em `client/android/app/build/outputs/apk/release/app-release.apk`.

O `applicationId` anterior foi preservado para que o Zello possa atualizar a instalação existente. A versão atual é `1.2.0` (`versionCode 3`).

O servidor legado permanece no repositório para uma futura retomada, mas não é iniciado nem consultado pelo aplicativo atual.

Para iniciar o sistema no computador, siga [COMO-RODAR-LOCAL.md](COMO-RODAR-LOCAL.md).

Para gerar e compartilhar um APK assinado, siga [INSTRUCOES-APK-COMPARTILHAVEL.md](INSTRUCOES-APK-COMPARTILHAVEL.md).
