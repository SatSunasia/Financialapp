import { useEffect, useState } from 'react'
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

  return (
    <>
      <p className="vazio">
        Perfil, setor/empresa e status dos usuários do sistema. Para criar um usuário novo, use{' '}
        <strong>Supabase → Authentication → Users</strong> (ver README) — ele aparece aqui
        automaticamente depois do primeiro login. O setor/empresa aqui é o que define para qual
        gestor os pedidos desse usuário vão (ver aba "Gestor por Setor").
      </p>

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
