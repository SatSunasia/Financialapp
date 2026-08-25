import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { NovoPedido } from './pages/NovoPedido'
import { ParaOrcar } from './pages/ParaOrcar'
import { AprovarPedidos } from './pages/AprovarPedidos'
import { AprovaFinanceiro } from './pages/AprovaFinanceiro'
import { AcompanharPedidos } from './pages/AcompanharPedidos'
import { Administracao } from './pages/Administracao'
import { NovaSenha } from './pages/NovaSenha'
import { Relatorios } from './pages/Relatorios'

function RotasPrivadas() {
  const { session, usuario, loading, recuperandoSenha } = useAuth()

  if (loading) return <div className="carregando">Carregando…</div>
  if (recuperandoSenha) return <NovaSenha />
  if (!session) return <Login />
  if (!usuario) return <div className="carregando">Preparando seu acesso…</div>

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/novo-pedido" element={<NovoPedido />} />
        <Route path="/para-orcar" element={<ParaOrcar />} />
        <Route path="/aprovar" element={<AprovarPedidos />} />
        <Route path="/aprovar-financeiro" element={<AprovaFinanceiro />} />
        <Route path="/acompanhar" element={<AcompanharPedidos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/admin" element={<Administracao />} />
        <Route path="*" element={<Navigate to="/novo-pedido" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RotasPrivadas />
      </AuthProvider>
    </ThemeProvider>
  )
}
