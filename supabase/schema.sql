-- ==================================================================
-- Schema do sistema de agendamento — Carioca e Glow
-- Execute este arquivo inteiro no SQL Editor do Supabase (projeto
-- cariocaeglow-nail-agenda, região sa-east-1).
-- ==================================================================

create extension if not exists pgcrypto;

-- ============ SETTINGS (linha única, id fixo = 1) ============
create table if not exists public.settings (
  id smallint primary key default 1,
  nome_profissional text not null default 'Carioca e Glow',
  subtitulo text default 'Nail Designer',
  descricao_curta text default 'Unhas com acabamento impecável, num estúdio pensado para você relaxar.',
  sobre_mim text,
  whatsapp text,
  instagram text,
  endereco text,
  cor_primaria text default '#6b4055',
  cor_secundaria text default '#e8c9c6',
  mensagem_confirmacao text default 'Agendamento confirmado! Mal posso esperar para te receber 💅',
  antecedencia_minima_horas int not null default 2,
  logo_url text,
  foto_url text,
  atualizado_em timestamptz default now(),
  constraint settings_singleton check (id = 1)
);

alter table public.settings enable row level security;

drop policy if exists "settings_select_public" on public.settings;
create policy "settings_select_public" on public.settings
  for select using (true);

drop policy if exists "settings_write_admin" on public.settings;
create policy "settings_write_admin" on public.settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============ SERVICES ============
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  duracao_min int not null check (duracao_min > 0),
  preco numeric(10,2) not null check (preco >= 0),
  ativo boolean not null default true,
  imagem_url text,
  criado_em timestamptz default now()
);

alter table public.services enable row level security;

drop policy if exists "services_select_public" on public.services;
create policy "services_select_public" on public.services
  for select using (true);

drop policy if exists "services_write_admin" on public.services;
create policy "services_write_admin" on public.services
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============ HOURS (uma linha por dia da semana) ============
create table if not exists public.hours (
  dia_semana text primary key check (dia_semana in ('dom','seg','ter','qua','qui','sex','sab')),
  ativo boolean not null default true,
  inicio time not null default '09:00',
  fim time not null default '18:00',
  intervalos jsonb not null default '[]'::jsonb
);

alter table public.hours enable row level security;

drop policy if exists "hours_select_public" on public.hours;
create policy "hours_select_public" on public.hours
  for select using (true);

drop policy if exists "hours_write_admin" on public.hours;
create policy "hours_write_admin" on public.hours
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============ BLOCKS (bloqueios de data/horário) ============
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  dia_inteiro boolean not null default true,
  horarios jsonb not null default '[]'::jsonb,
  motivo text,
  criado_em timestamptz default now()
);

alter table public.blocks enable row level security;

drop policy if exists "blocks_select_public" on public.blocks;
create policy "blocks_select_public" on public.blocks
  for select using (true);

drop policy if exists "blocks_write_admin" on public.blocks;
create policy "blocks_write_admin" on public.blocks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============ CLIENTS ============
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null unique,
  email text,
  ultimo_agendamento date,
  total_agendamentos int not null default 0
);

alter table public.clients enable row level security;

drop policy if exists "clients_admin_only" on public.clients;
create policy "clients_admin_only" on public.clients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============ APPOINTMENTS ============
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  servico_id uuid references public.services(id),
  servico_nome text not null,
  duracao_min int not null,
  preco numeric(10,2) not null,
  data date not null,
  horario time not null,
  cliente_nome text not null,
  cliente_whatsapp text not null,
  cliente_email text,
  observacao text,
  status text not null default 'confirmado' check (status in ('pendente','confirmado','concluido','cancelado','nao_compareceu')),
  criado_em timestamptz default now()
);

alter table public.appointments enable row level security;

drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all" on public.appointments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Sem policy pública: agendamentos públicos só entram via rpc_create_appointment,
-- que roda com privilégio elevado (SECURITY DEFINER) e valida o horário antes de gravar.
-- Isso evita que qualquer pessoa leia nome/whatsapp de outras clientes pela API.

create index if not exists idx_appointments_data on public.appointments (data);

-- ==================================================================
-- FUNÇÕES (RPC) — disponibilidade e criação de agendamento
-- ==================================================================

