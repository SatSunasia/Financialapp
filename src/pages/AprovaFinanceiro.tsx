import { AprovacaoPedidos } from '../components/AprovacaoPedidos'

export function AprovaFinanceiro() {
  return (
    <AprovacaoPedidos
      titulo="Aprovação Financeira"
      statusAlvo="aguardando_aprovacao_financeira"
      statusAprovado="aprovado_compra"
      statusRejeitado="rejeitado_financeiro"
    />
  )
}
