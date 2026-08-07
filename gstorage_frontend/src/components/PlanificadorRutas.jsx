import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import * as XLSX from 'xlsx-js-style'
import { GripVertical, FileSpreadsheet, User, Package, Building2, UserStar, Hexagon, Loader2 } from 'lucide-react'
import apiClient from '../services/api'
import Select from 'react-select'
import { useUI } from '../context/UIContext'

export default function PlanificadorRutas() {
  document.title = "Planificador de Rutas - GStorage"
  const { showLoader, hideLoader, showToast } = useUI()

  const [despachos, setDespachos] = useState([])
  const [clientes, setClientes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [destinos, setDestinos] = useState([])
  const [ramplas, setRamplas] = useState([])
  const [camiones, setCamiones] = useState([])
  const [rutas, setRutas] = useState([])

  const [despachoSeleccionado, setDespachoSeleccionado] = useState('')
  const [listaRuta, setListaRuta] = useState([])
  const [loading, setLoading] = useState(true)
  const [cambiosPendientes, setCambiosPendientes] = useState(false)
  const [busquedaCorrelativo, setBusquedaCorrelativo] = useState('')
  const [posicionDestino, setPosicionDestino] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      if (typeof showLoader === 'function') showLoader()
      try {
        setLoading(true)
        const [
          despachosRes,
          clientesRes,
          proveedoresRes,
          destinosRes,
          ramplasRes,
          camionesRes,
          rutasRes
        ] = await Promise.all([
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/proveedores/'),
          apiClient.get('/api/inventario/destinos/'),
          apiClient.get('/api/inventario/ramplas/'),
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/rutas/')
        ])

        setDespachos(despachosRes.data.results || despachosRes.data)
        setClientes(clientesRes.data)
        setProveedores(proveedoresRes.data)
        setDestinos(destinosRes.data)
        setRamplas(ramplasRes.data)
        setCamiones(camionesRes.data)
        setRutas(rutasRes.data)
        setLoading(false)
      } catch (error) {
        console.error("Error cargando catálogos iniciales:", error)
        setLoading(false)
      } finally {
        if (typeof hideLoader === 'function') hideLoader()
      }
    }
    fetchData()
  }, [])

  const getNombreCliente = (id) => {
    const cliente = clientes.find(c => String(c.id_cliente) === String(id))
    return cliente ? cliente.nombre_cliente : 'Cliente Desconocido'
  }
  const getNombreProveedor = (id) => {
    const proveedor = proveedores.find(p => String(p.id) === String(id))
    return proveedor ? proveedor.nombre_proveedor : 'N/R'
  }
  const getNombreDestino = (id) => {
    const destino = destinos.find(d => String(d.id_destino) === String(id))
    return destino ? destino.nombre_ciudad : 'No especificado'
  }
  const getPatenteRampla = (id) => {
    const rampla = ramplas.find(r => String(r.id_rampla) === String(id))
    return rampla ? rampla.patente : 'S/R'
  }
  const getPatenteCamion = (id_camion) => {
    if (!id_camion) return 'Sin Camión';
    const camionEncontrado = camiones.find(c => String(c.id_camion) === String(id_camion))
    return camionEncontrado ? camionEncontrado.patente : 'Camión Desconocido'
  }
  const getCodigoRuta = (rutaId) => {
    if (!rutaId) return 'Sin Ruta asignada';
    const rutaEncontrada = rutas.find(r => String(r.id) === String(rutaId) || String(r.id_ruta) === String(rutaId))
    if (rutaEncontrada) {
      return rutaEncontrada.codigo_ruta || rutaEncontrada.codigo || `Encontrada (Sin código)`
    }
    return `Ruta N° ${rutaId}`
  }
  const manejarSeleccionDespacho = async (e) => {
    const id = (e && e.target) ? e.target.value : e
    setDespachoSeleccionado(id)

    if (!id) {
      setListaRuta([])
      return
    }

    if (typeof showLoader === 'function') showLoader()

    try {
      const response = await apiClient.get(`/api/inventario/mercancias/?id_despacho=${id}&page_size=500`)
      const mercanciasDelCamion = response.data.results || response.data
      const despachoObj = despachos.find(d => String(d.id_despacho) === String(id))
      const ordenIds = (despachoObj?.orden_mercancias || []).map(String)
      mercanciasDelCamion.sort((a, b) => {
        const indexA = ordenIds.indexOf(String(a.id_mercancia))
        const indexB = ordenIds.indexOf(String(b.id_mercancia))

        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1

        return indexA - indexB
      })

      setListaRuta(mercanciasDelCamion)
      setCambiosPendientes(false)

    } catch (error) {
      console.error("Error al traer mercancías del despacho selecto:", error)
      if (typeof showToast === 'function') {
        showToast('Error al conectar con el servidor de estibas.', 'error')
      }
    } finally {
      if (typeof hideLoader === 'function') hideLoader()
    }
  }

  const moverAlInicio = (indexActual) => {
    const listaClonada = [...listaRuta]
    const [elemento] = listaClonada.splice(indexActual, 1)
    listaClonada.unshift(elemento)
    setListaRuta(listaClonada)
    setCambiosPendientes(true)
  }

  const moverAPosicion = (indexActual, posicionDestino) => {
    const targetIndex = parseInt(posicionDestino) - 1
    const listaClonada = [...listaRuta]

    if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= listaClonada.length) return

    const [elemento] = listaClonada.splice(indexActual, 1)
    listaClonada.splice(targetIndex, 0, elemento)
    setListaRuta(listaClonada)
    setCambiosPendientes(true)
  }

  const onDragEnd = (result) => {
    if (!result.destination) return
    const items = Array.from(listaRuta)
    const [itemReordenado] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, itemReordenado)
    setListaRuta(items)
    setCambiosPendientes(true)
  }

  const exportarAExcel = () => {
    if (listaRuta.length === 0) return

    const despacho = despachos.find(d => String(d.id_despacho) === String(despachoSeleccionado))

    const totalKilos = listaRuta.reduce((acc, item) => acc + (Number(item.kg) || 0), 0)
    const totalBultos = listaRuta.reduce((acc, item) => acc + (Number(item.cantidad_bultos) || 0), 0)

    const datosExcel = [
      [
        "",
        `${despacho?.nombre_conductor || 'N/A'}`,
        `${getCodigoRuta(despacho?.id_ruta).split('-')[0].trim()}`,
        `${(despacho?.id_camion).replace(/Camión/ig, '').split('(')[0].trim()}`,
        `${getPatenteRampla(despacho?.id_rampla)}`,
        `${despacho?.fecha_salida_real ? new Date(despacho.fecha_salida_real).toLocaleDateString() : 'N/A'}`,
        "", ""
      ],
      ["N°", "Cliente", "Proveedor", "Kilos", "Destino", "Documento", "Bultos", "Cód. Interno"]
    ]

    listaRuta.forEach((item, index) => {
      datosExcel.push([
        index + 1,
        getNombreCliente(item.id_cliente),
        getNombreProveedor(item.id_proveedor),
        Number(item.kg) || 0,
        getNombreDestino(item.id_destino),
        item.tipo_documento_mercancia + ": " + item.factura || "S/F",
        item.cantidad_bultos + " " + item.tipo || 0,
        item.codigo_interno || "N/A"
      ])
    })

    datosExcel.push([
      "", "", "TOTAL KILOS", totalKilos,
    ])

    const hoja = XLSX.utils.aoa_to_sheet(datosExcel)
    const formatoKilos = '#,##0'
    for (let i = 2; i < datosExcel.length; i++) {
      const referenciaCelda = XLSX.utils.encode_cell({ r: i, c: 3 })
      if (hoja[referenciaCelda]) {
        hoja[referenciaCelda].z = formatoKilos
      }
    }
    hoja['!merges'] = [
      { s: { r: 0, c: 5 }, e: { r: 0, c: 7 } }
    ]

    hoja['!cols'] = [
      { wch: 6 }, { wch: 35 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
    ]

    hoja['!pageSetup'] = {
      scale: 70,
      orientation: 'landscape',
      paperSize: 9
    }

    hoja['!margins'] = {
      left: 0.13,
      right: 0.13,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    }

    const coloresDestino = {
      "ANTOFAGASTA": "f5424e",
      "IQUIQUE": "000000",
      "CALAMA": "4290f5",
      "SANTIAGO": "008000",
      "TOCOPILLA": "0120FF",
      "COPIAPO": "654321",
      "MEJILLONES": "42f55a"
    }

    Object.keys(hoja).forEach(referenciaCelda => {
      if (referenciaCelda.startsWith('!')) return
      if (!hoja[referenciaCelda].s) hoja[referenciaCelda].s = {}

      const numeroFila = parseInt(referenciaCelda.replace(/\D/g, ''))
      hoja[referenciaCelda].s.alignment = { horizontal: "center", vertical: "center", wrapText: true }
      hoja[referenciaCelda].s.font = { sz: 10, name: "Calibri" }
      hoja[referenciaCelda].s.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" }
      }
      if (numeroFila >= 3) {
        const refDestino = `E${numeroFila}`
        const nombreDestino = hoja[refDestino]?.v ? String(hoja[refDestino].v).toUpperCase() : ""

        if (coloresDestino[nombreDestino]) {
          hoja[referenciaCelda].s.font.color = { rgb: coloresDestino[nombreDestino] }
        }
      }

      if (numeroFila === 2) {
        hoja[referenciaCelda].s.font.bold = true
        hoja[referenciaCelda].s.fill = { fgColor: { rgb: "F2F2F2" } }
      }
    })

    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, "Ruta")
    XLSX.writeFile(libro, `Ruta_Despacho_${getCodigoRuta(despachoSeleccionado)}.xlsx`)
  }

  const handleAsignacionRapida = (e) => {
    if (e) e.preventDefault()
    if (!busquedaCorrelativo || !posicionDestino) return
    const indexOrigen = listaRuta.findIndex(item =>
      String(item.codigo_interno).trim().toLowerCase() === busquedaCorrelativo.trim().toLowerCase()
    )
    if (indexOrigen !== -1) {
      moverAPosicion(indexOrigen, posicionDestino)
      setBusquedaCorrelativo('')
      setPosicionDestino('')
      SetCambiosPendientes(true)
      if (typeof showToast === 'function') {
        showToast(`Código ${busquedaCorrelativo} movido a la posición ${posicionDestino}`, 'success')
        setCambiosPendientes(false)
      }
    } else {
      if (typeof showToast === 'function') showToast('Código correlativo no encontrado.', 'error')
    }
  }

  const handleGuardarSecuencia = async () => {
    if (!despachoSeleccionado) return
    setLoading(true)
    try {
      const listaIdsOrdenados = listaRuta.map(item => item.id_mercancia)
      await apiClient.post(`/api/inventario/despachos/${despachoSeleccionado}/guardar-secuencia/`, {
        orden_ids: listaIdsOrdenados
      })
      alert("¡Secuencia de carga guardada exitosamente en el despacho!")
      setCambiosPendientes(false)

      const despachosRes = await apiClient.get('/api/inventario/despachos/')
      setDespachos(despachosRes.data.results || despachosRes.data)
    } catch (error) {
      console.error("Error al guardar la secuencia:", error)
      alert("Hubo un error al intentar guardar el orden en el servidor.")
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Planificador de Rutas</h1>
          {cambiosPendientes && (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full animate-pulse">
              ⚠️ Tienes cambios sin guardar en la estiba
            </span>
          )}
        </div>
        <div className="min-w-[300px]">
          <Select
            inputId="id_despacho"
            placeholder="Seleccionar Despacho..."
            noOptionsMessage={() => "No se encontró el despacho"}
            isClearable
            options={despachos.map(d => ({
              value: d.id_despacho,
              label: `Despacho N° ${d.id_despacho} | Ruta N° ${getCodigoRuta(d.id_despacho)}`
            }))}
            value={despachoSeleccionado ? {
              value: despachoSeleccionado,
              label: `Despacho N° ${despachoSeleccionado} | Ruta N° ${getCodigoRuta(despachoSeleccionado)}`
            } : null}
            onChange={(opcion) => manejarSeleccionDespacho(opcion ? opcion.value : "")}
            classNamePrefix="react-select"
          />
        </div>
      </div>

      {listaRuta.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
            <form onSubmit={handleAsignacionRapida} className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200 shadow-inner">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Código correlativo (ej. 1045)..."
                  value={busquedaCorrelativo}
                  onChange={(e) => setBusquedaCorrelativo(e.target.value)}
                  className="pl-2 pr-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-medium w-44 h-7"
                />
              </div>

              <span className="text-slate-400 text-xs font-bold">→</span>

              <input
                type="number"
                placeholder="N° Pos."
                min="1"
                max={listaRuta.length}
                value={posicionDestino}
                onChange={(e) => setPosicionDestino(e.target.value)}
                className="w-16 text-center text-xs py-1 border border-slate-300 rounded bg-white text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-bold h-7"
              />

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold transition shadow-sm h-7 flex items-center"
              >
                Asignar
              </button>
            </form>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 font-bold px-2 py-1 rounded border border-emerald-200/50">
              {Math.ceil(listaRuta.length / 10)} Columna(s) en total
            </span>
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="overflow-x-auto bg-slate-50/50 p-4">
              <Droppable droppableId="lista-rutas" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-flow-col grid-rows-[repeat(10,minmax(0,1fr))] gap-x-4 gap-y-2 h-[610px] w-max pr-4"
                  >
                    {listaRuta.map((item, index) => (
                      <Draggable key={String(item.id_mercancia || index)} draggableId={String(item.id_mercancia || index)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center justify-between p-2.5 border border-slate-200 bg-white rounded-lg w-80 h-[52px] transition-all ${snapshot.isDragging
                              ? 'shadow-2xl scale-[1.03] ring-2 ring-indigo-500 z-50 rounded-lg'
                              : 'hover:border-slate-300 hover:shadow-sm'
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
                                <div {...provided.dragHandleProps} className="cursor-grab p-0.5 hover:text-slate-600">
                                  <GripVertical size={14} />
                                </div>
                                <span className="font-mono font-black text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-center min-w-[28px]">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                <span className="font-bold text-slate-800 text-xs truncate" title={getNombreCliente(item.id_cliente)}>
                                  {getNombreCliente(item.id_cliente)}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate font-medium">
                                  <span className="text-slate-900 font-mono font-bold mr-1">{item.codigo_interno}</span>
                                  ({item.cantidad_bultos}B | {item.kg}kg)
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              <input
                                type="number"
                                min="1"
                                max={listaRuta.length}
                                key={index}
                                defaultValue={index + 1}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  if (val && parseInt(val) !== index + 1) {
                                    moverAPosicion(index, val);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.value) {
                                    moverAPosicion(index, e.target.value);
                                  }
                                }}
                                className="w-10 text-center text-xs py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none font-bold bg-slate-50 text-slate-700 h-6"
                              />

                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moverAlInicio(index)}
                                  title="Enviar al inicio"
                                  className="p-1 text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded transition flex items-center justify-center h-6 w-6"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                  </svg>
                                </button>
                              )}
                            </div>

                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleGuardarSecuencia}
              className={`px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition shadow-sm text-white ${cambiosPendientes
                ? 'bg-orange-600 hover:bg-orange-700 ring-4 ring-orange-100'
                : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
              Guardar Asignación de Ruta
            </button>
            <button
              onClick={exportarAExcel}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-2 ml-4 transition"
            >
              <FileSpreadsheet size={18} /> Exportar Excel
            </button>
          </div>
        </div>
      ) : (
        despachoSeleccionado && (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            No hay mercancías asignadas a este despacho.
          </div>
        )
      )}
    </div>
  )
}