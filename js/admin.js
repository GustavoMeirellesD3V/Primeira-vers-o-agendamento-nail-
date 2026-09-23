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
  // itens de destaque no menu inferior (mobile) — subconjunto para não poluir
  const MOBILE_NAV_ITEMS = [
    { href: "dashboard.html", icon: ICONS.dashboard, label: "Início" },
    { href: "agenda.html", icon: ICONS.agenda, label: "Agenda" },
    { href: "agendamentos.html", icon: ICONS.agendamentos, label: "Agend." },
    { href: "servicos.html", icon: ICONS.servicos, label: "Serviços" },
    { href: "configuracoes.html", icon: ICONS.configuracoes, label: "Ajustes" },
  ];

  function currentPage() {
    return window.location.pathname.split("/").pop();
  }

  async function buildShell({ title, subtitle, activeHref }) {
    const session = await DB.requireAuth();
    if (!session) return null; // redirecionando para login

    const settings = await DB.getSettings();
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
              <span class="topbar-bell" title="Notificações">${ICONS.bell}<span class="dot"></span></span>
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
      </nav>
      `
    );

    document.getElementById("desktop-logout").addEventListener("click", doLogout);
    document.getElementById("mobile-logout").addEventListener("click", doLogout);

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
  function waLink(phone, text) {
    return `https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text || "")}`;
  }

  global.Admin = {
    buildShell,
    formatCurrency,
    formatDateBR,
    formatDateLabel,
    statusLabel,
    statusBadge,
    waLink,
    NAV_ITEMS,
  };
})(window);
