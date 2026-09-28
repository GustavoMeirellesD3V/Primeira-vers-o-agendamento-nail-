/**
 * data.js
 * ------------------------------------------------------------------
 * Camada de dados do sistema. Toda a aplicação (público + admin) fala
 * APENAS com o objeto `DataStore`, nunca direto com o supabaseClient.
 *
 * Isso mantém o resto do código (app.js, agendamento.js, admin.js...)
 * isolado de detalhes do banco: se um dia trocarmos de provedor, só
 * este arquivo muda.
 *
 * Backend: Supabase (Postgres + Auth), projeto cariocaeglow-nail-agenda,
 * região sa-east-1 (São Paulo). As regras de quem pode ler/escrever
 * cada tabela vivem no banco (Row Level Security), não aqui — este
 * arquivo só faz as chamadas; o Supabase que aceita ou recusa.
 * ------------------------------------------------------------------ */

function mapService(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    duracaoMin: row.duracao_min,
    preco: Number(row.preco),
    ativo: row.ativo,
    imagem: row.imagem_url || ''
  };
}

function serviceToRow(service) {
  return {
    nome: service.nome,
    descricao: service.descricao || null,
    duracao_min: service.duracaoMin,
    preco: service.preco,
    ativo: service.ativo,
    imagem_url: service.imagem || null
  };
}

function mapSettings(row) {
  if (!row) return {};
  return {
    nomeProfissional: row.nome_profissional,
    subtitulo: row.subtitulo,
    descricaoCurta: row.descricao_curta,
    sobreMim: row.sobre_mim,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    endereco: row.endereco,
    corPrimaria: row.cor_primaria,
    corSecundaria: row.cor_secundaria,
    mensagemConfirmacao: row.mensagem_confirmacao,
    antecedenciaMinimaHoras: row.antecedencia_minima_horas,
    logo: row.logo_url || '',
    foto: row.foto_url || ''
  };
}

function settingsToRow(settings) {
  return {
    id: 1,
    nome_profissional: settings.nomeProfissional,
    subtitulo: settings.subtitulo,
    descricao_curta: settings.descricaoCurta,
    sobre_mim: settings.sobreMim,
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    endereco: settings.endereco,
    cor_primaria: settings.corPrimaria,
    cor_secundaria: settings.corSecundaria,
    mensagem_confirmacao: settings.mensagemConfirmacao,
    antecedencia_minima_horas: settings.antecedenciaMinimaHoras,
    logo_url: settings.logo || null,
    foto_url: settings.foto || null,
    atualizado_em: new Date().toISOString()
  };
}

function mapHoursRows(rows) {
  const hours = {};
  (rows || []).forEach(row => {
    hours[row.dia_semana] = {
      ativo: row.ativo,
      inicio: row.inicio.slice(0, 5),
      fim: row.fim.slice(0, 5),
      intervalos: row.intervalos || []
    };
  });
  return hours;
}

function mapBlock(row) {
  return {
    id: row.id,
    data: row.data,
    diaInteiro: row.dia_inteiro,
    horarios: row.horarios || [],
    motivo: row.motivo || ''
  };
}

function mapAppointment(row) {
  return {
    id: row.id,
    servicoId: row.servico_id,
    servicoNome: row.servico_nome,
    duracaoMin: row.duracao_min,
    preco: Number(row.preco),
    data: row.data,
    horario: row.horario.slice(0, 5),
    clienteNome: row.cliente_nome,
    clienteWhatsapp: row.cliente_whatsapp,
    clienteEmail: row.cliente_email || '',
    observacao: row.observacao || '',
    status: row.status,
    criadoEm: row.criado_em
  };
}

function mapClient(row) {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    email: row.email || '',
    ultimoAgendamento: row.ultimo_agendamento,
    totalAgendamentos: row.total_agendamentos
  };
}

function lancarErro(contexto, error) {
  console.error(contexto, error);
  throw new Error(error?.message || 'Ocorreu um erro inesperado. Tente novamente.');
}

