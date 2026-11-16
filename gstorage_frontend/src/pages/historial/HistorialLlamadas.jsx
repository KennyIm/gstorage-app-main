import React, { useState, useEffect, useMemo, useCallback } from 'react'
import apiClient from '../../services/api'
import { useUI } from '../../context/UIContext'
import {
  Phone, PhoneIncoming, PhoneMissed, PhoneForwarded, PhoneCall,
  Clock, Building2, Search, Calendar, X, Loader2,
  CheckCircle2, AlertTriangle, RefreshCw, Activity, ArrowRight, Radio
} from 'lucide-react'

const ESTADO_CONFIG = {
  CONTESTADA_BODEGA: {
    label: 'Contestada por Bodega',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: PhoneIncoming,
  },
  CONTESTADA_GENERAL: {
    label: 'Contestada en General',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: PhoneForwarded,
  },
  NO_CONTESTA_DESVIADA: {
    label: 'Desviada (Sin Respuesta)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: PhoneForwarded,
  },
  ABANDONADA: {
    label: 'Abandonada / No Contestada',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: PhoneMissed,
  },
  EN_CURSO: {
    label: 'En Curso',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200 animate-pulse',
    icon: PhoneCall,
  },
}

const EVENTO_TIMELINE_CONFIG = {
  CALL_INIT: {
    titulo: 'Llamada Entrante Recibida',
    dotClass: 'bg-indigo-600 ring-indigo-100',
    textClass: 'text-indigo-700',
  },
  SELECTION: {
    titulo: 'Selección de Bodega en IVR',
    dotClass: 'bg-sky-600 ring-sky-100',
    textClass: 'text-sky-700',
  },
  IVR_TIMEOUT: {
    titulo: 'Sin Selección en Menú (Timeout)',
    dotClass: 'bg-amber-500 ring-amber-100',
    textClass: 'text-amber-700',
  },
  TRY_BRANCH: {
    titulo: 'Timbrando en Bodega Destino',
    dotClass: 'bg-blue-600 ring-blue-100',
    textClass: 'text-blue-700',
  },
  BRANCH_ANSWERED: {
    titulo: 'Llamada Atendida por Bodega',
    dotClass: 'bg-emerald-600 ring-emerald-100',
    textClass: 'text-emerald-700',
  },
  FALLBACK_TRIGGERED: {
    titulo: 'Desvío Automático a Central General',
    dotClass: 'bg-amber-600 ring-amber-100',
    textClass: 'text-amber-800',
  },
  GENERAL_RESULT: {
    titulo: 'Resultado en Central General',
    dotClass: 'bg-slate-700 ring-slate-200',
    textClass: 'text-slate-800',
  },
}

