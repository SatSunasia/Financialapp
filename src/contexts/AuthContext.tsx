import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Usuario } from '../types/database'

interface AuthState {
  session: Session | null
  usuario: Usuario | null
  loading: boolean
  recuperandoSenha: boolean
  contaDesativada: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  solicitarRecuperacaoSenha: (email: string) => Promise<{ error: string | null }>
  definirNovaSenha: (novaSenha: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)
  const [contaDesativada, setContaDesativada] = useState(false)

  async function carregarUsuario(userId: string) {
    const { data } = await supabase.from('usuarios').select('*').eq('id', userId).single()
    const encontrado = data as Usuario | null
    if (encontrado && !encontrado.ativo) {
      setContaDesativada(true)
      setUsuario(null)
      await supabase.auth.signOut()
      return
    }
    setUsuario(encontrado)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) carregarUsuario(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
      setSession(newSession)
      if (newSession) {
        carregarUsuario(newSession.user.id)
      } else {
        setUsuario(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    setContaDesativada(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function solicitarRecuperacaoSenha(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error: error?.message ?? null }
  }

  async function definirNovaSenha(novaSenha: string) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (!error) setRecuperandoSenha(false)
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider
      value={{ session, usuario, loading, recuperandoSenha, contaDesativada, signIn, signOut, solicitarRecuperacaoSenha, definirNovaSenha }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