const DataStore = {
  init: async function () {
    // Nada a fazer: o schema já existe no Supabase. Mantido apenas
    // para compatibilidade com o restante do app, que chama
    // DataStore.init() antes de qualquer outra coisa.
  },

  /* ---------- Serviços ---------- */
  getServices: async function ({ apenasAtivos = false } = {}) {
    let query = supabaseClient.from('services').select('*').order('nome', { ascending: true });
    if (apenasAtivos) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (error) lancarErro('getServices', error);
    return (data || []).map(mapService);
  },

  getServiceById: async function (id) {
    const { data, error } = await supabaseClient.from('services').select('*').eq('id', id).maybeSingle();
    if (error) lancarErro('getServiceById', error);
    return mapService(data);
  },

  saveService: async function (service) {
    const row = serviceToRow(service);
    if (service.id) {
      const { data, error } = await supabaseClient.from('services').update(row).eq('id', service.id).select().single();
      if (error) lancarErro('saveService(update)', error);
      return mapService(data);
    }
    const { data, error } = await supabaseClient.from('services').insert(row).select().single();
    if (error) lancarErro('saveService(insert)', error);
    return mapService(data);
  },

  deleteService: async function (id) {
    const { error } = await supabaseClient.from('services').delete().eq('id', id);
    if (error) lancarErro('deleteService', error);
    return true;
  },

  /* ---------- Configurações ---------- */
  getSettings: async function () {
    const { data, error } = await supabaseClient.from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) lancarErro('getSettings', error);
    return mapSettings(data);
  },

  saveSettings: async function (settings) {
    const row = settingsToRow(settings);
    const { data, error } = await supabaseClient.from('settings').upsert(row).select().single();
    if (error) lancarErro('saveSettings', error);
    return mapSettings(data);
  },

  /* ---------- Horários de funcionamento ---------- */
  getHours: async function () {
    const { data, error } = await supabaseClient.from('hours').select('*');
    if (error) lancarErro('getHours', error);
    return mapHoursRows(data);
  },

  saveHours: async function (hours) {
    const rows = Object.keys(hours).map(dia => ({
      dia_semana: dia,
      ativo: hours[dia].ativo,
      inicio: hours[dia].inicio,
      fim: hours[dia].fim,
      intervalos: hours[dia].intervalos || []
    }));
    const { error } = await supabaseClient.from('hours').upsert(rows, { onConflict: 'dia_semana' });
    if (error) lancarErro('saveHours', error);
    return hours;
  },

  /* ---------- Bloqueios de data/horário ---------- */
  getBlocks: async function () {
    const { data, error } = await supabaseClient.from('blocks').select('*').order('data', { ascending: true });
    if (error) lancarErro('getBlocks', error);
    return (data || []).map(mapBlock);
  },

  addBlock: async function (block) {
    const row = {
      data: block.data,
      dia_inteiro: block.diaInteiro,
      horarios: block.horarios || [],
      motivo: block.motivo || null
    };
    const { data, error } = await supabaseClient.from('blocks').insert(row).select().single();
    if (error) lancarErro('addBlock', error);
    return mapBlock(data);
  },

  removeBlock: async function (id) {
    const { error } = await supabaseClient.from('blocks').delete().eq('id', id);
    if (error) lancarErro('removeBlock', error);
    return true;
  },

  /* ---------- Agendamentos ---------- */
  getAppointments: async function () {
    const { data, error } = await supabaseClient
      .from('appointments')
      .select('*')
      .order('data', { ascending: true })
      .order('horario', { ascending: true });
    if (error) lancarErro('getAppointments', error);
    return (data || []).map(mapAppointment);
  },

  getAppointmentsByDate: async function (dataISO) {
    const { data, error } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('data', dataISO)
      .neq('status', 'cancelado')
      .order('horario', { ascending: true });
    if (error) lancarErro('getAppointmentsByDate', error);
    return (data || []).map(mapAppointment);
  },

  /**
   * Cria um agendamento via função do banco (rpc_create_appointment),
   * que revalida o horário no servidor antes de gravar — evita que
   * duas clientes reservem o mesmo horário ao mesmo tempo.
   */
  addAppointment: async function (appointment) {
    const { data, error } = await supabaseClient.rpc('rpc_create_appointment', {
      p_servico_id: appointment.servicoId,
      p_data: appointment.data,
      p_horario: appointment.horario,
      p_cliente_nome: appointment.clienteNome,
      p_cliente_whatsapp: appointment.clienteWhatsapp,
      p_cliente_email: appointment.clienteEmail || null,
      p_observacao: appointment.observacao || null
    });
    if (error) lancarErro('addAppointment', error);
    return { ...appointment, id: data };
  },

  updateAppointment: async function (id, changes) {
    const row = {};
    if (changes.status !== undefined) row.status = changes.status;
    if (changes.data !== undefined) row.data = changes.data;
    if (changes.horario !== undefined) row.horario = changes.horario;
    if (changes.observacao !== undefined) row.observacao = changes.observacao;
    const { data, error } = await supabaseClient.from('appointments').update(row).eq('id', id).select().single();
    if (error) lancarErro('updateAppointment', error);
    return mapAppointment(data);
  },

  cancelAppointment: async function (id) {
    return this.updateAppointment(id, { status: 'cancelado' });
  },

  /* ---------- Clientes ---------- */
  getClients: async function () {
    const { data, error } = await supabaseClient.from('clients').select('*').order('nome', { ascending: true });
    if (error) lancarErro('getClients', error);
    return (data || []).map(mapClient);
  },

  /* ---------- Disponibilidade (via funções do banco) ---------- */
  getAvailableSlots: async function (servicoId, dataISO) {
    const { data, error } = await supabaseClient.rpc('rpc_available_slots', {
      p_servico_id: servicoId,
      p_data: dataISO
    });
    if (error) lancarErro('getAvailableSlots', error);
    return data || [];
  },

  getAvailableDatesInMonth: async function (servicoId, ano, mes) {
    const { data, error } = await supabaseClient.rpc('rpc_available_dates', {
      p_servico_id: servicoId,
      p_ano: ano,
      p_mes: mes
    });
    if (error) lancarErro('getAvailableDatesInMonth', error);
    return new Set(data || []);
  },

  /* ---------- Sessão admin (Supabase Auth) ---------- */
  getSession: async function () {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  }
};

/* ------------------------------------------------------------------
 * Helpers de data — usados tanto no fluxo público quanto no admin.
 * ------------------------------------------------------------------ */
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const DIAS_SEMANA_LABEL = { dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado' };

function dateToISO(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
