// Informes en PDF para proveedores. Dos vistas:
//   · lista  → informes agrupados por proveedor, con buscador y compartir.
//   · nuevo  → elegir proveedor, nombre, fecha y seleccionar oportunidades
//              (agrupadas por fase); por cada una, un cuestionario de qué incluir.

import { useEffect, useMemo, useState } from 'react'
import { supabaseConfigurado } from '../lib/supabase.js'
import {
  listarInformes, crearInforme, guardarPdfInforme, urlPublicaInforme, borrarInforme,
  listarPersonas, listarEncargos,
} from '../lib/datos.js'
import { FASES, faseInfo } from '../lib/fases.js'
import { generarPdfInforme } from '../lib/informePdf.js'
import Desplegable from '../components/Desplegable.jsx'
import SinConfigurar from '../components/SinConfigurar.jsx'

const norm = (s) => (s || '').toString().toLowerCase()
const hoyISO = () => new Date().toISOString().slice(0, 10)
const fechaEs = (iso) => {
  if (!iso) return ''
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d) ? '' : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const soloDigitos = (s) => (s || '').replace(/[^\d]/g, '')

const CAMPOS = [
  { k: 'centro', t: 'Centro' },
  { k: 'producto', t: 'Producto' },
  { k: 'fecha', t: 'Fecha' },
  { k: 'importe', t: 'Importe' },
  { k: 'descripcion', t: 'Descripción' },
]
const incPorDefecto = () => ({ centro: true, producto: true, fecha: true, importe: false, descripcion: true })

