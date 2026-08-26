// O gatilho fica escondido na letra "P" de "Pedidos de Compra" no topo
// (ver Layout.tsx) — esse componente é só o popup em si.
export function EasterEggModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
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
        <p style={{ fontSize: '2rem', margin: 0 }}>🥚✨</p>
        <h3 style={{ margin: '0.5rem 0' }}>Você achou o segredo!</h3>
        <p className="vazio" style={{ margin: '0 0 1rem' }}>
          Poucos chegam até esse pixel escondido. Este sistema nasceu de uma planilha,
          virou um app inteiro — orçamento, aprovações, relatórios e tudo mais — e
          sobreviveu a um bom número de <code>schema.sql</code> rodados do zero.
          Obrigado por confiar no processo. 🧡
        </p>
        <button onClick={onFechar}>Fechar</button>
      </div>
    </div>
  )
}
