import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { apenasNumeros, formatarCnpjCpf } from '../../lib/mascaras'
import type { Fornecedor } from '../../types/database'

const FORM_VAZIO = { nome: '', cnpj_cpf: '', contato: '', email: '', telefone: '' }

export function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  async function carregar() {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setFornecedores((data as Fornecedor[]) ?? [])
  }

  useEffect(() => { carregar() }, [])

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!form.nome.trim()) return
    const { error } = await supabase.from('fornecedores').insert({
      nome: form.nome.trim(),
      cnpj_cpf: form.cnpj_cpf || null,
      contato: form.contato || null,
      email: form.email || null,
      telefone: form.telefone || null,
    })
    if (error) { setErro(error.message); return }
    setForm(FORM_VAZIO)
    carregar()
  }

  async function alternarAtivo(f: Fornecedor) {
    setSalvandoId(f.id)
    const { error } = await supabase.from('fornecedores').update({ ativo: !f.ativo }).eq('id', f.id)
    if (error) setErro(error.message)
    setSalvandoId(null)
    carregar()
  }

  return (
    <div className="card">
      <h3>Fornecedores</h3>
      <p className="vazio">
        Só fornecedores cadastrados aqui aparecem pra escolher na hora de orçar um pedido.
      </p>

      {erro && <p className="erro">{erro}</p>}

      <table className="tabela-admin">
        <thead><tr><th>Nome</th><th>CNPJ/CPF</th><th>Contato</th><th>E-mail</th><th>Telefone</th><th>Ativo</th></tr></thead>
        <tbody>
          {fornecedores.map((f) => (
            <tr key={f.id} style={{ opacity: f.ativo ? 1 : 0.5 }}>
              <td>{f.nome}</td>
              <td>{f.cnpj_cpf ?? '—'}</td>
              <td>{f.contato ?? '—'}</td>
              <td>{f.email ?? '—'}</td>
              <td>{f.telefone ?? '—'}</td>
              <td>
                <input
                  type="checkbox"
                  checked={f.ativo}
                  disabled={salvandoId === f.id}
                  onChange={() => alternarAtivo(f)}
                />
              </td>
            </tr>
          ))}
          {fornecedores.length === 0 && <tr><td className="vazio" colSpan={6}>Nenhum fornecedor cadastrado.</td></tr>}
        </tbody>
      </table>

      <form className="form-grid" onSubmit={criar} style={{ marginTop: '1rem' }}>
        <label className="span-2">
          Nome *
          <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
        </label>
        <label>
          CNPJ/CPF
          <input
            type="text"
            inputMode="numeric"
            value={form.cnpj_cpf}
            onChange={(e) => setForm((f) => ({ ...f, cnpj_cpf: formatarCnpjCpf(e.target.value) }))}
          />
        </label>
        <label>
          Contato
          <input value={form.contato} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} placeholder="Nome do contato" />
        </label>
        <label>
          E-mail
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
        <label>
          Telefone
          <input
            type="text"
            inputMode="numeric"
            value={form.telefone}
            onChange={(e) => setForm((f) => ({ ...f, telefone: apenasNumeros(e.target.value, 11) }))}
          />
        </label>
        <div className="span-2 acoes">
          <button type="submit">Adicionar fornecedor</button>
        </div>
      </form>
    </div>
  )
}
