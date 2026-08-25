import type { StatusPedido } from '../types/database'
import { STATUS_LABEL } from '../types/database'

const COR: Record<StatusPedido, string> = {
  aguardando_cotacao: '#f0ad4e',
  em_cotacao: '#f0ad4e',
  aguardando_aprovacao_orcamento: '#5bc0de',
  rejeitado_orcamento: '#d9534f',
  aguardando_aprovacao_financeira: '#5bc0de',
  rejeitado_financeiro: '#d9534f',
  aprovado_compra: '#5cb85c',
  encaminhado_erp: '#5cb85c',
  concluido: '#3d8b3d',
  cancelado: '#777777',
}

export function StatusBadge({ status }: { status: StatusPedido }) {
  return (
    <span className="status-badge" style={{ backgroundColor: COR[status] }}>
      {STATUS_LABEL[status]}
    </span>
  )
}
