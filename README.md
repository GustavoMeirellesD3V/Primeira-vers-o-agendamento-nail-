# Nail Studio — Sistema de Agendamento Online

Sistema completo de agendamento para Nail Designer, com área pública para
clientes e painel administrativo protegido por **login real** (Supabase
Auth). Front-end puro (HTML5 + CSS3 + JavaScript, sem build/bundler) +
banco de dados Postgres gerenciado pelo Supabase.

## ⚙️ Configuração obrigatória (fazer uma vez, antes de usar)

O sistema não funciona "do zero" — ele precisa de um projeto Supabase
configurado. Sem isso, o site mostra um aviso vermelho no topo da página.

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um
   novo projeto (Region: São Paulo, se disponível).
2. No painel do projeto, vá em **SQL Editor → New query**, cole todo o
   conteúdo de `supabase/schema.sql` deste projeto e clique em **Run**.
   Isso cria as tabelas, as regras de segurança (RLS) e os dados de
   exemplo.
3. Vá em **Authentication → Users → Add user** e crie o usuário da Nail
   Designer (o e-mail e a senha que ela vai usar para logar em
   `/login.html`). É esse cadastro — feito pelo próprio Supabase — que
   autentica o admin, não mais um valor fixo no código.
4. Vá em **Project Settings → API** e copie a **Project URL** e a
   **anon public key**.
5. Abra `js/supabase-config.js` neste projeto e cole os dois valores nas
   constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

Pronto — abra `index.html` (ou `login.html`) e o sistema já está
conectado ao banco real.

> **A "anon key" não é secreta.** Ela é feita para ficar exposta no
> navegador — é assim que todo site que usa Supabase funciona. Quem
> protege os dados são as regras de RLS em `supabase/schema.sql`, não o
> sigilo dessa chave. **Nunca** coloque a `service_role key` (essa sim
> secreta) em nenhum arquivo deste projeto.

## Como abrir no VS Code

1. Abra a pasta `nail-agenda` no VS Code (`File > Open Folder...`).
2. Instale a extensão **Live Server** (Ritwick Dey) — facilita rodar com
   recarregamento automático.
3. Clique com o botão direito em `index.html` → **Open with Live Server**.
   (Também funciona abrindo o arquivo direto no navegador, sem servidor.)

## Login da área administrativa

Acesse `/login.html` com o e-mail e senha que você cadastrou no passo 3
da configuração acima (**Authentication → Users** no Supabase). Existe
também "Esqueci minha senha", que envia um e-mail de redefinição de
verdade via Supabase Auth.

## Estrutura do projeto

```
/index.html              → página inicial (site institucional)
/agendamento.html         → fluxo de agendamento (etapas)
/login.html               → login da área administrativa
/robots.txt               → pede a buscadores para não indexar /admin
/.gitignore                → protege .env/segredos de irem para o Git

/admin/
  dashboard.html           → visão geral do dia
  agenda.html               → calendário (dia/semana/mês)
  agendamentos.html         → lista completa + editar/reagendar/cancelar
  servicos.html             → CRUD de serviços
  horarios.html             → configuração de dias/horários/pausas
  bloqueios.html            → bloqueio de datas/horários específicos
  clientes.html             → histórico de clientes
  configuracoes.html        → dados da profissional + identidade visual

/css/
  style.css                 → design system + área pública
  agendamento.css           → fluxo de agendamento
  admin.css                 → painel administrativo

/js/
  supabase-config.js         → suas credenciais do Supabase (preencher!)
  data.js                    → camada de dados — fala com o Supabase
  app.js                     → lógica da home
  agendamento.js              → lógica do fluxo de agendamento
  calendario.js               → componente de calendário reutilizável
  admin.js                    → layout/autenticação/utilitários do admin

/supabase/
  schema.sql                 → script único: tabelas + RLS + dados iniciais

/assets/
  imagens/, icones/           → coloque aqui suas imagens e ícones
```

## Sobre os dados (banco de dados)

Nenhuma tela fala diretamente com o Supabase — todas passam pelo objeto
`DB`, definido em `js/data.js` (`DB.getServices()`,
`DB.createAppointment()`, `DB.getAvailableSlots()`, `DB.login()` etc).
Se um dia quiser trocar de provedor (Firebase, MySQL + API própria...),
basta reescrever os métodos internos de `js/data.js` — o resto do
sistema não muda.

### Como a segurança funciona de verdade

- **Login**: Supabase Auth (usuário/senha reais, sessão via JWT). Não
  existe mais senha fixa no código.
- **Dados sensíveis** (nome/telefone das clientes) ficam na tabela
  `appointments`, que só pode ser **lida** por quem está autenticado
  (a Nail Designer logada). Um visitante anônimo só pode **criar** um
  agendamento novo — nunca ler os agendamentos de outras pessoas.
- Para calcular horários livres sem expor essa tabela, o site chama a
  função `get_busy_times()` (definida em `supabase/schema.sql`), que
  devolve só horário + duração, nunca nome/telefone.
- Tudo isso é reforçado no **banco**, via Row Level Security — não
  depende de nada escondido no JavaScript, que qualquer visitante pode
  ler pelo navegador de qualquer jeito.

## Identidade visual

As cores, nome, foto, logo, WhatsApp, Instagram, endereço, mensagem de
confirmação e tempo mínimo de agendamento podem ser alterados em
`/admin/configuracoes.html` — sem tocar em código.

## Personalização de conteúdo inicial

Os dados de exemplo (serviços, horários) são inseridos pelo próprio
`supabase/schema.sql`. Edite os valores no script antes de rodá-lo pela
primeira vez, ou ajuste tudo depois direto pela interface em
`/admin/servicos.html` e `/admin/horarios.html`.

## Publicando (GitHub + Vercel/Netlify/GitHub Pages)

- Pode deixar o repositório público sem problema: a "anon key" é
  pública por natureza, e os dados sensíveis (agendamentos) são
  protegidos pelo RLS no banco, não pelo sigilo do repositório.
- Se ainda assim preferir mais discrição, deixe o repositório privado —
  isso impede que qualquer pessoa veja o código-fonte pela interface do
  GitHub (mas não impede alguém de ler `js/data.js` pelo navegador no
  site publicado, já que isso é inerente a qualquer site estático).
