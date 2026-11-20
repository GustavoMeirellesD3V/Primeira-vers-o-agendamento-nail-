/* =========================================================
   NAIL STUDIO — agendamento.js
   Lógica do fluxo de agendamento (agendamento.html)
   ========================================================= */

(function () {
  const state = {
    step: 1, // 1 serviço, 2 data, 3 horário, 4 dados, 5 confirmação, 6 sucesso
    service: null,
    date: null,
    time: null,
    cliente: { nome: "", whatsapp: "", email: "", observacao: "" },
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    settings: null,
    promo: null,          // promoção valendo hoje, ou null
    descontoPct: 0,       // desconto desta cliente, definido na etapa 4
    clienteAntiga: null,  // true = já se atendeu aqui antes
  };

  const STEP_TITLES = {
    1: { eyebrow: "Etapa 1 de 5", title: "Escolha o serviço" },
    2: { eyebrow: "Etapa 2 de 5", title: "Escolha a data" },
    3: { eyebrow: "Etapa 3 de 5", title: "Escolha o horário" },
    4: { eyebrow: "Etapa 4 de 5", title: "Seus dados" },
    5: { eyebrow: "Etapa 5 de 5", title: "Confirme seu agendamento" },
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", async () => {
    els.stepper = document.getElementById("stepper");
    els.stepLabel = document.getElementById("step-label");
    els.main = document.getElementById("book-main");
    els.footer = document.getElementById("book-footer");
    els.backBtn = document.getElementById("back-btn");
    els.toast = document.getElementById("toast");

    state.settings = await window.NailTheme.applyTheme();
    state.promo = DB.promoDeHoje(state.settings);

    // Pré-seleciona serviço se veio via ?servico=ID da home
    const params = new URLSearchParams(window.location.search);
    const preSelected = params.get("servico");
    if (preSelected) {
      const svc = await DB.getService(preSelected);
      if (svc) {
        state.service = svc;
        state.step = 2;
      }
    }

    els.backBtn.addEventListener("click", goBack);
    render();
  });

  function goBack() {
    if (state.step === 1) {
      window.location.href = "index.html";
      return;
    }
    if (state.step === 6) return; // sem voltar da tela de sucesso
    state.step -= 1;
    render();
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function renderStepper() {
    const total = 5;
    els.stepper.innerHTML = "";
    for (let i = 1; i <= total; i++) {
      const dot = document.createElement("div");
      dot.className = "dot" + (i < state.step ? " done" : i === state.step ? " active" : "");
      els.stepper.appendChild(dot);
    }

    const label = STEP_TITLES[Math.min(state.step, 5)];
    if (label) {
      els.stepLabel.innerHTML = `<span>${label.eyebrow}</span><h2>${label.title}</h2>`;
      els.stepLabel.style.display = "";
    } else {
      els.stepLabel.style.display = "none";
    }
  }

  async function render() {
    renderStepper();
    els.footer.style.display = state.step === 6 ? "none" : "";

    switch (state.step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
    }
  }

  /* ---------- ETAPA 1: SERVIÇO ---------- */
  /* ---------- PROMOÇÃO ----------
     O preço aparece na etapa 1, mas o WhatsApp só na etapa 4. Então a
     lista mostra "até X%" e o desconto real só é calculado no resumo,
     quando já dá para saber se a cliente é nova ou antiga.

     Quem manda no desconto é a DATA DO ATENDIMENTO, não o dia em que ela
     está agendando: dá para marcar hoje para um dia da promoção e já sair
     com o desconto. Por isso a faixa diz em quais dias o desconto vale.
  ---------------------------------------------------------- */

  // O dia escolhido entra na promoção?
  function promoNaData() {
    return !!state.promo && DB.promoValeEm(state.promo, state.date);
  }

  // "23 a 27/11", para caber na faixa
  function periodoCurto() {
    if (!state.promo || !state.promo.inicio || !state.promo.fim) return "";
    const [, mi, di] = state.promo.inicio.split("-");
    const [, mf, df] = state.promo.fim.split("-");
    return mi === mf ? `${+di} a ${+df}/${mi}` : `${+di}/${mi} a ${+df}/${mf}`;
  }
  function precoFinal() {
    if (!state.service) return 0;
    return DB.aplicarDesconto(state.service.preco, state.descontoPct);
  }

  function temDesconto() {
    return !!(state.descontoPct && state.service);
  }

  function moeda(v) {
    return "R$ " + Number(v).toFixed(2).replace(".", ",");
  }

  // Descobre o desconto da cliente a partir do telefone. Se a consulta
  // falhar, trata como nova: é melhor dar o desconto maior do que
  // travar o agendamento por causa de uma promoção.
  async function definirDesconto() {
    state.descontoPct = 0;
    state.clienteAntiga = null;
    if (!promoNaData()) return;
    try {
      const antiga = await DB.clienteEAntiga(state.cliente.whatsapp);
      state.clienteAntiga = antiga;
      state.descontoPct = antiga ? state.promo.pctAntigas : state.promo.pctNovas;
    } catch (e) {
      state.clienteAntiga = false;
      state.descontoPct = state.promo.pctNovas;
    }
  }

  function seloPromo() {
    if (!state.promo) return "";
    const dias = periodoCurto();
    return `<div class="promo-faixa">${state.promo.titulo} — até ${state.promo.maior}% de desconto${
      dias ? ` nos atendimentos de ${dias}` : ""
    }</div>`;
  }

  async function renderStep1() {
    const services = await DB.getServices({ onlyActive: true });
    els.main.innerHTML = `
      ${seloPromo()}
      <div id="service-list"></div>
    `;
    const list = document.getElementById("service-list");
    list.innerHTML = services
      .map(
        (s) => `
      <div class="service-select-card ${state.service && state.service.id === s.id ? "selected" : ""}" data-id="${s.id}">
        <div class="thumb">${s.imagem ? `<img src="${s.imagem}" alt="${s.nome}">` : "💅"}</div>
        <div class="info">
          <h3>${s.nome}</h3>
          <p>${s.descricao}</p>
          <div class="meta"><span>⏱ ${s.duracaoMin} min</span></div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <div class="price">${state.promo ? `<span class="price-de">R$ ${s.preco.toFixed(2).replace(".", ",")}</span> ` : ""}R$ ${DB.aplicarDesconto(s.preco, state.promo ? state.promo.maior : 0).toFixed(2).replace(".", ",")}</div>
          <div class="check">✓</div>
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll(".service-select-card").forEach((card) => {
      card.addEventListener("click", () => {
        const svc = services.find((s) => s.id === card.dataset.id);
        state.service = svc;
        state.step = 2;
        render();
      });
    });

    renderFooter({ disabled: true, hideTotal: true, label: "Escolher" });
  }

  /* ---------- ETAPA 2: DATA ---------- */
  async function renderStep2() {
    els.main.innerHTML = `${seloPromo()}<div class="calendar-card" id="calendar-holder"></div>`;
    const holder = document.getElementById("calendar-holder");

    const today = new Date();
    const maxDate = DB.addDaysISO(DB.todayISO(), state.settings.diasFuturosVisiveis || 60);

    await NailCalendar.renderCalendar(holder, {
      year: state.calYear,
      month: state.calMonth,
      selectedDate: state.date,
      minDate: DB.todayISO(),
      maxDate,
      // Um dia só fica clicável se o serviço escolhido realmente couber em algum horário livre.
      isAvailable: async (iso) => {
        if (!(await DB.isDateAvailable(iso))) return false;
        try {
          const slots = await DB.getAvailableSlots(iso, state.service.id);
          return slots.length > 0;
        } catch (e) {
          return false;
        }
      },
      onSelect: (iso) => {
        state.date = iso;
        state.time = null;
        state.step = 3;
        render();
      },
      onMonthChange: (y, m) => {
        state.calYear = y;
        state.calMonth = m;
        render();
      },
    });

    renderFooter({ disabled: true, hideTotal: true, hide: true });
  }

  /* ---------- ETAPA 3: HORÁRIO ---------- */
  async function renderStep3() {
    const slots = await DB.getAvailableSlots(state.date, state.service.id);
    const dateLabel = formatDateLong(state.date);

    if (!slots.length) {
      els.main.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🗓️</div>
          <h3>Não existem horários disponíveis para esta data.</h3>
          <p>${dateLabel}</p>
          <button class="btn btn-outline" id="choose-other-date">Escolher outra data</button>
        </div>`;
      document.getElementById("choose-other-date").addEventListener("click", () => {
        state.step = 2;
        render();
      });
      renderFooter({ hide: true });
      return;
    }

    els.main.innerHTML = `
      <p style="text-align:center;margin-bottom:16px;font-weight:600;color:var(--color-text);">${dateLabel}</p>
      <div class="time-grid" id="time-grid"></div>
    `;
    const grid = document.getElementById("time-grid");
    grid.innerHTML = slots
      .map((t) => `<div class="time-slot ${state.time === t ? "selected" : ""}" data-time="${t}">${t}</div>`)
      .join("");

    grid.querySelectorAll(".time-slot").forEach((slot) => {
      slot.addEventListener("click", () => {
        state.time = slot.dataset.time;
        grid.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
        slot.classList.add("selected");
        renderFooter({ disabled: false, label: "Continuar", onNext: goToStep4 });
      });
    });

    renderFooter({ disabled: !state.time, label: "Continuar", onNext: goToStep4 });
  }

  function goToStep4() {
    state.step = 4;
    render();
  }

  /* ---------- ETAPA 4: DADOS DA CLIENTE ---------- */
  function renderStep4() {
    els.main.innerHTML = `
      <form id="client-form" novalidate>
        <div class="form-group" id="fg-nome">
          <label for="nome">Nome completo *</label>
          <input type="text" id="nome" name="nome" placeholder="Como podemos te chamar?" value="${state.cliente.nome}" required>
          <div class="field-error">Informe seu nome completo.</div>
        </div>
        <div class="form-group" id="fg-whatsapp">
          <label for="whatsapp">WhatsApp *</label>
          <input type="tel" id="whatsapp" name="whatsapp" placeholder="(11) 99999-9999" value="${state.cliente.whatsapp}" required>
          <div class="field-error">Informe um WhatsApp válido.</div>
        </div>
        <div class="form-group">
          <label for="email">E-mail (opcional)</label>
          <input type="email" id="email" name="email" placeholder="seu@email.com" value="${state.cliente.email}">
        </div>
        <div class="form-group">
          <label for="observacao">Alguma observação para seu atendimento?</label>
          <textarea id="observacao" name="observacao" placeholder="Ex: referência de nail art, alergias, etc.">${state.cliente.observacao}</textarea>
        </div>
      </form>
    `;

    const form = document.getElementById("client-form");
    form.addEventListener("input", () => {
      state.cliente.nome = form.nome.value;
      state.cliente.whatsapp = form.whatsapp.value;
      state.cliente.email = form.email.value;
      state.cliente.observacao = form.observacao.value;
      renderFooter({ disabled: !validClientForm(false), label: "Continuar", onNext: goToStep5 });
    });

    renderFooter({ disabled: !validClientForm(false), label: "Continuar", onNext: goToStep5 });
  }

  function validClientForm(showErrors) {
    const nomeOk = state.cliente.nome.trim().split(" ").filter(Boolean).length >= 1 && state.cliente.nome.trim().length >= 3;
    const waDigits = state.cliente.whatsapp.replace(/\D/g, "");
    const waOk = waDigits.length >= 10;

    if (showErrors) {
      document.getElementById("fg-nome").classList.toggle("invalid", !nomeOk);
      document.getElementById("fg-whatsapp").classList.toggle("invalid", !waOk);
    }
    return nomeOk && waOk;
  }

  async function goToStep5() {
    if (!validClientForm(true)) {
      showToast("Confira os campos destacados.");
      return;
    }
    await definirDesconto();
    state.step = 5;
    render();
  }

  /* ---------- ETAPA 5: CONFIRMAÇÃO ---------- */
  function renderStep5() {
    const s = state.service;
    els.main.innerHTML = `
      <div class="summary-card">
        <div class="summary-row"><div class="label">Serviço</div><div class="value">${s.nome}</div></div>
        <div class="summary-row"><div class="label">Data</div><div class="value">${formatDateShort(state.date)}</div></div>
        <div class="summary-row"><div class="label">Horário</div><div class="value">${state.time}</div></div>
        <div class="summary-row"><div class="label">Duração</div><div class="value">${formatDuration(s.duracaoMin)}</div></div>
        <div class="summary-row"><div class="label">Cliente</div><div class="value">${state.cliente.nome}</div></div>
        <div class="summary-row"><div class="label">WhatsApp</div><div class="value">${state.cliente.whatsapp}</div></div>
        ${state.cliente.observacao ? `<div class="summary-row"><div class="label">Observação</div><div class="value">${state.cliente.observacao}</div></div>` : ""}
        ${
          temDesconto()
            ? `<div class="summary-row"><div class="label">Valor</div><div class="value price"><span class="price-de">${moeda(s.preco)}</span> ${moeda(precoFinal())}</div></div>
               <div class="summary-row promo-linha"><div class="label">Desconto</div><div class="value">${state.descontoPct}% ${state.clienteAntiga ? "cliente Carioca &amp; Glow" : "primeira vez aqui"}</div></div>`
            : `<div class="summary-row"><div class="label">Valor</div><div class="value price">${moeda(s.preco)}</div></div>`
        }
      </div>
    `;
    renderFooter({ disabled: false, label: "Confirmar agendamento", onNext: confirmAppointment, primaryFullLabel: "CONFIRMAR AGENDAMENTO" });
  }

  async function confirmAppointment() {
    const btn = els.footer.querySelector(".btn-primary");
    if (btn) { btn.disabled = true; btn.textContent = "Confirmando..."; }

    try {
      // Revalida disponibilidade no momento da confirmação (evita conflitos)
      const slots = await DB.getAvailableSlots(state.date, state.service.id);
      if (!slots.includes(state.time)) {
        showToast("Esse horário acabou de ser reservado. Escolha outro.");
        state.step = 3;
        render();
        return;
      }

      await DB.createAppointment({
        serviceId: state.service.id,
        data: state.date,
        horario: state.time,
        clienteNome: state.cliente.nome.trim(),
        clienteWhatsapp: state.cliente.whatsapp.replace(/\D/g, ""),
        clienteEmail: state.cliente.email.trim(),
        observacao: state.cliente.observacao.trim(),
        status: "pendente",
        descontoPct: state.descontoPct || null,
      });
      state.step = 6;
      render();
    } catch (e) {
      showToast("Não foi possível concluir. Tente novamente.");
      if (btn) { btn.disabled = false; btn.textContent = "CONFIRMAR AGENDAMENTO"; }
    }
  }

  /* ---------- ETAPA 6: SUCESSO ---------- */
  function renderStep6() {
    const s = state.service;
    els.main.innerHTML = `
      <div class="success-screen">
        <div class="success-icon">✓</div>
        <h2>${state.settings.mensagemConfirmacao}</h2>
        <div class="summary-card" style="text-align:left;margin-top:24px;">
          <div class="summary-row"><div class="label">Serviço</div><div class="value">${s.nome}</div></div>
          <div class="summary-row"><div class="label">Data</div><div class="value">${formatDateShort(state.date)}</div></div>
          <div class="summary-row"><div class="label">Horário</div><div class="value">${state.time}</div></div>
          <div class="summary-row"><div class="label">Endereço</div><div class="value">${state.settings.endereco}</div></div>
          <div class="summary-row"><div class="label">Profissional</div><div class="value">${state.settings.nome}</div></div>
          ${
            temDesconto()
              ? `<div class="summary-row"><div class="label">Valor</div><div class="value price"><span class="price-de">${moeda(s.preco)}</span> ${moeda(precoFinal())}</div></div>
                 <div class="summary-row promo-linha"><div class="label">Desconto</div><div class="value">${state.descontoPct}% ${state.promo ? state.promo.titulo : ""}</div></div>`
              : ""
          }
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:24px;">
          <button class="btn btn-outline btn-block" id="add-calendar">📅 Adicionar ao calendário</button>
          <a class="btn btn-whatsapp btn-block" id="talk-whatsapp" target="_blank" rel="noopener">💬 Falar pelo WhatsApp</a>
          <a class="btn btn-ghost btn-block" href="index.html">Voltar para o início</a>
        </div>
      </div>
    `;

    const wa = `https://wa.me/${state.settings.whatsapp}?text=${encodeURIComponent(
      `Olá, ${state.settings.nome}! Acabei de agendar: ${s.nome} em ${formatDateShort(state.date)} às ${state.time}.` +
        (temDesconto() ? ` (${state.descontoPct}% de desconto — ${state.promo.titulo})` : "")
    )}`;
    document.getElementById("talk-whatsapp").href = wa;
    document.getElementById("add-calendar").addEventListener("click", addToCalendar);
  }

  function addToCalendar() {
    const s = state.service;
    const start = new Date(`${state.date}T${state.time}:00`);
    const end = new Date(start.getTime() + s.duracaoMin * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      s.nome + " — " + state.settings.nome
    )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(
      "Agendamento em " + state.settings.nome
    )}&location=${encodeURIComponent(state.settings.endereco)}`;
    window.open(url, "_blank");
  }

  /* ---------- FOOTER (barra fixa) ---------- */
  function renderFooter({ disabled = false, label = "Continuar", hideTotal = false, hide = false, onNext = null, primaryFullLabel = null }) {
    if (hide) {
      els.footer.style.display = "none";
      return;
    }
    els.footer.style.display = "";
    const s = state.service;
    els.footer.innerHTML = `
      <div class="book-footer-inner">
        ${
          !hideTotal && s
            ? `<div class="total"><div class="lbl">Total</div><div class="val">${
                temDesconto() ? `<span class="price-de">${moeda(s.preco)}</span> ${moeda(precoFinal())}` : moeda(s.preco)
              }</div></div>`
            : `<div class="total"></div>`
        }
        <button class="btn btn-primary" id="footer-next" ${disabled ? "disabled" : ""} style="${disabled ? "opacity:.5;cursor:not-allowed;" : ""}">${primaryFullLabel || label}</button>
      </div>
    `;
    const btn = document.getElementById("footer-next");
    if (onNext) {
      btn.addEventListener("click", onNext);
    } else {
      btn.style.display = "none";
    }
  }

  /* ---------- HELPERS DE FORMATAÇÃO ---------- */
  function formatDateLong(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  }
  function formatDateShort(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function formatDuration(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m}min` : `${h}h`;
  }
})();
