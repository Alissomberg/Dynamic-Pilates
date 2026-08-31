# Dynamic Pilates — Sistema de Gestão do Estúdio

Sistema web projetado sob medida para o estúdio **Dynamic Pilates** (Dr. João), com foco prioritário em uso em **Tablets**, operações ágeis em 1 a 2 toques e automação total de cálculos financeiros e controle de frequência.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* Node.js 20+ instalado.

### 1. Iniciar o Servidor (Backend Fastify)
```bash
npm run server
```
A API REST estará disponível em `http://localhost:3001`.

### 2. Iniciar o Frontend (React + Vite)
Em outro terminal:
```bash
npm run client
```
A interface web estará disponível em `http://localhost:3000`.

### 3. Rodar os Testes Automatizados
```bash
node server/test/api.test.js
```

---

## 🛠️ Stack Tecnológica (JavaScript Puro)

* **Frontend:** React 18, Vite, React Router 6, TanStack Query v5, Tailwind CSS, Lucide Icons.
* **Backend:** Node.js, Fastify 4, `@fastify/cors`, `@fastify/helmet`.
* **Banco de Dados:** SQLite Relacional Nativo (zero dependências binárias) com DDL compatível com PostgreSQL.
* **Motor de Regras:** `billingEngine.js` desacoplado com suporte a Cenário A e Cenário B.
