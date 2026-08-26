import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import { DATA_MAX, DATA_MIN, limitarValorNumerico } from '../lib/mascaras'
import type { Cotacao, Fornecedor, PedidoCompra } from '../types/database'

const STATUS_ALVO = ['aguardando_cotacao', 'em_cotacao', 'rejeitado_orcamento', 'rejeitado_financeiro']
const MAX_COTACOES = 3
const FORM_VAZIO = { fornecedor_id: '', valor: '', data_entrega: '', forma_pagamento: '', observacao: '' }

export function ParaOrcar() {
  const { usuario } = useAuth()
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [selecionado, setSelecionado] = useState<PedidoCompra | null>(null)
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviandoAprovacao, setEnviandoAprovacao] = useState(false)

  async function carregar() {
    const { data } = await supabase
      .from('pedidos_compra')
      .select('*')
      .in('status', STATUS_ALVO)
      .order('created_at', { ascending: true })
    setPedidos((data as PedidoCompra[]) ?? [])
  }

  async function carregarCotacoes(pedidoId: string) {
    const { data } = await supabase
      .from('cotacoes')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: true })
    setCotacoes((data as Cotacao[]) ?? [])
  }

  useEffect(() => {
    carregar()
    supabase.from('fornecedores').select('*').eq('ativo', true).order('nome').then(({ data }) => {
      setFornecedores((data as Fornecedor[]) ?? [])
    })
  }, [])

  function selecionar(p: PedidoCompra) {
    setSelecionado(p)
    setForm(FORM_VAZIO)
    setArquivo(null)
    setMensagem(null)
    carregarCotacoes(p.id)
  }

  async function onSubmitCotacao(e: FormEvent) {
    e.preventDefault()
    if (!selecionado || !usuario) return
    const valor = Number(form.valor)
    if (valor <= 0 || !form.data_entrega || !form.forma_pagamento) {
      setMensagem('Preencha valor, data de entrega e forma de pagamento.')
      return
    }

    setEnviando(true)
    setMensagem(null)

    const { data: novaCotacao, error: erroCotacao } = await supabase
      .from('cotacoes')
      .insert({
        pedido_id: selecionado.id,
        fornecedor_id: form.fornecedor_id || null,
        valor,
        data_entrega: form.data_entrega,
        forma_pagamento: form.forma_pagamento,
        observacao: form.observacao || null,
        criado_por: usuario.id,
      })
      .select('*')
      .single()

    if (erroCotacao || !novaCotacao) {
      setMensagem('Erro ao salvar orçamento: ' + (erroCotacao?.message ?? ''))
      setEnviando(false)
      return
    }

    if (arquivo) {
      const caminho = `${selecionado.id}/${novaCotacao.id}-${arquivo.name}`
      const { error: erroUpload } = await supabase.storage.from('anexos-cotacoes').upload(caminho, arquivo)
      if (erroUpload) {
        setMensagem('Orçamento salvo, mas o anexo falhou: ' + erroUpload.message)
      } else {
        await supabase.from('cotacoes').update({ anexo_path: caminho, anexo_nome: arquivo.name }).eq('id', novaCotacao.id)
      }
    }

    setEnviando(false)
    setForm(FORM_VAZIO)
    setArquivo(null)
    if (!arquivo) setMensagem('Orçamento adicionado.')
    carregarCotacoes(selecionado.id)
  }

  async function marcarVencedora(cotacaoId: string) {
    const { error } = await supabase.rpc('marcar_cotacao_vencedora', { cotacao_id: cotacaoId })
    if (error) {
      setMensagem('Erro ao marcar vencedora: ' + error.message)
      return
    }
    if (selecionado) carregarCotacoes(selecionado.id)
  }

  async function baixarAnexo(c: Cotacao) {
    if (!c.anexo_path) return
    const { data, error } = await supabase.storage.from('anexos-cotacoes').createSignedUrl(c.anexo_path, 60)
    if (error || !data) {
      setMensagem('Erro ao gerar link do anexo: ' + (error?.message ?? ''))
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function enviarParaAprovacao() {
    if (!selecionado) return
    if (cotacoes.length === 0) {
      setMensagem('Registre pelo menos um orçamento antes de enviar para aprovação.')
      return
    }

    let vencedoraId = cotacoes.find((c) => c.vencedora)?.id
    if (!vencedoraId) {
      if (cotacoes.length === 1) {
        vencedoraId = cotacoes[0].id
        const { error } = await supabase.rpc('marcar_cotacao_vencedora', { cotacao_id: vencedoraId })
        if (error) {
          setMensagem('Erro ao marcar vencedora: ' + error.message)
          return
        }
      } else {
        setMensagem('Marque qual orçamento é o vencedor antes de enviar para aprovação.')
        return
      }
    }

    setEnviandoAprovacao(true)
    const { error: erroPedido } = await supabase
      .from('pedidos_compra')
      .update({ status: 'aguardando_aprovacao_orcamento' })
      .eq('id', selecionado.id)
    setEnviandoAprovacao(false)

    if (erroPedido) {
      setMensagem('Erro ao enviar para aprovação: ' + erroPedido.message)
      return
    }

    setMensagem('Pedido enviado para aprovação!')
    setSelecionado(null)
    setCotacoes([])
    carregar()
  }

  const nomeFornecedor = (id: string | null) => fornecedores.find((f) => f.id === id)?.nome ?? '—'

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

            <div className="card">
              <h4>Orçamentos ({cotacoes.length}/{MAX_COTACOES})</h4>
              {cotacoes.length === 0 && <p className="vazio">Nenhum orçamento registrado ainda.</p>}
              {cotacoes.map((c) => (
                <div key={c.id} className="card" style={{ borderColor: c.vencedora ? 'var(--primaria)' : undefined }}>
                  <p style={{ margin: 0 }}>
                    <strong>{nomeFornecedor(c.fornecedor_id)}</strong> — R$ {c.valor}
                    {c.vencedora && <span className="status-badge" style={{ background: 'var(--primaria)', marginLeft: '0.5rem' }}>Vencedora</span>}
                  </p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--texto-suave)' }}>
                    Entrega: {c.data_entrega} · Pagamento: {c.forma_pagamento}
                  </p>
                  {c.observacao && <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>{c.observacao}</p>}
                  <div className="acoes" style={{ justifyContent: 'flex-start' }}>
                    {!c.vencedora && <button type="button" onClick={() => marcarVencedora(c.id)}>Marcar como vencedora</button>}
                    {c.anexo_path && <button type="button" onClick={() => baixarAnexo(c)}>Ver anexo ({c.anexo_nome})</button>}
                  </div>
                </div>
              ))}

              <div className="acoes" style={{ marginTop: '1rem' }}>
                <button type="button" onClick={enviarParaAprovacao} disabled={enviandoAprovacao || cotacoes.length === 0}>
                  {enviandoAprovacao ? 'Enviando…' : 'Enviar para aprovação'}
                </button>
              </div>
            </div>

            {cotacoes.length < MAX_COTACOES && (
              <form className="card form-grid" onSubmit={onSubmitCotacao}>
                <h4 className="span-2">Adicionar Orçamento</h4>
                <label>
                  Fornecedor
                  <select value={form.fornecedor_id} onChange={(e) => setForm((f) => ({ ...f, fornecedor_id: e.target.value }))}>
                    <option value="">Selecione…</option>
                    {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </label>
                <label>
                  Valor (R$) *
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: limitarValorNumerico(e.target.value, 7) }))}
                    required
                  />
                </label>
                <label>
                  Data de Entrega *
                  <input
                    type="date"
                    min={DATA_MIN}
                    max={DATA_MAX}
                    value={form.data_entrega}
                    onChange={(e) => setForm((f) => ({ ...f, data_entrega: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Forma de Pagamento *
                  <input value={form.forma_pagamento} placeholder="Ex: 30/60/90 dias, à vista…"
                    onChange={(e) => setForm((f) => ({ ...f, forma_pagamento: e.target.value }))} required />
                </label>
                <label className="span-2">
                  Observação
                  <textarea
                    value={form.observacao}
                    maxLength={1024}
                    onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  />
                </label>
                <label className="span-2">
                  Anexo (opcional)
                  <input type="file" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
                </label>
                {mensagem && <p className="mensagem span-2">{mensagem}</p>}
                <div className="span-2 acoes">
                  <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Adicionar orçamento'}</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
