import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Empresa, Setor, SetorEmpresa, Usuario } from '../../types/database'

export function VinculosGestor() {
  const [vinculos, setVinculos] = useState<SetorEmpresa[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [gestores, setGestores] = useState<Usuario[]>([])
  const [form, setForm] = useState({ setor_id: '', empresa_id: '', gestor_id: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [{ data: v }, { data: e }, { data: s }, { data: g }] = await Promise.all([
      supabase.from('setores_empresas').select('*'),
      supabase.from('empresas').select('*').order('razao_social'),
      supabase.from('setores').select('*').order('nome'),
      supabase.from('usuarios').select('*').eq('perfil', 'gestor').order('nome'),
    ])
    setVinculos((v as SetorEmpresa[]) ?? [])
    setEmpresas((e as Empresa[]) ?? [])
    setSetores((s as Setor[]) ?? [])
    setGestores((g as Usuario[]) ?? [])
  }

  useEffect(() => { carregar() }, [])

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!form.setor_id || !form.empresa_id) return
    setSalvando(true)
    const { error } = await supabase.from('setores_empresas').insert({
      setor_id: form.setor_id,
      empresa_id: form.empresa_id,
      gestor_id: form.gestor_id || null,
    })
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setForm({ setor_id: '', empresa_id: '', gestor_id: '' })
    carregar()
  }

  async function mudarGestor(id: string, gestor_id: string) {
    const { error } = await supabase.from('setores_empresas').update({ gestor_id: gestor_id || null }).eq('id', id)
    if (error) { setErro(error.message); return }
    carregar()
  }

  async function alternarAtivo(v: SetorEmpresa) {
    const { error } = await supabase.from('setores_empresas').update({ ativo: !v.ativo }).eq('id', v.id)
    if (error) { setErro(error.message); return }
    carregar()
  }

  const nomeSetor = (id: string) => setores.find((s) => s.id === id)?.nome ?? '—'
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.razao_social ?? '—'

  return (
    <div className="card">
      <h3>Gestor responsável por Setor + Empresa</h3>
      <p className="vazio">
        Só o gestor vinculado aqui consegue aprovar orçamentos dos pedidos daquele
        setor/empresa. Combinações sem gestor definido ficam sem ninguém pra aprovar
        (exceto um administrador, que pode destravar manualmente).
      </p>

      {erro && <p className="erro">{erro}</p>}

      <table className="tabela-admin">
        <thead>
          <tr><th>Setor</th><th>Empresa</th><th>Gestor responsável</th><th>Ativo</th></tr>
        </thead>
        <tbody>
          {vinculos.map((v) => (
            <tr key={v.id} style={{ opacity: v.ativo ? 1 : 0.5 }}>
              <td>{nomeSetor(v.setor_id)}</td>
              <td>{nomeEmpresa(v.empresa_id)}</td>
              <td>
                <select value={v.gestor_id ?? ''} onChange={(e) => mudarGestor(v.id, e.target.value)}>
                  <option value="">(nenhum)</option>
                  {gestores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </td>
              <td>
                <input type="checkbox" checked={v.ativo} onChange={() => alternarAtivo(v)} />
              </td>
            </tr>
          ))}
          {vinculos.length === 0 && <tr><td className="vazio" colSpan={4}>Nenhuma combinação cadastrada.</td></tr>}
        </tbody>
      </table>

      <form className="form-grid" onSubmit={criar} style={{ marginTop: '1rem' }}>
        <label>
          Setor
          <select value={form.setor_id} onChange={(e) => setForm((f) => ({ ...f, setor_id: e.target.value }))}>
            <option value="">Selecione…</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label>
          Empresa
          <select value={form.empresa_id} onChange={(e) => setForm((f) => ({ ...f, empresa_id: e.target.value }))}>
            <option value="">Selecione…</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
          </select>
        </label>
        <label className="span-2">
          Gestor responsável (opcional, pode definir depois)
          <select value={form.gestor_id} onChange={(e) => setForm((f) => ({ ...f, gestor_id: e.target.value }))}>
            <option value="">(nenhum)</option>
            {gestores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        </label>
        <div className="span-2 acoes">
          <button type="submit" disabled={salvando}>Adicionar combinação</button>
        </div>
      </form>
    </div>
  )
}
