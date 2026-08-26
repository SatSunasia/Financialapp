import { useState, type ReactNode } from 'react'

// Popup genérico reaproveitado pelos dois easter eggs escondidos no app
// (a letra "P" de "Pedidos de Compra" no topo, e o pixel no canto — ver
// PixelEscondido logo abaixo).
export function EasterEggModal({
  aberto,
  onFechar,
  emoji,
  titulo,
  children,
}: {
  aberto: boolean
  onFechar: () => void
  emoji: string
  titulo: string
  children: ReactNode
}) {
  if (!aberto) return null

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div className="card" style={{ maxWidth: 380, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: '2rem', margin: 0 }}>{emoji}</p>
        <h3 style={{ margin: '0.5rem 0' }}>{titulo}</h3>
        <p className="vazio" style={{ margin: '0 0 1rem' }}>{children}</p>
        <button onClick={onFechar}>Fechar</button>
      </div>
    </div>
  )
}

// Segundo easter egg: um pontinho de 10px quase invisível (15% de
// opacidade) no canto inferior direito, presente em toda tela logada.
export function PixelEscondido() {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-hidden="true"
        title=""
        style={{
          position: 'fixed',
          bottom: 6,
          right: 6,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--primaria)',
          opacity: 0.15,
          border: 'none',
          padding: 0,
          cursor: 'default',
          zIndex: 50,
        }}
      />
      <EasterEggModal aberto={aberto} onFechar={() => setAberto(false)} emoji="🕵️‍♂️✨" titulo="Você achou o segredo!">
        Poucos chegam até esse pixel escondido... sério, é praticamente invisível! 👀
        Mas já que você tem esse talento pra caçar easter egg, que tal usar esse
        superpoder pra outra coisa? Bora trabalhar! 🚀💪😄
      </EasterEggModal>
    </>
  )
}
