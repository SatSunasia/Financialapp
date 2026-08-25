import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import type { Fornecedor, PedidoCompra } from '../types/database'

const STATUS_ALVO = ['aguardando_cotacao', 'em_cotacao', 'rejeitado_orcamento', 'rejeitado_financeiro']

export function ParaOrcar() {
  const { usuario } = useAuth()
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [selecionado, setSelecionado] = useState<PedidoCompra | null>(null)
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [form, setForm] = useState({ fornecedor_id: '', valor: '', data_entrega: '', forma_pagamento: '', observacao: '' })
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function carregar() {
    const { data } = await supabase
      .from('pedidos_compra')
      .select('*')
      .in('status', STATUS_ALVO)
      .order('created_at', { ascending: true })
    setPedidos((data as PedidoCompra[]) ?? [])
  }

  useEffect(() => {
    carregar()
    supabase.from('fornecedores').select('*').eq('ativo', true).order('nome').then(({ data }) => {
      setFornecedores((data as Fornecedor[]) ?? [])
    })
  }, [])

  function selecionar(p: PedidoCompra) {
    setSelecionado(p)
    setForm({ fornecedor_id: '', valor: '', data_entrega: '', forma_pagamento: '', observacao: '' })
    setMensagem(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selecionado || !usuario) return
    const valor = Number(form.valor)
    if (valor <= 0 || !form.data_entrega || !form.forma_pagamento) {
      setMensagem('Preencha valor, data de entrega e forma de pagamento.')
      return
    }

    setEnviando(true)

    const { error: erroCotacao } = await supabase.from('cotacoes').insert({
      pedido_id: selecionado.id,
      fornecedor_id: form.fornecedor_id || null,
      valor,
      data_entrega: form.data_entrega,
      forma_pagamento: form.forma_pagamento,
      observacao: form.observacao || null,
      criado_por: usuario.id,
    })

    if (erroCotacao) {
      setMensagem('Erro ao salvar orçamento: ' + erroCotacao.message)
      setEnviando(false)
      return
    }

    const { error: erroPedido } = await supabase
      .from('pedidos_compra')
      .update({ status: 'aguardando_aprovacao_orcamento' })
      .eq('id', selecionado.id)

    setEnviando(false)

    if (erroPedido) {
      setMensagem('Orçamento salvo, mas houve erro ao atualizar o status: ' + erroPedido.message)
      return
    }

    setMensagem('Orçamento registrado e enviado para aprovação!')
    setSelecionado(null)
    carregar()
  }

  return (
    <div className="page split">
      <div className="lista">
        <h2>Pedidos para Orçar</h2>
        {pedidos.length === 0 && <p className="vazio">Nenhum pedido pendente de orçamento.</p>}
        {pedidos.map((p) => (
          <button key={p.id} className={'item-lista' + (selecionado?.id === p.id ? ' ativo' : '')} onClick={() => selecionar(p)}>
            <strong>Nº {p.numero} — {p.descricao_item}</strong>
            <StatusBadge status={p.status} />
          </button>
        ))}
      </div>

      <div className="detalhe">
        {!selecionado && <p className="vazio">Selecione um pedido na lista.</p>}
        {selecionado && (
          <>
            <h3>Pedido Nº {selecionado.numero}</h3>
            <p><strong>Descrição:</strong> {selecionado.descricao_item}</p>
            <p><strong>Quantidade:</strong> {selecionado.quantidade}</p>
            <p><strong>Valor estimado:</strong> R$ {selecionado.valor_estimado}</p>
            <p><strong>Justificativa:</strong> {selecionado.justificativa}</p>
            {selecionado.observacao && <p><strong>Observação:</strong> {selecionado.observacao}</p>}

            <form className="card form-grid" onSubmit={onSubmit}>
              <h4 className="span-2">Registrar Orçamento</h4>
              <label>
                Fornecedor
                <select value={form.fornecedor_id} onChange={(e) => setForm((f) => ({ ...f, fornecedor_id: e.target.value }))}>
                  <option value="">Selecione…</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </label>
              <label>
                Valor (R$) *
                <input type="number" min="0.01" step="0.01" value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} required />
              </label>
              <label>
                Data de Entrega *
                <input type="date" value={form.data_entrega}
                  onChange={(e) => setForm((f) => ({ ...f, data_entrega: e.target.value }))} required />
              </label>
              <label>
                Forma de Pagamento *
                <input value={form.forma_pagamento} placeholder="Ex: 30/60/90 dias, à vista…"
                  onChange={(e) => setForm((f) => ({ ...f, forma_pagamento: e.target.value }))} required />
              </label>
              <label className="span-2">
                Observação
                <textarea value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} />
              </label>
              {mensagem && <p className="mensagem span-2">{mensagem}</p>}
              <div className="span-2 acoes">
                <button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar para aprovação'}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
