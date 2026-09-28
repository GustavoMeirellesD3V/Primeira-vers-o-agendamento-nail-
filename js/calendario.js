/**
 * calendario.js
 * ------------------------------------------------------------------
 * Componente de calendário mensal reutilizável.
 * Usado na etapa "Escolher data" do agendamento público.
 * ------------------------------------------------------------------ */

const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DIAS_SEMANA_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/**
 * Renderiza um calendário de mês dentro de `container`.
 *
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string}   opts.servicoId      - serviço já escolhido (define a disponibilidade)
 * @param {Date}     opts.mesReferencia  - qualquer data dentro do mês a exibir
 * @param {Date}     [opts.selecionada]  - data atualmente selecionada
 * @param {Function} opts.onSelectDate   - (Date) => void
 * @param {Function} opts.onMesChange    - (Date novoMesReferencia) => void
 * @param {Date}     [opts.minDate]      - não permite selecionar antes disso (padrão: hoje)
 */
async function renderCalendario(container, opts) {
  const { servicoId, mesReferencia, selecionada, onSelectDate, onMesChange } = opts;
  const minDate = opts.minDate || new Date(new Date().setHours(0, 0, 0, 0));

  const ano = mesReferencia.getFullYear();
  const mes = mesReferencia.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const totalDias = ultimoDia.getDate();
  const offsetInicio = primeiroDia.getDay(); // 0 = domingo

  container.innerHTML = `
    <div class="cal-header">
      <button type="button" class="cal-nav" data-nav="-1" aria-label="Mês anterior">‹</button>
      <span class="cal-titulo">${MESES_LABEL[mes]} ${ano}</span>
      <button type="button" class="cal-nav" data-nav="1" aria-label="Próximo mês">›</button>
    </div>
    <div class="cal-grid cal-grid-cabecalho">
      ${DIAS_SEMANA_CURTO.map(d => `<span>${d}</span>`).join('')}
    </div>
    <div class="cal-grid cal-grid-dias" id="cal-dias">
      <div class="cal-loading">Carregando datas…</div>
    </div>
  `;

  container.querySelectorAll('.cal-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.nav, 10);
      const novoMes = new Date(ano, mes + delta, 1);
      onMesChange(novoMes);
    });
  });

  const diasContainer = container.querySelector('#cal-dias');

  let datasDisponiveis;
  try {
    datasDisponiveis = await DataStore.getAvailableDatesInMonth(servicoId, ano, mes + 1);
  } catch (e) {
    diasContainer.innerHTML = '<div class="cal-loading">Não foi possível carregar as datas. Tente novamente.</div>';
    return;
  }

  const celulas = [];
  for (let i = 0; i < offsetInicio; i++) {
    celulas.push('<span class="cal-dia cal-dia--vazio"></span>');
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const data = new Date(ano, mes, dia);
    const iso = dateToISO(data);
    const passou = data < minDate;
    const disponivel = datasDisponiveis.has(iso) && !passou;
    const isSelecionada = selecionada && dateToISO(selecionada) === iso;
    const isHoje = dateToISO(new Date()) === iso;

    const classes = ['cal-dia'];
    if (!disponivel) classes.push('cal-dia--indisponivel');
    if (isSelecionada) classes.push('cal-dia--selecionada');
    if (isHoje) classes.push('cal-dia--hoje');

    celulas.push(
      `<button type="button" class="${classes.join(' ')}" data-dia="${dia}" ${disponivel ? '' : 'disabled'} aria-label="${dia} de ${MESES_LABEL[mes]}">${dia}</button>`
    );
  }

  diasContainer.innerHTML = celulas.join('');

  diasContainer.querySelectorAll('.cal-dia:not(.cal-dia--vazio):not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const dia = parseInt(btn.dataset.dia, 10);
      onSelectDate(new Date(ano, mes, dia));
    });
  });
}
