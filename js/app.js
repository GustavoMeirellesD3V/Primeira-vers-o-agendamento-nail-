/* =========================================================
   NAIL STUDIO — app.js
   Lógica da página inicial (index.html)
   ========================================================= */

(function () {
  // Aplica as cores/textos salvos pelo admin em qualquer página pública
  async function applyTheme() {
    const settings = await DB.getSettings();
    const root = document.documentElement.style;
    root.setProperty("--color-primary", settings.cores.primary);
    root.setProperty("--color-primary-dark", settings.cores.primaryDark);
    root.setProperty("--color-primary-light", settings.cores.primaryLight);
    root.setProperty("--color-nude", settings.cores.nude);
    root.setProperty("--color-gold", settings.cores.gold);
    return settings;
  }
  window.NailTheme = { applyTheme };

  document.addEventListener("DOMContentLoaded", async () => {
    const settings = await applyTheme();

    // Preenche dados dinâmicos
    document.querySelectorAll("[data-bind='nome']").forEach((el) => (el.textContent = settings.nome));
    document.querySelectorAll("[data-bind='subtitulo']").forEach((el) => (el.textContent = settings.subtitulo));
    document.querySelectorAll("[data-bind='descricao']").forEach((el) => (el.textContent = settings.descricao));
    document.querySelectorAll("[data-bind='endereco']").forEach((el) => (el.textContent = settings.endereco));
    document.querySelectorAll("[data-bind='instagram']").forEach((el) => (el.textContent = settings.instagram));

    const logoEls = document.querySelectorAll("[data-bind='logo']");
    logoEls.forEach((el) => {
      el.textContent = settings.nome ? settings.nome.charAt(0).toUpperCase() : "N";
      if (settings.logo) el.innerHTML = `<img src="${settings.logo}" alt="Logo">`;
    });

    const fotoEls = document.querySelectorAll("[data-bind='foto']");
    fotoEls.forEach((el) => {
      if (settings.foto) el.innerHTML = `<img src="${settings.foto}" alt="${settings.nome}">`;
      else el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--font-display);font-size:1rem;color:var(--color-text-soft);">Foto de destaque</div>`;
    });

    const waLink = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
      "Olá! Vim pelo site e gostaria de agendar um horário 💅"
    )}`;
    document.querySelectorAll("[data-href='whatsapp']").forEach((el) => (el.href = waLink));
    document.querySelectorAll("[data-href='instagram']").forEach(
      (el) => (el.href = `https://instagram.com/${settings.instagram.replace("@", "")}`)
    );

    // Renderiza serviços em destaque na home
    const wrap = document.getElementById("services-preview");
    if (wrap) {
      const services = await DB.getServices({ onlyActive: true });
      wrap.innerHTML = services
        .slice(0, 4)
        .map(
          (s) => `
        <div class="service-card">
          <div class="thumb">${s.imagem ? `<img src="${s.imagem}" alt="${s.nome}">` : "💅"}</div>
          <div class="info">
            <h3>${s.nome}</h3>
            <div class="meta"><span>⏱ ${s.duracaoMin} min</span></div>
          </div>
          <div class="price">R$ ${s.preco.toFixed(2).replace(".", ",")}</div>
        </div>`
        )
        .join("");
    }
  });
})();