export default function Informes() {
  const [vista, setVista] = useState('lista')
  const [informes, setInformes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [encargos, setEncargos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // --- estado del formulario "nuevo" ---
  const [form, setForm] = useState({ proveedor_id: '', nombre: '', fecha: hoyISO() })
  const [sel, setSel] = useState({}) // { [encargoId]: { incluir, comentario } }
  const [generando, setGenerando] = useState(false)

  // --- estado de la lista ---
  const [busca, setBusca] = useState('')

  async function recargar() {
    setError(null)
    try {
      const [inf, prov, enc] = await Promise.all([
        listarInformes(), listarPersonas('proveedor'), listarEncargos(),
      ])
      setInformes(inf); setProveedores(prov); setEncargos(enc)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => {
    if (!supabaseConfigurado) { setCargando(false); return }
    ;(async () => { await recargar(); setCargando(false) })()
  }, [])

  // ---------- selección de oportunidades ----------
  const estaSel = (id) => !!sel[id]
  const toggleSel = (enc) => setSel((s) => {
    const n = { ...s }
    if (n[enc.id]) delete n[enc.id]
    else n[enc.id] = { incluir: incPorDefecto(), comentario: '' }
    return n
  })
  const setInc = (id, k, v) => setSel((s) => ({ ...s, [id]: { ...s[id], incluir: { ...s[id].incluir, [k]: v } } }))
  const setCom = (id, v) => setSel((s) => ({ ...s, [id]: { ...s[id], comentario: v } }))
  const nSel = Object.keys(sel).length

  const gruposEnc = useMemo(() => FASES
    .map((f) => ({
      fase: f,
      items: encargos.filter((e) => e.fase === f.v)
        .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)),
    }))
    .filter((g) => g.items.length), [encargos])

  function nuevoInforme() {
    setForm({ proveedor_id: '', nombre: '', fecha: hoyISO() })
    setSel({})
    setError(null)
    setVista('nuevo')
  }

  async function generar() {
    if (!form.proveedor_id) { setError('Elige el proveedor destinatario.'); return }
    if (!form.nombre.trim()) { setError('Ponle un nombre al informe.'); return }
    if (!nSel) { setError('Selecciona al menos una oportunidad.'); return }
    setGenerando(true); setError(null)
    try {
      const prov = proveedores.find((p) => p.id === form.proveedor_id)
      const oportunidades = encargos
        .filter((e) => sel[e.id])
        .map((e) => ({
          id: e.id, fase: e.fase, creado_en: e.creado_en,
          centro: e.empresas?.nombre || '', producto: e.producto || '',
          descripcion: e.descripcion || '', importe: e.ingresos_totales,
          comentario: (sel[e.id].comentario || '').trim(),
          incluir: sel[e.id].incluir,
        }))
      const contenido = {
        nombre: form.nombre.trim(), fecha: form.fecha,
        proveedor: { id: prov?.id, nombre: prov?.nombre || '' },
        oportunidades,
      }
      const informe = await crearInforme({
        proveedor_id: form.proveedor_id, nombre: form.nombre.trim(), fecha: form.fecha, contenido,
      })
      const blob = await generarPdfInforme(contenido)
      await guardarPdfInforme(informe.id, blob)
      await recargar()
      setVista('lista')
    } catch (e) { setError(e.message) }
    finally { setGenerando(false) }
  }

  // ---------- compartir ----------
  const abrir = (inf) => { const u = urlPublicaInforme(inf.pdf_ruta); if (u) window.open(u, '_blank') }
  const porWhatsapp = (numero, inf) => {
    const u = urlPublicaInforme(inf.pdf_ruta)
    const texto = `${inf.nombre}${u ? '\n' + u : ''}`
    window.open(`https://wa.me/${soloDigitos(numero)}?text=${encodeURIComponent(texto)}`, '_blank')
  }
  const porCorreo = (dir, inf) => {
    const u = urlPublicaInforme(inf.pdf_ruta)
    const asunto = encodeURIComponent(inf.nombre)
    const cuerpo = encodeURIComponent(`Hola,\n\nTe envío el informe "${inf.nombre}".\n\n${u || ''}\n\nUn saludo.`)
    window.location.href = `mailto:${dir}?subject=${asunto}&body=${cuerpo}`
  }
  async function compartirArchivo(inf) {
    const u = urlPublicaInforme(inf.pdf_ruta)
    if (!u) return
    try {
      const resp = await fetch(u)
      const blob = await resp.blob()
      const file = new File([blob], `${inf.nombre}.pdf`, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: inf.nombre }); return
      }
      if (navigator.share) { await navigator.share({ title: inf.nombre, text: inf.nombre, url: u }); return }
      window.open(u, '_blank')
    } catch { window.open(u, '_blank') }
  }
  async function eliminar(inf) {
    if (!confirm(`¿Enviar "${inf.nombre}" a la papelera?`)) return
    try { await borrarInforme(inf.id); await recargar() } catch (e) { setError(e.message) }
  }

  // ---------- lista filtrada y agrupada por proveedor ----------
  const listaFiltrada = useMemo(() => {
    const q = norm(busca).trim()
    if (!q) return informes
    return informes.filter((i) =>
      norm(i.nombre).includes(q) ||
      norm(i.proveedor?.nombre).includes(q) ||
      fechaEs(i.fecha).includes(q) ||
      (i.contenido?.oportunidades || []).some((o) =>
        norm(o.centro).includes(q) || norm(o.producto).includes(q)))
  }, [busca, informes])

  const gruposInforme = useMemo(() => {
    const m = new Map()
    for (const i of listaFiltrada) {
      const clave = i.proveedor?.nombre || 'Sin proveedor'
      if (!m.has(clave)) m.set(clave, [])
      m.get(clave).push(i)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [listaFiltrada])

  if (!supabaseConfigurado) return <SinConfigurar titulo="📄 Informes" />
  if (cargando) return <p className="placeholder">Cargando…</p>

  // =========================================================
  // VISTA: NUEVO INFORME
  // =========================================================
  if (vista === 'nuevo') {
    return (
      <>
        <h1 className="titulo-pagina">📄 Nuevo informe</h1>

        <div className="tarjeta" style={{ maxWidth: 720 }}>
          <label className="placeholder" style={{ fontSize: '0.8rem' }}>Proveedor destinatario *</label>
          {proveedores.length === 0 ? (
            <p className="placeholder" style={{ marginTop: '0.3rem' }}>
              No tienes proveedores. Añádelos en <b>Cartera → Proveedores</b>.
            </p>
          ) : (
            <Desplegable value={form.proveedor_id} onChange={(v) => setForm((f) => ({ ...f, proveedor_id: v }))}
              placeholder="— Elige el proveedor —"
              opciones={proveedores.map((p) => ({ valor: p.id, etiqueta: p.nombre }))} />
          )}

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
            <div style={{ flex: '2 1 220px' }}>
              <label className="placeholder" style={{ fontSize: '0.8rem' }}>Nombre del informe *</label>
              <input className="campo" placeholder="Ej. Visitas y oportunidades — junio"
                value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label className="placeholder" style={{ fontSize: '0.8rem' }}>Fecha</label>
              <input className="campo" type="date" value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
            </div>
          </div>
        </div>

        <h3 style={{ margin: '1.1rem 0 0.4rem' }}>
          Oportunidades {nSel > 0 && <span className="badge" style={{ background: 'var(--azul-claro)', color: 'var(--azul)' }}>{nSel} seleccionadas</span>}
        </h3>
        <p className="placeholder" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          Marca las que quieras incluir. Al marcar una, elige qué datos aparecen y añade un comentario si quieres.
        </p>

        {gruposEnc.length === 0 && <p className="placeholder">No hay oportunidades.</p>}

        {gruposEnc.map((g) => (
          <section key={g.fase.v} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.3rem 0' }}>
              <span className="punto" style={{ background: g.fase.color, width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
              <strong style={{ color: g.fase.color }}>{g.fase.t}</strong>
              <span className="placeholder" style={{ fontSize: '0.8rem' }}>({g.items.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {g.items.map((e) => {
                const marcada = estaSel(e.id)
                return (
                  <div key={e.id} className="tarjeta" style={{ padding: '0.7rem 0.85rem' }}>
                    <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                      <input type="checkbox" checked={marcada} onChange={() => toggleSel(e)}
                        style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>
                        <strong>{e.producto || '(sin título)'}</strong>
                        <span className="placeholder" style={{ display: 'block', fontSize: '0.82rem' }}>
                          {[e.empresas?.nombre, fechaEs(e.creado_en)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </label>

                    {marcada && (
                      <div style={{ marginTop: '0.6rem', paddingLeft: '1.7rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem 0.9rem', flexWrap: 'wrap' }}>
                          {CAMPOS.map((c) => (
                            <label key={c.k} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                              <input type="checkbox" checked={!!sel[e.id].incluir[c.k]} style={{ width: 16, height: 16 }}
                                onChange={(ev) => setInc(e.id, c.k, ev.target.checked)} />
                              {c.t}
                            </label>
                          ))}
                        </div>
                        <input className="campo" placeholder="Comentario para el informe (opcional)"
                          value={sel[e.id].comentario} style={{ marginTop: '0.45rem' }}
                          onChange={(ev) => setCom(e.id, ev.target.value)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {error && <p style={{ color: 'var(--rojo)', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', position: 'sticky', bottom: 0,
          padding: '0.7rem 0', background: 'var(--fondo)' }}>
          <button className="btn-primario" onClick={generar} disabled={generando}>
            {generando ? 'Generando PDF…' : '📄 Generar informe'}
          </button>
          <button className="btn-sec-claro" onClick={() => setVista('lista')} disabled={generando}>Cancelar</button>
        </div>
      </>
    )
  }

  // =========================================================
  // VISTA: LISTA
  // =========================================================
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h1 className="titulo-pagina" style={{ margin: 0 }}>📄 Informes</h1>
        <button className="btn-primario" onClick={nuevoInforme}>+ Nuevo informe</button>
      </div>

      <input type="search" className="buscador-grande" value={busca} onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por proveedor, nombre o fecha…" style={{ marginTop: '1rem' }} />

      {error && <p style={{ color: 'var(--rojo)', fontSize: '0.9rem' }}>{error}</p>}

      {informes.length === 0 ? (
        <p className="placeholder" style={{ marginTop: '1.5rem' }}>
          Aún no hay informes. Crea el primero con <b>+ Nuevo informe</b>.
        </p>
      ) : gruposInforme.length === 0 ? (
        <p className="placeholder" style={{ marginTop: '1.5rem' }}>Sin resultados para “{busca}”.</p>
      ) : (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {gruposInforme.map(([proveedor, items]) => (
            <section key={proveedor}>
              <h3 className="res-grupo">👤 {proveedor} ({items.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {items.map((inf) => {
                  const tels = inf.proveedor?.telefonos || []
                  return (
                    <div key={inf.id} className="tarjeta">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <strong>{inf.nombre}</strong>
                          <p className="placeholder" style={{ margin: 0, fontSize: '0.82rem' }}>
                            {fechaEs(inf.fecha)} · {(inf.contenido?.oportunidades?.length ?? 0)} oportunidades
                          </p>
                        </div>
                        {!inf.pdf_ruta && <span className="badge" style={{ background: 'var(--rojo-claro, #fecaca)', color: '#991b1b' }}>Sin PDF</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                        <button className="btn-sec-claro" onClick={() => abrir(inf)} disabled={!inf.pdf_ruta}>📄 Abrir</button>
                        {tels.map((t, i) => (
                          <button key={i} className="btn-sec-claro" onClick={() => porWhatsapp(t.numero, inf)} disabled={!inf.pdf_ruta}
                            title={`WhatsApp ${t.nombre || ''} ${t.numero}`.trim()}>
                            💬 {t.nombre ? t.nombre : 'WhatsApp'}
                          </button>
                        ))}
                        {inf.proveedor?.correo && (
                          <button className="btn-sec-claro" onClick={() => porCorreo(inf.proveedor.correo, inf)} disabled={!inf.pdf_ruta}>✉️ Correo</button>
                        )}
                        <button className="btn-sec-claro" onClick={() => compartirArchivo(inf)} disabled={!inf.pdf_ruta}>📎 Compartir</button>
                        <button className="btn-icono" onClick={() => eliminar(inf)} title="Borrar" style={{ marginLeft: 'auto' }}>🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
