import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, supabaseConfigurado } from './lib/supabase.js'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Inicio from './pages/Inicio.jsx'
import Cartera from './pages/Cartera.jsx'
import Ventas from './pages/Ventas.jsx'
import EncargoDetalle from './pages/EncargoDetalle.jsx'
import Calendario from './pages/Calendario.jsx'
import Buscar from './pages/Buscar.jsx'
import Avisos from './pages/Avisos.jsx'
import Papelera from './pages/Papelera.jsx'
import Ajustes from './pages/Ajustes.jsx'
import Productos from './pages/Productos.jsx'
import Informes from './pages/Informes.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCargando(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Al entrar, pide permiso de notificaciones y programa los avisos del móvil
  // a partir de los recordatorios (solo en la app nativa).
  useEffect(() => {
    if (!supabaseConfigurado || !session) return
    ;(async () => {
      try {
        const noti = await import('./lib/notificaciones.js')
        await noti.pedirPermisoNotificaciones()
        await noti.reprogramarTodo()
      } catch (e) {
        console.warn('Notificaciones no disponibles', e)
      }
    })()
  }, [session])

  if (cargando) {
    return <div className="contenido"><p className="placeholder">Cargando…</p></div>
  }

  // Si Supabase está configurado, exigimos sesión iniciada.
  if (supabaseConfigurado && !session) {
    return <Login />
  }

  const cerrarSesion = () => supabase.auth.signOut()

  return (
    <Routes>
      <Route element={<Layout onLogout={cerrarSesion} />}>
        <Route index element={<Inicio />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="encargos/:id" element={<EncargoDetalle />} />
        <Route path="cartera" element={<Cartera />} />
        <Route path="agenda" element={<Calendario />} />
        <Route path="buscar" element={<Buscar />} />
        <Route path="avisos" element={<Avisos />} />
        <Route path="papelera" element={<Papelera />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="productos" element={<Productos />} />
        <Route path="informes" element={<Informes />} />

        {/* Rutas antiguas -> nuevas, por si hay enlaces o marcadores guardados */}
        <Route path="encargos" element={<Navigate to="/ventas" replace />} />
        <Route path="hospitales" element={<Navigate to="/cartera" replace />} />
        <Route path="hospitales/:id" element={<Navigate to="/cartera" replace />} />
        <Route path="empresas" element={<Navigate to="/cartera?t=empresas" replace />} />
        <Route path="calendario" element={<Navigate to="/agenda" replace />} />
      </Route>
    </Routes>
  )
}
