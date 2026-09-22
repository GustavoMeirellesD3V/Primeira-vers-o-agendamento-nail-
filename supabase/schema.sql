-- =========================================================
-- NAIL STUDIO — schema.sql
-- ---------------------------------------------------------
-- Execute este arquivo inteiro no SQL Editor do seu projeto
-- Supabase (Project > SQL Editor > New query > colar tudo >
-- Run). Ele cria as tabelas, as regras de segurança (RLS) e
-- os dados iniciais (mesmos valores de exemplo que o sistema
-- já usava em localStorage).
--
-- Depois de rodar este script, crie o usuário administrador em:
-- Project > Authentication > Users > Add user
-- (email + senha — é esse login que você vai usar em /login.html)
-- =========================================================

create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ---------------------------------------------------------
-- SETTINGS (linha única, id sempre = 1)
-- ---------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1,
  nome text not null default 'Nail Designer',
  subtitulo text not null default 'Nail Designer',
  descricao text not null default '',
  foto text not null default '',
  logo text not null default '',
  whatsapp text not null default '',
  instagram text not null default '',
  endereco text not null default '',
  mensagem_confirmacao text not null default 'Agendamento realizado com sucesso! 💅',
  tempo_minimo_horas int not null default 2,
  dias_futuros_visiveis int not null default 45,
  cores jsonb not null default '{"primary":"#C98CA0","primaryDark":"#A96A7E","primaryLight":"#F6E4E8","nude":"#EFE1D4","gold":"#C9A24B"}',
  constraint settings_singleton check (id = 1)
);

-- ---------------------------------------------------------
-- SCHEDULE (linha única, id sempre = 1) — mesmo formato JSON
-- que o sistema já usava: { seg: {ativo, expediente[], pausas[]}, ... }
-- ---------------------------------------------------------
create table if not exists public.schedule (
  id int primary key default 1,
  data jsonb not null,
  constraint schedule_singleton check (id = 1)
);

-- ---------------------------------------------------------
-- BLOCKED_DATES
-- ---------------------------------------------------------
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  full_day boolean not null default true,
  horarios text[] not null default '{}',
  motivo text not null default 'Sem atendimento',
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  preco numeric(10,2) not null default 0,
  duracao_min int not null default 30,
  imagem text not null default '',
  ativo boolean not null default true
);

-- ---------------------------------------------------------
-- APPOINTMENTS
-- ---------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete set null,
  data date not null,
  horario time not null,
  cliente_nome text not null,
  cliente_whatsapp text not null,
  cliente_email text not null default '',
  observacao text not null default '',
  status text not null default 'pendente'
    check (status in ('pendente','confirmado','concluido','cancelado','faltou')),
  criado_em timestamptz not null default now()
);

create index if not exists appointments_data_idx on public.appointments (data);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.settings enable row level security;
alter table public.schedule enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- Leitura pública (o site precisa mostrar serviços, horários e config a
-- qualquer visitante, sem login)
create policy "settings: leitura publica" on public.settings for select using (true);
create policy "schedule: leitura publica" on public.schedule for select using (true);
create policy "blocked_dates: leitura publica" on public.blocked_dates for select using (true);
create policy "services: leitura publica" on public.services for select using (true);

-- Escrita liberada SOMENTE para usuários autenticados (a Nail Designer logada)
create policy "settings: escrita admin" on public.settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "schedule: escrita admin" on public.schedule for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "blocked_dates: escrita admin" on public.blocked_dates for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "services: escrita admin" on public.services for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Agendamentos: qualquer visitante pode CRIAR (agendar), mas não pode
-- ler, editar ou apagar agendamentos — isso evita expor nome/telefone
-- de outras clientes. Só a admin autenticada tem acesso total.
create policy "appointments: criar publico" on public.appointments for insert
  with check (status = 'pendente');
create policy "appointments: acesso total admin" on public.appointments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- FUNÇÃO PÚBLICA: horários já ocupados em uma data
-- ---------------------------------------------------------
-- Como a tabela appointments não é legível por visitantes (só INSERT),
-- esta função devolve apenas o horário + duração do serviço ocupado
-- naquela data — o suficiente para calcular disponibilidade no site,
-- sem expor nome/telefone de nenhuma cliente.
create or replace function public.get_busy_times(p_date date)
returns table (horario time, duracao_min int)
language sql
security definer
set search_path = public
as $$
  select a.horario, coalesce(s.duracao_min, 30) as duracao_min
  from public.appointments a
  left join public.services s on s.id = a.service_id
  where a.data = p_date
    and a.status <> 'cancelado';
$$;

grant execute on function public.get_busy_times(date) to anon, authenticated;

-- =========================================================
-- DADOS INICIAIS (os mesmos valores de exemplo do sistema)
-- Edite os valores abaixo antes de rodar, se já souber os dados reais,
-- ou ajuste depois em /admin/configuracoes.html.
-- =========================================================

insert into public.settings (id, nome, subtitulo, descricao, whatsapp, instagram, endereco, mensagem_confirmacao, tempo_minimo_horas, dias_futuros_visiveis)
values (
  1,
  'Camila Duarte',
  'Nail Designer',
  'Especialista em alongamento em gel e nail art, atendimento humanizado e materiais de alta qualidade em um studio pensado para o seu momento de autocuidado.',
  '5511999999999',
  '@camiladuarte.nails',
  'Rua das Flores, 123 — Jardim Primavera, São Paulo/SP',
  'Agendamento realizado com sucesso! Mal podemos esperar para te receber 💅',
  2,
  45
)
on conflict (id) do nothing;

insert into public.schedule (id, data) values (
  1,
  '{
    "seg": {"ativo": true,  "expediente": [{"inicio":"08:00","fim":"18:00"}], "pausas": [{"inicio":"12:00","fim":"13:30"}]},
    "ter": {"ativo": true,  "expediente": [{"inicio":"08:00","fim":"18:00"}], "pausas": [{"inicio":"12:00","fim":"13:30"}]},
    "qua": {"ativo": false, "expediente": [{"inicio":"08:00","fim":"18:00"}], "pausas": []},
    "qui": {"ativo": true,  "expediente": [{"inicio":"10:00","fim":"20:00"}], "pausas": [{"inicio":"13:00","fim":"14:00"}]},
    "sex": {"ativo": true,  "expediente": [{"inicio":"08:00","fim":"18:00"}], "pausas": [{"inicio":"12:00","fim":"13:30"}]},
    "sab": {"ativo": true,  "expediente": [{"inicio":"08:00","fim":"14:00"}], "pausas": []},
    "dom": {"ativo": false, "expediente": [{"inicio":"08:00","fim":"12:00"}], "pausas": []}
  }'::jsonb
)
on conflict (id) do nothing;

insert into public.services (nome, descricao, preco, duracao_min, ativo) values
  ('Alongamento em Gel', 'Alongamento com fibra de vidro ou gel, acabamento natural.', 150, 120, true),
  ('Banho de Gel', 'Fortalecimento e proteção das unhas naturais.', 80, 60, true),
  ('Manutenção', 'Manutenção de alongamento já existente.', 100, 90, true),
  ('Manicure', 'Cutilagem, lixamento e esmaltação tradicional.', 45, 45, true),
  ('Nail Art', 'Desenhos e decorações personalizadas por unha.', 30, 30, true),
  ('Esmaltação em Gel', 'Esmaltação de longa duração com acabamento em gel.', 60, 50, true),
  ('Remoção', 'Remoção segura de alongamento ou esmaltação em gel.', 25, 30, true)
on conflict do nothing;
