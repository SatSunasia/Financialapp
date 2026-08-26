import { useState } from 'react'

export function EasterEgg() {
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
      {aberto && (
        <div
          onClick={() => setAberto(false)}
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
            <p style={{ fontSize: '2rem', margin: 0 }}>🥚✨</p>
            <h3 style={{ margin: '0.5rem 0' }}>Você achou o segredo!</h3>
            <p className="vazio" style={{ margin: '0 0 1rem' }}>
              Poucos chegam até esse pixel escondido, agora Bora trabalhar !!
            </p>
            <button onClick={() => setAberto(false)}>Fechar</button>
          </div>
        </div>
      )}
    </>
  )
}
