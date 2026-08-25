import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Tema = 'light' | 'dark'
const CHAVE_STORAGE = 'pedidos-compra:tema'

interface ThemeState {
  tema: Tema
  setTema: (tema: Tema) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function lerTemaSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE)
    if (salvo === 'light' || salvo === 'dark') return salvo
  } catch {
    // localStorage indisponível — segue com o padrão
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerTemaSalvo)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    try {
      localStorage.setItem(CHAVE_STORAGE, tema)
    } catch {
      // sem localStorage, só não persiste entre sessões
    }
  }, [tema])

  return <ThemeContext.Provider value={{ tema, setTema }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>')
  return ctx
}
