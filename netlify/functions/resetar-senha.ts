// Gera uma senha aleatória forte e a define como nova senha do usuário
// (equivalente a "Reset Password" no painel do Supabase, mas com a senha
// já pronta em vez de exigir e-mail). Só admin pode usar.

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

function gerarSenhaForte(): string {
  // 20 caracteres, alfabeto sem símbolos ambíguos (0/O, 1/l/I) pra facilitar
  // repassar por telefone/mensagem sem erro de leitura.
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const bytes = crypto.randomBytes(20)
  let senha = ''
  for (let i = 0; i < 20; i++) senha += alfabeto[bytes[i] % alfabeto.length]
  return senha
}

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
    return { statusCode: 403, body: JSON.stringify({ error: 'Só administradores podem resetar senha de outros usuários.' }) }
  }

  if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Corpo vazio.' }) }
  const { userId } = JSON.parse(event.body)
  if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'userId é obrigatório.' }) }

  const novaSenha = gerarSenhaForte()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: novaSenha })

  if (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) }
  }

  return { statusCode: 200, body: JSON.stringify({ novaSenha }) }
}
