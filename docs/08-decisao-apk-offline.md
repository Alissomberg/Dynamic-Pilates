# Decisão de arquitetura: APK offline-first

## Status

Aprovada em 10 de setembro de 2026.

## Contexto

O sistema será usado principalmente em um tablet Android por uma pessoa não técnica. O cliente rejeitou outros produtos por excesso de complexidade. Dados de alunos, frequência, contratos e pagamentos precisam continuar disponíveis sem rede.

O MVP original usa um frontend React conectado a um servidor Fastify e a um SQLite localizado no computador. Essa arquitetura depende do servidor e da rede local e, portanto, não atende ao requisito offline do tablet.

## Decisão

O frontend React/JavaScript será empacotado com Capacitor como APK Android. As operações e a autenticação usarão SQLite no próprio dispositivo. O servidor Node permanece como referência para uma futura fase, mas não participa do funcionamento atual.

## Princípios de interface

1. Mostrar primeiro a tarefa que o usuário veio realizar.
2. Usar termos do estúdio, evitando vocabulário técnico.
3. Não expor configurações avançadas no fluxo diário.
4. Preferir seleção visual a digitação sempre que houver opções frequentes.
5. Permitir valores e durações personalizados sem tornar o formulário principal complexo.
6. Confirmar ações destrutivas e financeiras.
7. Informar claramente quando um dado foi salvo no tablet.
8. Manter alvos de toque grandes e legíveis.

## Consequências

### Positivas

- funcionamento em modo avião;
- preservação da interface existente;
- ausência de instalação de Node no tablet;
- banco relacional local;
- possibilidade de backup por arquivo;
- cópia e restauração por arquivo local sem depender da internet.

### Custos

- manutenção de um projeto Android e de uma chave de assinatura;
- dependência do Capacitor e da integração SQLite;
- necessidade de migrações do banco entre versões;
- preparação de JDK e Android SDK na máquina que gera o APK.

## Fora do escopo inicial

- sincronização entre vários aparelhos;
- painel remoto;
- funcionamento simultâneo em tablet e computador;
- publicação automática na Play Store;
- sincronização contínua entre aparelhos.
