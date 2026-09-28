/**
 * supabase-config.js
 * ------------------------------------------------------------------
 * Credenciais de conexão com o Supabase (projeto cariocaeglow-nail-agenda,
 * região sa-east-1 / São Paulo).
 *
 * A "anon/publishable key" abaixo é segura para expor no front-end:
 * ela só permite o que as políticas de RLS (Row Level Security) do
 * banco autorizarem para o papel "anon". Nunca coloque a "service_role"
 * ou "secret key" aqui — essa sim dá acesso total e nunca deve rodar
 * no navegador.
 *
 * Requer que o script do supabase-js já tenha sido carregado antes
 * deste arquivo (ver <script> no <head>/fim do <body> de cada página).
 * ------------------------------------------------------------------ */

const SUPABASE_URL = "https://vbxfgzcjfbequexrtzwa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LZwkz-1gTXOmCMKb_ecLXw_gstmPYFL";
