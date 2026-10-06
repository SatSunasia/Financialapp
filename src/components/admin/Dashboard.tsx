import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STATUS_LABEL, type PedidoCompra, type StatusPedido } from '../../types/database'

export function Dashboard() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
  const [usuariosAtivos, setUsuariosAtivos] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('pedidos_compra').select('*').order('created_at', { ascending: false }),
      supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('ativo', true),
    ]).then(([p, u]) => {
      setPedidos((p.data as PedidoCompra[]) ?? [])
      setUsuariosAtivos(u.count ?? 0)
      setCarregando(false)
    })
  }, [])

  if (carregando) return <p className="vazio">Carregando…</p>

  const porStatus = pedidos.reduce<Partial<Record<StatusPedido, number>>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  const ultimos = pedidos.slice(0, 8)

  return (
    <>
      <div className="resumo-grupos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card-resumo ativo">
          <span className="valor">{pedidos.length}</span>
          <span className="rotulo">Total de pedidos</span>
        </div>
        <div className="card-resumo ativo">
          <span className="valor">{usuariosAtivos}</span>
          <span className="rotulo">Usuários ativos</span>
        </div>
        {(Object.keys(STATUS_LABEL) as StatusPedido[]).map((s) =>
          porStatus[s] ? (
            <div key={s} className="card-resumo ativo">
              <span className="valor">{porStatus[s]}</span>
              <span className="rotulo">{STATUS_LABEL[s]}</span>
            </div>
          ) : null
        )}
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Últimos pedidos criados</h3>
      <div className="lista">
        {ultimos.map((p) => (
          <div key={p.id} className="item-lista">
            <strong>Nº {p.numero} — {p.descricao_item}</strong>
            <span className="vazio">{STATUS_LABEL[p.status]} · {new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        ))}
        {ultimos.length === 0 && <p className="vazio">Nenhum pedido ainda.</p>}
      </div>
    </>
  )
}