const formatearFechaHora = (isoString) => {
  if (!isoString) return '-';
  const fecha = new Date(isoString);
  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const formatearSoloHora = (isoString) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const formatearDuracion = (segundos) => {
  if (segundos === null || segundos === undefined) return 'En curso'
  if (segundos < 60) return `${segundos}s`
  const mins = Math.floor(segundos / 60)
  const secs = segundos % 60
  return `${mins}m ${secs}s`
}

export default function HistorialLlamadas() {
  document.title = 'Central Telefónica - GStorage'
  const { showToast } = useUI()

  const [llamadas, setLlamadas] = useState([])
  const [page, setPage] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const pageSize = 20
  const [resumen, setResumen] = useState({
    total: 0,
    contestadas_bodega: 0,
    desviadas_general: 0,
    abandonadas: 0,
    en_curso: 0,
  })

  const [loading, setLoading] = useState(true)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [llamadaSeleccionada, setLlamadaSeleccionada] = useState(null)

  const [filtros, setFiltros] = useState({
    search: '',
    bodega: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
  })

  const construirParams = useCallback(() => {
    const params = {}
    if (filtros.search.trim()) params.search = filtros.search.trim()
    if (filtros.bodega) params.bodega = filtros.bodega
    if (filtros.estado) params.estado = filtros.estado
    if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde
    if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta
    return params
  }, [filtros])

  const actualizarFiltro = (campo, valor) => {
    setPage(1)
    setFiltros((prev) => ({ ...prev, [campo]: valor }))
  }

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const baseParams = construirParams()
      const llamadasParams = { ...baseParams, page, page_size: pageSize }

      const [llamadasRes, resumenRes] = await Promise.all([
        apiClient.get('/api/seguimiento/telefonia/llamadas/', { params: llamadasParams }),
        apiClient.get('/api/seguimiento/telefonia/llamadas/resumen/', { params: baseParams }),
      ])

      const data = llamadasRes.data
      const lista = data?.results || (Array.isArray(data) ? data : [])
      setLlamadas(lista)
      setTotalRegistros(data?.count ?? lista.length)
      setHasNext(Boolean(data?.next))
      setHasPrev(Boolean(data?.previous))

      if (resumenRes.data) {
        setResumen(resumenRes.data)
      }
    } catch (err) {
      console.error('Error cargando historial telefónico:', err)
      showToast('No se pudo cargar el historial de llamadas.', 'error')
    } finally {
      setLoading(false)
    }
  }, [construirParams, page, pageSize, showToast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const abrirDetalleLlamada = async (uniqueId) => {
    setLoadingDetalle(true);
    setLlamadaSeleccionada({ unique_id: uniqueId, eventos: [] })
    try {
      const res = await apiClient.get(`/api/seguimiento/telefonia/llamadas/${uniqueId}/`)
      setLlamadaSeleccionada(res.data)
    } catch (err) {
      console.error('Error cargando detalle de llamada:', err)
      showToast('No se pudo obtener la traza de eventos de la llamada.', 'error')
      setLlamadaSeleccionada(null)
    } finally {
      setLoadingDetalle(false)
    }
  }

  const metricasPorBodega = useMemo(() => {
    const sucursales = ['Santiago', 'Antofagasta', 'Iquique']
    return sucursales.map((nombre) => {
      const delDestino = llamadas.filter(
        (l) => (l.bodega_seleccionada || '').toLowerCase() === nombre.toLowerCase()
      )
      const total = delDestino.length
      const atendidas = delDestino.filter(
        (l) => l.estado_final === 'CONTESTADA_BODEGA'
      ).length
      const desviadas = delDestino.filter((l) =>
        ['NO_CONTESTA_DESVIADA', 'CONTESTADA_GENERAL'].includes(l.estado_final)
      ).length
      const tasaAtencion = total > 0 ? Math.round((atendidas / total) * 100) : 0

      return { nombre, total, atendidas, desviadas, tasaAtencion }
    })
  }, [llamadas])

  const tasaAtencionDirectaGlobal = useMemo(() => {
    if (!resumen.total) return 0
    return Math.round((resumen.contestadas_bodega / resumen.total) * 100)
  }, [resumen])

  const limpiarFiltros = () => {
    setPage(1)
    setFiltros({
      search: '',
      bodega: '',
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
    })
  }

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== '');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* TARJETAS KPI GLOBALES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Llamadas
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Phone className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{resumen.total}</span>
              {resumen.en_curso > 0 && (
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {resumen.en_curso} en curso
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Atendidas en Bodega
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-emerald-700">
                {resumen.contestadas_bodega}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Desviadas a General
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <PhoneForwarded className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-amber-600">
                {resumen.desviadas_general}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Abandonadas
              </span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <PhoneMissed className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-rose-600">
                {resumen.abandonadas}
              </span>
            </div>
          </div>
        </div>

        {/* RENDIMIENTO POR BODEGA */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metricasPorBodega.map((b) => {
              const activa = filtros.bodega.toLowerCase() === b.nombre.toLowerCase();
              return (
                <button
                  key={b.nombre}
                  type="button"
                  onClick={() => actualizarFiltro('bodega', activa ? '' : b.nombre)}
                  className={`text-left p-4 rounded-xl border transition ${activa
                    ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">Bodega {b.nombre}</span>
                    <span className="text-xs font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {b.tasaAtencion}% atención
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${b.tasaAtencion}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Total: <strong>{b.total}</strong></span>
                    <span className="text-emerald-700">Directas: <strong>{b.atendidas}</strong></span>
                    <span className="text-amber-700">Desviadas: <strong>{b.desviadas}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar teléfono o ID..."
                value={filtros.search}
                onChange={(e) => actualizarFiltro('search', e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <select
              value={filtros.bodega}
              onChange={(e) => actualizarFiltro('search', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todas las bodegas</option>
              <option value="Santiago">Bodega Santiago</option>
              <option value="Antofagasta">Bodega Antofagasta</option>
              <option value="Iquique">Bodega Iquique</option>
            </select>

            <select
              value={filtros.estado}
              onChange={(e) => actualizarFiltro('search', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="CONTESTADA_BODEGA">Contestada por Bodega</option>
              <option value="CONTESTADA_GENERAL">Contestada por General</option>
              <option value="NO_CONTESTA_DESVIADA">No Contesta (Desviada)</option>
              <option value="ABANDONADA">Abandonada</option>
              <option value="EN_CURSO">En Curso</option>
            </select>

            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => actualizarFiltro('search', e.target.value)}
                title="Fecha desde"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => actualizarFiltro('search', e.target.value)}
                  title="Fecha hasta"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  title="Limpiar filtros"
                  className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition shrink-0"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TABLA DE LLAMADAS */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm">Cargando registros telefónicos...</p>
            </div>
          ) : llamadas.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <PhoneMissed className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-gray-700">No se encontraron llamadas</p>
              <p className="text-xs text-gray-400 mt-1">
                Prueba ajustando los filtros de búsqueda o rango de fechas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Fecha / Hora</th>
                    <th className="py-3.5 px-4">Origen</th>
                    <th className="py-3.5 px-4">Bodega Destino</th>
                    <th className="py-3.5 px-4">Estado Final</th>
                    <th className="py-3.5 px-4">Duración</th>
                    <th className="py-3.5 px-4 text-center">Saltos</th>
                    <th className="py-3.5 px-4 text-right">Trazabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {llamadas.map((llamada) => {
                    const config = ESTADO_CONFIG[llamada.estado_final] || {
                      label: llamada.estado_final_display || llamada.estado_final,
                      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                      icon: Phone,
                    };
                    const IconoEstado = config.icon;

                    return (
                      <tr
                        key={llamada.unique_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                          {formatearFechaHora(llamada.fecha_inicio)}
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {llamada.unique_id}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                          {llamada.origen}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {llamada.bodega_seleccionada ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                              {llamada.bodega_seleccionada}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              Directo a General
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.badgeClass}`}
                          >
                            <IconoEstado className="w-3.5 h-3.5" />
                            {config.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatearDuracion(llamada.duracion_segundos)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-md">
                            {llamada.total_eventos ?? 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => abrirDetalleLlamada(llamada.unique_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Ver Traza
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalRegistros > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                  <div>
                    Mostrando página <strong className="text-slate-900">{page}</strong> de{' '}
                    <strong className="text-slate-900">
                      {Math.max(1, Math.ceil(totalRegistros / pageSize))}
                    </strong>{' '}
                    ({totalRegistros} registros en total)
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev || loading}
                      className="px-3.5 py-1.5 font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext || loading}
                      className="px-3.5 py-1.5 font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL LÍNEA DE TIEMPO DE EVENTOS */}
      {llamadaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">

            {/* Cabecera Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-lg font-bold">Trazabilidad de Llamada</h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  UniqueID: {llamadaSeleccionada.unique_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLlamadaSeleccionada(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen Superior de la Llamada */}
            {!loadingDetalle && (
              <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 grid grid-cols-3 gap-4 text-xs shrink-0">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Origen</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {llamadaSeleccionada.origen}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">
                    Bodega Solicitada
                  </span>
                  <span className="font-bold text-indigo-700 text-sm">
                    {llamadaSeleccionada.bodega_seleccionada || 'Central General'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">
                    Duración Total
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatearDuracion(llamadaSeleccionada.duracion_segundos)}
                  </span>
                </div>
              </div>
            )}

            {/* Cuerpo Timeline */}
            <div className="p-6 overflow-y-auto flex-grow">
              {loadingDetalle ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-sm">Reconstruyendo línea de tiempo...</p>
                </div>
              ) : !llamadaSeleccionada.eventos || llamadaSeleccionada.eventos.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  No hay eventos granulares registrados para esta llamada.
                </p>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 ml-2">
                  {llamadaSeleccionada.eventos.map((ev, index) => {
                    const primerTimestamp = new Date(
                      llamadaSeleccionada.eventos[0].creado_en
                    ).getTime();
                    const actualTimestamp = new Date(ev.creado_en).getTime();
                    const deltaSegundos = Math.max(
                      0,
                      Math.round((actualTimestamp - primerTimestamp) / 1000)
                    );

                    const meta = EVENTO_TIMELINE_CONFIG[ev.tipo_evento] || {
                      titulo: ev.tipo_evento,
                      dotClass: 'bg-slate-500 ring-slate-100',
                      textClass: 'text-slate-800',
                    };

                    return (
                      <div key={ev.id || index} className="relative">
                        {/* Punto en la línea vertical */}
                        <span
                          className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ring-4 ${meta.dotClass}`}
                        />

                        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className={`font-bold text-sm ${meta.textClass}`}>
                              {meta.titulo}
                            </span>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono rounded">
                                +{deltaSegundos}s
                              </span>
                              <span className="text-slate-400 font-mono">
                                {formatearSoloHora(ev.creado_en)}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 mt-1.5">
                            <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                              {ev.tipo_evento}
                            </span>

                            {ev.destino && (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                <ArrowRight className="w-3 h-3 text-indigo-500" />
                                Destino: {ev.destino}
                              </span>
                            )}

                            {ev.motivo_fallo && (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                Estado: {ev.motivo_fallo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setLlamadaSeleccionada(null)}
                className="px-5 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}