import { useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import AvisoActualizacion from './AvisoActualizacion.jsx'

// Navegación reducida a 4 secciones para que sea cómoda y visual.
// "Buscar" deja de ser una pestaña y pasa al buscador del encabezado.
const enlaces = [
  { to: '/', icono: '🏠', texto: 'Inicio', end: true },
  { to: '/ventas', icono: '📊', texto: 'Oportunidades' },
  { to: '/cartera', icono: '👥', texto: 'Cartera' },
  { to: '/productos', icono: '📦', texto: 'Productos' },
  { to: '/informes', icono: '📄', texto: 'Informes' },
  { to: '/agenda', icono: '📅', texto: 'Agenda' },
]

function claseNav({ isActive }) {
  return isActive ? 'nav-item activo' : 'nav-item'
}

// Índice de la pestaña actual dentro de "enlaces" (-1 si es una ficha de detalle,
// buscador, etc. donde no tiene sentido deslizar).
function indiceActual(pathname) {
  return enlaces.findIndex((e) =>
    e.to === '/' ? pathname === '/' : pathname.startsWith(e.to))
}

export default function Layout({ onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const toque = useRef(null)

  // --- Deslizar para cambiar de pestaña (solo móvil) ---
  function alEmpezar(e) {
    const t = e.touches[0]
    // No interferir con elementos que se desplazan/escriben en horizontal.
    const enScrollH = !!e.target.closest('.pipeline, .subtabs, input, textarea, select, .cal-grid')
    toque.current = { x: t.clientX, y: t.clientY, t: Date.now(), enScrollH }
  }

  function alTerminar(e) {
    const ini = toque.current
    toque.current = null
    if (!ini || ini.enScrollH) return
    const t = e.changedTouches[0]
    const dx = t.clientX - ini.x
    const dy = t.clientY - ini.y
    const rapido = Date.now() - ini.t < 700
    // Gesto claramente horizontal y con recorrido suficiente.
    if (!rapido || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return
    const i = indiceActual(location.pathname)
    if (i === -1) return
    const destino = i + (dx < 0 ? 1 : -1)
    if (destino < 0 || destino >= enlaces.length) return
    navigate(enlaces[destino].to)
  }

  return (
    <div className="app">
      {/* Encabezado superior (atrás + marca + buscador + salir) */}
      <header className="topbar">
        {location.pathname !== '/' && (
          <button className="topbar-icono" onClick={() => navigate(-1)} title="Atrás" aria-label="Atrás"
            style={{ fontSize: '1.5rem', lineHeight: 1 }}>‹</button>
        )}
        <div className="topbar-marca" onClick={() => navigate('/')}>
          <img src="/swirl.png" alt="" width="26" height="26" />
          <span>Zona <b>Cliente</b></span>
        </div>

        <button className="topbar-buscar" onClick={() => navigate('/buscar')}>
          <span className="lupa">🔍</span>
          <span className="ph">Buscar empresa, persona, oportunidad…</span>
        </button>

        <button className="topbar-icono" onClick={() => navigate('/avisos')} title="Avisos">🔔</button>
        <button className="topbar-icono" onClick={() => navigate('/ajustes')} title="Ajustes">⚙️</button>

        {onLogout && (
          <button className="topbar-salir" onClick={onLogout} title="Cerrar sesión">
            <span className="icono">🚪</span>
            <span className="txt">Salir</span>
          </button>
        )}
      </header>

      {/* Navegación lateral (escritorio) */}
      <aside className="sidebar">
        {enlaces.map((e) => (
          <NavLink key={e.to} to={e.to} end={e.end} className={claseNav}>
            <span className="icono">{e.icono}</span>
            <span>{e.texto}</span>
          </NavLink>
        ))}
      </aside>

      {/* Contenido */}
      <main className="con-sidebar" onTouchStart={alEmpezar} onTouchEnd={alTerminar}>
        <div className="contenido">
          <AvisoActualizacion />
          <div className="pagina" key={location.pathname}>
            <Outlet />
          </div>
        </div>
      </main>

      {/* Navegación inferior (móvil) */}
      <nav className="bottom-nav">
        {enlaces.map((e) => (
          <NavLink key={e.to} to={e.to} end={e.end} className={claseNav}>
            <span className="icono">{e.icono}</span>
            <span className="etq">{e.texto}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
