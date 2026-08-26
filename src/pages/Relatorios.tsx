import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUS_LABEL, type RelatorioPedido, type StatusPedido, type Usuario } from '../types/database'
import { DATA_MAX, DATA_MIN } from '../lib/mascaras'

type Grupo = 'abertos' | 'cancelados' | 'finalizados' | 'aguardando_info'

const STATUS_DO_GRUPO: Record<Grupo, StatusPedido[]> = {
  abertos: ['aguardando_cotacao', 'em_cotacao', 'aguardando_aprovacao_orcamento', 'aguardando_aprovacao_financeira', 'aprovado_compra', 'encaminhado_erp'],
  cancelados: ['cancelado'],
  finalizados: ['concluido'],
  aguardando_info: ['rejeitado_orcamento', 'rejeitado_financeiro'],
}

const GRUPO_LABEL: Record<Grupo, string> = {
  abertos: 'Em aberto',
  cancelados: 'Cancelados',
  finalizados: 'Finalizados',
  aguardando_info: 'Aguardando informações',
}

const TODOS_STATUS = Object.keys(STATUS_LABEL) as StatusPedido[]

export function Relatorios() {
  const [pedidos, setPedidos] = useState<RelatorioPedido[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [statusSelecionados, setStatusSelecionados] = useState<Set<StatusPedido>>(new Set(TODOS_STATUS))
  const [solicitanteId, setSolicitanteId] = useState('')
  const [orcadoPorId, setOrcadoPorId] = useState('')
  const [aprovadoGestorId, setAprovadoGestorId] = useState('')
  const [aprovadoFinanceiroId, setAprovadoFinanceiroId] = useState('')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('relatorio_pedidos').select('*').order('numero', { ascending: false }),
      supabase.from('usuarios').select('*').order('nome'),
    ]).then(([p, u]) => {
      if (p.error) setErro(p.error.message)
      else setPedidos((p.data as RelatorioPedido[]) ?? [])
      setUsuarios((u.data as Usuario[]) ?? [])
      setCarregando(false)
    })
  }, [])

  function alternarGrupo(grupo: Grupo) {
    const statusGrupo = STATUS_DO_GRUPO[grupo]
    const todosJaSelecionados = statusGrupo.every((s) => statusSelecionados.has(s))
    setStatusSelecionados((atual) => {
      const novo = new Set(atual)
      statusGrupo.forEach((s) => (todosJaSelecionados ? novo.delete(s) : novo.add(s)))
      return novo
    })
  }

  function alternarStatus(status: StatusPedido) {
    setStatusSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(status)) novo.delete(status)
      else novo.add(status)
      return novo
    })
  }

  const contagemPorGrupo = useMemo(() => {
    const contagem: Record<Grupo, number> = { abertos: 0, cancelados: 0, finalizados: 0, aguardando_info: 0 }
    for (const p of pedidos) {
      for (const grupo of Object.keys(STATUS_DO_GRUPO) as Grupo[]) {
        if (STATUS_DO_GRUPO[grupo].includes(p.status)) contagem[grupo]++
      }
    }
    return contagem
  }, [pedidos])

  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (!statusSelecionados.has(p.status)) return false
      if (solicitanteId && p.solicitante_id !== solicitanteId) return false
      if (orcadoPorId && p.orcado_por_id !== orcadoPorId) return false
      if (aprovadoGestorId && p.aprovado_gestor_id !== aprovadoGestorId) return false
      if (aprovadoFinanceiroId && p.aprovado_financeiro_id !== aprovadoFinanceiroId) return false
      if (dataDe && p.data_solicitacao < dataDe) return false
      if (dataAte && p.data_solicitacao > dataAte) return false
      return true
    })
  }, [pedidos, statusSelecionados, solicitanteId, orcadoPorId, aprovadoGestorId, aprovadoFinanceiroId, dataDe, dataAte])

  function exportarCsv() {
    const cabecalho = ['Nº', 'Descrição', 'Solicitante', 'Empresa', 'Setor', 'Status', 'Orçado por', 'Aprovado (Gestor)', 'Aprovado (Financeiro)', 'Valor Estimado', 'Data da Solicitação']
    const linhas = filtrados.map((p) => [
      p.numero,
      p.descricao_item,
      p.solicitante_nome ?? '',
      p.empresa_nome ?? '',
      p.setor_nome ?? '',
      STATUS_LABEL[p.status],
      p.orcado_por_nome ?? '',
      p.aprovado_gestor_nome ?? '',
      p.aprovado_financeiro_nome ?? '',
      p.valor_estimado,
      p.data_solicitacao,
    ])
    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-pedidos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const compradores = usuarios.filter((u) => u.perfil === 'compras')
  const gestores = usuarios.filter((u) => u.perfil === 'gestor')
  const financeiros = usuarios.filter((u) => u.perfil === 'financeiro')

  return (
    <div className="page">
      <h2>Relatórios</h2>
      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="vazio">Carregando…</p>}

      {!carregando && (
        <>
          <div className="resumo-grupos">
            {(Object.keys(GRUPO_LABEL) as Grupo[]).map((grupo) => (
              <button
                key={grupo}
                className={'card-resumo' + (STATUS_DO_GRUPO[grupo].every((s) => statusSelecionados.has(s)) ? ' ativo' : '')}
                onClick={() => alternarGrupo(grupo)}
              >
                <span className="valor">{contagemPorGrupo[grupo]}</span>
                <span className="rotulo">{GRUPO_LABEL[grupo]}</span>
              </button>
            ))}
          </div>

          <div className="card">
            <div className="form-grid">
              <label className="span-2">
                Status (clique nos cards acima para ligar/desligar por grupo, ou marque individualmente aqui)
                <div className="chips">
                  {TODOS_STATUS.map((s) => (
                    <label key={s} className="chip">
                      <input type="checkbox" checked={statusSelecionados.has(s)} onChange={() => alternarStatus(s)} />
                      {STATUS_LABEL[s]}
                    </label>
                  ))}
                </div>
              </label>

              <label>
                Criado por
                <select value={solicitanteId} onChange={(e) => setSolicitanteId(e.target.value)}>
                  <option value="">Todos</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
              <label>
                Orçado por
                <select value={orcadoPorId} onChange={(e) => setOrcadoPorId(e.target.value)}>
                  <option value="">Todos</option>
                  {compradores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
              <label>
                Aprovado por (Gestor)
                <select value={aprovadoGestorId} onChange={(e) => setAprovadoGestorId(e.target.value)}>
                  <option value="">Todos</option>
                  {gestores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
              <label>
                Aprovado por (Financeiro)
                <select value={aprovadoFinanceiroId} onChange={(e) => setAprovadoFinanceiroId(e.target.value)}>
                  <option value="">Todos</option>
                  {financeiros.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>

              <label>
                Data da solicitação — de
                <input type="date" min={DATA_MIN} max={DATA_MAX} value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
              </label>
              <label>
                até
                <input type="date" min={DATA_MIN} max={DATA_MAX} value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
              </label>

              <div className="span-2 acoes">
                <button type="button" onClick={exportarCsv} disabled={filtrados.length === 0}>
                  Exportar CSV ({filtrados.length})
                </button>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="tabela-admin">
              <thead>
                <tr>
                  <th>Nº</th><th>Descrição</th><th>Solicitante</th><th>Setor</th><th>Status</th>
                  <th>Orçado por</th><th>Aprov. Gestor</th><th>Aprov. Financeiro</th><th>Valor</th><th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id}>
                    <td>{p.numero}</td>
                    <td>{p.descricao_item}</td>
                    <td>{p.solicitante_nome ?? '—'}</td>
                    <td>{p.setor_nome ?? '—'}</td>
                    <td>{STATUS_LABEL[p.status]}</td>
                    <td>{p.orcado_por_nome ?? '—'}</td>
                    <td>{p.aprovado_gestor_nome ?? '—'}</td>
                    <td>{p.aprovado_financeiro_nome ?? '—'}</td>
                    <td>R$ {p.valor_estimado}</td>
                    <td>{p.data_solicitacao}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td className="vazio" colSpan={10}>Nenhum pedido encontrado com esses filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
