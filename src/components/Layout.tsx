import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { EasterEggModal, PixelEscondido } from './EasterEgg'

export function Layout() {
  const { usuario, signOut } = useAuth()
  const { tema, setTema } = useTheme()
  const [eggAberto, setEggAberto] = useState(false)
  if (!usuario) return null

  const podeVer = {
    orcar: usuario.perfil === 'compras' || usuario.is_admin,
    aprovarGestor: usuario.perfil === 'gestor' || usuario.is_admin,
    aprovarFinanceiro: usuario.perfil === 'financeiro' || usuario.is_admin,
    relatorios: usuario.perfil !== 'colaborador' || usuario.is_admin,
  }

  return (
    <div className="layout">
      <header className="topbar">
        <h1><span onClick={() => setEggAberto(true)} style={{ cursor: 'default' }} aria-hidden="true">P</span>edidos de Compra</h1>
        <nav>
          <NavLink to="/novo-pedido">Novo Pedido</NavLink>
          {podeVer.orcar && <NavLink to="/para-orcar">Para Orçar</NavLink>}
          {podeVer.aprovarGestor && <NavLink to="/aprovar">Aprovar Orçamento</NavLink>}
          {podeVer.aprovarFinanceiro && <NavLink to="/aprovar-financeiro">Aprovação Financeira</NavLink>}
          <NavLink to="/acompanhar">Acompanhar</NavLink>
          {podeVer.relatorios && <NavLink to="/relatorios">Relatórios</NavLink>}
          {usuario.is_admin && <NavLink to="/admin">Administração</NavLink>}
        </nav>
        <div className="user-box">
          <div className="tema-switch">
            <button
              className={'tema-opcao' + (tema === 'light' ? ' ativa' : '')}
              onClick={() => setTema('light')}
            >
              ☀ Claro
            </button>
            <button
              className={'tema-opcao' + (tema === 'dark' ? ' ativa' : '')}
              onClick={() => setTema('dark')}
            >
              ● Escuro
            </button>
          </div>
          <span>{usuario.nome} · {usuario.perfil}</span>
          <button onClick={signOut}>Sair</button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <EasterEggModal aberto={eggAberto} onFechar={() => setEggAberto(false)} emoji="🥚✨" titulo="Você achou o segredo!">
        Poucos chegam até esse pixel escondido. Este sistema nasceu de uma planilha,
        virou um app inteiro — orçamento, aprovações, relatórios e tudo mais — e
        sobreviveu a um bom número de <code>schema.sql</code> rodados do zero.
        Obrigado por confiar no processo. 🧡
      </EasterEggModal>
      <PixelEscondido />
    </div>
  )
}