-- Horários livres para um serviço numa data
create or replace function public.rpc_available_slots(p_servico_id uuid, p_data date)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service record;
  v_dia_semana text;
  v_hours record;
  v_bloqueio_dia boolean;
  v_horarios_bloqueados text[];
  v_slots text[] := '{}';
  v_inicio_min int;
  v_fim_min int;
  v_passo int := 30;
  v_min_permitido int := -999999;
  v_agora_sp timestamptz := now() at time zone 'America/Sao_Paulo';
  v_hoje_sp date := (now() at time zone 'America/Sao_Paulo')::date;
  i int;
begin
  select * into v_service from public.services where id = p_servico_id and ativo = true;
  if not found then
    return v_slots;
  end if;

  v_dia_semana := (array['dom','seg','ter','qua','qui','sex','sab'])[extract(dow from p_data)::int + 1];

  select * into v_hours from public.hours where dia_semana = v_dia_semana;
  if not found or v_hours.ativo = false then
    return v_slots;
  end if;

  select exists(
    select 1 from public.blocks where data = p_data and dia_inteiro = true
  ) into v_bloqueio_dia;
  if v_bloqueio_dia then
    return v_slots;
  end if;

  select coalesce(array_agg(h), '{}')
    into v_horarios_bloqueados
    from public.blocks b, jsonb_array_elements_text(b.horarios) h
    where b.data = p_data and b.dia_inteiro = false;

  v_inicio_min := extract(hour from v_hours.inicio)::int * 60 + extract(minute from v_hours.inicio)::int;
  v_fim_min := extract(hour from v_hours.fim)::int * 60 + extract(minute from v_hours.fim)::int;

  if p_data = v_hoje_sp then
    select (extract(hour from v_agora_sp)::int * 60 + extract(minute from v_agora_sp)::int)
           + coalesce((select antecedencia_minima_horas from public.settings where id = 1), 0) * 60
      into v_min_permitido;
  end if;

  for i in 0..47 loop
    declare
      v_slot_inicio int := v_inicio_min + i * v_passo;
      v_slot_fim int := v_slot_inicio + v_service.duracao_min;
      v_slot_str text;
      v_cruza_intervalo boolean := false;
      v_cruza_ocupado boolean := false;
      v_intervalo jsonb;
    begin
      exit when v_slot_fim > v_fim_min;

      if p_data = v_hoje_sp and v_slot_inicio < v_min_permitido then
        continue;
      end if;

      for v_intervalo in select * from jsonb_array_elements(v_hours.intervalos) loop
        declare
          iv_inicio int := split_part(v_intervalo->>'inicio', ':', 1)::int * 60 + split_part(v_intervalo->>'inicio', ':', 2)::int;
          iv_fim int := split_part(v_intervalo->>'fim', ':', 1)::int * 60 + split_part(v_intervalo->>'fim', ':', 2)::int;
        begin
          if v_slot_inicio < iv_fim and v_slot_fim > iv_inicio then
            v_cruza_intervalo := true;
          end if;
        end;
      end loop;
      if v_cruza_intervalo then
        continue;
      end if;

      select exists(
        select 1 from public.appointments a
        where a.data = p_data and a.status <> 'cancelado'
          and v_slot_inicio < (extract(hour from a.horario)::int * 60 + extract(minute from a.horario)::int + a.duracao_min)
          and v_slot_fim > (extract(hour from a.horario)::int * 60 + extract(minute from a.horario)::int)
      ) into v_cruza_ocupado;
      if v_cruza_ocupado then
        continue;
      end if;

      v_slot_str := lpad((v_slot_inicio / 60)::text, 2, '0') || ':' || lpad((v_slot_inicio % 60)::text, 2, '0');

      if v_slot_str = any(v_horarios_bloqueados) then
        continue;
      end if;

      v_slots := array_append(v_slots, v_slot_str);
    end;
  end loop;

  return v_slots;
end;
$$;

grant execute on function public.rpc_available_slots(uuid, date) to anon, authenticated;

