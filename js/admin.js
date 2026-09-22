/* =========================================================
   NAIL STUDIO — admin.js
   Núcleo do painel administrativo: autenticação, layout
   (sidebar / menu inferior) e utilitários compartilhados
   entre todas as páginas de /admin.
   ========================================================= */

(function (global) {
  const NAV_ITEMS = [
    { href: "dashboard.html", icon: "🏠", label: "Dashboard" },
    { href: "agenda.html", icon: "📅", label: "Agenda" },
    { href: "agendamentos.html", icon: "🗒️", label: "Agendamentos" },
    { href: "servicos.html", icon: "💅", label: "Serviços" },
    { href: "horarios.html", icon: "⏰", label: "Horários" },
    { href: "bloqueios.html", icon: "🚫", label: "Dias bloqueados" },
    { href: "clientes.html", icon: "👥", label: "Clientes" },
    { href: "configuracoes.html", icon: "⚙️", label: "Configurações" },
  ];
  // itens de destaque no menu inferior (mobile) — subconjunto para não poluir
  const MOBILE_NAV_ITEMS = [
    { href: "dashboard.html", icon: "🏠", label: "Início" },
    { href: "agenda.html", icon: "📅", label: "Agenda" },
    { href: "agendamentos.html", icon: "🗒️", label: "Agend." },
    { href: "servicos.html", icon: "💅", label: "Serviços" },
    { href: "configuracoes.html", icon: "⚙️", label: "Ajustes" },
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
        <button class="icon-btn" id="mobile-logout" aria-label="Sair" style="background:transparent;border-color:#4b4247;color:#fff;">⏻</button>
      </div>

      <div class="admin-layout">
        <aside class="admin-sidebar">
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
          <button class="logout-btn" id="desktop-logout"><span class="ic">⏻</span> Sair</button>
        </aside>

        <div class="admin-content">
          <div class="admin-topbar">
            <div>
              <h1>${title}</h1>
              ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
            </div>
            <div id="admin-topbar-actions"></div>
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
