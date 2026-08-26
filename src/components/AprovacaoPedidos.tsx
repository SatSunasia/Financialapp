import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge } from './StatusBadge'
import type { Cotacao, PedidoCompra, StatusPedido } from '../types/database'

interface Props {
  titulo: string
  statusAlvo: StatusPedido
  statusAprovado: StatusPedido
  statusRejeitado: StatusPedido
  // Quando true, a lista vem da função pedidos_pendentes_gestor() em vez de
  // uma busca direta — ela já filtra só os pedidos do Setor+Empresa em que
  // o gestor logado é o responsável designado (ver setores_empresas).
  usarRotaGestor?: boolean
}

export function AprovacaoPedidos({ titulo, statusAlvo, statusAprovado, statusRejeitado, usarRotaGestor }: Props) {
  const { usuario } = useAuth()
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [selecionado, setSelecionado] = useState<PedidoCompra | null>(null)
  const [cotacao, setCotacao] = useState<Cotacao | null>(null)
  const [comentario, setComentario] = useState('')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  async function carregar() {
    if (usarRotaGestor) {
      const { data, error } = await supabase.rpc('pedidos_pendentes_gestor')
      if (error) {
        setMensagem('Erro ao carregar: ' + error.message)
        return
      }
      const lista = ((data as PedidoCompra[]) ?? []).slice()
      lista.sort((a, b) => a.created_at.localeCompare(b.created_at))
      setPedidos(lista)
      return
    }
    const { data } = await supabase
      .from('pedidos_compra')
      .select('*')
      .eq('status', statusAlvo)
      .order('created_at', { ascending: true })
    setPedidos((data as PedidoCompra[]) ?? [])
  }

  useEffect(() => { carregar() }, [statusAlvo])

  async function selecionar(p: PedidoCompra) {
    setSelecionado(p)
    setComentario('')
    setMensagem(null)
    const { data } = await supabase
      .from('cotacoes')
      .select('*')
      .eq('pedido_id', p.id)
      .order('vencedora', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setCotacao((data as Cotacao) ?? null)
  }

  async function baixarAnexo() {
    if (!cotacao?.anexo_path) return
    const { data, error } = await supabase.storage.from('anexos-cotacoes').createSignedUrl(cotacao.anexo_path, 60)
    if (error || !data) {
      setMensagem('Erro ao gerar link do anexo: ' + (error?.message ?? ''))
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function decidir(aprovado: boolean) {
    if (!selecionado || !usuario) return
    setProcessando(true)

    const novoStatus = aprovado ? statusAprovado : statusRejeitado
    const { error } = await supabase
      .from('pedidos_compra')
      .update({ status: novoStatus })
      .eq('id', selecionado.id)

    if (error) {
      setMensagem('Erro ao atualizar: ' + error.message)
      setProcessando(false)
      return
    }

    if (comentario.trim()) {
      await supabase.from('historico_status').insert({
        pedido_id: selecionado.id,
        etapa: 'Comentário',
        novo_status: novoStatus,
        usuario_id: usuario.id,
        observacao: comentario.trim(),
      })
    }

    setProcessando(false)
    setMensagem(aprovado ? 'Pedido aprovado!' : 'Pedido rejeitado.')
    setSelecionado(null)
    carregar()
  }

  return (
    <div className="page split">
      <div className="lista">
        <h2>{titulo}</h2>
        {pedidos.length === 0 && <p className="vazio">Nada pendente por aqui.</p>}
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

            {cotacao && (
              <div className="card">
                <h4>Orçamento</h4>
                <p><strong>Valor:</strong> R$ {cotacao.valor}</p>
                <p><strong>Data de entrega:</strong> {cotacao.data_entrega}</p>
                <p><strong>Forma de pagamento:</strong> {cotacao.forma_pagamento}</p>
                {cotacao.observacao && <p><strong>Observação:</strong> {cotacao.observacao}</p>}
                {cotacao.anexo_path && (
                  <button type="button" onClick={baixarAnexo}>Ver anexo ({cotacao.anexo_nome})</button>
                )}
              </div>
            )}

            <div className="card">
              <label>
                Comentário (opcional)
                <textarea value={comentario} onChange={(e) => setComentario(e.target.value)}
                  placeholder="Motivo da decisão, condições, etc." />
              </label>
              {mensagem && <p className="mensagem">{mensagem}</p>}
              <div className="acoes">
                <button className="rejeitar" disabled={processando} onClick={() => decidir(false)}>Rejeitar</button>
                <button className="aprovar" disabled={processando} onClick={() => decidir(true)}>Aprovar</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
