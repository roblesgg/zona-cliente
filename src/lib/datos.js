// Capa de acceso a datos. Centraliza las llamadas a Supabase.
// Modelo: EMPRESAS (orgs tipadas) + PERSONAS (socio/cliente/proveedor) +
// ENCARGOS (oportunidades, ligadas a una empresa, con personas y productos).

import { supabase } from './supabase.js'

// ---------------------------------------------------------------
// EMPRESAS (organizaciones: hospital, clínica, fábrica, proveedor, otro)
// ---------------------------------------------------------------

export async function listarEmpresas() {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .is('borrado_en', null)
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function obtenerEmpresa(id) {
  const { data, error } = await supabase.from('empresas').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function crearEmpresa(empresa) {
  const { data, error } = await supabase.from('empresas').insert(empresa).select().single()
  if (error) throw error
  return data
}

export async function actualizarEmpresa(id, cambios) {
  const { data, error } = await supabase
    .from('empresas').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function borrarEmpresa(id) {
  const { error } = await supabase.from('empresas').update({ borrado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// PERSONAS (socios / clientes / proveedores — mismos campos)
// ---------------------------------------------------------------

// Lista las personas de un tipo (socio/cliente/proveedor) con su empresa.
export async function listarPersonas(tipo) {
  let q = supabase
    .from('personas')
    .select('*, empresas(nombre, tipo)')
    .is('borrado_en', null)
    .order('nombre', { ascending: true })
  if (tipo) q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function crearPersona(persona) {
  const { data, error } = await supabase.from('personas').insert(persona).select().single()
  if (error) throw error
  return data
}

export async function actualizarPersona(id, cambios) {
  const { data, error } = await supabase
    .from('personas').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function borrarPersona(id) {
  const { error } = await supabase.from('personas').update({ borrado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// ENCARGOS = OPORTUNIDADES (ligadas a una empresa)
// ---------------------------------------------------------------

export async function listarEncargos() {
  const { data, error } = await supabase
    .from('encargos')
    .select('*, empresas(nombre, tipo)')
    .is('borrado_en', null)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}

export async function crearEncargo(encargo) {
  const { data, error } = await supabase.from('encargos').insert(encargo).select().single()
  if (error) throw error
  return data
}

export async function actualizarEncargo(id, cambios) {
  const { data, error } = await supabase
    .from('encargos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function borrarEncargo(id) {
  const { error } = await supabase.from('encargos').update({ borrado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function obtenerEncargo(id) {
  const { data, error } = await supabase
    .from('encargos')
    .select('*, empresas(nombre, tipo)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------
// PRODUCTOS (catálogo reutilizable)
// ---------------------------------------------------------------

export async function listarProductos() {
  const { data, error } = await supabase
    .from('productos').select('*').is('borrado_en', null).order('nombre', { ascending: true })
  if (error) throw error
  return data
}

export async function crearProducto(producto) {
  const { data, error } = await supabase.from('productos').insert(producto).select().single()
  if (error) throw error
  return data
}

export async function actualizarProducto(id, cambios) {
  const { data, error } = await supabase
    .from('productos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function borrarProducto(id) {
  const { error } = await supabase.from('productos').update({ borrado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// LÍNEAS DE OPORTUNIDAD (productos con cantidad)
// ---------------------------------------------------------------

export async function listarProductosDeOportunidad(encargoId) {
  const { data, error } = await supabase
    .from('oportunidad_productos')
    .select('*, productos(nombre, referencia, marca, precio)')
    .eq('encargo_id', encargoId)
    .order('creado_en', { ascending: true })
  if (error) throw error
  return data
}

export async function añadirProductoAOportunidad(linea) {
  const { data, error } = await supabase
    .from('oportunidad_productos').insert(linea).select().single()
  if (error) throw error
  return data
}

export async function actualizarLineaProducto(id, cambios) {
  const { data, error } = await supabase
    .from('oportunidad_productos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function quitarProductoDeOportunidad(id) {
  const { error } = await supabase.from('oportunidad_productos').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// PERSONAS INVOLUCRADAS EN UNA OPORTUNIDAD
// ---------------------------------------------------------------

export async function listarPersonasDeOportunidad(encargoId) {
  const { data, error } = await supabase
    .from('oportunidad_personas')
    .select('id, persona_id, descripcion, personas(nombre, tipo, cargo, telefonos, correo, empresas(nombre))')
    .eq('encargo_id', encargoId)
    .order('creado_en', { ascending: true })
  if (error) throw error
  return data
}

export async function añadirPersonaAOportunidad(encargoId, personaId) {
  const { data, error } = await supabase
    .from('oportunidad_personas')
    .insert({ encargo_id: encargoId, persona_id: personaId })
    .select().single()
  if (error) throw error
  return data
}

export async function actualizarDescripcionInvolucrado(id, descripcion) {
  const { error } = await supabase
    .from('oportunidad_personas').update({ descripcion }).eq('id', id)
  if (error) throw error
}

export async function quitarPersonaDeOportunidad(id) {
  const { error } = await supabase.from('oportunidad_personas').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// OFERTAS (presupuestos de proveedores dentro de una oportunidad)
// ---------------------------------------------------------------

export async function listarOfertasDeEncargo(encargoId) {
  const { data, error } = await supabase
    .from('ofertas')
    .select('*, de_persona:personas!de_persona_id(nombre), para_persona:personas!para_persona_id(nombre)')
    .eq('encargo_id', encargoId)
    .order('precio', { ascending: true })
  if (error) throw error
  return data
}

export async function crearOferta(oferta) {
  const { data, error } = await supabase.from('ofertas').insert(oferta).select().single()
  if (error) throw error
  return data
}

export async function borrarOferta(id) {
  const { error } = await supabase.from('ofertas').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// NOTAS de una oportunidad (seguimiento con recordatorios)
// ---------------------------------------------------------------

export async function listarNotasDeEncargo(encargoId) {
  const { data, error } = await supabase
    .from('notas').select('*').eq('encargo_id', encargoId).is('borrado_en', null)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}

export async function crearNota(nota) {
  const { data, error } = await supabase.from('notas').insert(nota).select().single()
  if (error) throw error
  return data
}

export async function borrarNota(id) {
  const { error } = await supabase.from('notas').update({ borrado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function listarRecordatorios() {
  const { data, error } = await supabase
    .from('notas')
    .select('id, texto, recordatorio, recordatorio_hora, aviso_min, encargos(producto, descripcion)')
    .not('recordatorio', 'is', null)
    .is('borrado_en', null)
    .order('recordatorio', { ascending: true })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------
// TAREAS pendientes de una oportunidad (con fecha límite)
// ---------------------------------------------------------------

export async function listarTareasDeEncargo(encargoId) {
  const { data, error } = await supabase
    .from('tareas').select('*, personas(nombre, tipo)').eq('encargo_id', encargoId).is('borrado_en', null)
    .order('completada', { ascending: true })
    .order('fecha_limite', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data
}

export async function crearTarea(tarea) {
  const { data, error } = await supabase.from('tareas').insert(tarea).select().single()
  if (error) throw error
  return data
}

export async function actualizarTarea(id, cambios) {
  const { data, error } = await supabase
    .from('tareas').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function borrarTarea(id) {
  const { error } = await supabase.from('tareas').update({ borrado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// Tareas pendientes (sin completar) de todas las oportunidades, por vencimiento.
export async function listarTareasPendientes() {
  const { data, error } = await supabase
    .from('tareas')
    .select('*, personas(nombre), encargos(producto, fase, empresas(nombre))')
    .eq('completada', false)
    .is('borrado_en', null)
    .order('fecha_limite', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------
// AVISOS (historial): recordatorios (notas) + tareas con fecha, unidos
// ---------------------------------------------------------------

export async function listarAvisos() {
  const [rNotas, rTareas] = await Promise.all([
    supabase.from('notas')
      .select('id, texto, recordatorio, recordatorio_hora, encargo_id, encargos(producto, empresas(nombre))')
      .not('recordatorio', 'is', null).is('borrado_en', null),
    supabase.from('tareas')
      .select('id, texto, fecha_limite, hora, completada, encargo_id, encargos(producto, empresas(nombre))')
      .not('fecha_limite', 'is', null).is('borrado_en', null),
  ])
  if (rNotas.error) throw rNotas.error
  if (rTareas.error) throw rTareas.error

  const ts = (fecha, hora) => new Date(`${fecha}T${(hora || '09:00').slice(0, 5)}:00`).getTime()
  const items = []
  for (const n of rNotas.data || []) {
    items.push({ key: 'n' + n.id, tipo: 'recordatorio', texto: n.texto, fecha: n.recordatorio, hora: n.recordatorio_hora,
      encargo_id: n.encargo_id, encargo: n.encargos, completada: null, ts: ts(n.recordatorio, n.recordatorio_hora) })
  }
  for (const t of rTareas.data || []) {
    items.push({ key: 't' + t.id, tipo: 'tarea', texto: t.texto, fecha: t.fecha_limite, hora: t.hora,
      encargo_id: t.encargo_id, encargo: t.encargos, completada: t.completada, ts: ts(t.fecha_limite, t.hora) })
  }
  return items
}

// ---------------------------------------------------------------
// ADJUNTOS (fotos y PDFs de oportunidades y productos) — Supabase Storage
// ---------------------------------------------------------------

// ref = { encargoId | productoId | tareaId | notaId } (a qué pertenece el adjunto)
function refAdjunto(ref) {
  return {
    encargo_id: ref.encargoId || null, producto_id: ref.productoId || null,
    tarea_id: ref.tareaId || null, nota_id: ref.notaId || null,
  }
}
function carpetaAdjunto(ref) {
  if (ref.encargoId) return `oportunidad/${ref.encargoId}`
  if (ref.productoId) return `producto/${ref.productoId}`
  if (ref.tareaId) return `tarea/${ref.tareaId}`
  return `nota/${ref.notaId}`
}

export async function listarAdjuntos(ref) {
  let q = supabase.from('adjuntos').select('*').order('creado_en', { ascending: false })
  if (ref.encargoId) q = q.eq('encargo_id', ref.encargoId)
  if (ref.productoId) q = q.eq('producto_id', ref.productoId)
  if (ref.tareaId) q = q.eq('tarea_id', ref.tareaId)
  if (ref.notaId) q = q.eq('nota_id', ref.notaId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function subirAdjunto(file, ref, descripcion) {
  const { data: u } = await supabase.auth.getUser()
  const uid = u?.user?.id
  if (!uid) throw new Error('Sin sesión')
  const limpio = (file.name || 'archivo').replace(/[^\w.\-]/g, '_')
  const ruta = `${uid}/${carpetaAdjunto(ref)}/${Date.now()}-${limpio}`
  const { error: errUp } = await supabase.storage.from('adjuntos').upload(ruta, file, { contentType: file.type })
  if (errUp) throw errUp
  const { data, error } = await supabase.from('adjuntos').insert({
    ...refAdjunto(ref), nombre: file.name, ruta, tipo: file.type, descripcion: descripcion || null,
  }).select().single()
  if (error) throw error
  return data
}

// Sube una lista de adjuntos pendientes (archivos o enlaces) a un destino ya
// creado (p. ej. la tarea/nota recién guardada).
export async function subirPendientes(items, ref) {
  for (const it of items || []) {
    if (it.file) await subirAdjunto(it.file, ref, it.descripcion)
    else if (it.url) await crearEnlace(it.url, ref, it.descripcion)
  }
}

// Adjuntar un ENLACE (URL) en vez de un archivo.
export async function crearEnlace(url, ref, descripcion) {
  const { data, error } = await supabase.from('adjuntos').insert({
    ...refAdjunto(ref), nombre: url, ruta: url, tipo: 'enlace', descripcion: descripcion || null,
  }).select().single()
  if (error) throw error
  return data
}

export async function urlAdjunto(ruta) {
  const { data, error } = await supabase.storage.from('adjuntos').createSignedUrl(ruta, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function borrarAdjunto(adj) {
  if (adj.tipo !== 'enlace') await supabase.storage.from('adjuntos').remove([adj.ruta]).catch(() => {})
  const { error } = await supabase.from('adjuntos').delete().eq('id', adj.id)
  if (error) throw error
}

// ---------------------------------------------------------------
// PAPELERA (borrado suave: restaurar o borrar definitivo; purga a 3 meses)
// ---------------------------------------------------------------

const TABLAS_PAPELERA = [
  { tabla: 'empresas', etiqueta: 'Empresa', campo: 'nombre' },
  { tabla: 'personas', etiqueta: 'Persona', campo: 'nombre' },
  { tabla: 'productos', etiqueta: 'Producto', campo: 'nombre' },
  { tabla: 'encargos', etiqueta: 'Oportunidad', campo: 'producto' },
  { tabla: 'notas', etiqueta: 'Nota', campo: 'texto' },
  { tabla: 'tareas', etiqueta: 'Tarea', campo: 'texto' },
  { tabla: 'informes', etiqueta: 'Informe', campo: 'nombre' },
]

export async function listarPapelera() {
  const res = await Promise.all(TABLAS_PAPELERA.map(async (t) => {
    const { data, error } = await supabase.from(t.tabla)
      .select(`id, ${t.campo}, borrado_en`)
      .not('borrado_en', 'is', null)
      .order('borrado_en', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => ({
      tabla: t.tabla, etiqueta: t.etiqueta, id: r.id,
      texto: r[t.campo] || '(sin nombre)', borrado_en: r.borrado_en,
    }))
  }))
  return res.flat().sort((a, b) => new Date(b.borrado_en) - new Date(a.borrado_en))
}

export async function restaurarPapelera(tabla, id) {
  const { error } = await supabase.from(tabla).update({ borrado_en: null }).eq('id', id)
  if (error) throw error
}

export async function borrarDefinitivo(tabla, id) {
  const { error } = await supabase.from(tabla).delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// INFORMES (PDF para proveedores) — bucket público 'informes'
// ---------------------------------------------------------------

// Lista los informes con su proveedor, más nuevos primero.
export async function listarInformes() {
  const { data, error } = await supabase
    .from('informes')
    .select('*, proveedor:personas!proveedor_id(nombre, telefonos, correo)')
    .is('borrado_en', null)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}

export async function crearInforme(informe) {
  const { data, error } = await supabase.from('informes').insert(informe).select().single()
  if (error) throw error
  return data
}

// Sube (o reemplaza) el PDF del informe al bucket público y guarda su ruta.
export async function guardarPdfInforme(informeId, blob) {
  const { data: u } = await supabase.auth.getUser()
  const uid = u?.user?.id
  if (!uid) throw new Error('Sin sesión')
  const ruta = `${uid}/${informeId}.pdf`
  const { error: errUp } = await supabase.storage
    .from('informes').upload(ruta, blob, { contentType: 'application/pdf', upsert: true })
  if (errUp) throw errUp
  const { data, error } = await supabase
    .from('informes').update({ pdf_ruta: ruta }).eq('id', informeId).select().single()
  if (error) throw error
  return data
}

// URL pública (bucket público): sirve para compartir por WhatsApp/correo.
export function urlPublicaInforme(ruta) {
  if (!ruta) return null
  return supabase.storage.from('informes').getPublicUrl(ruta).data.publicUrl
}

export async function borrarInforme(id) {
  const { error } = await supabase.from('informes').update({ borrado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------
// AJUSTES (configuración del usuario)
// ---------------------------------------------------------------

export async function obtenerAjustes() {
  // Con RLS por usuario, solo es visible la fila propia (0 o 1).
  const { data, error } = await supabase.from('ajustes').select('*').maybeSingle()
  if (error) throw error
  return data || { nombre: '', notif_movil: true, notif_correo: false, correo_avisos: '', extra: {} }
}

export async function actualizarAjustes(cambios) {
  // user_id lo pone el default auth.uid(); upsert por usuario.
  const { data, error } = await supabase
    .from('ajustes').upsert({ ...cambios }, { onConflict: 'user_id' }).select().single()
  if (error) throw error
  return data
}
