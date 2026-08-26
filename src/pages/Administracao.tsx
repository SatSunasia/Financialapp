import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { PERFIL_LABEL, type Empresa, type PerfilUsuario, type Setor, type Usuario } from '../types/database'
import { EmpresasSetores } from '../components/admin/EmpresasSetores'
import { VinculosGestor } from '../components/admin/VinculosGestor'

const PERFIS: PerfilUsuario[] = ['colaborador', 'compras', 'gestor', 'financeiro']
const ABAS = ['usuarios', 'cadastros', 'vinculos'] as const
type Aba = (typeof ABAS)[number]
const ABA_LABEL: Record<Aba, string> = {
  usuarios: 'Usuários',
  cadastros: 'Empresas & Setores',
  vinculos: 'Gestor por Setor',
}

export function Administracao() {
  const { usuario: eu } = useAuth()
  const [aba, setAba] = useState<Aba>('usuarios')

  if (!eu?.is_admin) {
    return (
      <div className="page">
        <h2>Administração</h2>
        <p className="vazio">Esta tela é só para administradores.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h2>Administração</h2>
      <div className="abas">
        {ABAS.map((a) => (
          <button key={a} className={'aba' + (aba === a ? ' ativa' : '')} onClick={() => setAba(a)}>
            {ABA_LABEL[a]}
          </button>
        ))}
      </div>

      {aba === 'usuarios' && <TabelaUsuarios euId={eu.id} />}
      {aba === 'cadastros' && <EmpresasSetores />}
      {aba === 'vinculos' && <VinculosGestor />}
    </div>
  )
}

function TabelaUsuarios({ euId }: { euId: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const [{ data: u, error }, { data: e }, { data: s }] = await Promise.all([
      supabase.from('usuarios').select('*').order('nome'),
      supabase.from('empresas').select('*').order('razao_social'),
      supabase.from('setores').select('*').order('nome'),
    ])
    if (error) setErro(error.message)
    else setUsuarios((u as Usuario[]) ?? [])
    setEmpresas((e as Empresa[]) ?? [])
    setSetores((s as Setor[]) ?? [])
    setCarregando(false)
  }

  async function salvar(id: string, campos: Partial<Usuario>) {
    setSalvandoId(id)
    setErro(null)
    const { error } = await supabase.from('usuarios').update(campos).eq('id', id)
    if (error) {
      setErro(`Não deu para salvar: ${error.message}`)
    } else {
      setUsuarios((lista) => lista.map((u) => (u.id === id ? { ...u, ...campos } : u)))
    }
    setSalvandoId(null)
  }

  async function excluir(u: Usuario) {
    const confirmado = confirm(
      `Excluir "${u.nome}" (${u.email})?\n\nSó funciona se essa pessoa nunca criou pedido, orçamento ou aprovação — caso contrário, desative em vez de excluir.`
    )
    if (!confirmado) return

    setSalvandoId(u.id)
    setErro(null)

    const { data: sessao } = await supabase.auth.getSession()
    const token = sessao.session?.access_token

    const resp = await fetch('/.netlify/functions/excluir-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: u.id }),
    })
    const resultado = await resp.json()

    if (!resp.ok) {
      setErro(resultado.error ?? 'Erro ao excluir usuário.')
      setSalvandoId(null)
      return
    }

    setUsuarios((lista) => lista.filter((x) => x.id !== u.id))
    setSalvandoId(null)
  }

  async function resetarSenha(u: Usuario) {
    const confirmado = confirm(`Gerar uma nova senha aleatória para "${u.nome}" (${u.email})?\n\nA senha atual dela deixa de funcionar imediatamente.`)
    if (!confirmado) return

    setSalvandoId(u.id)
    setErro(null)
    setSenhaGerada(null)

    const { data: sessao } = await supabase.auth.getSession()
    const token = sessao.session?.access_token

    const resp = await fetch('/.netlify/functions/resetar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: u.id }),
    })
    const resultado = await resp.json()

    if (!resp.ok) {
      setErro(resultado.error ?? 'Erro ao resetar senha.')
      setSalvandoId(null)
      return
    }

    setSenhaGerada({ email: u.email ?? u.nome, senha: resultado.novaSenha })
    setSalvandoId(null)
  }

  return (
    <>
      <p className="vazio">
        Perfil, setor/empresa e status dos usuários do sistema. O setor/empresa aqui é o que
        define para qual gestor os pedidos desse usuário vão (ver aba "Gestor por Setor").
      </p>

      <NovoUsuarioForm onCriado={carregar} />

      {senhaGerada && (
        <div className="card" style={{ borderColor: 'var(--primaria)' }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            Nova senha para <strong>{senhaGerada.email}</strong> — repasse por um canal seguro
            (a senha antiga já não funciona mais, e ela só aparece aqui uma vez):
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ background: 'var(--fundo)', padding: '0.4rem 0.7rem', borderRadius: '6px', fontSize: '1rem' }}>
              {senhaGerada.senha}
            </code>
            <button type="button" onClick={() => navigator.clipboard.writeText(senhaGerada.senha)}>Copiar</button>
            <button type="button" className="rejeitar" onClick={() => setSenhaGerada(null)}>Fechar</button>
          </div>
        </div>
      )}

      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="vazio">Carregando…</p>}

      {!carregando && (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela-admin">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Perfil</th>
                <th>Empresa</th>
                <th>Setor</th>
                <th>Ativo</th>
                <th>Admin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ opacity: salvandoId === u.id ? 0.5 : 1 }}>
                  <td>{u.email ?? '—'}</td>
                  <td>{u.nome}</td>
                  <td>
                    <select
                      value={u.perfil}
                      disabled={salvandoId === u.id}
                      onChange={(e) => salvar(u.id, { perfil: e.target.value as PerfilUsuario })}
                    >
                      {PERFIS.map((p) => (
                        <option key={p} value={p}>{PERFIL_LABEL[p]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={u.empresa_id ?? ''}
                      disabled={salvandoId === u.id}
                      onChange={(e) => salvar(u.id, { empresa_id: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={u.setor_id ?? ''}
                      disabled={salvandoId === u.id}
                      onChange={(e) => salvar(u.id, { setor_id: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {setores
                        .filter((s) => !u.empresa_id || s.empresa_id === u.empresa_id)
                        .map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={u.ativo}
                      disabled={salvandoId === u.id}
                      onChange={(e) => salvar(u.id, { ativo: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={u.is_admin}
                      disabled={salvandoId === u.id || u.id === euId}
                      title={u.id === euId ? 'Não é possível remover seu próprio acesso de admin por aqui.' : undefined}
                      onChange={(e) => salvar(u.id, { is_admin: e.target.checked })}
                    />
                  </td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      disabled={salvandoId === u.id}
                      onClick={() => resetarSenha(u)}
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                    >
                      Reset senha
                    </button>
                    {u.id !== euId && (
                      <button
                        type="button"
                        className="rejeitar"
                        disabled={salvandoId === u.id}
                        onClick={() => excluir(u)}
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', margin: 0 }}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function NovoUsuarioForm({ onCriado }: { onCriado: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'colaborador' as PerfilUsuario })
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!form.email || !form.senha) {
      setErro('Preencha e-mail e senha.')
      return
    }

    setEnviando(true)

    const { data: sessao } = await supabase.auth.getSession()
    const token = sessao.session?.access_token

    const resp = await fetch('/.netlify/functions/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: form.email, senha: form.senha, nome: form.nome || undefined, perfil: form.perfil }),
    })
    const resultado = await resp.json()

    if (!resp.ok) {
      setErro(resultado.error ?? 'Erro ao criar usuário.')
      setEnviando(false)
      return
    }

    setEnviando(false)
    setForm({ nome: '', email: '', senha: '', perfil: 'colaborador' })
    setAberto(false)
    onCriado()
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} style={{ marginBottom: '1rem' }}>
        + Criar novo usuário
      </button>
    )
  }

  return (
    <form className="card form-grid" onSubmit={criar} style={{ marginBottom: '1rem' }}>
      <label>
        Nome (opcional)
        <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
      </label>
      <label>
        E-mail *
        <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
      </label>
      <label>
        Senha *
        <input value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} placeholder="mínimo 6 caracteres" required />
      </label>
      <label>
        Perfil inicial
        <select value={form.perfil} onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value as PerfilUsuario }))}>
          {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
        </select>
      </label>
      {erro && <p className="erro span-2">{erro}</p>}
      <div className="span-2 acoes">
        <button type="button" className="rejeitar" onClick={() => setAberto(false)}>Cancelar</button>
        <button type="submit" disabled={enviando}>{enviando ? 'Criando…' : 'Criar usuário'}</button>
      </div>
    </form>
  )
}
