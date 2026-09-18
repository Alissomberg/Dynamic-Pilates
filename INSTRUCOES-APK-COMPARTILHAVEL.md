# Instruções para criar e compartilhar o APK do Zello

Este procedimento gera um APK de produção assinado, pronto para ser enviado ao cliente por um link de download ou por um canal de compartilhamento.

## 1. Pré-requisitos

Instale e configure:

- Android Studio;
- Android SDK compatível com o projeto;
- JDK 17 ou 21;
- Node.js `24.15.0` e npm.

O Gradle deste projeto não deve ser executado com o Java 25 que acompanha algumas versões do Android Studio. Confirme no PowerShell:

```powershell
java -version
```

## 2. Configurar a API de produção

Antes de compilar o APK, crie `client/.env.production` a partir de `client/.env.example`:

```env
VITE_CLOUD_API_URL=https://api.seu-dominio.com/api/v1
```

Use uma URL HTTPS real e acessível pelo celular. Sem essa variável, o APK abre, mas não consegue validar tokens, enviar backups ou consultar atualizações fora do ambiente local.

O servidor também precisa estar publicado com `server/.env` configurado, banco persistente e armazenamento persistente para os backups e releases.

## 3. Conferir a versão

Antes de cada entrega, atualize a versão em:

- `client/src/services/cloudApi.js`: `APP_VERSION` e `APP_VERSION_CODE`;
- `client/android/app/build.gradle`: `versionName` e `versionCode`.

O `versionCode` deve sempre aumentar. Exemplo:

```text
APP_VERSION: 1.2.0
APP_VERSION_CODE: 3
versionName: "1.2.0"
versionCode: 3
```

Não altere `applicationId "com.dynamicpilates.app"` depois que o APK for entregue. Alterar esse valor faz o Android tratar a versão como outro aplicativo.

## 4. Preparar o projeto

Na raiz do projeto:

```powershell
npm install
npm install --prefix client
npm install --prefix server
npm run build
npm run android:sync
```

Para fazer o build pelo terminal do Windows, depois de criar o keystore, use:

```powershell
npm run android:release
```

O script usa o JDK embutido no Android Studio quando `JAVA_HOME` não está definido,
desde que ele seja JDK 17 ou 21. Ele solicita as senhas apenas durante o processo e
não grava essas senhas em arquivos.

## 5. Keystore de produção

Use sempre o mesmo arquivo:

```text
C:\Users\fabio\Documents\Dynamic Pylates\private\dynamic-pilates-release.jks
```

Configuração recomendada:

```text
Alias: dynamic-pilates
Validity: 30 anos
```

Use uma senha forte e, se desejar, a mesma senha para o keystore e para a chave. Guarde o arquivo `.jks` e a senha em dois locais seguros, incluindo um gerenciador de senhas. Nunca faça commit deles no GitHub.

Não use validade menor que um ano para o certificado. A validade do certificado não funciona como validade comercial do aplicativo: quando ela termina, futuras atualizações podem deixar de instalar. Para controlar assinaturas, planos ou períodos de uso, use a expiração do token no servidor.

## 6. Gerar o APK assinado no Android Studio

1. Abra o Android Studio.
2. Selecione **Open** e abra:

   ```text
   C:\Users\fabio\Documents\Dynamic Pylates\client\android
   ```

3. Aguarde a sincronização do Gradle.
4. No menu, escolha **Build > Generate Signed Bundle / APK**.
5. Selecione **APK** e clique em **Next**.
6. Selecione o módulo `app`.
7. Informe:

   ```text
   Key store path: C:\Users\fabio\Documents\Dynamic Pylates\private\dynamic-pilates-release.jks
   Key store password: senha do keystore
   Key alias: dynamic-pilates
   Key password: senha da chave
   ```

8. Clique em **Next**.
9. Em **Build Variants**, escolha `release`.
10. Marque **V1** e **V2** se as duas opções aparecerem. A assinatura V2 é a principal para aparelhos atuais; V1 ajuda na compatibilidade com Android mais antigo.
11. Escolha a pasta de destino.
12. Clique em **Create** ou **Finish**.

O arquivo será criado em:

```text
C:\Users\fabio\Documents\Dynamic Pylates\client\android\app\build\outputs\apk\release\app-release.apk
```

O caminho mostrado pelo Android Studio após o build é a referência definitiva caso ele tenha sido alterado.

## 7. Testar antes de compartilhar

Em um aparelho de teste:

1. Desinstale versões de teste assinadas com outra chave, se necessário.
2. Instale o `app-release.apk`.
3. Abra o Zello.
4. Faça login com um token de teste.
5. Confirme que o dashboard abre.
6. Em **Ajustes**, teste **Enviar backup agora**.
7. Teste o botão do WhatsApp.
8. Verifique se a versão aparece corretamente.

Se o APK já instalado foi assinado com uma chave diferente, o Android recusará a atualização. Nesse caso, a instalação antiga precisa ser removida — isso pode apagar os dados locais — ou o APK precisa ser assinado com a chave original.

## 8. Conferir o arquivo e o hash

Depois de gerar o APK:

```powershell
$apk = "C:\Users\fabio\Documents\Dynamic Pylates\client\android\app\build\outputs\apk\release\app-release.apk"
Get-Item -LiteralPath $apk | Select-Object FullName,Length,LastWriteTime
Get-FileHash -Algorithm SHA256 -LiteralPath $apk
```

Envie o hash SHA-256 junto do link para que o destinatário possa confirmar que baixou o arquivo correto.

## 9. Compartilhar

Prefira um link HTTPS com validade controlada, hospedado no servidor de releases do Zello ou em um armazenamento confiável. Também é possível enviar o APK diretamente por um canal que aceite arquivos, mas o link com hash facilita a distribuição e o suporte.

Ao publicar uma nova versão pela API do Zello:

```powershell
npm run release:publish -- --apk caminho\app-release.apk --version 1.2.0 --version-code 3 --notes "Correções e melhorias"
```

O aplicativo autenticado avisará o usuário quando encontrar um `versionCode` maior.

## 10. Checklist de cada entrega

- [ ] API HTTPS de produção configurada em `client/.env.production`;
- [ ] servidor online e `/api/health` respondendo;
- [ ] `versionCode` incrementado;
- [ ] mesmo `applicationId`;
- [ ] mesmo keystore e alias;
- [ ] build `release` assinado;
- [ ] instalação testada em um aparelho limpo;
- [ ] login, backup e WhatsApp testados;
- [ ] SHA-256 calculado;
- [ ] APK e keystore mantidos em locais seguros.
