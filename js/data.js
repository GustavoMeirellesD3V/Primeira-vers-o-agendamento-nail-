/* =========================================================
   NAIL STUDIO — data.js
   ---------------------------------------------------------
   Camada de acesso a dados, agora ligada a um banco real
   (Supabase / Postgres) com autenticação de verdade.

   Nenhuma outra tela do sistema fala diretamente com o banco —
   todas chamam DB.getServices(), DB.createAppointment() etc.
   Por isso esta reescrita não exigiu tocar em agendamento.js,
   app.js, calendario.js nem nas páginas de /admin: a "forma"
   dos dados que este arquivo devolve continua igual à versão
   anterior (localStorage), só a fonte mudou.

   Pré-requisitos:
   1) Rodar supabase/schema.sql no SQL Editor do seu projeto.
   2) Criar o usuário admin em Authentication > Users.
   3) Preencher js/supabase-config.js com a URL e a anon key.
   4) Incluir, em toda página HTML, ANTES deste arquivo:
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
      <script src="js/supabase-config.js"></script>
   ========================================================= */

(function (global) {
  const WEEKDAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const WEEKDAY_LABELS = {
    seg: "Segunda-feira",
    ter: "Terça-feira",
    qua: "Quarta-feira",
    qui: "Quinta-feira",
    sex: "Sexta-feira",
    sab: "Sábado",
    dom: "Domingo",
  };

  /* ---------------------------------------------------------
     CLIENTE SUPABASE
  --------------------------------------------------------- */
  const CONFIGURED =
    typeof SUPABASE_URL !== "undefined" &&
    typeof SUPABASE_ANON_KEY !== "undefined" &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("SEU-PROJETO");

  if (!CONFIGURED) {
    showConfigBanner();
  }

  const sb = CONFIGURED && global.supabase ? global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  function showConfigBanner() {
    const inject = () => {
      if (document.getElementById("supabase-config-banner")) return;
      const bar = document.createElement("div");
      bar.id = "supabase-config-banner";
      bar.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:9999;background:#C4645B;color:#fff;" +
        "padding:10px 16px;font:600 13px/1.4 system-ui,sans-serif;text-align:center;";
      bar.textContent =
        "⚠️ Supabase não configurado — preencha js/supabase-config.js com a URL e a anon key do seu projeto.";
      document.body.prepend(bar);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inject);
    } else {
      inject();
    }
  }

  function assertConfigured() {
    if (!sb) {
      throw new Error(
        "Supabase não configurado. Edite js/supabase-config.js com a URL e a anon key do seu projeto."
      );
    }
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function addDaysISO(iso, days) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }
  function fromMinutes(mins) {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    return `${h}:${m}`;
  }

  /* ---------------------------------------------------------
     MAPEADORES (snake_case do banco <-> camelCase do app)
  --------------------------------------------------------- */
  function mapSettingsFromDb(row) {
    return {
      nome: row.nome,
      subtitulo: row.subtitulo,
      descricao: row.descricao,
      foto: row.foto,
      logo: row.logo,
      whatsapp: row.whatsapp,
      instagram: row.instagram,
      endereco: row.endereco,
      mensagemConfirmacao: row.mensagem_confirmacao,
      tempoMinimoAgendamentoHoras: row.tempo_minimo_horas,
      diasFuturosVisiveis: row.dias_futuros_visiveis,
      cores: row.cores,
    };
  }
  function mapSettingsToDb(obj) {
    const out = {};
    if (obj.nome !== undefined) out.nome = obj.nome;
    if (obj.subtitulo !== undefined) out.subtitulo = obj.subtitulo;
    if (obj.descricao !== undefined) out.descricao = obj.descricao;
    if (obj.foto !== undefined) out.foto = obj.foto;
    if (obj.logo !== undefined) out.logo = obj.logo;
    if (obj.whatsapp !== undefined) out.whatsapp = obj.whatsapp;
    if (obj.instagram !== undefined) out.instagram = obj.instagram;
    if (obj.endereco !== undefined) out.endereco = obj.endereco;
    if (obj.mensagemConfirmacao !== undefined) out.mensagem_confirmacao = obj.mensagemConfirmacao;
    if (obj.tempoMinimoAgendamentoHoras !== undefined) out.tempo_minimo_horas = obj.tempoMinimoAgendamentoHoras;
    if (obj.diasFuturosVisiveis !== undefined) out.dias_futuros_visiveis = obj.diasFuturosVisiveis;
    if (obj.cores !== undefined) out.cores = obj.cores;
    return out;
  }

  function mapServiceFromDb(row) {
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      preco: Number(row.preco),
      duracaoMin: row.duracao_min,
      imagem: row.imagem,
      ativo: row.ativo,
    };
  }
  function mapServiceToDb(obj) {
    const out = {};
    if (obj.nome !== undefined) out.nome = obj.nome;
    if (obj.descricao !== undefined) out.descricao = obj.descricao;
    if (obj.preco !== undefined) out.preco = obj.preco;
    if (obj.duracaoMin !== undefined) out.duracao_min = obj.duracaoMin;
    if (obj.imagem !== undefined) out.imagem = obj.imagem;
    if (obj.ativo !== undefined) out.ativo = obj.ativo;
    return out;
  }

  function mapAppointmentFromDb(row) {
    return {
      id: row.id,
      serviceId: row.service_id,
      data: row.data,
      horario: (row.horario || "").slice(0, 5),
      clienteNome: row.cliente_nome,
      clienteWhatsapp: row.cliente_whatsapp,
      clienteEmail: row.cliente_email,
      observacao: row.observacao,
      status: row.status,
      criadoEm: row.criado_em,
    };
  }
  function mapAppointmentToDb(obj) {
    const out = {};
    if (obj.serviceId !== undefined) out.service_id = obj.serviceId;
    if (obj.data !== undefined) out.data = obj.data;
    if (obj.horario !== undefined) out.horario = obj.horario;
    if (obj.clienteNome !== undefined) out.cliente_nome = obj.clienteNome;
    if (obj.clienteWhatsapp !== undefined) out.cliente_whatsapp = obj.clienteWhatsapp;
    if (obj.clienteEmail !== undefined) out.cliente_email = obj.clienteEmail;
    if (obj.observacao !== undefined) out.observacao = obj.observacao;
    if (obj.status !== undefined) out.status = obj.status;
    return out;
  }

  function mapBlockFromDb(row) {
    return { id: row.id, date: row.date, fullDay: row.full_day, horarios: row.horarios || [], motivo: row.motivo };
  }

  /* ---------------------------------------------------------
     API PÚBLICA — DB (mesma "forma" de antes)
  --------------------------------------------------------- */
  const DB = {
    WEEKDAY_KEYS,
    WEEKDAY_LABELS,
    todayISO,
    addDaysISO,

    /* ---------- CONFIGURAÇÕES ---------- */
    async getSettings() {
      assertConfigured();
      const { data, error } = await sb.from("settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return mapSettingsFromDb(data);
    },
    async saveSettings(patch) {
      assertConfigured();
      const { data, error } = await sb
        .from("settings")
        .update(mapSettingsToDb(patch))
        .eq("id", 1)
        .select()
        .single();
      if (error) throw error;
      return mapSettingsFromDb(data);
    },

    /* ---------- HORÁRIOS DE FUNCIONAMENTO ---------- */
    async getSchedule() {
      assertConfigured();
      const { data, error } = await sb.from("schedule").select("data").eq("id", 1).single();
      if (error) throw error;
      return data.data;
    },
    async saveSchedule(newSchedule) {
      assertConfigured();
      const { error } = await sb.from("schedule").update({ data: newSchedule }).eq("id", 1);
      if (error) throw error;
      return newSchedule;
    },

    /* ---------- DATAS/HORÁRIOS BLOQUEADOS ---------- */
    async getBlockedDates() {
      assertConfigured();
      const { data, error } = await sb.from("blocked_dates").select("*").order("date");
      if (error) throw error;
      return data.map(mapBlockFromDb);
    },
    async addBlockedDate(block) {
      assertConfigured();
      const { data, error } = await sb
        .from("blocked_dates")
        .insert({ date: block.date, full_day: block.fullDay, horarios: block.horarios || [], motivo: block.motivo })
        .select()
        .single();
      if (error) throw error;
      return mapBlockFromDb(data);
    },
    async removeBlockedDate(id) {
      assertConfigured();
      const { error } = await sb.from("blocked_dates").delete().eq("id", id);
      if (error) throw error;
      return true;
    },

    /* ---------- SERVIÇOS ---------- */
    async getServices({ onlyActive = false } = {}) {
      assertConfigured();
      let query = sb.from("services").select("*").order("nome");
      if (onlyActive) query = query.eq("ativo", true);
      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapServiceFromDb);
    },
    async getService(id) {
      assertConfigured();
      const { data, error } = await sb.from("services").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? mapServiceFromDb(data) : null;
    },
    async createService(service) {
      assertConfigured();
      const { data, error } = await sb.from("services").insert(mapServiceToDb(service)).select().single();
      if (error) throw error;
      return mapServiceFromDb(data);
    },
    async updateService(id, patch) {
      assertConfigured();
      const { data, error } = await sb.from("services").update(mapServiceToDb(patch)).eq("id", id).select().single();
      if (error) throw error;
      return mapServiceFromDb(data);
    },
    async deleteService(id) {
      assertConfigured();
      const { error } = await sb.from("services").delete().eq("id", id);
      if (error) throw error;
      return true;
    },

    /* ---------- AGENDAMENTOS ----------
       ATENÇÃO: por segurança (RLS), a tabela appointments só pode
       ser LIDA por um usuário autenticado (a Nail Designer logada).
       Um visitante anônimo só pode INSERIR (agendar) — para calcular
       horários livres, ele usa a função pública get_busy_times(),
       que devolve só horário + duração, nunca nome/telefone.
    ---------------------------------------------------------- */
    async getAppointments(filter = {}) {
      assertConfigured();
      let query = sb.from("appointments").select("*");
      if (filter.date) query = query.eq("data", filter.date);
      if (filter.dateFrom) query = query.gte("data", filter.dateFrom);
      if (filter.dateTo) query = query.lte("data", filter.dateTo);
      if (filter.status) query = query.eq("status", filter.status);
      query = query.order("data").order("horario");
      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapAppointmentFromDb);
    },
    async getAppointment(id) {
      assertConfigured();
      const { data, error } = await sb.from("appointments").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? mapAppointmentFromDb(data) : null;
    },
    async createAppointment(appt) {
      assertConfigured();
      const payload = mapAppointmentToDb({ ...appt, status: appt.status || "pendente" });
      // OBS: sem .select() de propósito. Um visitante anônimo pode INSERIR
      // um agendamento (política de RLS "appointments: criar publico"), mas
      // não tem permissão de LEITURA na tabela — só a admin autenticada lê.
      // Pedir .select() aqui exigiria ler a linha recém-criada, o que a RLS
      // nega para o visitante e fazia a confirmação falhar sempre.
      const { error } = await sb.from("appointments").insert(payload);
      if (error) throw error;
      return { ...appt, status: payload.status };
    },
    async updateAppointment(id, patch) {
      assertConfigured();
      const { data, error } = await sb
        .from("appointments")
        .update(mapAppointmentToDb(patch))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapAppointmentFromDb(data);
    },
    async cancelAppointment(id) {
      return DB.updateAppointment(id, { status: "cancelado" });
    },
    async deleteAppointment(id) {
      assertConfigured();
      const { error } = await sb.from("appointments").delete().eq("id", id);
      if (error) throw error;
      return true;
    },

    /* ---------- CLIENTES (derivado dos agendamentos; requer login) ---------- */
    async getClients() {
      assertConfigured();
      const { data, error } = await sb.from("appointments").select("*");
      if (error) throw error;
      const map = new Map();
      data.forEach((row) => {
        const a = mapAppointmentFromDb(row);
        const key = a.clienteWhatsapp || a.clienteNome;
        if (!map.has(key)) {
          map.set(key, { nome: a.clienteNome, whatsapp: a.clienteWhatsapp, email: a.clienteEmail, totalAgendamentos: 0, ultimoAgendamento: a.data });
        }
        const c = map.get(key);
        c.totalAgendamentos += 1;
        if (a.data > c.ultimoAgendamento) c.ultimoAgendamento = a.data;
      });
      return Array.from(map.values()).sort((a, b) => (a.nome > b.nome ? 1 : -1));
    },

    /* ---------- REGRAS DE DISPONIBILIDADE ---------- */
    async isDateAvailable(iso) {
      const schedule = await DB.getSchedule();
      const weekday = WEEKDAY_KEYS[new Date(iso + "T00:00:00").getDay()];
      const dayCfg = schedule[weekday];
      if (!dayCfg || !dayCfg.ativo) return false;

      const blocks = await DB.getBlockedDates();
      const block = blocks.find((b) => b.date === iso);
      if (block && block.fullDay) return false;

      return true;
    },

    async getAvailableSlots(iso, serviceId) {
      assertConfigured();
      const [schedule, service, blocks] = await Promise.all([
        DB.getSchedule(),
        DB.getService(serviceId),
        DB.getBlockedDates(),
      ]);

      const weekday = WEEKDAY_KEYS[new Date(iso + "T00:00:00").getDay()];
      const dayCfg = schedule[weekday];
      if (!dayCfg || !dayCfg.ativo) return [];

      const duracao = service ? service.duracaoMin : 30;

      const block = blocks.find((b) => b.date === iso);
      if (block && block.fullDay) return [];
      const blockedTimes = block && !block.fullDay ? block.horarios : [];

      const { data: busyRows, error } = await sb.rpc("get_busy_times", { p_date: iso });
      if (error) throw error;
      const busy = (busyRows || []).map((r) => {
        const start = toMinutes((r.horario || "").slice(0, 5));
        return { start, end: start + (r.duracao_min || 30) };
      });

      const settings = await DB.getSettings();
      const now = new Date();
      const isToday = iso === todayISO();
      const minLeadMinutes = (settings.tempoMinimoAgendamentoHoras || 0) * 60;
      const earliestAllowed = isToday ? now.getHours() * 60 + now.getMinutes() + minLeadMinutes : -1;

      const slots = [];
      const STEP = 30;

      (dayCfg.expediente || []).forEach((range) => {
        let cursor = toMinutes(range.inicio);
        const end = toMinutes(range.fim);
        while (cursor + duracao <= end) {
          const slotEnd = cursor + duracao;
          const withinPause = (dayCfg.pausas || []).some((p) => {
            const pStart = toMinutes(p.inicio);
            const pEnd = toMinutes(p.fim);
            return cursor < pEnd && slotEnd > pStart;
          });
          const overlapsBusy = busy.some((b) => cursor < b.end && slotEnd > b.start);
          const isBlockedTime = blockedTimes.includes(fromMinutes(cursor));
          const tooSoon = isToday && cursor < earliestAllowed;

          if (!withinPause && !overlapsBusy && !isBlockedTime && !tooSoon) {
            slots.push(fromMinutes(cursor));
          }
          cursor += STEP;
        }
      });

      return slots;
    },

    /* ---------- AUTENTICAÇÃO ADMIN (Supabase Auth real) ---------- */
    async login(email, password) {
      assertConfigured();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error("E-mail ou senha inválidos.");
      return { token: data.session.access_token, email: data.user.email };
    },
    async logout() {
      if (!sb) return;
      await sb.auth.signOut();
    },
    async resetPassword(email) {
      assertConfigured();
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return true;
    },
    async getSession() {
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session || null;
    },
    async requireAuth() {
      const session = await DB.getSession();
      if (!session) {
        window.location.href = "../login.html";
      }
      return session;
    },
  };

  global.DB = DB;
})(window);
