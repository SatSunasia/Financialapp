import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signIn, solicitarRecuperacaoSenha, contaDesativada } = useAuth()
  const [modo, setModo] = useState<'login' | 'recuperar'>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmitLogin(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await signIn(email, senha)
    if (error) setErro(error)
    setEnviando(false)
  }

  async function onSubmitRecuperar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    setMensagem(null)
    const { error } = await solicitarRecuperacaoSenha(email)
    setEnviando(false)
    if (error) setErro(error)
    else setMensagem('Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.')
  }

  if (modo === 'recuperar') {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={onSubmitRecuperar}>
          <h1>Esqueci Minha Senha</h1>
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {mensagem && <p className="mensagem">{mensagem}</p>}
          {erro && <p className="erro">{erro}</p>}
          <button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar link de redefinição'}</button>
          <button type="button" className="link-secundario" onClick={() => { setModo('login'); setErro(null); setMensagem(null) }}>
            Voltar para o login
          </button>
        </form>
      </div>
    )
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
