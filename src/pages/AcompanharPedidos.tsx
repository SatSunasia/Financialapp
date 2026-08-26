import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import type { HistoricoStatus, PedidoCompra } from '../types/database'

export function AcompanharPedidos() {
  const { usuario } = useAuth()
  const [searchParams] = useSearchParams()
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [selecionado, setSelecionado] = useState<PedidoCompra | null>(null)
  const [historico, setHistorico] = useState<HistoricoStatus[]>([])

  useEffect(() => {
    if (!usuario) return
    let query = supabase.from('pedidos_compra').select('*').order('created_at', { ascending: false })
    // Colaborador só vê os próprios pedidos; demais perfis acompanham todos.
    if (usuario.perfil === 'colaborador') {
      query = query.eq('solicitante_id', usuario.id)
    }
    query.then(({ data }) => {
      const lista = (data as PedidoCompra[]) ?? []
      setPedidos(lista)
      // Veio de um clique em notificação (?pedido=NÚMERO) — abre direto nele.
      const numeroAlvo = searchParams.get('pedido')
      if (numeroAlvo) {
        const alvo = lista.find((p) => String(p.numero) === numeroAlvo)
        if (alvo) selecionar(alvo)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  async function selecionar(p: PedidoCompra) {
    setSelecionado(p)
    const { data } = await supabase
      .from('historico_status')
      .select('*')
      .eq('pedido_id', p.id)
      .order('created_at', { ascending: true })
    setHistorico((data as HistoricoStatus[]) ?? [])
  }

  async function cancelar(p: PedidoCompra) {
    if (!confirm(`Cancelar o pedido Nº ${p.numero}?`)) return
    const { error } = await supabase.from('pedidos_compra').update({ status: 'cancelado' }).eq('id', p.id)
    if (!error) {
      setSelecionado(null)
      setPedidos((lista) => lista.map((x) => (x.id === p.id ? { ...x, status: 'cancelado' } : x)))
    }
  }

  const podeCancelar = (p: PedidoCompra) =>
    usuario?.id === p.solicitante_id && !['concluido', 'cancelado', 'encaminhado_erp'].includes(p.status)

  return (
    <div className="page split">
      <div className="lista">
        <h2>Acompanhar Pedidos</h2>
        {pedidos.length === 0 && <p className="vazio">Nenhum pedido encontrado.</p>}
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
            <StatusBadge status={selecionado.status} />
            <p><strong>Descrição:</strong> {selecionado.descricao_item}</p>
            <p><strong>Valor estimado:</strong> R$ {selecionado.valor_estimado}</p>

            {podeCancelar(selecionado) && (
              <button className="rejeitar" onClick={() => cancelar(selecionado)}>Cancelar pedido</button>
            )}

            <h4>Linha do tempo</h4>
            <ul className="timeline">
              {historico.map((h) => (
                <li key={h.id}>
                  <span className="data">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                  <strong>{h.etapa}</strong>
                  {h.status_anterior && <span> — de <em>{h.status_anterior}</em></span>}
                  <span> para <em>{h.novo_status}</em></span>
                  {h.observacao && <p className="obs">{h.observacao}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
