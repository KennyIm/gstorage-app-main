import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { clearTokenEnMemoria } from '../../services/api'
import { ArrowDownUp, Boxes, Layers, ArrowLeft, LogOut, Search, X } from 'lucide-react'

const ZONAS_DESTINO = {
  TODOS: [],
  IQUIQUE: ['iquique', 'alto hospicio'],
  ANTOFAGASTA: ['antofagasta', 'mejillones', 'tocopilla', 'calama'],
  COPIAPO: ['copiapó', 'copiapo'],
}

export default function RecepcionPatioMobile() {
  document.title = "Transfer - GStorage"
  const [listaDespachos, setListaDespachos] = useState([])
  const [despachoId, setDespachoId] = useState('')
  const [despachoInfo, setDespachoInfo] = useState(null)
  const [mercancias, setMercancias] = useState([])
  const { logoutUser } = useAuth()
  const navigate = useNavigate()
  const [filtroZonaMercancia, setFiltroZonaMercancia] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [criterioOrden, setCriterioOrden] = useState('ASC') 
  const [separarRevisados, setSepararRevisados] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [draftRestoredMsg, setDraftRestoredMsg] = useState(false)
  const [itemEnEdicion, setItemEnEdicion] = useState(null)

  useEffect(() => {
    obtenerDespachosDisponibles()
    const borradorGuardado = sessionStorage.getItem('patio_transfer_draft')
    if (borradorGuardado) {
      try {
        const draft = JSON.parse(borradorGuardado)
        if (draft.despachoInfo && draft.mercancias && draft.mercancias.length > 0) {
          setDespachoId(draft.despachoId)
          setDespachoInfo(draft.despachoInfo)
          setMercancias(draft.mercancias)
          setDraftRestoredMsg(true)
        }
      } catch (e) {
        sessionStorage.removeItem('patio_transfer_draft')
      }
    }
  }, [])

  useEffect(() => {
    if (despachoInfo && mercancias.length > 0) {
      sessionStorage.setItem('patio_transfer_draft', JSON.stringify({
        despachoId,
        despachoInfo,
        mercancias,
      }))
    }
  }, [despachoInfo, mercancias, despachoId])
  const descartarBorrador = () => {
    sessionStorage.removeItem('patio_transfer_draft')
    setDespachoInfo(null)
    setMercancias([])
    setDespachoId('')
    setDraftRestoredMsg(false)
    setBusqueda('')
  }
  const obtenerDespachosDisponibles = async () => {
    try {
      const res = await axios.get('/api/inventario/despachos/disponibles-patio/')
      setListaDespachos(res.data)
    } catch (err) {
      console.error('Error al cargar lista de despachos:', err)
    }
  }
  const cargarDespacho = async (id) => {
    if (!id) return
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setDraftRestoredMsg(false)
    setBusqueda('')
    sessionStorage.removeItem('patio_transfer_draft')
    try {
      const res = await axios.get(`/api/inventario/despachos/${id}/mercancias-patio/`)
      const despacho = res.data.despacho
      setDespachoInfo(despacho)
      const mapaOrden = new Map()
      const ordenCampo = despacho?.orden_mercancias

      const registrarEnMapa = (item, indexFallback) => {
        if (!item) return
        if (typeof item === 'object') {
          const mId = String(item.id_mercancia || item.mercancia_id || item.id || '')
          const pos = item.posicion || item.orden || item.posicion_estiba || (indexFallback + 1)
          if (mId) mapaOrden.set(mId, Number(pos))
        } else {
          mapaOrden.set(String(item), indexFallback + 1)
        }
      }

      if (Array.isArray(ordenCampo)) {
        ordenCampo.forEach((it, i) => registrarEnMapa(it, i))
      } else if (typeof ordenCampo === 'string' && ordenCampo.trim() !== '') {
        try {
          const parsed = JSON.parse(ordenCampo)
          if (Array.isArray(parsed)) {
            parsed.forEach((it, i) => registrarEnMapa(it, i))
          }
        } catch {
          ordenCampo.split(',').forEach((s, i) => {
            const clean = s.trim()
            if (clean) mapaOrden.set(clean, i + 1)
          })
        }
      }

      const itemsConValidacion = (res.data.mercancias || []).map((item, index) => {
        const estaEnObservacion = item.estado === 'En Observacion'
        const idStr = String(item.id_mercancia || item.id || '')

        let posicionEstiba = null
        if (mapaOrden.has(idStr)) {
          posicionEstiba = mapaOrden.get(idStr)
        } else {
          const campoAlternativo = item.posicion_estiba ?? item.orden_estiba ?? item.orden_carga ?? item.numero_orden_carga ?? item.orden
          if (campoAlternativo !== undefined && campoAlternativo !== null && !isNaN(Number(campoAlternativo)) && Number(campoAlternativo) > 0) {
            posicionEstiba = Number(campoAlternativo)
          } else {
            posicionEstiba = index + 1
          }
        }

        return {
          ...item,
          posicion_estiba: posicionEstiba,
          bultos_recibidos: estaEnObservacion ? (item.bultos_recibidos || 0) : item.cantidad_bultos,
          kg_recibidos: estaEnObservacion ? (item.kg_recibidos || 0) : item.kg,
          m3_recibidos: estaEnObservacion ? (item.m3_recibidos || 0) : item.m3,
          tipo_recibido: item.tipo || '',
          conforme: !estaEnObservacion,
          observacion: item.motivo_baja || item.observacion || '',
          revisado: estaEnObservacion,
        }
      })

      setMercancias(itemsConValidacion)
    } catch (err) {
      console.error(err)
      setErrorMsg(
        err.response?.data?.detail || 'No se pudo cargar el despacho o no tiene mercancías pendientes.'
      )
      setDespachoInfo(null)
      setMercancias([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('¿Seguro que deseas cerrar tu sesión de patio?')) return

    try {
      sessionStorage.removeItem('patio_transfer_draft')
      if (logoutUser) {
        await logoutUser()
      } else {
        clearTokenEnMemoria()
        localStorage.clear()
        window.location.href = '/login-express'
      }
    } catch (err) {
      console.error("Error al cerrar sesión:", err)
      window.location.href = '/login-express'
    }
  }

  const marcarConforme = (id_mercancia) => {
    setMercancias((prev) =>
      prev.map((item) => {
        if (item.id_mercancia === id_mercancia) {
          return {
            ...item,
            bultos_recibidos: item.cantidad_bultos,
            kg_recibidos: item.kg,
            m3_recibidos: item.m3,
            conforme: true,
            observacion: '',
            revisado: true,
          }
        }
        return item
      })
    )
  }

  const abrirAjuste = (item) => {
    setItemEnEdicion({ ...item })
  }

  const guardarAjuste = () => {
    setMercancias((prev) =>
      prev.map((item) => {
        if (item.id_mercancia === itemEnEdicion.id_mercancia) {
          return {
            ...itemEnEdicion,
            revisado: true,
          }
        }
        return item
      })
    )
    setItemEnEdicion(null)
  }
  const mercanciasFiltradas = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    return mercancias.filter((m) => {
      if (filtroZonaMercancia !== 'TODOS') {
        const destinoStr = (m.nombre_destino || '').toLowerCase()
        const ciudadesValidas = ZONAS_DESTINO[filtroZonaMercancia] || []
        const coincideZona = ciudadesValidas.some((ciudad) => destinoStr.includes(ciudad))
        if (!coincideZona) return false
      }
      if (query) {
        const cliente = String(m.nombre_cliente || m.cliente || '').toLowerCase()
        const codigo = String(m.codigo_interno || m.id_mercancia || '').toLowerCase()
        const factura = String(m.factura || m.numero_factura || '').toLowerCase()

        const coincide = cliente.includes(query) || codigo.includes(query) || factura.includes(query)
        if (!coincide) return false
      }

      return true
    })
  }, [mercancias, filtroZonaMercancia, busqueda])

  const revisadosFiltradosCount = mercanciasFiltradas.filter((m) => m.revisado).length
  const conformesFiltradosCount = mercanciasFiltradas.filter((m) => m.revisado && m.conforme).length
  const obsFiltradosCount = mercanciasFiltradas.filter((m) => m.revisado && !m.conforme).length
  const mercanciasOrdenadas = useMemo(() => {
    return [...mercanciasFiltradas].sort((a, b) => {
      if (separarRevisados) {
        if (!a.revisado && b.revisado) return -1
        if (a.revisado && !b.revisado) return 1
      }

      const posA = Number(a.posicion_estiba) || 9999
      const posB = Number(b.posicion_estiba) || 9999

      if (posA !== posB) {
        return criterioOrden === 'ASC' ? posA - posB : posB - posA
      }
      return (Number(a.id_mercancia) || 0) - (Number(b.id_mercancia) || 0)
    })
  }, [mercanciasFiltradas, criterioOrden, separarRevisados])

  const finalizarTransferZona = async () => {
    if (mercanciasFiltradas.length === 0) return
    const sinRevisar = mercanciasFiltradas.filter((m) => !m.revisado)
    if (sinRevisar.length > 0) {
      const msj = filtroZonaMercancia === 'TODOS'
        ? `Quedan ${sinRevisar.length} cargas sin revisar en total. ¿Deseas marcarlas como conformes y recepcionar?`
        : `Quedan ${sinRevisar.length} cargas sin revisar para la zona [${filtroZonaMercancia}]. ¿Deseas marcarlas como conformes y recepcionar?`

      if (!window.confirm(msj)) return
    }

    setSubmitting(true)
    setErrorMsg('')
    try {
      const payload = {
        items: mercanciasFiltradas.map((m) => ({
          id_mercancia: m.id_mercancia,
          bultos_recibidos: parseInt(m.bultos_recibidos || 0, 10),
          kg_recibidos: parseFloat(m.kg_recibidos || 0),
          m3_recibidos: parseFloat(m.m3_recibidos || 0),
          tipo_recibido: m.tipo_recibido,
          conforme: m.conforme,
          observacion: m.observacion,
        })),
      }

      const res = await axios.post(`/api/inventario/despachos/${despachoId}/procesar-transfer/`, payload)
      setSuccessMsg(res.data.message || `Recepción finalizada con éxito.`)
      sessionStorage.removeItem('patio_transfer_draft')
      setDraftRestoredMsg(false)

      if (res.data.despacho_finalizado) {
        setDespachoInfo(null)
        setMercancias([])
        setDespachoId('')
        obtenerDespachosDisponibles()
      } else {
        cargarDespacho(despachoId)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || err.response?.data?.detail || 'Ocurrió un error al procesar el transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 font-sans pb-16">
      {/* Header */}
      <div className="bg-slate-800 text-white p-4 rounded-xl mb-4 flex justify-between items-center shadow-md">
        <button
          onClick={() => navigate('/operaciones')}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div>
          <h2 className="m-0 text-base font-bold flex items-center gap-1.5">
            Transfer / Patio
          </h2>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-700/30 hover:bg-red-800/40 text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
        >
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </div>

      {draftRestoredMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg mb-4 text-xs flex justify-between items-center">
          <span><strong>Avance restaurado:</strong> Despacho #{despachoInfo?.nombre_ruta || despachoId}.</span>
          <button
            onClick={descartarBorrador}
            className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-bold text-xs cursor-pointer hover:bg-blue-200"
          >
            Limpiar
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg mb-4 text-xs font-bold">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-300 text-green-800 rounded-lg mb-4 text-xs font-bold">
          ✅ {successMsg}
        </div>
      )}

      {!despachoInfo && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Seleccionar camión en andén / patio:
          </label>
          <select
            value={despachoId}
            onChange={(e) => {
              const id = e.target.value
              setDespachoId(id)
              if (id) cargarDespacho(id)
            }}
            disabled={loading}
            className="w-full p-3 text-center text-sm font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="">-- {loading ? 'Cargando viaje...' : 'Seleccionar Despacho'} --</option>
            {listaDespachos.map((d) => (
              <option key={d.id_despacho} value={d.id_despacho}>
                Ruta #{d.nombre_ruta} - [{d.estado || d.estado_despacho}] {d.destino !== 'Sin Destino' ? `${d.destino}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {despachoInfo && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 px-4 mb-3 shadow-xs">
            <div className="flex justify-between items-center">
              <div>
                <strong className="text-base font-black text-blue-900 block">
                  Despacho #{despachoInfo.nombre_ruta || despachoInfo.id_despacho}
                </strong>
              </div>
              <button
                onClick={descartarBorrador}
                className="bg-white border border-blue-300 px-3 py-1.5 rounded-lg text-blue-800 text-xs cursor-pointer hover:bg-blue-100 font-bold"
              >
                Cambiar Camión
              </button>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-700 mb-1 font-semibold">
                <span>Progreso ({filtroZonaMercancia}): {revisadosFiltradosCount} de {mercanciasFiltradas.length}</span>
                <span className="text-blue-800 font-black">{Math.round((revisadosFiltradosCount / (mercanciasFiltradas.length || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(revisadosFiltradosCount / (mercanciasFiltradas.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3 shadow-xs space-y-3">
            {/* Buscador de Mercancía */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente, código interno o factura..."
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selector de Zonas */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'TODOS', label: 'Todas' },
                { id: 'COPIAPO', label: 'Copiapó' },
                { id: 'ANTOFAGASTA', label: 'Antofagasta' },
                { id: 'IQUIQUE', label: 'Iquique' },
              ].map((zona) => {
                const activo = filtroZonaMercancia === zona.id
                return (
                  <button
                    key={zona.id}
                    onClick={() => setFiltroZonaMercancia(zona.id)}
                    className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${activo
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {zona.label}
                  </button>
                )
              })}
            </div>

            {/* Controles de Secuencia y Comportamiento */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <ArrowDownUp className="w-3.5 h-3.5 text-amber-500" />
                  Secuencia:
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCriterioOrden('ASC')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${criterioOrden === 'ASC'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    title="Orden natural de estiba: 1 a N (Parapeto al frente)"
                  >
                    Parapeto
                  </button>
                  <button
                    onClick={() => setCriterioOrden('DESC')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${criterioOrden === 'DESC'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    title="Descarga primero: N a 1 (Puertas traseras / Cola)"
                  >
                    Cola
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Mover revisados al final:</span>
                <button
                  type="button"
                  onClick={() => setSepararRevisados(!separarRevisados)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                    separarRevisados
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {separarRevisados ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>
            </div>
          </div>

          {/* Listado de Cargas */}
          <div className="flex flex-col gap-2.5 mb-6">
            {mercanciasOrdenadas.length === 0 ? (
              <div className="text-center p-8 text-slate-400 bg-white border border-slate-200 rounded-xl text-xs">
                {busqueda
                  ? `No se encontraron mercancías que coincidan con "${busqueda}".`
                  : 'No hay mercancías pendientes en este despacho.'}
              </div>
            ) : (
              mercanciasOrdenadas.map((m) => {
                const esRevisado = m.revisado
                const esConforme = m.conforme
                return (
                  <div
                    key={m.id_mercancia}
                    className={`border rounded-xl p-3.5 shadow-xs transition ${!esRevisado
                        ? 'border-slate-200 bg-white'
                        : esConforme
                          ? 'border-green-300 bg-green-50/40 opacity-80'
                          : 'border-amber-300 bg-amber-50/50 opacity-90'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-2xs">
                            ORDEN #{m.posicion_estiba || '-'}
                          </span>
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            CÓD: <strong className='text-blue-500'>{m.codigo_interno || `#${m.id_mercancia}`}</strong>
                          </span>
                          <span className="bg-slate-800 text-green-300 text-[10px] font-black px-2 py-0.5 rounded border border-green-200">
                            FAC: <strong className='text-green-300'>{m.factura || `S/N`}</strong>
                          </span>
                        </div>
                        <h4 className="m-0 text-sm font-bold text-slate-900 leading-tight">
                          {m.nombre_cliente}
                        </h4>
                      </div>

                      {esRevisado && (
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${esConforme ? 'text-green-800 bg-green-100' : 'text-amber-800 bg-amber-100'
                            }`}
                        >
                          {esConforme ? '✓ CONFORME' : '⚠️ OBSERVADO'}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-blue-600 mb-1">
                      Destino: {m.direccion_entrega || 'No especificado'}, {m.nombre_destino || 'No especificado'}
                    </div>

                    <div className="text-xs text-slate-500 mb-2 truncate">
                      <strong>Tipo:</strong> {m.tipo || 'Carga General'} {m.descripcion_carga && `| ${m.descripcion_carga}`}
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2 text-xs grid grid-cols-3 gap-1 text-center mb-2.5 border border-slate-200 font-medium">
                      <div>
                        <div className="text-slate-400 text-[10px] font-bold uppercase">Bultos</div>
                        <strong className="text-slate-800">{m.bultos_recibidos}</strong>{' '}
                        <span className="text-[10px] text-slate-400">({m.cantidad_bultos})</span>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] font-bold uppercase">Kg</div>
                        <strong className="text-slate-800">{m.kg_recibidos}</strong>{' '}
                        <span className="text-[10px] text-slate-400">({m.kg})</span>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] font-bold uppercase">m³</div>
                        <strong className="text-slate-800">{m.m3_recibidos}</strong>{' '}
                        <span className="text-[10px] text-slate-400">({m.m3})</span>
                      </div>
                    </div>

                    {!esConforme && m.observacion && (
                      <div className="text-xs text-amber-900 bg-amber-100/70 p-2 rounded-lg italic mb-2.5 border border-amber-200">
                        Novedad: "{m.observacion}"
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => marcarConforme(m.id_mercancia)}
                        className={`p-2.5 text-white font-bold text-xs rounded-lg border-none cursor-pointer transition active:scale-95 ${esRevisado && esConforme ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'
                          }`}
                      >
                        Conforme
                      </button>
                      <button
                        onClick={() => abrirAjuste(m)}
                        className={`p-2.5 text-white font-bold text-xs rounded-lg border-none cursor-pointer transition active:scale-95 ${!esConforme ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-800'
                          }`}
                      >
                        {esRevisado && !esConforme ? 'Editar Novedad' : 'Ajustar / Falta'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Botón flotante para finalizar la recepción */}
          <div className="sticky bottom-4 bg-white p-3 rounded-xl shadow-xl border border-slate-200">
            <button
              onClick={finalizarTransferZona}
              disabled={submitting || mercanciasFiltradas.length === 0}
              className={`w-full p-3.5 text-white font-black text-xs uppercase tracking-wider rounded-lg border-none transition active:scale-95 ${mercanciasFiltradas.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 cursor-pointer shadow-md'
                }`}
            >
              {submitting
                ? 'Procesando Recepción...'
                : `Finalizar Recepción (${conformesFiltradosCount} Conformes, ${obsFiltradosCount} Observados)`}
            </button>
          </div>
        </>
      )}

      {/* Modal de Ajuste / Incidencia */}
      {itemEnEdicion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded">
                ORDEN #{itemEnEdicion.posicion_estiba}
              </span>
              <h3 className="m-0 text-slate-900 font-bold text-base">
                Ajustar Carga {itemEnEdicion.codigo_interno || `#${itemEnEdicion.id_mercancia}`}
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Bultos Recibidos:</label>
              <input
                type="number"
                value={itemEnEdicion.bultos_recibidos}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, bultos_recibidos: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Kg Recibidos:</label>
              <input
                type="number"
                step="0.01"
                value={itemEnEdicion.kg_recibidos}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, kg_recibidos: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">m³ Recibidos:</label>
              <input
                type="number"
                step="0.001"
                value={itemEnEdicion.m3_recibidos}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, m3_recibidos: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
              <label className="flex items-center gap-2 text-xs cursor-pointer font-bold text-amber-900">
                <input
                  type="checkbox"
                  checked={!itemEnEdicion.conforme}
                  onChange={(e) =>
                    setItemEnEdicion({
                      ...itemEnEdicion,
                      conforme: !e.target.checked,
                      bultos_recibidos: e.target.checked ? 0 : itemEnEdicion.cantidad_bultos,
                      kg_recibidos: e.target.checked ? 0 : itemEnEdicion.kg,
                      m3_recibidos: e.target.checked ? 0 : itemEnEdicion.m3,
                    })
                  }
                />
                Marcar como NO CONFORME / Carga Faltante
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Observación / Motivo:</label>
              <textarea
                rows="3"
                placeholder="Ej: Bulto roto o no venía en el camión..."
                value={itemEnEdicion.observacion}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, observacion: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-sans outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setItemEnEdicion(null)}
                className="p-3 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs cursor-pointer hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={guardarAjuste}
                className="p-3 bg-blue-600 text-white rounded-lg font-bold text-xs cursor-pointer hover:bg-blue-700"
              >
                Guardar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}