/* =========================================================
   NAIL STUDIO — calendario.js
   Componente de calendário reutilizável (site público e admin)
   ========================================================= */

(function (global) {
  const MONTH_LABELS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  /**
   * Renderiza um calendário mensal dentro de `container`.
   * @param {HTMLElement} container
   * @param {Object} opts
   *   - year, month (0-11)
   *   - selectedDate (iso string | null)
   *   - isAvailable(iso) => boolean | Promise<boolean>
   *   - minDate (iso), maxDate (iso)
   *   - onSelect(iso)
   *   - onMonthChange(year, month)
   */
  async function renderCalendar(container, opts) {
    const {
      year,
      month,
      selectedDate,
      isAvailable,
      minDate,
      maxDate,
      onSelect,
      onMonthChange,
    } = opts;

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = firstDay.getDay();
    const todayIso = new Date().toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="calendar-nav">
        <button type="button" data-nav="prev" aria-label="Mês anterior">‹</button>
        <div class="calendar-month-label">${MONTH_LABELS[month]} ${year}</div>
        <button type="button" data-nav="next" aria-label="Próximo mês">›</button>
      </div>
      <div class="calendar-grid" id="cal-grid">
        ${WEEKDAY_SHORT.map((w) => `<div class="weekday">${w}</div>`).join("")}
      </div>
      <div class="calendar-legend">
        <span><i class="legend-dot avail"></i> Disponível</span>
        <span><i class="legend-dot unavail"></i> Indisponível</span>
      </div>
    `;

    const grid = container.querySelector("#cal-grid");

    for (let i = 0; i < startWeekday; i++) {
      grid.insertAdjacentHTML("beforeend", `<div class="calendar-day empty"></div>`);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isPast = iso < todayIso;
      const beforeMin = minDate && iso < minDate;
      const afterMax = maxDate && iso > maxDate;

      const el = document.createElement("div");
      el.className = "calendar-day";
      el.textContent = day;
      el.dataset.date = iso;
      if (iso === todayIso) el.classList.add("today");

      if (isPast || beforeMin || afterMax) {
        el.classList.add("disabled");
      } else {
        // marca como "carregando" disponibilidade — resolvido abaixo
        el.classList.add("checking");
      }
      grid.appendChild(el);
    }

    // Resolve disponibilidade (pode ser assíncrona)
    const dayEls = Array.from(grid.querySelectorAll(".calendar-day.checking"));
    await Promise.all(
      dayEls.map(async (el) => {
        const iso = el.dataset.date;
        const available = await isAvailable(iso);
        el.classList.remove("checking");
        el.classList.add(available ? "available" : "disabled");
        if (available) {
          el.addEventListener("click", () => onSelect(iso));
        }
        if (iso === selectedDate) el.classList.add("selected");
      })
    );

    const prevBtn = container.querySelector('[data-nav="prev"]');
    const nextBtn = container.querySelector('[data-nav="next"]');
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    prevBtn.disabled = isCurrentMonth;
    prevBtn.addEventListener("click", () => {
      const d = new Date(year, month - 1, 1);
      onMonthChange(d.getFullYear(), d.getMonth());
    });
    nextBtn.addEventListener("click", () => {
      const d = new Date(year, month + 1, 1);
      onMonthChange(d.getFullYear(), d.getMonth());
    });
  }

  global.NailCalendar = { renderCalendar, MONTH_LABELS, WEEKDAY_SHORT };
})(window);
