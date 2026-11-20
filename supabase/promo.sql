-- ==================================================================
-- PROMOÇÃO (Black Friday e as próximas)
-- ------------------------------------------------------------------
-- Este arquivo documenta o que a promoção precisa no banco. Já está
-- aplicado no projeto em produção — ele existe para poder recriar
-- tudo do zero se for preciso. Pode rodar de novo sem medo: as três
-- partes são idempotentes.
--
-- Rodar em: Supabase > SQL Editor.
-- ==================================================================


-- 1) Onde as regras da promoção ficam guardadas -------------------
--    Um único JSON dentro de settings, editado no painel em
--    Configurações > Promoção. Formato:
--    { "ativa": true, "titulo": "Black Friday",
--      "pctNovas": 20, "pctAntigas": 10,
--      "inicio": "2026-11-23", "fim": "2026-11-27" }
alter table public.settings
  add column if not exists promo jsonb not null default '{}'::jsonb;


-- 2) Qual desconto foi dado em cada agendamento -------------------
--    Guardado no momento do agendamento, para a dona ver depois
--    quanto a cliente pagou. O painel reconfere esse número contra
--    as regras atuais (js/admin.js > valorDoAgendamento), então um
--    valor adulterado no navegador não engana o relatório.
alter table public.appointments
  add column if not exists desconto_pct smallint;


-- 3) "Esse WhatsApp já agendou aqui alguma vez?" ------------------
--    A página de agendamento é pública e NÃO pode ler a tabela de
--    agendamentos (a RLS não deixa, e é isso que protege os dados
--    das clientes). Então a pergunta é respondida por esta função,
--    que roda com permissão elevada (security definer) e devolve
--    só um sim ou não — nunca nome, data ou telefone de ninguém.
--
--    Conta qualquer agendamento, inclusive cancelado, conforme
--    combinado com o dono do site.
create or replace function public.cliente_e_antiga(p_whatsapp text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tel text;
begin
  -- só os dígitos; o 55 do começo (DDI) sai fora.
  -- atenção: aqui tem que ser '[^0-9]' e não '\D' — dentro de uma
  -- string do Postgres o \D não vale como regex e a limpeza não
  -- acontece, fazendo a função devolver false pra todo mundo.
  tel := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  tel := regexp_replace(tel, '^55', '');

  -- telefone curto demais não é telefone
  if length(tel) < 10 then
    return false;
  end if;

  return exists (
    select 1
      from public.appointments a
     where regexp_replace(
             regexp_replace(coalesce(a.cliente_whatsapp, ''), '[^0-9]', '', 'g'),
             '^55', ''
           ) = tel
  );
end;
$$;

revoke all on function public.cliente_e_antiga(text) from public;
grant execute on function public.cliente_e_antiga(text) to anon, authenticated;


-- ------------------------------------------------------------------
-- Conferido em produção em 19/11/2026, com um número que já agendou
-- (12) 99143-2579 e um que nunca agendou:
--
--   '12991432579'          -> true
--   '(12) 99143-2579'      -> true
--   '5512991432579'        -> true
--   '+55 (12) 99143-2579'  -> true
--   ' 12 99143 2579 '      -> true
--   '11988887777'          -> false
--   ''  /  '123'  /  '55'  -> false
-- ------------------------------------------------------------------
