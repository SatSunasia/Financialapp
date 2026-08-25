import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Empresa, Setor } from '../../types/database'

export function EmpresasSetores() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [novaEmpresa, setNovaEmpresa] = useState('')
  const [novoSetorNome, setNovoSetorNome] = useState('')
  const [novoSetorEmpresa, setNovoSetorEmpresa] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    const [{ data: e }, { data: s }] = await Promise.all([
      supabase.from('empresas').select('*').order('razao_social'),
      supabase.from('setores').select('*').order('nome'),
    ])
    setEmpresas((e as Empresa[]) ?? [])
    setSetores((s as Setor[]) ?? [])
  }

  useEffect(() => { carregar() }, [])

  async function criarEmpresa(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!novaEmpresa.trim()) return
    const { error } = await supabase.from('empresas').insert({ razao_social: novaEmpresa.trim() })
    if (error) { setErro(error.message); return }
    setNovaEmpresa('')
    carregar()
  }

  async function criarSetor(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!novoSetorNome.trim() || !novoSetorEmpresa) return
    const { error } = await supabase.from('setores').insert({ nome: novoSetorNome.trim(), empresa_id: novoSetorEmpresa })
    if (error) { setErro(error.message); return }
    setNovoSetorNome('')
    carregar()
  }

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.razao_social ?? '—'

  return (
    <div className="admin-grid">
      {erro && <p className="erro">{erro}</p>}

      <div className="card">
        <h3>Empresas</h3>
        <table className="tabela-admin">
          <thead><tr><th>Razão Social</th></tr></thead>
          <tbody>
            {empresas.map((e) => <tr key={e.id}><td>{e.razao_social}</td></tr>)}
            {empresas.length === 0 && <tr><td className="vazio">Nenhuma empresa cadastrada.</td></tr>}
          </tbody>
        </table>
        <form className="form-grid" onSubmit={criarEmpresa} style={{ marginTop: '1rem' }}>
          <label className="span-2">
            Nova empresa
            <input value={novaEmpresa} onChange={(e) => setNovaEmpresa(e.target.value)} placeholder="Razão social" />
          </label>
          <div className="span-2 acoes">
            <button type="submit">Adicionar</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Setores</h3>
        <table className="tabela-admin">
          <thead><tr><th>Setor</th><th>Empresa</th></tr></thead>
          <tbody>
            {setores.map((s) => <tr key={s.id}><td>{s.nome}</td><td>{nomeEmpresa(s.empresa_id)}</td></tr>)}
            {setores.length === 0 && <tr><td className="vazio" colSpan={2}>Nenhum setor cadastrado.</td></tr>}
          </tbody>
        </table>
        <form className="form-grid" onSubmit={criarSetor} style={{ marginTop: '1rem' }}>
          <label>
            Novo setor
            <input value={novoSetorNome} onChange={(e) => setNovoSetorNome(e.target.value)} placeholder="Ex: TI, Financeiro…" />
          </label>
          <label>
            Empresa
            <select value={novoSetorEmpresa} onChange={(e) => setNovoSetorEmpresa(e.target.value)}>
              <option value="">Selecione…</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
            </select>
          </label>
          <div className="span-2 acoes">
            <button type="submit">Adicionar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
