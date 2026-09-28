/**
 * agendamento.js — controla o fluxo de agendamento público (6 etapas)
 */
(function () {
  const TOTAL_ETAPAS = 6;

  const estado = {
    etapaAtual: 1,
    servico: null,
    dataSelecionada: null, // Date
    horarioSelecionado: null, // 'HH:MM'
    mesCalendario: new Date(),
    cliente: { nome: '', whatsapp: '', email: '', observacao: '' },
    settings: null
  };

  const els = {
    etapas: document.querySelectorAll('.etapa'),
    progresso: document.getElementById('progresso'),
    btnVoltar: document.getElementById('btn-voltar'),
    btnContinuar: document.getElementById('btn-continuar'),
    listaServicos: document.getElementById('lista-opcoes-servico'),
    calendario: document.getElementById('calendario'),
    areaHorarios: document.getElementById('area-horarios'),
    legendaHorarios: document.getElementById('legenda-horarios'),
    formDados: document.getElementById('form-dados'),
    resumo: document.getElementById('resumo'),
    resumoErro: document.getElementById('resumo-erro'),
    resumoFinal: document.getElementById('resumo-final'),
    mensagemSucesso: document.getElementById('mensagem-sucesso'),
    btnCalendario: document.getElementById('btn-calendario'),
    btnWhatsappSucesso: document.getElementById('btn-whatsapp-sucesso')
  };

  function formatarPreco(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatarDuracao(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  }
  function formatarDataLonga(date) {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  function formatarDataCurta(date) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function atualizarProgresso() {
    const passos = els.progresso.querySelectorAll('.progresso__passo');
    passos.forEach((p, idx) => {
      const numero = idx + 1;
      p.classList.toggle('progresso__passo--ativo', numero === estado.etapaAtual);
      p.classList.toggle('progresso__passo--concluido', numero < estado.etapaAtual);
    });
  }

  function irParaEtapa(numero) {
    estado.etapaAtual = numero;
    els.etapas.forEach(sec => {
      sec.classList.toggle('etapa--ativa', parseInt(sec.dataset.etapa, 10) === numero);
    });
    atualizarProgresso();
    document.getElementById('barra-inferior').style.display = numero === 6 ? 'none' : 'block';
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    renderizarEtapaAtual();
  }

  function podeAvancar() {
    switch (estado.etapaAtual) {
      case 1: return !!estado.servico;
      case 2: return !!estado.dataSelecionada;
      case 3: return !!estado.horarioSelecionado;
      case 4: return validarFormulario(false);
      case 5: return true;
      default: return false;
    }
  }

  function atualizarBotaoContinuar() {
    els.btnContinuar.disabled = !podeAvancar();
    els.btnContinuar.textContent = estado.etapaAtual === 5 ? 'Confirmar agendamento' : 'Continuar';
  }

  /* ---------------- ETAPA 1: SERVIÇOS ---------------- */
  async function renderEtapaServicos() {
    els.listaServicos.innerHTML = '<p>Carregando serviços…</p>';
    let servicos;
    try {
      servicos = await DataStore.getServices({ apenasAtivos: true });
    } catch (e) {
      els.listaServicos.innerHTML = '<div class="estado-erro">Não foi possível carregar os serviços. Tente recarregar a página.</div>';
      return;
    }
    if (servicos.length === 0) {
      els.listaServicos.innerHTML = '<p>Nenhum serviço disponível no momento.</p>';
      return;
    }
    els.listaServicos.innerHTML = servicos.map(s => `
      <button type="button" class="opcao-servico ${estado.servico && estado.servico.id === s.id ? 'opcao-servico--selecionada' : ''}" data-id="${s.id}">
        <span class="opcao-servico__icone">${s.nome.charAt(0)}</span>
        <span class="opcao-servico__corpo">
          <span class="opcao-servico__nome">${s.nome}</span>
          <p class="opcao-servico__desc">${s.descricao || ''}</p>
          <span class="opcao-servico__meta">${formatarDuracao(s.duracaoMin)}</span>
        </span>
        <span class="opcao-servico__preco">${formatarPreco(s.preco)}</span>
      </button>
    `).join('');

    els.listaServicos.querySelectorAll('.opcao-servico').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        estado.servico = await DataStore.getServiceById(id);
        // se a data/horário já escolhidos deixam de ser válidos para o novo serviço, reseta
        estado.dataSelecionada = null;
        estado.horarioSelecionado = null;
        renderEtapaServicos();
        atualizarBotaoContinuar();
      });
    });
  }

  /* ---------------- ETAPA 2: DATA ---------------- */
  async function renderEtapaCalendario() {
    if (!estado.servico) return;
    await renderCalendario(els.calendario, {
      servicoId: estado.servico.id,
      mesReferencia: estado.mesCalendario,
      selecionada: estado.dataSelecionada,
      onSelectDate: (date) => {
        estado.dataSelecionada = date;
        estado.horarioSelecionado = null;
        renderEtapaCalendario();
        atualizarBotaoContinuar();
      },
      onMesChange: (novoMes) => {
        estado.mesCalendario = novoMes;
        renderEtapaCalendario();
      }
    });
  }

  /* ---------------- ETAPA 3: HORÁRIO ---------------- */
  async function renderEtapaHorarios() {
    if (!estado.servico || !estado.dataSelecionada) return;
    els.legendaHorarios.textContent = `Para ${formatarDataLonga(estado.dataSelecionada)}.`;
    els.areaHorarios.innerHTML = '<p>Consultando agenda…</p>';

    const dataISO = dateToISO(estado.dataSelecionada);
    let slots;
    try {
      slots = await DataStore.getAvailableSlots(estado.servico.id, dataISO);
    } catch (e) {
      els.areaHorarios.innerHTML = '<div class="estado-erro">Não foi possível consultar os horários. Tente novamente.</div>';
      return;
    }

    if (slots.length === 0) {
      els.areaHorarios.innerHTML = `
        <div class="aviso-vazio">
          <div class="aviso-vazio__icone">🗓️</div>
          <p>Não existem horários disponíveis para esta data.</p>
          <button type="button" class="btn btn--ghost" id="btn-outra-data" style="margin-top:1rem;">Escolher outra data</button>
        </div>
      `;
      document.getElementById('btn-outra-data').addEventListener('click', () => irParaEtapa(2));
      return;
    }

    els.areaHorarios.innerHTML = `
      <div class="grade-horarios">
        ${slots.map(h => `<button type="button" class="horario-btn ${estado.horarioSelecionado === h ? 'horario-btn--selecionado' : ''}" data-hora="${h}">${h}</button>`).join('')}
      </div>
    `;
    els.areaHorarios.querySelectorAll('.horario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        estado.horarioSelecionado = btn.dataset.hora;
        renderEtapaHorarios();
        atualizarBotaoContinuar();
      });
    });
  }

  /* ---------------- ETAPA 4: DADOS ---------------- */
  function validarFormulario(mostrarErros) {
    const nome = document.getElementById('input-nome').value.trim();
    const whatsapp = document.getElementById('input-whatsapp').value.trim();

    const nomeValido = nome.split(' ').filter(Boolean).length >= 2;
    const whatsappValido = whatsapp.replace(/\D/g, '').length >= 10;

    if (mostrarErros) {
      document.getElementById('campo-nome').classList.toggle('campo--invalido', !nomeValido);
      document.getElementById('campo-whatsapp').classList.toggle('campo--invalido', !whatsappValido);
    }
    return nomeValido && whatsappValido;
  }

  function capturarDadosFormulario() {
    estado.cliente = {
      nome: document.getElementById('input-nome').value.trim(),
      whatsapp: document.getElementById('input-whatsapp').value.trim(),
      email: document.getElementById('input-email').value.trim(),
      observacao: document.getElementById('input-obs').value.trim()
    };
  }

  /* ---------------- ETAPA 5: RESUMO ---------------- */
  function montarLinhasResumo() {
    return `
      <div class="resumo__linha">
        <span class="resumo__label">Serviço</span>
        <span class="resumo__valor">${estado.servico.nome}</span>
      </div>
      <div class="resumo__linha">
        <span class="resumo__label">Data</span>
        <span class="resumo__valor">${formatarDataCurta(estado.dataSelecionada)}</span>
      </div>
      <div class="resumo__linha">
        <span class="resumo__label">Horário</span>
        <span class="resumo__valor">${estado.horarioSelecionado}</span>
      </div>
      <div class="resumo__linha">
        <span class="resumo__label">Duração</span>
        <span class="resumo__valor">${formatarDuracao(estado.servico.duracaoMin)}</span>
      </div>
      <div class="resumo__linha">
        <span class="resumo__label">Cliente</span>
        <span class="resumo__valor">${estado.cliente.nome}</span>
      </div>
      <div class="resumo__linha resumo__linha--total">
        <span class="resumo__label">Valor</span>
        <span class="resumo__valor">${formatarPreco(estado.servico.preco)}</span>
      </div>
    `;
  }

  function renderEtapaResumo() {
    els.resumoErro.classList.remove('resumo__erro--ativo');
    els.resumo.innerHTML = montarLinhasResumo();
  }

  /* ---------------- ETAPA 6: SUCESSO ---------------- */
  async function finalizarAgendamento() {
    const agendamento = {
      servicoId: estado.servico.id,
      data: dateToISO(estado.dataSelecionada),
      horario: estado.horarioSelecionado,
      clienteNome: estado.cliente.nome,
      clienteWhatsapp: estado.cliente.whatsapp,
      clienteEmail: estado.cliente.email,
      observacao: estado.cliente.observacao
    };

    try {
      await DataStore.addAppointment(agendamento);
    } catch (e) {
      // O horário pode ter sido ocupado por outra cliente entre a escolha e a
      // confirmação — o servidor recusa e devolve uma mensagem explicando isso.
      // Como o horário escolhido não é mais válido, volta para a etapa de
      // horários já com uma nova consulta (a lista de livres mudou).
      estado.horarioSelecionado = null;
      els.btnContinuar.disabled = false;
      els.btnContinuar.textContent = 'Confirmar agendamento';
      irParaEtapa(3);
      window.alert(e.message || 'Esse horário acabou de ser preenchido. Escolha outro horário, por favor.');
      return;
    }

    els.mensagemSucesso.textContent = estado.settings.mensagemConfirmacao || 'Agendamento realizado com sucesso!';
    els.resumoFinal.innerHTML = montarLinhasResumo();

    // Link "adicionar ao calendário" (formato .ics via data URI)
    els.btnCalendario.href = gerarLinkICS(agendamento);
    els.btnCalendario.setAttribute('download', 'agendamento.ics');

    const wppNumero = (estado.settings.whatsapp || '').replace(/\D/g, '');
    els.btnWhatsappSucesso.href = wppNumero ? `https://wa.me/${wppNumero}` : '#';

    irParaEtapa(6);
  }

  function gerarLinkICS(ag) {
    const [ano, mes, dia] = ag.data.split('-').map(Number);
    const [h, m] = ag.horario.split(':').map(Number);
    const inicio = new Date(ano, mes - 1, dia, h, m);
    const fim = new Date(inicio.getTime() + estado.servico.duracaoMin * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `DTSTART:${fmt(inicio)}`, `DTEND:${fmt(fim)}`,
      `SUMMARY:${estado.servico.nome} — ${estado.settings.nomeProfissional || 'Nail Designer'}`,
      `DESCRIPTION:Agendamento de ${estado.servico.nome}`,
      `LOCATION:${estado.settings.endereco || ''}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }

  /* ---------------- Orquestração ---------------- */
  function renderizarEtapaAtual() {
    switch (estado.etapaAtual) {
      case 1: renderEtapaServicos(); break;
      case 2: renderEtapaCalendario(); break;
      case 3: renderEtapaHorarios(); break;
      case 4: break; // formulário já está no DOM
      case 5: renderEtapaResumo(); break;
    }
    atualizarBotaoContinuar();
  }

  els.btnContinuar.addEventListener('click', async () => {
    if (estado.etapaAtual === 4) {
      capturarDadosFormulario();
      if (!validarFormulario(true)) return;
    }
    if (estado.etapaAtual === 5) {
      els.btnContinuar.disabled = true;
      els.btnContinuar.textContent = 'Confirmando…';
      await finalizarAgendamento();
      return;
    }
    if (estado.etapaAtual < TOTAL_ETAPAS - 1) {
      irParaEtapa(estado.etapaAtual + 1);
    }
  });

  els.btnVoltar.addEventListener('click', (e) => {
    e.preventDefault();
    if (estado.etapaAtual > 1) {
      irParaEtapa(estado.etapaAtual - 1);
    } else {
      window.location.href = 'index.html';
    }
  });

  els.formDados.addEventListener('input', () => {
    validarFormulario(false);
    atualizarBotaoContinuar();
  });

  async function iniciar() {
    try {
      await DataStore.init();
      estado.settings = await DataStore.getSettings();
    } catch (e) {
      estado.settings = {};
    }
    if (estado.settings.corPrimaria) {
      document.documentElement.style.setProperty('--color-primary', estado.settings.corPrimaria);
    }
    if (estado.settings.corSecundaria) {
      document.documentElement.style.setProperty('--color-primary-tint', estado.settings.corSecundaria);
    }

    // Permite pré-selecionar serviço via ?servico=ID (vindo da home)
    const params = new URLSearchParams(window.location.search);
    const servicoId = params.get('servico');
    if (servicoId) {
      try {
        estado.servico = await DataStore.getServiceById(servicoId);
      } catch (e) {
        estado.servico = null;
      }
    }

    irParaEtapa(1);
  }

  iniciar();
})();
