/**
 * app.js — lógica da página inicial (home pública)
 */
(async function () {
  try {
    await DataStore.init();

    const [settings, servicos] = await Promise.all([
      DataStore.getSettings(),
      DataStore.getServices({ apenasAtivos: true })
    ]);

    document.getElementById('ano').textContent = new Date().getFullYear();

    // Aplica cor primária configurável pelo admin
    if (settings.corPrimaria) {
      document.documentElement.style.setProperty('--color-primary', settings.corPrimaria);
    }
    if (settings.corSecundaria) {
      document.documentElement.style.setProperty('--color-primary-tint', settings.corSecundaria);
    }

    // Nome / textos
    document.title = `${settings.nomeProfissional} · ${settings.subtitulo || 'Nail Designer'}`;
    document.getElementById('nome-topo').textContent = settings.nomeProfissional;
    document.getElementById('nome-rodape').textContent = settings.nomeProfissional;
    document.getElementById('logo-inicial').textContent = (settings.nomeProfissional || 'N').charAt(0);
    document.getElementById('hero-legenda').textContent = settings.subtitulo || 'nail designer';
    document.getElementById('hero-descricao').textContent = settings.descricaoCurta || '';
    document.getElementById('sobre-texto').textContent = settings.sobreMim || 'Em breve, mais sobre o estúdio por aqui.';
    document.getElementById('sobre-assinatura').textContent = `— ${(settings.nomeProfissional || '').split(' ')[0]}`;
    document.getElementById('texto-instagram').textContent = settings.instagram || '';
    document.getElementById('texto-endereco').textContent = settings.endereco || '';

    // WhatsApp
    const wppNumero = (settings.whatsapp || '').replace(/\D/g, '');
    const wppLink = wppNumero ? `https://wa.me/${wppNumero}` : '#';
    document.getElementById('link-whatsapp').href = wppLink;
    document.getElementById('flutuante-whatsapp').href = wppLink;
    document.getElementById('texto-whatsapp').textContent = settings.whatsapp
      ? settings.whatsapp.replace(/^55/, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      : 'enviar mensagem';

    // Instagram
    const instaUser = (settings.instagram || '').replace('@', '');
    document.getElementById('link-instagram').href = instaUser ? `https://instagram.com/${instaUser}` : '#';

    // Lista de serviços
    const lista = document.getElementById('lista-servicos');
    if (servicos.length === 0) {
      lista.innerHTML = '<p>Nenhum serviço cadastrado no momento.</p>';
    } else {
      lista.innerHTML = servicos.map(s => `
        <a href="agendamento.html?servico=${s.id}" class="servico-card" style="text-decoration:none;color:inherit;">
          <span class="servico-card__miniatura">${iniciais(s.nome)}</span>
          <span class="servico-card__corpo">
            <span class="servico-card__nome">${s.nome}</span><br>
            <span class="servico-card__meta">${formatarDuracao(s.duracaoMin)}</span>
          </span>
          <span class="servico-card__preco">${formatarPreco(s.preco)}</span>
        </a>
      `).join('');
    }
  } catch (e) {
    console.error(e);
    const lista = document.getElementById('lista-servicos');
    if (lista) lista.innerHTML = '<p>Não foi possível carregar as informações agora. Tente novamente em instantes.</p>';
  }

  function iniciais(nome) {
    return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
  function formatarDuracao(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  }
  function formatarPreco(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
})();
