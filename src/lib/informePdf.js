// Genera el PDF de un informe a partir del snapshot `contenido` (lo que el padre
// seleccionó). jsPDF se carga bajo demanda para no engordar el paquete inicial.
//
// contenido = {
//   nombre, fecha (YYYY-MM-DD), proveedor: { nombre },
//   oportunidades: [{ id, fase, creado_en, centro, producto, descripcion,
//                     importe, comentario, incluir: {centro,producto,fecha,importe,descripcion} }]
// }

import { FASES } from './fases.js'

const MARGEN = 16
const A4 = { w: 210, h: 297 }

function hexRgb(hex) {
  const h = (hex || '#333333').replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function fechaEs(iso) {
  if (!iso) return ''
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function importeEs(n) {
  if (n == null || n === '' || isNaN(Number(n))) return ''
  return Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

export async function generarPdfInforme(contenido) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoUtil = A4.w - MARGEN * 2
  const fondo = A4.h - MARGEN
  let y = MARGEN

  const saltoSiHaceFalta = (alto) => {
    if (y + alto > fondo) { doc.addPage(); y = MARGEN }
  }
  const parrafo = (texto, { size = 10, style = 'normal', color = [40, 40, 40], gap = 1.5, indent = 0 } = {}) => {
    if (!texto) return
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color)
    const lineas = doc.splitTextToSize(String(texto), anchoUtil - indent)
    const lh = size * 0.42
    for (const ln of lineas) {
      saltoSiHaceFalta(lh)
      doc.text(ln, MARGEN + indent, y)
      y += lh
    }
    y += gap
  }

  // ---- Cabecera ----
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(150, 150, 150)
  doc.text('ZONA CLIENTE', MARGEN, y); y += 7
  doc.setFontSize(20); doc.setTextColor(20, 20, 20)
  const titulo = doc.splitTextToSize(contenido.nombre || 'Informe', anchoUtil)
  for (const ln of titulo) { doc.text(ln, MARGEN, y); y += 8 }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(90, 90, 90)
  const meta = [contenido.proveedor?.nombre ? `Para: ${contenido.proveedor.nombre}` : null,
    contenido.fecha ? `Fecha: ${fechaEs(contenido.fecha)}` : null].filter(Boolean).join('    ·    ')
  if (meta) { doc.text(meta, MARGEN, y); y += 6 }
  doc.setDrawColor(220, 220, 220); doc.line(MARGEN, y, A4.w - MARGEN, y); y += 8

  // ---- Oportunidades agrupadas por fase (orden de FASES; dentro, más nuevas primero) ----
  const ops = contenido.oportunidades || []
  const ordenFase = (v) => { const i = FASES.findIndex((f) => f.v === v); return i === -1 ? 99 : i }
  const grupos = FASES
    .map((f) => ({
      fase: f,
      items: ops.filter((o) => o.fase === f.v).sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)),
    }))
    .filter((g) => g.items.length)
  // Fases desconocidas (por si acaso) al final.
  const conocidas = new Set(FASES.map((f) => f.v))
  const sueltas = ops.filter((o) => !conocidas.has(o.fase))
  if (sueltas.length) grupos.push({ fase: { t: 'Otras', color: '#666666', v: '_' }, items: sueltas })

  if (!grupos.length) {
    parrafo('Sin oportunidades seleccionadas.', { color: [140, 140, 140], style: 'italic' })
  }

  for (const g of grupos) {
    saltoSiHaceFalta(12)
    y += 2
    const [r, gr, b] = hexRgb(g.fase.color)
    doc.setFillColor(r, gr, b)
    doc.roundedRect(MARGEN, y - 3.6, 3, 4.4, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(r, gr, b)
    doc.text(`${g.fase.t}  (${g.items.length})`, MARGEN + 5, y); y += 6

    for (const o of g.items) {
      const inc = o.incluir || {}
      saltoSiHaceFalta(10)
      const tituloPartes = []
      if (inc.centro && o.centro) tituloPartes.push(o.centro)
      if (inc.producto && o.producto) tituloPartes.push(o.producto)
      const tituloOp = tituloPartes.join('  —  ') || o.producto || o.centro || 'Oportunidad'
      parrafo(tituloOp, { size: 11, style: 'bold', color: [30, 30, 30], gap: 0.5 })

      const metaPartes = []
      if (inc.fecha && o.creado_en) metaPartes.push(fechaEs(o.creado_en))
      if (inc.importe && importeEs(o.importe)) metaPartes.push(importeEs(o.importe))
      if (metaPartes.length) parrafo(metaPartes.join('   ·   '), { size: 9, color: [120, 120, 120], gap: 1 })

      if (inc.descripcion && o.descripcion) parrafo(o.descripcion, { size: 10, color: [55, 55, 55], gap: 1 })
      if (o.comentario) parrafo(`» ${o.comentario}`, { size: 10, style: 'italic', color: [70, 70, 90], gap: 1 })
      y += 2.5
    }
    y += 2
  }

  // ---- Pie: número de página ----
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(160, 160, 160)
    doc.text(`Página ${p} de ${total}`, A4.w - MARGEN, A4.h - 8, { align: 'right' })
    doc.text('Generado con Zona Cliente', MARGEN, A4.h - 8)
  }

  return doc.output('blob')
}
