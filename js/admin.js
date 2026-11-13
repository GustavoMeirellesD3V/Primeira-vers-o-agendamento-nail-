/* =========================================================
   NAIL STUDIO — admin.js
   Núcleo do painel administrativo: autenticação, layout
   (sidebar / menu inferior) e utilitários compartilhados
   entre todas as páginas de /admin.
   ========================================================= */

(function (global) {
  // ícones em SVG (traço), no lugar de emoji — mesmo padrão visual do site público
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    agendamentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    servicos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>',
    horarios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    bloqueios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>',
    clientes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-4-3-8-6.5-8-11a5 5 0 019-3 5 5 0 019 3c0 4.5-4 8-8 11z"/></svg>',
    configuracoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9c.14.36.4.66.75.84"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>',
  };

  const NAV_ITEMS = [
    { href: "dashboard.html", icon: ICONS.dashboard, label: "Dashboard" },
    { href: "agenda.html", icon: ICONS.agenda, label: "Agenda" },
    { href: "agendamentos.html", icon: ICONS.agendamentos, label: "Agendamentos" },
    { href: "servicos.html", icon: ICONS.servicos, label: "Serviços" },
    { href: "horarios.html", icon: ICONS.horarios, label: "Horários" },
    { href: "bloqueios.html", icon: ICONS.bloqueios, label: "Dias bloqueados" },
    { href: "clientes.html", icon: ICONS.clientes, label: "Clientes" },
    { href: "configuracoes.html", icon: ICONS.configuracoes, label: "Configurações" },
  ];
  // Atalhos fixos do menu inferior (mobile). O que nao cabe aqui vai para o
  // botao "Mais", para que nenhuma pagina fique inacessivel no celular.
  const MOBILE_NAV_ITEMS = [
    { href: "dashboard.html", icon: ICONS.dashboard, label: "Início" },
    { href: "agenda.html", icon: ICONS.agenda, label: "Agenda" },
    { href: "agendamentos.html", icon: ICONS.agendamentos, label: "Agend." },
    { href: "servicos.html", icon: ICONS.servicos, label: "Serviços" },
  ];
  const ICON_MAIS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';

  // Tudo que nao esta nos atalhos aparece na folha "Mais".
  function itensDoMais() {
    const fixos = MOBILE_NAV_ITEMS.map((i) => i.href);
    return NAV_ITEMS.filter((i) => fixos.indexOf(i.href) === -1);
  }

  function currentPage() {
    return window.location.pathname.split("/").pop();
  }

  async function buildShell({ title, subtitle, activeHref }) {
    const session = await DB.requireAuth();
    if (!session) return null; // redirecionando para login

    const settings = await DB.getSettings();
    cachedSettings = settings;
    applyThemeVars(settings);

    const active = activeHref || currentPage();

    document.body.classList.add("admin-body");
    document.body.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="admin-mobile-topbar">
        <div class="brand">
          <div class="logo-badge">${settings.nome.charAt(0)}</div>
          ${settings.nome}
        </div>
        <button class="icon-btn" id="mobile-logout" aria-label="Sair" style="background:transparent;border-color:#4b4247;color:#fff;">${ICONS.power}</button>
      </div>

      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="sidebar-glow" aria-hidden="true"></div>
          <div class="brand">
            <div class="logo-badge">${settings.nome.charAt(0)}</div>
            <div>
              <strong>${settings.nome}</strong>
              <span>Painel administrativo</span>
            </div>
          </div>
          <ul class="admin-nav">
            ${NAV_ITEMS.map(
              (item) => `
              <li><a href="${item.href}" class="${item.href === active ? "active" : ""}">
                <span class="ic">${item.icon}</span> ${item.label}
              </a></li>`
            ).join("")}
          </ul>
          <button class="logout-btn" id="desktop-logout"><span class="ic">${ICONS.power}</span> Sair</button>
        </aside>

        <div class="admin-content">
          <div class="admin-topbar">
            <div>
              <h1>${title}</h1>
              ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
            </div>
            <div class="topbar-right">
              <div class="notif-wrap">
                <button type="button" class="topbar-bell" id="notif-btn" title="Clientes para retorno"
                        aria-haspopup="true" aria-expanded="false">
                  ${ICONS.bell}<span class="notif-badge" id="notif-badge" hidden>0</span>
                </button>
                <div class="notif-panel" id="notif-panel" role="dialog" aria-label="Clientes para retorno" hidden>
                  <div class="notif-panel__head">
                    <strong>Clientes para retorno</strong>
                    <button type="button" class="notif-close" id="notif-close" aria-label="Fechar">&times;</button>
                  </div>
                  <div id="notif-lista"><div class="empty-hint">Carregando…</div></div>
                </div>
              </div>
              <div id="admin-topbar-actions"></div>
            </div>
          </div>
          <div id="admin-page-content"></div>
        </div>
      </div>

      <nav class="admin-bottom-nav">
        ${MOBILE_NAV_ITEMS.map(
          (item) => `
          <a href="${item.href}" class="${item.href === active ? "active" : ""}">
            <span class="ic">${item.icon}</span>${item.label}
          </a>`
        ).join("")}
        <button type="button" id="mobile-mais-btn"
                class="${itensDoMais().some((i) => i.href === active) ? "active" : ""}"
                aria-haspopup="true" aria-expanded="false" aria-controls="mobile-mais-sheet">
          <span class="ic">${ICON_MAIS}</span>Mais
        </button>
      </nav>

      <div class="mobile-sheet-backdrop" id="mobile-mais-backdrop" hidden></div>
      <div class="mobile-sheet" id="mobile-mais-sheet" role="dialog" aria-label="Mais opções" hidden>
        <div class="mobile-sheet-handle" aria-hidden="true"></div>
        <ul>
          ${itensDoMais()
            .map(
              (item) => `
            <li><a href="${item.href}" class="${item.href === active ? "active" : ""}">
              <span class="ic">${item.icon}</span> ${item.label}
            </a></li>`
            )
            .join("")}
          <li><button type="button" id="sheet-logout"><span class="ic">${ICONS.power}</span> Sair</button></li>
        </ul>
      </div>
      `
    );

    document.getElementById("desktop-logout").addEventListener("click", doLogout);
    document.getElementById("mobile-logout").addEventListener("click", doLogout);
    document.getElementById("sheet-logout").addEventListener("click", doLogout);

    /* ---------- notificação de clientes para retorno ----------
       Lista quem nao vem ha um tempo e ainda nao remarcou, com um
       botao que abre o WhatsApp com a mensagem pronta.
    ------------------------------------------------------------- */
    const notifBtn = document.getElementById("notif-btn");
    const notifPanel = document.getElementById("notif-panel");
    const notifBadge = document.getElementById("notif-badge");
    const notifLista = document.getElementById("notif-lista");

    function abrirNotif(abrir) {
      notifPanel.hidden = !abrir;
      notifBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
    }
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirNotif(notifPanel.hidden);
    });
    document.getElementById("notif-close").addEventListener("click", () => abrirNotif(false));
    document.addEventListener("click", (e) => {
      if (!notifPanel.hidden && !notifPanel.contains(e.target)) abrirNotif(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") abrirNotif(false);
    });

    // carrega depois da tela aparecer, para nao atrasar a pagina
    (async () => {
      try {
        const dias = retornoDias();
        const clientes = await DB.getClientesParaRetorno(dias);
        if (clientes.length) {
          notifBadge.textContent = clientes.length > 9 ? "9+" : String(clientes.length);
          notifBadge.hidden = false;
        }
        if (!clientes.length) {
          notifLista.innerHTML = `<div class="empty-hint">Ninguém está há mais de ${dias} dias sem vir. 🎉</div>`;
          return;
        }
        notifLista.innerHTML =
          `<p class="form-hint notif-sub">Sem vir há ${dias} dias ou mais, e ainda sem horário marcado.</p>` +
          clientes
            .map(
              (c) => `
          <div class="notif-item">
            <div class="notif-item__info">
              <strong>${c.nome}</strong>
              <span>${c.diasSemVir} dias · última visita ${formatDateBR(c.ultimaVisita)}</span>
            </div>
            ${
              c.whatsapp
                ? `<a class="btn btn-outline btn-sm" href="${linkRetorno(c)}" target="_blank" rel="noopener">Chamar</a>`
                : `<span class="form-hint" style="margin:0;">sem WhatsApp</span>`
            }
          </div>`
            )
            .join("");
      } catch (err) {
        notifLista.innerHTML = `<div class="empty-hint">Não foi possível carregar agora.</div>`;
      }
    })();

    /* ---------- folha "Mais" (mobile) ---------- */
    const sheet = document.getElementById("mobile-mais-sheet");
    const sheetBackdrop = document.getElementById("mobile-mais-backdrop");
    const sheetBtn = document.getElementById("mobile-mais-btn");

    function abrirSheet(abrir) {
      sheet.hidden = !abrir;
      sheetBackdrop.hidden = !abrir;
      sheetBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
      document.body.classList.toggle("sheet-aberta", abrir);
    }
    sheetBtn.addEventListener("click", () => abrirSheet(sheet.hidden));
    sheetBackdrop.addEventListener("click", () => abrirSheet(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") abrirSheet(false);
    });

    return document.getElementById("admin-page-content");
  }

  async function doLogout() {
    if (confirm("Deseja sair do painel administrativo?")) {
      await DB.logout();
      window.location.href = "../login.html";
    }
  }

  function applyThemeVars(settings) {
    const root = document.documentElement.style;
    root.setProperty("--color-primary", settings.cores.primary);
    root.setProperty("--color-primary-dark", settings.cores.primaryDark);
    root.setProperty("--color-primary-light", settings.cores.primaryLight);
    root.setProperty("--color-nude", settings.cores.nude);
    root.setProperty("--color-gold", settings.cores.gold);
  }

  /* ---------- HELPERS COMPARTILHADOS ---------- */
  function formatCurrency(v) {
    return "R$ " + Number(v).toFixed(2).replace(".", ",");
  }
  function formatDateBR(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pt-BR");
  }
  function formatDateLabel(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  }
  function statusLabel(status) {
    const map = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      concluido: "Concluído",
      cancelado: "Cancelado",
      faltou: "Não compareceu",
    };
    return map[status] || status;
  }
  function statusBadge(status) {
    return `<span class="badge badge-${status}">${statusLabel(status)}</span>`;
  }
  /* ---------- MENSAGENS PRONTAS DE WHATSAPP ----------
     Monta o texto e o link. O envio continua manual: o link abre o
     WhatsApp com a mensagem escrita e a profissional só aperta enviar.
  ---------------------------------------------------------- */
  let cachedSettings = null;

  // Evita repetir o 55 quando o número já foi salvo com o código do país.
  function telefoneInternacional(phone) {
    let num = (phone || "").replace(/\D/g, "");
    if (num.length > 11 && num.indexOf("55") === 0) num = num.slice(2);
    return "55" + num;
  }

  function waLink(phone, text) {
    return `https://wa.me/${telefoneInternacional(phone)}?text=${encodeURIComponent(text || "")}`;
  }

  // Data por extenso para a cliente ler: "quarta-feira, 14/10".
  function dataPorExtenso(iso) {
    const d = new Date(iso + "T00:00:00");
    const semana = d.toLocaleDateString("pt-BR", { weekday: "long" });
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    return `${semana}, ${dia}/${mes}`;
  }

  function primeiroNome(nome) {
    return (nome || "").trim().split(" ")[0] || "";
  }

  /* Modelos padrão. A profissional pode reescrever em Configurações;
     o que ela salvar entra no lugar destes textos.               */
  const MODELO_CONFIRMACAO = [
    "Oi, {cliente}! Aqui é do {estudio}.",
    "",
    "Seu horário está confirmado:",
    "{servico}",
    "{data} às {horario}",
    "",
    "Endereço: {endereco}",
    "",
    "Qualquer imprevisto é só me avisar por aqui. Até lá!",
  ].join("\n");

  const MODELO_LEMBRETE = [
    "Oi, {cliente}! Passando para lembrar do seu horário no {estudio}.",
    "",
    "{servico}",
    "{data} às {horario}",
    "",
    "Consegue vir no horário? Se precisar remarcar, é só me falar por aqui.",
  ].join("\n");

  const MODELO_RETORNO = [
    "Oi, {cliente}! Aqui é do {estudio}.",
    "",
    "Faz {dias} dias que você não passa aqui e eu já estou com saudade 💅",
    "",
    "Quer marcar um horário? Me diz o melhor dia para você que eu encaixo.",
  ].join("\n");

  const RETORNO_DIAS_PADRAO = 21;

  const VARIAVEIS_DISPONIVEIS = ["cliente", "servico", "data", "horario", "estudio", "endereco", "dias"];

  // Troca {cliente}, {servico}... pelos valores reais. Se um valor estiver
  // vazio (ex.: endereço em branco), a linha inteira sai do texto.
  function aplicarVariaveis(modelo, dados) {
    let texto = modelo || "";
    VARIAVEIS_DISPONIVEIS.forEach((chave) => {
      const valor = (dados[chave] || "").trim();
      const marcador = "{" + chave + "}";
      if (!valor) {
        texto = texto
          .split("\n")
          .filter((linha) => linha.indexOf(marcador) === -1)
          .join("\n");
        return;
      }
      texto = texto.split(marcador).join(valor);
    });
    return texto.replace(/\n{3,}/g, "\n\n").trim();
  }

  function dadosDaMensagem(a, servico) {
    return {
      cliente: primeiroNome(a.clienteNome),
      servico: servico ? servico.nome : "Atendimento",
      data: dataPorExtenso(a.data),
      horario: a.horario,
      estudio: (cachedSettings && cachedSettings.nome) || "",
      endereco: (cachedSettings && cachedSettings.endereco) || "",
    };
  }

  function modeloSalvo(tipo) {
    const guardados = (cachedSettings && cachedSettings.mensagens) || {};
    const texto = (guardados[tipo] || "").trim();
    if (texto) return texto;
    if (tipo === "lembrete") return MODELO_LEMBRETE;
    if (tipo === "retorno") return MODELO_RETORNO;
    return MODELO_CONFIRMACAO;
  }

  // Configuracoes ja carregadas pelo buildShell, sem buscar de novo.
  function settings() {
    return cachedSettings || {};
  }

  // Quantos dias sem vir disparam a notificacao de retorno.
  function retornoDias() {
    const guardados = (cachedSettings && cachedSettings.mensagens) || {};
    const n = parseInt(guardados.retornoDias, 10);
    return n > 0 ? n : RETORNO_DIAS_PADRAO;
  }

  function msgRetorno(cliente) {
    const modelo = modeloSalvo("retorno");
    return aplicarVariaveis(modelo, {
      cliente: primeiroNome(cliente.nome),
      dias: String(cliente.diasSemVir || ""),
      estudio: (cachedSettings && cachedSettings.nome) || "",
      endereco: (cachedSettings && cachedSettings.endereco) || "",
    });
  }

  function linkRetorno(cliente) {
    return waLink(cliente.whatsapp, msgRetorno(cliente));
  }

  function msgConfirmacao(a, servico) {
    return aplicarVariaveis(modeloSalvo("confirmacao"), dadosDaMensagem(a, servico));
  }

  function msgLembrete(a, servico) {
    return aplicarVariaveis(modeloSalvo("lembrete"), dadosDaMensagem(a, servico));
  }

  // Atalhos: já devolvem o link pronto para usar no href do botão.
  function linkConfirmacao(a, servico) {
    return waLink(a.clienteWhatsapp, msgConfirmacao(a, servico));
  }
  function linkLembrete(a, servico) {
    return waLink(a.clienteWhatsapp, msgLembrete(a, servico));
  }

  global.Admin = {
    buildShell,
    formatCurrency,
    formatDateBR,
    formatDateLabel,
    statusLabel,
    statusBadge,
    waLink,
    msgConfirmacao,
    msgLembrete,
    linkConfirmacao,
    linkLembrete,
    MODELO_CONFIRMACAO,
    MODELO_LEMBRETE,
    MODELO_RETORNO,
    RETORNO_DIAS_PADRAO,
    retornoDias,
    settings,
    msgRetorno,
    linkRetorno,
    VARIAVEIS_DISPONIVEIS,
    aplicarVariaveis,
    NAV_ITEMS,
  };
})(window);
