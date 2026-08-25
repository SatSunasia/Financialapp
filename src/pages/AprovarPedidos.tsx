import { AprovacaoPedidos } from '../components/AprovacaoPedidos'

export function AprovarPedidos() {
  return (
    <AprovacaoPedidos
      titulo="Aprovar Orçamento"
      statusAlvo="aguardando_aprovacao_orcamento"
      statusAprovado="aguardando_aprovacao_financeira"
      statusRejeitado="rejeitado_orcamento"
      usarRotaGestor
    />
  )
}
