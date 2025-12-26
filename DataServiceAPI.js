/**
 * DataService (Versão API MySQL)
 * Substitua o DataService original no index.html por este.
 */
const DataService = {
  API_URL: 'http://localhost:3000/api/escala',

  // Carrega dados do servidor
  async getInitialData() {
    try {
      const response = await fetch(this.API_URL);
      if (!response.ok) throw new Error('Falha na rede');
      
      const data = await response.json();
      
      // Se a base de dados estiver vazia, gera localmente e envia para o servidor
      if (data.length === 0) {
        const newData = this.generate2026();
        await this.resetDataOnServer(newData);
        return newData;
      }
      
      // Normalizar formato de data se necessário
      return data.map(item => ({
          ...item,
          // Garante YYYY-MM-DD
          date: item.data.split('T')[0], // Mapeia 'data' do banco para 'date' do app
          // O backend retorna 'tipo', o app usa 'type'? Não, no código atual usamos 'type' no objeto mas 'tipo' no banco.
          // Vamos uniformizar para o que o app espera.
          // Se o app espera { date, name, type }, e o banco devolve { data, nome, tipo }
          name: item.nome,
          type: item.tipo
      }));
    } catch (error) {
      console.error("Erro ao conectar na API:", error);
      Utils.showToast("Erro ao conectar no servidor.", "error");
      // Fallback para geração local (sem salvar) para não quebrar a UI
      return this.generate2026();
    }
  },

  // Salva alterações
  async save(fullDataList) {
    // Para simplificar a migração e garantir consistência com o "Troca de Plantão"
    // vamos usar a rota de RESET que subscreve tudo. 
    // Em produção com muitos dados, o ideal seria atualizar apenas o ID alterado.
    
    // Converter formato do App para formato do Banco
    const dbPayload = fullDataList.map(item => ({
        data: item.date,
        nome: item.name,
        tipo: item.type
    }));

    try {
        const response = await fetch(`${this.API_URL}/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbPayload)
        });
        if(!response.ok) throw new Error('Erro ao salvar');
    } catch (e) {
        console.error("Erro ao salvar:", e);
        Utils.showToast("Erro ao salvar no banco de dados.", "error");
    }
  },
  
  // Função auxiliar para enviar tudo (usada na inicialização)
  async resetDataOnServer(data) {
      // Converter formato
      const dbPayload = data.map(item => ({
        data: item.date,
        nome: item.name,
        tipo: item.type
      }));

      return fetch(`${this.API_URL}/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbPayload)
      });
  },

  // Gera a escala base (igual ao original)
  generate2026() {
    const data = [];
    const staff = ['Jessé', 'Júnior', 'Jefferson'];
    let staffIdx = 0;
    let date = new Date(2026, 0, 1);
    
    while (date.getDay() !== 6) date.setDate(date.getDate() + 1);

    while (date.getFullYear() === 2026) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      
      data.push({
        date: `${y}-${m}-${d}`,
        name: staff[staffIdx],
        type: 'Sábado (50%)'
      });

      date.setDate(date.getDate() + 7);
      staffIdx = (staffIdx + 1) % staff.length;
    }
    return data;
  }
};