import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { apenasNumeros, formatarCnpjCpf } from '../lib/mascaras'
import type { NaturezaPedido } from '../types/database'

const FORM_VAZIO = {
  descricao_item: '',
  quantidade: '',
  valor_estimado: '',
  natureza_pedido_id: '',
  fornecedor_sugerido: '',
  cnpj_fornecedor: '',
  justificativa: '',
  observacao: '',
}

export function NovoPedido() {
  const { usuario } = useAuth()
  const [naturezas, setNaturezas] = useState<NaturezaPedido[]>([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    supabase.from('naturezas_pedido').select('*').order('nome').then(({ data }) => {
      setNaturezas((data as NaturezaPedido[]) ?? [])
    })
  }, [])

  function campo(nome: keyof typeof form) {
    return {
      value: form[nome],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [nome]: e.target.value })),
    }
  }

  function limparCampos() {
    setForm(FORM_VAZIO)
    setMensagem(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!usuario) return
    setMensagem(null)

    const quantidade = Number(form.quantidade)
    const valor = Number(form.valor_estimado)
    if (!form.descricao_item || !form.natureza_pedido_id || !form.justificativa || quantidade <= 0 || valor <= 0) {
      setMensagem('Preencha todos os campos obrigatórios (*) com valores maiores que zero.')
      return
    }

    setEnviando(true)
    const { error } = await supabase.from('pedidos_compra').insert({
      descricao_item: form.descricao_item,
      quantidade,
      valor_estimado: valor,
      natureza_pedido_id: form.natureza_pedido_id,
      fornecedor_sugerido: form.fornecedor_sugerido || null,
      cnpj_fornecedor: form.cnpj_fornecedor || null,
      justificativa: form.justificativa,
      observacao: form.observacao || null,
      solicitante_id: usuario.id,
      setor_id: usuario.setor_id,
      empresa_id: usuario.empresa_id,
      status: 'aguardando_cotacao',
    })
    setEnviando(false)

    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
      return
    }

    setMensagem('Pedido enviado com sucesso!')
    setForm(FORM_VAZIO)
  }

  return (
    <div className="page">
      <h2>Novo Pedido de Compra</h2>
      <form className="card form-grid" onSubmit={onSubmit}>
        <label className="span-2">
          Descrição do Item *
          <textarea {...campo('descricao_item')} placeholder="Descreva detalhadamente o produto ou serviço que deseja" required />
        </label>

        <label>
          Quantidade *
          <input
            type="text"
            inputMode="numeric"
            value={form.quantidade}
            onChange={(e) => setForm((f) => ({ ...f, quantidade: apenasNumeros(e.target.value, 7) }))}
            required
          />
        </label>
        <label>
          Valor Estimado (R$) *
          <input type="number" min="0.01" step="0.01" {...campo('valor_estimado')} required />
        </label>

        <label>
          Natureza do Pedido *
          <select {...campo('natureza_pedido_id')} required>
            <option value="">Selecione…</option>
            {naturezas.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
        </label>
        <label>
          Fornecedor (opcional)
          <input {...campo('fornecedor_sugerido')} maxLength={240} placeholder="Opcional" />
        </label>

        <label>
          CNPJ/CPF Fornecedor (opcional)
          <input
            type="text"
            inputMode="numeric"
            value={form.cnpj_fornecedor}
            onChange={(e) => setForm((f) => ({ ...f, cnpj_fornecedor: formatarCnpjCpf(e.target.value) }))}
            placeholder="Opcional"
          />
        </label>

        <label className="span-2">
          Justificativa *
          <textarea {...campo('justificativa')} placeholder="Explique a necessidade da compra." required />
        </label>

        <label className="span-2">
          Observação
          <textarea {...campo('observacao')} placeholder="Comentários independentes / planejamento" />
        </label>

        {mensagem && <p className="mensagem span-2">{mensagem}</p>}

        <div className="span-2 acoes">
          <button type="button" className="rejeitar" onClick={limparCampos}>Limpar campos</button>
          <button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar Pedido'}</button>
        </div>
      </form>
    </div>
  )
}
