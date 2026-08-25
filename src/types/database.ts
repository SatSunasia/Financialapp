export type PerfilUsuario = 'colaborador' | 'compras' | 'gestor' | 'financeiro'

export type StatusPedido =
  | 'aguardando_cotacao'
  | 'em_cotacao'
  | 'aguardando_aprovacao_orcamento'
  | 'rejeitado_orcamento'
  | 'aguardando_aprovacao_financeira'
  | 'rejeitado_financeiro'
  | 'aprovado_compra'
  | 'encaminhado_erp'
  | 'concluido'
  | 'cancelado'

export const STATUS_LABEL: Record<StatusPedido, string> = {
  aguardando_cotacao: 'Aguardando cotação',
  em_cotacao: 'Em cotação',
  aguardando_aprovacao_orcamento: 'Aguardando aprovação do orçamento',
  rejeitado_orcamento: 'Rejeitado no orçamento',
  aguardando_aprovacao_financeira: 'Aguardando aprovação financeira',
  rejeitado_financeiro: 'Rejeitado pelo financeiro',
  aprovado_compra: 'Aprovado para compra',
  encaminhado_erp: 'Encaminhado ao ERP',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export interface Usuario {
  id: string
  nome: string
  email: string | null
  perfil: PerfilUsuario
  setor_id: string | null
  empresa_id: string | null
  ativo: boolean
  is_admin: boolean
}

export const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  colaborador: 'Colaborador',
  compras: 'Compras',
  gestor: 'Gestor',
  financeiro: 'Financeiro',
}

export interface NaturezaPedido {
  id: string
  nome: string
}

export interface Empresa {
  id: string
  razao_social: string
}

export interface Setor {
  id: string
  nome: string
  empresa_id: string
}

export interface SetorEmpresa {
  id: string
  setor_id: string
  empresa_id: string
  gestor_id: string | null
  ativo: boolean
}

export interface Fornecedor {
  id: string
  nome: string
  cnpj_cpf: string | null
  contato: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
}

export interface PedidoCompra {
  id: string
  numero: number
  descricao_item: string
  quantidade: number
  valor_estimado: number
  natureza_pedido_id: string
  fornecedor_sugerido: string | null
  cnpj_fornecedor: string | null
  justificativa: string
  observacao: string | null
  status: StatusPedido
  aprovacao_orcamento_pulada: boolean
  solicitante_id: string
  setor_id: string | null
  empresa_id: string | null
  data_solicitacao: string
  created_at: string
  updated_at: string
}

export interface Cotacao {
  id: string
  pedido_id: string
  fornecedor_id: string | null
  valor: number
  data_entrega: string | null
  forma_pagamento: string | null
  observacao: string | null
  criado_por: string | null
  created_at: string
}

export interface RelatorioPedido {
  id: string
  numero: number
  descricao_item: string
  quantidade: number
  valor_estimado: number
  status: StatusPedido
  data_solicitacao: string
  created_at: string
  updated_at: string
  solicitante_id: string | null
  solicitante_nome: string | null
  empresa_nome: string | null
  setor_nome: string | null
  natureza_nome: string | null
  orcado_por_id: string | null
  orcado_por_nome: string | null
  aprovado_gestor_id: string | null
  aprovado_gestor_nome: string | null
  aprovado_financeiro_id: string | null
  aprovado_financeiro_nome: string | null
}

export interface HistoricoStatus {
  id: string
  pedido_id: string
  etapa: string
  status_anterior: StatusPedido | null
  novo_status: StatusPedido
  usuario_id: string | null
  observacao: string | null
  created_at: string
}
