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

    const waLink = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
      "Olá! Vim pelo site e gostaria de agendar um horário 💅"
    )}`;
    document.querySelectorAll("[data-href='whatsapp']").forEach((el) => (el.href = waLink));
    document.querySelectorAll("[data-href='instagram']").forEach(
      (el) => (el.href = `https://instagram.com/${settings.instagram.replace("@", "")}`)
    );

    // Serviços ativos — usados tanto na prévia da home quanto na galeria do hero
    const heroPhotoEl = document.querySelector("[data-bind='foto']");
    const previewWrap = document.getElementById("services-preview");
    if (heroPhotoEl || previewWrap) {
      const services = await DB.getServices({ onlyActive: true });

      if (previewWrap) {
        previewWrap.innerHTML = services
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

      if (heroPhotoEl) buildHeroGallery(heroPhotoEl, settings, services);
    }
  });

  /* ---------- GALERIA DE FOTOS DO HERO (com setas) ----------
     Usa as fotos dos serviços ativos como "artes" para navegar.
     Se nenhum serviço tiver foto, cai para a foto de destaque única
     configurada em Configurações; se não houver nenhuma, mostra o placeholder. */
  function buildHeroGallery(container, settings, services) {
    let photos = services.filter((s) => s.imagem).map((s) => ({ src: s.imagem, alt: s.nome }));
    if (!photos.length && settings.foto) photos = [{ src: settings.foto, alt: settings.nome }];

    if (!photos.length) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--font-display);font-size:1rem;color:var(--color-text-soft);">Foto de destaque</div>`;
      return;
    }

    let idx = 0;
    container.innerHTML = `
      <div class="hero-photo-track" id="hero-photo-track">
        ${photos.map((p) => `<div class="hero-photo-slide"><img src="${p.src}" alt="${p.alt}"></div>`).join("")}
      </div>
      ${
        photos.length > 1
          ? `
        <button type="button" class="hero-photo-arrow prev" id="hero-photo-prev" aria-label="Arte anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button type="button" class="hero-photo-arrow next" id="hero-photo-next" aria-label="Próxima arte">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <div class="hero-photo-dots" id="hero-photo-dots">
          ${photos.map((_, i) => `<span class="hero-photo-dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`).join("")}
        </div>`
          : ""
      }
    `;

    if (photos.length <= 1) return;

    const track = document.getElementById("hero-photo-track");
    const dots = Array.from(container.querySelectorAll(".hero-photo-dot"));

    function goTo(i) {
      idx = (i + photos.length) % photos.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle("active", di === idx));
    }

    document.getElementById("hero-photo-prev").addEventListener("click", () => goTo(idx - 1));
    document.getElementById("hero-photo-next").addEventListener("click", () => goTo(idx + 1));
    dots.forEach((d) => d.addEventListener("click", () => goTo(Number(d.dataset.i))));

    // troca automática suave a cada 5s, pausando quando o mouse está em cima
    let timer = setInterval(() => goTo(idx + 1), 5000);
    container.addEventListener("mouseenter", () => clearInterval(timer));
    container.addEventListener("mouseleave", () => {
      timer = setInterval(() => goTo(idx + 1), 5000);
    });
  }
})();
