/**
 * auth.js
 * ------------------------------------------------------------------
 * Autenticação da área administrativa, via Supabase Auth (e-mail + senha).
 * A sessão fica guardada pelo próprio supabase-js (localStorage), e
 * o token é validado no servidor a cada chamada — inclusive nas
 * políticas de RLS que protegem as tabelas administrativas.
 * ------------------------------------------------------------------ */

const AuthService = {
  login: async function (email, senha) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password: senha
    });
    if (error) {
      return { ok: false, erro: 'E-mail ou senha incorretos.' };
    }
    return { ok: true, session: data.session };
  },

  logout: async function () {
    await supabaseClient.auth.signOut();
  },

  isLoggedIn: async function () {
    const { data } = await supabaseClient.auth.getSession();
    return !!data.session;
  },

  getUser: async function () {
    const { data } = await supabaseClient.auth.getUser();
    return data.user;
  },

  /** Envia e-mail de redefinição de senha (fluxo "esqueci minha senha"). */
  sendPasswordReset: async function (email) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/login.html'
    });
    if (error) return { ok: false, erro: error.message };
    return { ok: true };
  },

  /** Protege uma página admin: redireciona para o login se não houver sessão. */
  requireAuth: async function () {
    const logado = await this.isLoggedIn();
    if (!logado) {
      window.location.href = '../login.html';
    }
  }
};
