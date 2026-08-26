import { useState } from 'react'

// Paleta categórica validada (skill de dataviz) — ordem fixa, nunca embaralhar.
const CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const STATUS_COR = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', muted: '#898781' }

interface Tooltip {
  x: number
  y: number
  texto: string
}

function CaixaTooltip({ tooltip }: { tooltip: Tooltip | null }) {
  if (!tooltip) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        transform: 'translate(-50%, -100%)',
        background: 'var(--texto)',
        color: 'var(--papel)',
        padding: '0.3rem 0.6rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 10,
      }}
    >
      {tooltip.texto}
    </div>
  )
}

// ── Barras horizontais (ex.: Pedidos por Setor) ──────────────────────
export function GraficoBarras({ titulo, dados }: { titulo: string; dados: { rotulo: string; valor: number }[] }) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const maxValor = Math.max(1, ...dados.map((d) => d.valor))
  const larguraMax = 260
  const altLinha = 28
  const altura = dados.length * altLinha + 8

  return (
    <div className="card" style={{ position: 'relative' }}>
      <h4>{titulo}</h4>
      {dados.length === 0 && <p className="vazio">Sem dados para exibir.</p>}
      {dados.length > 0 && (
        <svg width="100%" height={altura} viewBox={`0 0 420 ${altura}`} role="img" aria-label={titulo}>
          {dados.map((d, i) => {
            const largura = Math.max(4, (d.valor / maxValor) * larguraMax)
            const y = i * altLinha
            const cor = CATEGORICA[i % CATEGORICA.length]
            return (
              <g key={d.rotulo}>
                <text x={0} y={y + 15} fontSize="12" fill="var(--texto-suave)">
                  {d.rotulo.length > 18 ? d.rotulo.slice(0, 17) + '…' : d.rotulo}
                </text>
                <rect
                  x={130}
                  y={y + 4}
                  width={largura}
                  height={16}
                  rx={4}
                  fill={cor}
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, texto: `${d.rotulo}: ${d.valor}` })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'default' }}
                />
                <text x={130 + largura + 6} y={y + 15} fontSize="12" fill="var(--texto-suave)">
                  {d.valor}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      <CaixaTooltip tooltip={tooltip} />
    </div>
  )
}

// ── Rosca / pizza (ex.: distribuição por grupo de status) ────────────
export function GraficoRosca({
  titulo,
  dados,
}: {
  titulo: string
  dados: { rotulo: string; valor: number; cor: string }[]
}) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const total = dados.reduce((s, d) => s + d.valor, 0)
  const raio = 70
  const raioInterno = 42
  const cx = 90
  const cy = 90

  let anguloAcumulado = -90

  function fatia(valor: number) {
    const fracao = total === 0 ? 0 : valor / total
    const anguloInicio = anguloAcumulado
    const anguloFim = anguloAcumulado + fracao * 360
    anguloAcumulado = anguloFim

    const rad = (a: number) => (a * Math.PI) / 180
    const p1ext = [cx + raio * Math.cos(rad(anguloInicio)), cy + raio * Math.sin(rad(anguloInicio))]
    const p2ext = [cx + raio * Math.cos(rad(anguloFim)), cy + raio * Math.sin(rad(anguloFim))]
    const p1int = [cx + raioInterno * Math.cos(rad(anguloFim)), cy + raioInterno * Math.sin(rad(anguloFim))]
    const p2int = [cx + raioInterno * Math.cos(rad(anguloInicio)), cy + raioInterno * Math.sin(rad(anguloInicio))]
    const grandeArco = anguloFim - anguloInicio > 180 ? 1 : 0

    return `M ${p1ext[0]} ${p1ext[1]} A ${raio} ${raio} 0 ${grandeArco} 1 ${p2ext[0]} ${p2ext[1]} L ${p1int[0]} ${p1int[1]} A ${raioInterno} ${raioInterno} 0 ${grandeArco} 0 ${p2int[0]} ${p2int[1]} Z`
  }

  return (
    <div className="card" style={{ position: 'relative' }}>
      <h4>{titulo}</h4>
      {total === 0 && <p className="vazio">Sem dados para exibir.</p>}
      {total > 0 && (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <svg width={180} height={180} viewBox="0 0 180 180" role="img" aria-label={titulo}>
            {dados.filter((d) => d.valor > 0).map((d) => (
              <path
                key={d.rotulo}
                d={fatia(d.valor)}
                fill={d.cor}
                stroke="var(--papel)"
                strokeWidth={2}
                onMouseEnter={(e) =>
                  setTooltip({ x: e.clientX, y: e.clientY, texto: `${d.rotulo}: ${d.valor} (${Math.round((d.valor / total) * 100)}%)` })
                }
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'default' }}
              />
            ))}
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--texto)">
              {total}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--texto-fraco)">
              pedidos
            </text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {dados.map((d) => (
              <div key={d.rotulo} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: d.cor, display: 'inline-block' }} />
                <span style={{ color: 'var(--texto-suave)' }}>{d.rotulo}</span>
                <span style={{ color: 'var(--texto-fraco)' }}>({d.valor})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <CaixaTooltip tooltip={tooltip} />
    </div>
  )
}

// ── Linha (ex.: valor total por mês) ──────────────────────────────────
export function GraficoLinha({ titulo, dados }: { titulo: string; dados: { rotulo: string; valor: number }[] }) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const largura = 420
  const altura = 160
  const margem = { esq: 50, dir: 16, cima: 12, baixo: 24 }
  const areaW = largura - margem.esq - margem.dir
  const areaH = altura - margem.cima - margem.baixo
  const maxValor = Math.max(1, ...dados.map((d) => d.valor))

  const pontos = dados.map((d, i) => {
    const x = margem.esq + (dados.length === 1 ? areaW / 2 : (i / (dados.length - 1)) * areaW)
    const y = margem.cima + areaH - (d.valor / maxValor) * areaH
    return { ...d, x, y }
  })

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="card" style={{ position: 'relative' }}>
      <h4>{titulo}</h4>
      {dados.length === 0 && <p className="vazio">Sem dados para exibir.</p>}
      {dados.length > 0 && (
        <svg width="100%" height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={titulo}>
          <line x1={margem.esq} y1={margem.cima} x2={margem.esq} y2={margem.cima + areaH} stroke="var(--borda)" strokeWidth={1} />
          <line
            x1={margem.esq}
            y1={margem.cima + areaH}
            x2={largura - margem.dir}
            y2={margem.cima + areaH}
            stroke="var(--borda)"
            strokeWidth={1}
          />
          <text x={margem.esq - 6} y={margem.cima + 4} textAnchor="end" fontSize="10" fill="var(--texto-fraco)">
            R$ {Math.round(maxValor)}
          </text>
          <path d={linha} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pontos.map((p) => (
            <g key={p.rotulo}>
              <circle
                cx={p.x}
                cy={p.y}
                r={5}
                fill="#2a78d6"
                stroke="var(--papel)"
                strokeWidth={2}
                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, texto: `${p.rotulo}: R$ ${p.valor.toFixed(2)}` })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'default' }}
              />
              <text x={p.x} y={altura - 6} textAnchor="middle" fontSize="10" fill="var(--texto-fraco)">
                {p.rotulo}
              </text>
            </g>
          ))}
        </svg>
      )}
      <CaixaTooltip tooltip={tooltip} />
    </div>
  )
}

export const CORES_STATUS = STATUS_COR
