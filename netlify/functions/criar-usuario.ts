// Cria um usuário no Supabase Auth (equivalente ao "Add user" do painel do
// Supabase), chamado pela tela de Administração do app.
//
// Só quem já é admin (is_admin = true) consegue usar isso — o token de quem
// chama é verificado aqui antes de qualquer coisa. A SUPABASE_SERVICE_ROLE_KEY
// é a única forma de criar um usuário programaticamente, e por isso só pode
// rodar aqui (servidor), nunca no navegador.

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' }
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados no Netlify.' }) }
  }

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Não autenticado.' }) }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: quemChama, error: erroToken } = await admin.auth.getUser(token)
  if (erroToken || !quemChama.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Sessão inválida.' }) }
  }

  const { data: perfilQuemChama } = await admin
    .from('usuarios')
    .select('is_admin')
    .eq('id', quemChama.user.id)
    .single()

  if (!perfilQuemChama?.is_admin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Só administradores podem criar usuários.' }) }
  }

  if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Corpo vazio.' }) }
  const { email, senha, nome } = JSON.parse(event.body)

  if (!email || !senha) {
    return { statusCode: 400, body: JSON.stringify({ error: 'E-mail e senha são obrigatórios.' }) }
  }
  if (String(senha).length < 6) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A senha precisa ter pelo menos 6 caracteres.' }) }
  }

  const { data: novoUsuario, error: erroCriacao } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: nome ? { nome } : undefined,
  })

  if (erroCriacao) {
    return { statusCode: 400, body: JSON.stringify({ error: erroCriacao.message }) }
  }

  return { statusCode: 200, body: JSON.stringify({ id: novoUsuario.user?.id }) }
}