-- Dias com ao menos 1 horário livre, num mês inteiro (para pintar o calendário)
create or replace function public.rpc_available_dates(p_servico_id uuid, p_ano int, p_mes int)
returns date[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dias date[] := '{}';
  v_dia date;
  v_ultimo date;
begin
  v_dia := make_date(p_ano, p_mes, 1);
  v_ultimo := (v_dia + interval '1 month - 1 day')::date;
  while v_dia <= v_ultimo loop
    if coalesce(array_length(public.rpc_available_slots(p_servico_id, v_dia), 1), 0) > 0 then
      v_dias := array_append(v_dias, v_dia);
    end if;
    v_dia := v_dia + 1;
  end loop;
  return v_dias;
end;
$$;

grant execute on function public.rpc_available_dates(uuid, int, int) to anon, authenticated;

-- Cria o agendamento revalidando o horário no servidor (evita conflito de duas clientes
-- reservando o mesmo horário ao mesmo tempo) e atualiza/insere a cliente na tabela clients.
create or replace function public.rpc_create_appointment(
  p_servico_id uuid,
  p_data date,
  p_horario text,
  p_cliente_nome text,
  p_cliente_whatsapp text,
  p_cliente_email text,
  p_observacao text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service record;
  v_slots text[];
  v_novo_id uuid;
begin
  select * into v_service from public.services where id = p_servico_id and ativo = true;
  if not found then
    raise exception 'Serviço inválido ou inativo.';
  end if;

  if coalesce(trim(p_cliente_nome), '') = '' or coalesce(trim(p_cliente_whatsapp), '') = '' then
    raise exception 'Nome e WhatsApp são obrigatórios.';
  end if;

  v_slots := public.rpc_available_slots(p_servico_id, p_data);
  if not (p_horario = any(v_slots)) then
    raise exception 'Este horário não está mais disponível. Escolha outro horário.';
  end if;

  insert into public.appointments (
    servico_id, servico_nome, duracao_min, preco, data, horario,
    cliente_nome, cliente_whatsapp, cliente_email, observacao, status
  ) values (
    p_servico_id, v_service.nome, v_service.duracao_min, v_service.preco, p_data, p_horario::time,
    trim(p_cliente_nome), trim(p_cliente_whatsapp), nullif(trim(p_cliente_email), ''), nullif(trim(p_observacao), ''), 'confirmado'
  ) returning id into v_novo_id;

  insert into public.clients (nome, whatsapp, email, ultimo_agendamento, total_agendamentos)
  values (trim(p_cliente_nome), trim(p_cliente_whatsapp), nullif(trim(p_cliente_email), ''), p_data, 1)
  on conflict (whatsapp) do update
    set nome = excluded.nome,
        ultimo_agendamento = excluded.ultimo_agendamento,
        total_agendamentos = public.clients.total_agendamentos + 1;

  return v_novo_id;
end;
$$;

grant execute on function public.rpc_create_appointment(uuid, date, text, text, text, text, text) to anon, authenticated;

-- ==================================================================
-- SEED — dados iniciais de demonstração (rode uma única vez)
-- ==================================================================

insert into public.services (nome, descricao, duracao_min, preco, ativo) values
  ('Alongamento em Gel', 'Alongamento completo com gel, acabamento natural ou marcante.', 120, 150.00, true),
  ('Banho de Gel', 'Fortalecimento e brilho com camada de gel sobre a unha natural.', 60, 70.00, true),
  ('Manutenção', 'Manutenção do alongamento já existente.', 90, 90.00, true),
  ('Manicure Tradicional', 'Cutilagem, lixamento e esmaltação tradicional.', 45, 45.00, true),
  ('Nail Art', 'Desenhos e detalhes personalizados, por unha ou mão completa.', 60, 60.00, true),
  ('Esmaltação em Gel', 'Esmaltação em gel de longa duração, sem alongamento.', 50, 55.00, true),
  ('Remoção', 'Remoção segura de alongamento ou esmaltação em gel.', 30, 25.00, true)
on conflict do nothing;

insert into public.hours (dia_semana, ativo, inicio, fim, intervalos) values
  ('seg', true, '09:00', '18:00', '[{"inicio":"12:00","fim":"13:30"}]'),
  ('ter', true, '09:00', '18:00', '[{"inicio":"12:00","fim":"13:30"}]'),
  ('qua', true, '09:00', '18:00', '[{"inicio":"12:00","fim":"13:30"}]'),
  ('qui', true, '09:00', '18:00', '[{"inicio":"12:00","fim":"13:30"}]'),
  ('sex', true, '09:00', '18:00', '[{"inicio":"12:00","fim":"13:30"}]'),
  ('sab', true, '09:00', '14:00', '[]'),
  ('dom', false, '09:00', '14:00', '[]')
on conflict (dia_semana) do nothing;

update public.settings set
  whatsapp = '5511999999999',
  instagram = '@cariocaeglow',
  endereco = 'Cachoeira Paulista, SP'
where id = 1;
