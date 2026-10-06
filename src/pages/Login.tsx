import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signIn, contaDesativada } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmitLogin(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await signIn(email, senha)
    if (error) setErro(error)
    setEnviando(false)
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmitLogin}>
        <h1>Pedidos de Compra</h1>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {contaDesativada && (
          <p className="erro">Esta conta foi desativada. Fale com um administrador do sistema.</p>
        )}
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
