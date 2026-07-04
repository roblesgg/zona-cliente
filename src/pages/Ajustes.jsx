// Ajustes del usuario: nombre, preferencias de aviso (móvil / correo) y acceso
// al catálogo de productos.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseConfigurado } from '../lib/supabase.js'
import { obtenerAjustes, actualizarAjustes } from '../lib/datos.js'
import SinConfigurar from '../components/SinConfigurar.jsx'

export default function Ajustes() {
  const [form, setForm] = useState({ nombre: '', notif_movil: true })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabaseConfigurado) { setCargando(false); return }
    ;(async () => {
      try {
        const a = await obtenerAjustes()
        setForm({ nombre: a.nombre || '', notif_movil: a.notif_movil ?? true })
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setGuardado(false)
    try {
      await actualizarAjustes({ nombre: form.nombre || null, notif_movil: form.notif_movil })
      setGuardado(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (!supabaseConfigurado) return <SinConfigurar titulo="⚙️ Ajustes" />
  if (cargando) return <p className="placeholder">Cargando…</p>

  return (
    <>
      <h1 className="titulo-pagina">⚙️ Ajustes</h1>

      <form className="tarjeta" onSubmit={guardar} style={{ maxWidth: 520 }}>
        <h3>Nombre</h3>
        <input className="campo" placeholder="Tu nombre (ej. Antonio Robles)" value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ maxWidth: 320 }} />
        <p className="placeholder" style={{ marginTop: '0.3rem', marginBottom: 0, fontSize: '0.85rem' }}>
          Aparece en los informes: “Para: {'{proveedor}'} <b>de {form.nombre || 'tu nombre'}</b>”.
        </p>

        <h3 style={{ marginTop: '1.25rem' }}>Avisos de recordatorios y tareas</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <input type="checkbox" checked={form.notif_movil} style={{ width: 18, height: 18 }}
            onChange={(e) => setForm({ ...form, notif_movil: e.target.checked })} />
          <span>📱 Notificación en el móvil (app instalada)</span>
        </label>
        <p className="placeholder" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          Además, todos los avisos quedan en el historial 🔔 (arriba), aunque no veas la notificación.
        </p>

        {error && <p style={{ color: 'var(--rojo)', fontSize: '0.9rem' }}>Error: {error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn-primario" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar ajustes'}
          </button>
          {guardado && <span style={{ color: 'var(--verde)', fontWeight: 600 }}>✓ Guardado</span>}
        </div>
      </form>

      <div className="tarjeta" style={{ maxWidth: 520, marginTop: '1rem' }}>
        <h3>📦 Catálogo de productos</h3>
        <p className="placeholder" style={{ marginTop: 0 }}>
          Gestiona los productos que reutilizas en las oportunidades.
        </p>
        <Link to="/productos" className="btn-sec-claro" style={{ display: 'inline-block' }}>
          Abrir catálogo de productos →
        </Link>
      </div>

      <div className="tarjeta" style={{ maxWidth: 520, marginTop: '1rem' }}>
        <h3>🗑️ Papelera</h3>
        <p className="placeholder" style={{ marginTop: 0 }}>
          Recupera lo que hayas borrado. Se guarda 3 meses y luego se elimina solo.
        </p>
        <Link to="/papelera" className="btn-sec-claro" style={{ display: 'inline-block' }}>
          Abrir papelera →
        </Link>
      </div>
    </>
  )
}
