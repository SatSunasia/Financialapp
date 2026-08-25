// Exclui um usuário do Supabase Auth (equivalente a excluir em
// Authentication → Users no painel do Supabase), chamado pela tela de
// Administração. Só quem já é admin consegue usar.
//
// Se o usuário já tiver pedidos/cotações/histórico associados, a exclusão
// é recusada (a chave estrangeira não deixa apagar) — nesse caso a
// recomendação é desativar em vez de excluir, pra não perder o histórico.

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' }
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY não configurados no Netlify.' }) }
  }

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Não autenticado.' }) }
  }

  const respostaUsuario = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  })
  if (!respostaUsuario.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Sessão inválida.' }) }
  }
  const quemChama = await respostaUsuario.json()

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: perfilQuemChama } = await admin
    .from('usuarios')
    .select('is_admin')
    .eq('id', quemChama.id)
    .single()

  if (!perfilQuemChama?.is_admin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Só administradores podem excluir usuários.' }) }
  }

  if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Corpo vazio.' }) }
  const { userId } = JSON.parse(event.body)
  if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'userId é obrigatório.' }) }

  if (userId === quemChama.id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Você não pode excluir sua própria conta.' }) }
  }

  const { error: erroExclusao } = await admin.auth.admin.deleteUser(userId)

  if (erroExclusao) {
    const temHistorico = /foreign key|violat/i.test(erroExclusao.message)
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: temHistorico
          ? 'Esse usuário já tem pedidos, orçamentos ou aprovações no histórico — não dá para excluir sem perder esses registros. Desative em vez de excluir.'
          : erroExclusao.message,
      }),
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}
