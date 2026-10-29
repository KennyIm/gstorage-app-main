import React, { useState, useEffect } from 'react'
import { useUI } from '../context/UIContext'
import { 
  History, User, Edit, Trash2, Plus, Filter, Search, MapPin, 
  Loader2, ChevronDown, ChevronUp, XCircle, Clock, ShieldCheck, FileText, ArrowRight 
} from 'lucide-react'
import apiClient from '../services/api'

export default function HistorialView() {
  document.title = "Historial de Cambios - GStorage"

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState([])
  const [error, setError] = useState(null)
  const [expandedItemId, setExpandedItemId] = useState(null)
  const { showToast } = useUI()
  
  const [nextPageUrl, setNextPageUrl] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('Todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const convertirARutaRelativa = (url) => {
    if (!url) return null
    try {
      const parsed = new URL(url)
      return `${parsed.pathname}${parsed.search}`
    } catch {
      return url
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        
        const tieneFiltrosActivos = Boolean(debouncedSearch || filterType !== 'Todos' || fechaDesde || fechaHasta)

        if (debouncedSearch) params.append('search', debouncedSearch)
        if (filterType !== 'Todos') params.append('accion', filterType)
        if (fechaDesde) params.append('fecha_desde', fechaDesde)
        if (fechaHasta) params.append('fecha_hasta', fechaHasta)
        if (tieneFiltrosActivos) {
          params.append('page_size', '1000')
        }

        const [historyRes, sucursalesRes] = await Promise.all([
          apiClient.get(`/api/inventario/historial/?${params.toString()}`),
          apiClient.get('/api/usuarios/sucursales/')
        ])

        const listaResultados = historyRes.data.results || historyRes.data
        setHistory(Array.isArray(listaResultados) ? listaResultados : [])
        
        setNextPageUrl(tieneFiltrosActivos ? null : (convertirARutaRelativa(historyRes.data?.next) || null))
        setSucursales(sucursalesRes.data)
      } catch (err) {
        if (err.response && err.response.status === 401) {
          showToast('Sesión caducada, ingresa nuevamente.', 'error')
        } else {
          showToast('Error al filtrar el historial.', 'error')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [debouncedSearch, filterType, fechaDesde, fechaHasta])

  const loadMore = async () => {
    if (!nextPageUrl || loadingMore) return
    setLoadingMore(true)

    try {
      const urlLimpia = convertirARutaRelativa(nextPageUrl)
      const res = await apiClient.get(urlLimpia)
      setHistory((prev) => [...prev, ...(res.data.results || [])])
      setNextPageUrl(convertirARutaRelativa(res.data?.next) || null)
    } catch (error) {
      console.error("Error al cargar más historial:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  const limpiarFiltros = () => {
    setSearchTerm('')
    setFilterType('Todos')
    setFechaDesde('')
    setFechaHasta('')
    setExpandedItemId(null)
  }

  const getNombreSucursal = (id) => {
    if (!id) return 'General / Sin Sucursal'
    const sucursal = sucursales.find(s => String(s.id) === String(id))
    return sucursal ? sucursal.nombre : `Suc. ${id}`
  }

  const getStyleForAction = (accion) => {
    const act = accion?.toLowerCase() || ''
    if (act.includes('creación') || act.includes('creacion') || act.includes('crear'))
      return { icon: Plus, color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', label: 'Creación' }
    if (act.includes('edición') || act.includes('edicion') || act.includes('modificación') || act.includes('actualizacion'))
      return { icon: Edit, color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-300', label: 'Edición' }
    if (act.includes('eliminación') || act.includes('eliminacion') || act.includes('borrado'))
      return { icon: Trash2, color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-300', label: 'Eliminación' }
    return { icon: History, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300', label: 'Movimiento' }
  }

  const renderDetalles = (item) => {
    const detallesRaw = item.detalles || item.datos_json || item.cambios

    if (!detallesRaw) {
      return (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-sm italic">
          Sin datos de auditoría detallados registrados.
        </div>
      )
    }

    let datos = detallesRaw
    if (typeof detallesRaw === 'string') {
      try { datos = JSON.parse(detallesRaw); } catch (e) { 
        return <p className="text-sm text-slate-700 font-mono bg-slate-50 p-3 rounded border">{detallesRaw}</p>; 
      }
    }

    if (datos.es_diff || datos.cambios) {
      const cambios = datos.cambios || datos
      if (Object.keys(cambios).length === 0) {
        return <p className="text-sm text-slate-500 italic mt-2">No se detectaron diferencias en los atributos del registro.</p>;
      }

      return (
        <div className="mt-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-amber-500/10 px-4 py-2.5 border-b border-amber-200/60 flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              Auditoría de Cambios
            </h4>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {Object.keys(cambios).length} campos modificados
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(cambios).map(([key, valores]) => {
              const oldVal = valores?.viejo === null || valores?.viejo === undefined ? '-' : String(valores.viejo);
              const newVal = valores?.nuevo === null || valores?.nuevo === undefined ? '-' : String(valores.nuevo);

              return (
                <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-700 capitalize block mb-2 font-mono">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded border border-rose-200 font-semibold line-through flex-1 truncate">
                      {oldVal}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-bold flex-1 truncate">
                      {newVal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payload de Registro</h4>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(datos).map(([key, value]) => {
            const valFormateado = value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value);
            return (
              <div key={key} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-bold text-slate-800 break-words font-mono">
                  {valFormateado}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (error) return <div className="m-8 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">{error}</div>;

  const hayFiltrosActivos = Boolean(debouncedSearch || filterType !== 'Todos' || fechaDesde || fechaHasta)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">

        {/* --- PANEL DE CABECERA Y FILTROS --- */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Historial de Auditoría</h1>                  
                </div>
              </div>
            </div>

            {/* Buscador General */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por usuario, modelo, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-80 shadow-sm"
              />
            </div>
          </div>

          {/* Fila de Filtros Avanzados */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipo de Acción</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 py-2 px-3 bg-white shadow-sm text-slate-700"
                >
                  {['Todos', 'Creación', 'Edición', 'Eliminación', 'Reubicación'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Desde Fecha</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 py-2 px-3 bg-white shadow-sm text-slate-700"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hasta Fecha</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 py-2 px-3 bg-white shadow-sm text-slate-700"
                />
              </div>

              {hayFiltrosActivos && (
                <button
                  onClick={limpiarFiltros}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-2 rounded-xl transition-colors border border-rose-200"
                >
                  <XCircle className="w-4 h-4" />
                  Limpiar Filtros
                </button>
              )}
            </div>

            {/* Contador Resumen */}
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 block">
                Mostrando: <strong className="text-slate-900 font-black">{history.length}</strong> registros
              </span>
              {hayFiltrosActivos && (
                <span className="text-[10px] text-emerald-600 font-extrabold uppercase">
                  (Modo sin límite)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* --- LISTA DE TIMELINE GRANDE --- */}
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200/70">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Cargando auditoría de datos...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold text-sm">No se encontraron movimientos registrados.</p>
              <p className="text-xs text-slate-400 mt-1">Intenta ajustando los criterios de búsqueda o las fechas.</p>
            </div>
          ) : (
            history.map((item) => {
              const actionType = item.accion || item.tipo_movimiento;
              const style = getStyleForAction(actionType);
              const Icon = style.icon;
              const isExpanded = expandedItemId === item.id_historial;

              return (
                <div key={item.id_historial} className="relative pl-12 transition-all">
                  
                  {/* Icono Flotante del Timeline */}
                  <div className={`absolute left-0 top-1 w-12 h-12 ${style.bg} ${style.border} rounded-2xl flex items-center justify-center z-10 shadow-md border-2`}>
                    <Icon className={`w-6 h-6 ${style.color}`} />
                  </div>

                  {/* Tarjeta Principal de Información */}
                  <div
                    className={`rounded-2xl p-5 border transition-all duration-200 cursor-pointer ${
                      isExpanded 
                        ? 'bg-white border-indigo-300 shadow-xl ring-2 ring-indigo-50' 
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                    }`}
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id_historial)}
                  >
                    {/* Encabezado de la Tarjeta */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${style.bg} ${style.color}`}>
                          {actionType}
                        </span>
                        
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                          {item.modelo_afectado || 'Sistema'}
                        </span>

                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          #HIST-{item.id_historial}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(item.fecha_hora_movimiento).toLocaleString('es-CL')}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* Descripción de la Acción */}
                    <p className="text-slate-800 text-sm font-semibold mb-4 leading-relaxed">
                      {item.descripcion_adicional || "Sin descripción detallada enviada."}
                    </p>

                    {/* Pie de Datos del Usuario y Ubicación */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                          <User className="w-4 h-4 text-indigo-500" />
                          <span>{item.usuario_nombre || 'Sistema / Tarea Automática'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{getNombreSucursal(item.sucursal || item.sucursal_id)}</span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-indigo-600 hover:underline">
                        {isExpanded ? 'Ocultar detalles técnicos ▲' : 'Ver inspección completa ▼'}
                      </span>
                    </div>

                    {/* Despliegue de Detalles Extendidos */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-slate-100 mt-4" onClick={(e) => e.stopPropagation()}>
                        {renderDetalles(item)}
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- BOTÓN CARGAR MÁS (Solo si no se están aplicando filtros) --- */}
        {nextPageUrl && !hayFiltrosActivos && (
          <div className="mt-10 flex justify-center pt-6 border-t border-slate-100">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              {loadingMore ? 'Cargando...' : 'Cargar más registros anteriores'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}