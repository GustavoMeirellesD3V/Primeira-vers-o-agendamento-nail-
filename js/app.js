/* =========================================================
   NAIL STUDIO — app.js
   Lógica da página inicial (index.html)
   ========================================================= */

(function () {
  /* Escapa texto vindo do banco antes de injetar com innerHTML.
     Sem isso, um nome de serviço com < ou > quebra a marcação. */
  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  /* Ícones dos cards de serviço — SVG de traço no lugar dos emojis,
     herdam a cor do CSS via currentColor. */
  const ICON_SERVICE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3.5h6l-.6 12a2.4 2.4 0 01-4.8 0L9 3.5z"/><path d="M9.3 9.5h5.4"/><path d="M12 18.5v2"/></svg>`;
  const ICON_CLOCK = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/></svg>`;

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

    // Galeria de fotos do hero (cadastrada manualmente em Configurações)
    const heroPhotoEl = document.querySelector("[data-bind='foto']");
    if (heroPhotoEl) buildHeroGallery(heroPhotoEl, settings);

    // Promoção vigente (Configurações > Promoção). Fora do período, vem null.
    const promo = DB.promoDeHoje(settings);
    renderPromoBanner(promo);

    // Renderiza serviços em destaque na home
    const previewWrap = document.getElementById("services-preview");
    if (previewWrap) {
      const services = await DB.getServices({ onlyActive: true });
      previewWrap.innerHTML = services
        .slice(0, 4)
        .map(
          (s) => `
        <div class="service-card">
          <div class="thumb">${
            s.imagem
              ? `<img src="${esc(s.imagem)}" alt="${esc(s.nome)}">`
              : ICON_SERVICE
          }</div>
          <div class="info">
            <h3>${esc(s.nome)}</h3>
            ${s.descricao ? `<p class="desc">${esc(s.descricao)}</p>` : ""}
            <div class="meta"><span>${ICON_CLOCK} ${s.duracaoMin} min</span></div>
          </div>
          <div class="price">${precoDoCartao(s.preco, promo)}</div>
        </div>`
        )
        .join("");
    }
  });

  /* ---------- PROMOÇÃO ----------
     A faixa e os preços riscados só existem enquanto a promoção estiver
     ligada e dentro do período cadastrado em Configurações.            */

  const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];

  function moedaBR(valor) {
    return "R$ " + Number(valor).toFixed(2).replace(".", ",");
  }

  // "2026-11-23" + "2026-11-27" -> "23 a 27 de novembro"
  function periodoPorExtenso(inicio, fim) {
    if (!inicio || !fim) return "";
    const [, mi, di] = inicio.split("-").map(Number);
    const [, mf, df] = fim.split("-").map(Number);
    if (mi === mf) return `${di} a ${df} de ${MESES[mi - 1]}`;
    return `${di} de ${MESES[mi - 1]} a ${df} de ${MESES[mf - 1]}`;
  }

  // "23 a 27/11" — cabe embaixo do preço do cartão
  function periodoCurto(promo) {
    if (!promo || !promo.inicio || !promo.fim) return "";
    const [, mi, di] = promo.inicio.split("-");
    const [, mf, df] = promo.fim.split("-");
    return mi === mf ? `${+di} a ${+df}/${mi}` : `${+di}/${mi} a ${+df}/${mf}`;
  }

  function precoDoCartao(preco, promo) {
    if (!promo || !promo.maior) return moedaBR(preco);
    const comDesconto = DB.aplicarDesconto(preco, promo.maior);
    const umaFaixaSo = promo.pctNovas === promo.pctAntigas;
    const dias = periodoCurto(promo);
    return `<span class="promo-de">${moedaBR(preco)}</span>${moedaBR(comDesconto)}<span class="promo-ate">${
      umaFaixaSo ? "" : "até "
    }${promo.maior}% ${dias ? `de ${dias}` : "de desconto"}</span>`;
  }

  function renderPromoBanner(promo) {
    const alvo = document.getElementById("promo-banner");
    if (!alvo) return;
    if (!promo) {
      alvo.innerHTML = "";
      alvo.hidden = true;
      return;
    }

    const periodo = periodoPorExtenso(promo.inicio, promo.fim);
    const tiers = [
      { pct: promo.pctNovas, quem: "para quem agenda aqui pela primeira vez" },
      { pct: promo.pctAntigas, quem: "para quem já é cliente Carioca &amp; Glow" },
    ].filter((t) => t.pct > 0);

    alvo.hidden = false;
    alvo.innerHTML = `
      <div class="promo-banner">
        <div class="promo-banner-texto">
          <p class="promo-banner-titulo">${esc(promo.titulo)}</p>
          <p class="promo-banner-periodo">${
            periodo
              ? `Desconto em todos os serviços nos atendimentos de ${periodo}. Pode marcar o seu agora.`
              : "Desconto em todos os serviços. É só agendar pelo site."
          }</p>
        </div>
        <div class="promo-banner-tiers">
          ${tiers
            .map(
              (t) => `<div class="promo-tier">
                <span class="promo-tier-pct">${t.pct}%</span>
                <span class="promo-tier-quem">${t.quem}</span>
              </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  /* ---------- GALERIA DE FOTOS DO HERO (com setas) ----------
     Usa as fotos cadastradas manualmente em Configurações > Galeria do hero.
     Se a galeria estiver vazia, cai para a foto de destaque única (compatibilidade
     com sites antigos); se não houver nenhuma, mostra o placeholder. */
  function buildHeroGallery(wrap, settings) {
    const photoBox = wrap.querySelector(".hero-photo") || wrap;
    const oldControls = wrap.querySelector(".hero-photo-controls");
    if (oldControls) oldControls.remove();

    let photos =
      Array.isArray(settings.fotosDestaque) && settings.fotosDestaque.length
        ? settings.fotosDestaque.map((src) => ({ src, alt: settings.nome }))
        : settings.foto
        ? [{ src: settings.foto, alt: settings.nome }]
        : [];

    if (!photos.length) {
      photoBox.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--font-display);font-size:1rem;color:var(--color-text-soft);">Foto de destaque</div>`;
      return;
    }

    let idx = 0;
    photoBox.innerHTML = `
      <div class="hero-photo-track" id="hero-photo-track">
        ${photos.map((p) => `<div class="hero-photo-slide"><img src="${p.src}" alt="${p.alt}"></div>`).join("")}
      </div>
    `;

    if (photos.length <= 1) return;

    // seta/bolinhas ficam FORA da imagem, numa barrinha logo abaixo
    wrap.insertAdjacentHTML(
      "beforeend",
      `
      <div class="hero-photo-controls" id="hero-photo-controls">
        <button type="button" class="hero-photo-arrow prev" id="hero-photo-prev" aria-label="Arte anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="hero-photo-dots" id="hero-photo-dots">
          ${photos.map((_, i) => `<span class="hero-photo-dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`).join("")}
        </div>
        <button type="button" class="hero-photo-arrow next" id="hero-photo-next" aria-label="Próxima arte">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    `
    );

    const track = document.getElementById("hero-photo-track");
    const dots = Array.from(wrap.querySelectorAll(".hero-photo-dot"));

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
    wrap.addEventListener("mouseenter", () => clearInterval(timer));
    wrap.addEventListener("mouseleave", () => {
      timer = setInterval(() => goTo(idx + 1), 5000);
    });
  }
})();
