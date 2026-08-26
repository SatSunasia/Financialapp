import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STATUS_LABEL, type Notificacao } from '../types/database'

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  return `${d}d atrás`
}

export function NotificacoesSino() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [aberto, setAberto] = useState(false)
  const carimboSessao = useRef<string>(usuario?.ultima_visualizacao_notificacoes ?? new Date().toISOString())
  const containerRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const [posicao, setPosicao] = useState({ top: 0, right: 0 })

  function calcularPosicao() {
    const rect = botaoRef.current?.getBoundingClientRect()
    if (!rect) return
    const larguraTela = document.documentElement.clientWidth
    const largura = Math.min(340, larguraTela - 24)
    const direitaMaxima = larguraTela - largura - 12
    const direitaIdeal = larguraTela - rect.right
    setPosicao({ top: rect.bottom + 8, right: Math.max(12, Math.min(direitaIdeal, direitaMaxima)) })
  }

  async function carregar() {
    const { data } = await supabase.rpc('minhas_notificacoes')
    setNotificacoes((data as Notificacao[]) ?? [])
  }

  useEffect(() => {
    carregar()
    const intervalo = setInterval(carregar, 60000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    function fecharSeClicouFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fecharSeClicouFora)
    return () => document.removeEventListener('mousedown', fecharSeClicouFora)
  }, [])

  useEffect(() => {
    if (!aberto) return
    window.addEventListener('resize', calcularPosicao)
    return () => window.removeEventListener('resize', calcularPosicao)
  }, [aberto])

  async function alternarAberto() {
    const vaiAbrir = !aberto
    if (vaiAbrir) calcularPosicao()
    setAberto(vaiAbrir)
    if (vaiAbrir && usuario) {
      const agora = new Date().toISOString()
      await supabase.from('usuarios').update({ ultima_visualizacao_notificacoes: agora }).eq('id', usuario.id)
      // Só atualiza o carimbo da PRÓXIMA sessão — durante essa visita ao
      // sino, os itens continuam marcados como "não visto" com o carimbo
      // antigo (senão o pontinho azul sumiria assim que abrisse).
    }
  }

  function irParaPedido(n: Notificacao) {
    setAberto(false)
    navigate(`/acompanhar?pedido=${n.pedido_numero}`)
  }

  const naoVistas = notificacoes.filter((n) => n.created_at > carimboSessao.current).length

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button ref={botaoRef} onClick={alternarAberto} style={{ position: 'relative', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.35)' }}>
        🔔
        {naoVistas > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: 'var(--vermelho)',
              color: 'white',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {naoVistas > 9 ? '9+' : naoVistas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className="card"
          style={{
            position: 'fixed',
            top: posicao.top,
            right: posicao.right,
            width: 'min(340px, calc(100vw - 1.5rem))',
            maxHeight: 420,
            overflowY: 'auto',
            zIndex: 60,
            margin: 0,
          }}
        >
          <h4 style={{ marginTop: 0 }}>Notificações</h4>
          {notificacoes.length === 0 && <p className="vazio">Nada por aqui ainda.</p>}
          {notificacoes.slice(0, 20).map((n) => {
            const naoVista = n.created_at > carimboSessao.current
            return (
              <button
                key={n.id}
                onClick={() => irParaPedido(n)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  color: 'var(--texto)',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--borda)',
                  borderRadius: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                  {naoVista && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primaria)', marginTop: 4, flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: naoVista ? 700 : 400, fontSize: '0.85rem' }}>
                      Nº {n.pedido_numero} — {n.descricao_item}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--texto-suave)' }}>
                      {n.etapa} → {STATUS_LABEL[n.novo_status]}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--texto-fraco)' }}>{tempoRelativo(n.created_at)}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
