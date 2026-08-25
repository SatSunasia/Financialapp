import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function NovaSenha() {
  const { definirNovaSenha } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.')
      return
    }

    setEnviando(true)
    const { error } = await definirNovaSenha(senha)
    setEnviando(false)

    if (error) setErro(error)
    else setSucesso(true)
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Definir Nova Senha</h1>

        {sucesso ? (
          <p className="mensagem">Senha atualizada! Você já pode continuar usando o sistema normalmente.</p>
        ) : (
          <>
            <label>
              Nova senha
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </label>
            <label>
              Confirmar nova senha
              <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            </label>
            {erro && <p className="erro">{erro}</p>}
            <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar nova senha'}</button>
          </>
        )}
      </form>
    </div>
  )
}
