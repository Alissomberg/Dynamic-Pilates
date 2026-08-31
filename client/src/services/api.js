const BASE_URL = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = 'Erro na requisição';
    try {
      const data = await response.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch (e) {
      // Ignora erro de parse
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Dashboard
  async getDashboard(data) {
    const url = data ? `${BASE_URL}/dashboard/today?data=${data}` : `${BASE_URL}/dashboard/today`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  // Alunos
  async getAlunos({ search, status } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'todos') params.append('status', status);
    const res = await fetch(`${BASE_URL}/alunos?${params.toString()}`);
    return handleResponse(res);
  },

  async getAlunoById(id) {
    const res = await fetch(`${BASE_URL}/alunos/${id}`);
    return handleResponse(res);
  },

  async getAlunoHistoricoMensal(id, mes) {
    const url = mes ? `${BASE_URL}/alunos/${id}/historico-mensal?mes=${mes}` : `${BASE_URL}/alunos/${id}/historico-mensal`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async updateAlunoHorarios(id, horarios) {
    const res = await fetch(`${BASE_URL}/alunos/${id}/horarios`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horarios })
    });
    return handleResponse(res);
  },

  async createAluno(data) {
    const res = await fetch(`${BASE_URL}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateAluno(id, data) {
    const res = await fetch(`${BASE_URL}/alunos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Presenças
  async getPresencasDia(data) {
    const url = data ? `${BASE_URL}/presencas/dia?data=${data}` : `${BASE_URL}/presencas/dia`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async checkinPresenca({ alunoId, data, horario, status }) {
    const res = await fetch(`${BASE_URL}/presencas/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alunoId, data, horario, status })
    });
    return handleResponse(res);
  },

  // Financeiro
  async getPendencias() {
    const res = await fetch(`${BASE_URL}/financeiro/pendencias`);
    return handleResponse(res);
  },

  async getHistoricoFinanceiro(limit = 50) {
    const res = await fetch(`${BASE_URL}/financeiro/historico?limit=${limit}`);
    return handleResponse(res);
  },

  async getResumoFinanceiro(mesAno) {
    const url = mesAno ? `${BASE_URL}/financeiro/resumo?mesAno=${mesAno}` : `${BASE_URL}/financeiro/resumo`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async registrarPagamento(data) {
    const res = await fetch(`${BASE_URL}/financeiro/pagamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Cenários de Demonstração
  async getScenarios() {
    const res = await fetch(`${BASE_URL}/scenarios`);
    return handleResponse(res);
  },

  async selectScenario(scenarioId, resetData = false) {
    const res = await fetch(`${BASE_URL}/scenarios/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, resetData })
    });
    return handleResponse(res);
  },

  async resetDemoData() {
    const res = await fetch(`${BASE_URL}/scenarios/reset`, {
      method: 'POST'
    });
    return handleResponse(res);
  }
};
