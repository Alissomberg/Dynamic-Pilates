# Frontend e experiência de uso

## Estrutura

React 18, JavaScript/JSX, TanStack Query, Tailwind e Lucide formam a interface. Capacitor empacota o build Vite no APK.

| Aba | Função principal |
|---|---|
| Início | visão rápida, chamada do dia e alertas |
| Presença | chamada completa por data, manhã e tarde |
| Alunos | busca, cadastro, ficha, horários e planos |
| Financeiro | cobranças, recebimentos e histórico |
| Ajustes | backup, restauração e status offline |

## Princípios de simplicidade

- ações diárias ficam nas quatro primeiras abas;
- backup e opções ocasionais ficam em Ajustes;
- botões têm área ampla para toque;
- termos técnicos de infraestrutura não aparecem para o cliente;
- opções Mensal e Trimestral são visuais;
- “Outro período” revela campos extras somente quando necessário;
- cada dia escolhido mostra seu próprio campo de horário;
- feedback de presença/falta e pagamento é imediato.

## Dados e cache

`client/src/services/api.js` mantém a interface de serviços, mas não faz `fetch`. Ele executa regras e consultas no SQLite. TanStack Query organiza cache e invalidação após cadastros, pagamentos, remarcações e presença.

## Offline

- assets são empacotados no APK;
- a fonte externa foi removida e há fallback de sistema;
- SQLite é local;
- nenhuma tela principal depende do Fastify;
- WhatsApp é um atalho opcional externo;
- a interface informa “Dados salvos neste tablet”.

## Cadastro de aluno

O formulário oferece opções salvas de plano, valor rápido ou livre, vencimento e botões de dias. Cada dia ativo abre seu próprio seletor de horário. O usuário pode cadastrar opções de plano fora do formulário principal pelo botão **Planos**.

## Acessibilidade e responsividade

O layout foi validado em viewport de tablet e mobile. Controles são HTML nativos, os ícones principais têm texto, modais fecham por botão/fundo/Escape e a navegação permanece fixa. Melhorias futuras recomendadas: focus trap completo nos modais, regiões `aria-live` e auditoria formal de contraste.

## Android

`client/capacitor.config.json` define o pacote `com.dynamicpilates.app` e o nome Dynamic Pilates. O projeto gerado suporta Android a partir do SDK 24 e compila contra SDK 36.

